// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.6.12;
pragma experimental ABIEncoderV2;

/**
 * @dev We use ABIEncoderV2 to enable encoding/decoding of the array of structs. The pragma
 * is required, but ABIEncoderV2 is no longer considered experimental as of Solidity 0.6.0
 */

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @notice Interface for the zkSync contract
 */
interface IZkSync {
  function depositETH(address _franklinAddr) external payable;

  function depositERC20(
    IERC20 _token,
    uint104 _amount,
    address _franklinAddr
  ) external;
}

/**
 * @notice Enables batch deposits of multiple tokens into the zkSync contract with one transaction
 */
contract BatchZkSyncDeposit is Ownable, Pausable, ReentrancyGuard {
  using SafeERC20 for IERC20;

  // Placeholder token address to represent ETH deposits
  IERC20 private constant ETH_TOKEN_PLACEHOLDER = IERC20(
    0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE
  );

  // Instance of the zkSync contract
  IZkSync public immutable zkSync;

  // Required parameters for each deposit
  struct Deposit {
    IERC20 token; // address of the token to deposit
    uint104 amount; // amount of tokens to deposit (uint104 because that's what zkSync uses)
  }

  // Emitted on each deposit
  event DepositMade(IERC20 indexed token, uint104 indexed amount, address indexed user);

  // Emitted when allowances are changed
  event AllowanceSet(IERC20 indexed token, uint256 amount);

  /**
   * @notice Sets address of the zkSync contract and approves zkSync contract to spend our tokens
   * @param _zkSync Address of the zkSync contract
   * @param _tokens Array of token address to approve
   */
  constructor(address _zkSync, IERC20[] memory _tokens) public {
    zkSync = IZkSync(_zkSync);

    for (uint256 i = 0; i < _tokens.length; i += 1) {
      // To use safeApprove, we must use solc 0.6.8 or above due to a constructor-related bug
      // fix in that version. See details at:
      //   Issue: https://github.com/ethereum/solidity/issues/8656
      //   Led to PR: https://github.com/ethereum/solidity/pull/8849
      //   Released in: https://github.com/ethereum/solidity/releases/tag/v0.6.8
      _tokens[i].safeApprove(_zkSync, uint256(-1));
    }
  }

  /**
   * @notice Sets allowance of zkSync to spend the specified token
   * @param _token Address of token to set allowance for
   * @param _amount Value to set allowance to
   */
  function setAllowance(IERC20 _token, uint256 _amount) external onlyOwner {
    _token.safeApprove(address(zkSync), _amount);
    emit AllowanceSet(_token, _amount);
  }

  /**
   * @notice Performs deposits to the zkSync contract
   * @dev We assume (1) all token approvals were already executed, and (2) all deposits go to
   * the same recipient
   * @param _recipient Address of the account that should receive the funds on zkSync
   * @param _deposits Array of deposit structs. A token address should only be present one time
   * in this array to minimize gas costs
   */
  function deposit(address _recipient, Deposit[] calldata _deposits)
    external
    payable
    nonReentrant
    whenNotPaused
  {
    for (uint256 i = 0; i < _deposits.length; i++) {
      emit DepositMade(_deposits[i].token, _deposits[i].amount, msg.sender);
      if (_deposits[i].token != ETH_TOKEN_PLACEHOLDER) {
        // Token deposit
        _deposits[i].token.safeTransferFrom(msg.sender, address(this), _deposits[i].amount);
        zkSync.depositERC20(_deposits[i].token, _deposits[i].amount, _recipient);
      } else {
        // ETH deposit
        // Make sure the value sent equals the specified deposit amount
        require(msg.value == _deposits[i].amount, "BatchZkSyncDeposit: ETH value mismatch");
        zkSync.depositETH{value: msg.value}(_recipient);
      }
    }
  }

  /**
   * @notice Pause contract
   */
  function pause() external onlyOwner whenNotPaused {
    _pause();
  }

  /**
   * @notice Unpause contract
   */
  function unpause() external onlyOwner whenPaused {
    _unpause();
  }
}
