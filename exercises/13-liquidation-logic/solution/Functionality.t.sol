// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Test} from "forge-std/Test.sol";
import {MockERC20} from "../../shared/MockERC20.sol";
import {Lending} from "../src/Lending.sol";

/// Legitimate behaviour any valid fix must preserve: an ACTUALLY underwater
/// position can still be liquidated.
contract LiquidationFunctionality is Test {
    MockERC20 collateralToken;
    MockERC20 debtToken;
    Lending lending;
    address victim = makeAddr("victim");
    address liquidator = makeAddr("liquidator");

    function setUp() public {
        collateralToken = new MockERC20("Collateral", "COL");
        debtToken = new MockERC20("Debt", "DEBT");
        lending = new Lending(collateralToken, debtToken);
        debtToken.mint(address(lending), 1_000_000e18);

        collateralToken.mint(victim, 10e18);
        vm.startPrank(victim);
        collateralToken.approve(address(lending), type(uint256).max);
        lending.deposit(10e18);
        lending.borrow(500e18);
        vm.stopPrank();

        debtToken.mint(liquidator, 500e18);
    }

    function test_underwaterPositionCanBeLiquidated() public {
        // Price drops: 10 collateral now worth 400 < 500 debt -> underwater.
        lending.setPrice(40);

        vm.startPrank(liquidator);
        debtToken.approve(address(lending), type(uint256).max);
        lending.liquidate(victim);
        vm.stopPrank();

        assertEq(collateralToken.balanceOf(liquidator), 10e18, "a genuine liquidation must still work");
        assertEq(lending.debt(victim), 0, "debt is cleared after liquidation");
    }
}
