// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Test} from "forge-std/Test.sol";
import {VaultBank} from "../src/VaultBank.sol";

/// Legitimate behaviour that ANY valid fix must preserve:
/// honest deposit/withdraw works, and a normal (non-reentrant) transfer works.
contract CrossFunctionFunctionality is Test {
    VaultBank bank;
    address alice = makeAddr("alice");
    address bob = makeAddr("bob");

    function setUp() public {
        bank = new VaultBank();
        vm.deal(alice, 2 ether);
        vm.deal(bob, 1 ether);
    }

    function test_honestDepositWithdraw() public {
        vm.startPrank(alice);
        bank.deposit{value: 2 ether}();
        bank.withdraw();
        vm.stopPrank();
        assertEq(alice.balance, 2 ether, "alice recovers her deposit");
    }

    function test_honestTransfer() public {
        vm.prank(bob);
        bank.deposit{value: 1 ether}();

        // A plain, non-reentrant transfer of credit must still succeed.
        vm.prank(bob);
        bank.transfer(alice, 1 ether);

        assertEq(bank.balanceOf(alice), 1 ether, "alice receives the transferred credit");
        assertEq(bank.balanceOf(bob), 0, "bob's credit moves out");
    }
}
