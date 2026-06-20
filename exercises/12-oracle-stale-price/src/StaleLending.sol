// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {MockERC20} from "../../shared/MockERC20.sol";
import {PriceFeed} from "./PriceFeed.sol";

/// @notice Lends a debt token against collateral valued by a price feed.
/// @dev BUG: borrow() reads the feed's answer but never checks how old it is
///      (updatedAt). When the feed goes stale, the protocol keeps lending against
///      a frozen, no-longer-accurate price.
contract StaleLending {
    MockERC20 public collateral;
    MockERC20 public debt;
    PriceFeed public feed;

    constructor(MockERC20 _collateral, MockERC20 _debt, PriceFeed _feed) {
        collateral = _collateral;
        debt = _debt;
        feed = _feed;
    }

    function borrow(uint256 collateralAmount) external returns (uint256 amount) {
        collateral.transferFrom(msg.sender, address(this), collateralAmount);
        (int256 price,) = feed.latestRoundData(); // updatedAt ignored
        require(price > 0, "bad price");
        amount = collateralAmount * uint256(price) / 1e8;
        debt.transfer(msg.sender, amount);
    }
}
