pragma solidity ^0.6.2;


/**
 * @notice Used for forcibly sending ETH to BulkCheckout for testing
 */

contract SelfDestruct {
  /**
   * @notice Self-destructs the contract to force ETH to the destination address
   * @param _dest Address to send all ETH in the contract to
   */
  function forceEther(address payable _dest) external {
    selfdestruct(_dest);
  }

  receive() external payable {}
}
