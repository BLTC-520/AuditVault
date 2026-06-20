// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {MockERC20} from "../../shared/MockERC20.sol";
import {MiniAMM} from "./MiniAMM.sol";

/// @notice Lends tokenB against tokenA collateral, valued at the AMM spot price.
/// @dev BUG: uses MiniAMM.priceAinB() (a manipulable spot price) as its oracle,
///      so an attacker can pump the price and borrow far more than the
///      collateral is really worth.
contract LendingDesk {
    MockERC20 public tokenA;
    MockERC20 public tokenB;
    MiniAMM public amm;

    constructor(MockERC20 _a, MockERC20 _b, MiniAMM _amm) {
        tokenA = _a;
        tokenB = _b;
        amm = _amm;
    }

    /// @notice Lock `collateralA`, borrow tokenB equal to its spot value.
    function borrow(uint256 collateralA) external returns (uint256 borrowed) {
        tokenA.transferFrom(msg.sender, address(this), collateralA);
        borrowed = collateralA * amm.priceAinB() / 1e18; // no haircut, spot oracle
        tokenB.transfer(msg.sender, borrowed);
    }
}
