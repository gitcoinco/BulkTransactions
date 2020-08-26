// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.6.2;
pragma experimental ABIEncoderV2;

/**
 * @dev We use ABIEncoderV2 to enable encoding/decoding of the array of structs. The pragma
 * is required, but ABIEncoderV2 is no longer considered experimental as of Solidity 0.6.0
 */

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract BulkCheckout is Ownable, Pausable, ReentrancyGuard {
  using Address for address payable;
  using SafeMath for uint256;
  /**
   * @notice Placeholder token address for ETH donations. This address is used in various other
   * projects as a stand-in for ETH
   */
  address constant ETH_TOKEN_PLACHOLDER = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;

  /**
   * @notice Required parameters for each donation
   */
  struct Donation {
    address token; // address of the token to donate
    uint256 amount; // amount of tokens to donate
    address payable dest; // grant address
  }

  /**
   * @dev Emitted on each donation
   */
  event DonationSent(
    address indexed token,
    uint256 indexed amount,
    address dest,
    address indexed donor
  );

  /**
   * @dev Emitted when a token or ETH is withdrawn from the contract
   */
  event TokenWithdrawn(address indexed token, uint256 indexed amount, address indexed dest);

  /**
   * @notice Bulk gitcoin grant donations
   * @dev We assume all token approvals were already executed
   * @param _donations Array of donation structs
   */
  function donate(Donation[] calldata _donations) external payable nonReentrant whenNotPaused {
    // We track total ETH donations to ensure msg.value is exactly correct
    uint256 _ethDonationTotal = 0;

    for (uint256 i = 0; i < _donations.length; i++) {
      emit DonationSent(_donations[i].token, _donations[i].amount, _donations[i].dest, msg.sender);
      if (_donations[i].token != ETH_TOKEN_PLACHOLDER) {
        // Token donation
        // This method throws on failure, so there is no return value to check
        SafeERC20.safeTransferFrom(
          IERC20(_donations[i].token),
          msg.sender,
          _donations[i].dest,
          _donations[i].amount
        );
      } else {
        // ETH donation
        // See comments in Address.sol for why we use sendValue over transer
        _donations[i].dest.sendValue(_donations[i].amount);
        _ethDonationTotal = _ethDonationTotal.add(_donations[i].amount);
      }
    }

    // Revert if the wrong amount of ETH was sent
    require(msg.value == _ethDonationTotal, "BulkCheckout: Too much ETH sent");
  }

  /**
   * @notice Transfers all tokens of the input adress to the recipient. This is
   * useful tokens are accidentally sent to this contrasct
   * @param _tokenAddress address of token to send
   * @param _dest destination address to send tokens to
   */
  function withdrawToken(address _tokenAddress, address _dest) external onlyOwner {
    uint256 _balance = IERC20(_tokenAddress).balanceOf(address(this));
    emit TokenWithdrawn(_tokenAddress, _balance, _dest);
    SafeERC20.safeTransfer(IERC20(_tokenAddress), _dest, _balance);
  }

  /**
   * @notice Transfers all Ether to the specified address
   * @param _dest destination address to send ETH to
   */
  function withdrawEther(address payable _dest) external onlyOwner {
    uint256 _balance = address(this).balance;
    emit TokenWithdrawn(ETH_TOKEN_PLACHOLDER, _balance, _dest);
    _dest.sendValue(_balance);
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
