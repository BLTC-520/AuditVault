// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Test} from "forge-std/Test.sol";
import {EtherBank} from "../src/EtherBank.sol";

/// Legitimate behaviour that ANY valid fix must preserve:
/// an honest user can deposit and then withdraw their funds exactly once.
contract ReentrancyFunctionality is Test {
    EtherBank bank;
    address user = makeAddr("user");

    function setUp() public {
        bank = new EtherBank();
        vm.deal(user, 3 ether);
    }

    function test_honestDepositWithdraw() public {
        vm.startPrank(user);
        bank.deposit{value: 3 ether}();
        bank.withdraw();
        vm.stopPrank();

        assertEq(user.balance, 3 ether, "user recovers their deposit");
        assertEq(address(bank).balance, 0, "bank holds nothing extra");
        assertEq(bank.balanceOf(user), 0, "balance is cleared after withdraw");
    }
}
