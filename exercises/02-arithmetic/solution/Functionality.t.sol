// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Test} from "forge-std/Test.sol";
import {Ledger} from "../src/Ledger.sol";

/// Legitimate behaviour that ANY valid fix must preserve:
/// honest deposit / transfer / withdraw with sufficient balance still works.
contract ArithmeticFunctionality is Test {
    Ledger ledger;
    address alice = makeAddr("alice");
    address bob = makeAddr("bob");

    function setUp() public {
        ledger = new Ledger();
        vm.deal(alice, 5 ether);
    }

    function test_honestTransferAndWithdraw() public {
        vm.prank(alice);
        ledger.deposit{value: 5 ether}();

        // Alice legitimately moves 2 ETH of credit to Bob.
        vm.prank(alice);
        ledger.transfer(bob, 2 ether);

        assertEq(ledger.balanceOf(alice), 3 ether, "alice keeps the remainder");
        assertEq(ledger.balanceOf(bob), 2 ether, "bob receives the credit");

        // Both can withdraw their real balances.
        vm.prank(alice);
        ledger.withdraw(3 ether);
        assertEq(alice.balance, 3 ether, "alice withdraws her remainder");
    }
}
