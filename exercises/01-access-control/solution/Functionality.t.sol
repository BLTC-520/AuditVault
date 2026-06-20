// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Test} from "forge-std/Test.sol";
import {Treasury} from "../src/Treasury.sol";

/// Legitimate behaviour that ANY valid fix must preserve:
/// the rightful owner can still manage and withdraw from the treasury.
contract AccessControlFunctionality is Test {
    Treasury treasury;
    address recipient = makeAddr("recipient");

    function setUp() public {
        treasury = new Treasury(); // owner == address(this)
        vm.deal(address(treasury), 10 ether);
    }

    function test_ownerCanWithdraw() public {
        treasury.withdrawAll(payable(recipient));
        assertEq(recipient.balance, 10 ether, "owner should be able to withdraw");
        assertEq(address(treasury).balance, 0, "treasury should be empty after owner withdraws");
    }

    function test_ownerCanRotateOwner() public {
        address newOwner = makeAddr("newOwner");
        treasury.setOwner(newOwner); // called by the current owner
        assertEq(treasury.owner(), newOwner, "owner should be able to hand over ownership");
    }
}
