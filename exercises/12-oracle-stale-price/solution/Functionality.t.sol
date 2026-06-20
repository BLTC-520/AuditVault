// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Test} from "forge-std/Test.sol";
import {MockERC20} from "../../shared/MockERC20.sol";
import {PriceFeed} from "../src/PriceFeed.sol";
import {StaleLending} from "../src/StaleLending.sol";

/// Legitimate behaviour any valid fix must preserve: borrowing against a FRESH
/// price still works.
contract StaleOracleFunctionality is Test {
    MockERC20 collateral;
    MockERC20 debt;
    PriceFeed feed;
    StaleLending lending;
    address user = makeAddr("user");

    function setUp() public {
        collateral = new MockERC20("Collateral", "COL");
        debt = new MockERC20("Debt", "DEBT");
        feed = new PriceFeed();
        lending = new StaleLending(collateral, debt, feed);
        debt.mint(address(lending), 1_000_000e18);
        collateral.mint(user, 100e18);
    }

    function test_freshPriceBorrowWorks() public {
        feed.set(2_000e8, block.timestamp); // fresh: updated right now
        vm.startPrank(user);
        collateral.approve(address(lending), type(uint256).max);
        uint256 got = lending.borrow(1e18);
        vm.stopPrank();
        assertEq(got, 2_000e18, "a fresh-price borrow must still pay out the expected amount");
    }
}
