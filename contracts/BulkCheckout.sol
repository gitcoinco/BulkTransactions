pragma solidity ^0.6.2;
pragma experimental ABIEncoderV2;

/**
 * @dev We use ABIEncoderV2 to enable encoding/decoding of the array of structs. The pragma
 * is required, but ABIEncoderV2 is no longer considered experimental as of Solidity 0.6.0
 */

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "@openzeppelin/contracts/utils/Address.sol";


contract BulkCheckout {
  using Address for address payable;
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
   * @notice Bulk gitcoin grant donations
   * @dev We assume all token approvals were already executed
   * @param _donations Array of donation structs
   */
  function donate(Donation[] calldata _donations) external payable {
    // We track total ETH donations to ensure msg.value is exactly correct
    uint256 _ethDonationTotal = 0;

    for (uint256 i = 0; i < _donations.length; i++) {
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
        _ethDonationTotal += _donations[i].amount;
      }
    }

    // Revert if the wrong amount of ETH was sent
    require(msg.value == _ethDonationTotal, "BulkCheckout: Too much ETH sent");
  }
}
