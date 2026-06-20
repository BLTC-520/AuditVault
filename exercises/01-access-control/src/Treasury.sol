// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/// @notice A treasury that holds ETH for its owner.
/// @dev The withdraw path is correctly guarded — but `setOwner` is not.
///      One unprotected privileged setter undermines every other check.
contract Treasury {
    address public owner;

    constructor() {
        owner = msg.sender;
    }

    receive() external payable {}

    /// @dev BUG: no access control. Anyone can become the owner.
    function setOwner(address newOwner) external {
        owner = newOwner;
    }

    function withdrawAll(address payable to) external {
        require(msg.sender == owner, "not owner");
        to.transfer(address(this).balance);
    }
}
