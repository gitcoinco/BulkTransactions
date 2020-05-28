pragma solidity ^0.6.2;
pragma experimental ABIEncoderV2;

/**
 * @dev We use ABIEncoderV2 to enable encoding/decoding of the array of structs. The pragma
 * is required, but ABIEncoderV2 is no longer considered experimental as of Solidity 0.6.0
 */

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";


contract BulkCheckout {
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
    address dest; // grant address
  }

  /**
   * @notice Bulk gitcoin grant donations
   * @dev We assume all token approvals were already executed
   * @param _donations Array of donation structs
   */
  function donate(Donation[] calldata _donations) external {
    for (uint256 i = 0; i < _donations.length; i++) {
      // Execute donation. This method throws on failure, so there is no return value to check
      SafeERC20.safeTransferFrom(
        IERC20(_donations[i].token),
        msg.sender,
        _donations[i].dest,
        _donations[i].amount
      );
    }
  }
}
