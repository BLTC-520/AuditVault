// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {MockERC20} from "../../shared/MockERC20.sol";

/// @notice A minimal constant-product (x*y=k) AMM for tokenA/tokenB.
/// @dev `priceAinB()` is the *spot* price — trivially moved by a single swap.
///      Anything that uses it as an oracle is exploitable.
contract MiniAMM {
    MockERC20 public tokenA;
    MockERC20 public tokenB;
    uint256 public reserveA;
    uint256 public reserveB;

    constructor(MockERC20 _a, MockERC20 _b) {
        tokenA = _a;
        tokenB = _b;
    }

    function addLiquidity(uint256 amtA, uint256 amtB) external {
        tokenA.transferFrom(msg.sender, address(this), amtA);
        tokenB.transferFrom(msg.sender, address(this), amtB);
        reserveA += amtA;
        reserveB += amtB;
    }

    /// @dev Spot price of A denominated in B, scaled by 1e18.
    function priceAinB() external view returns (uint256) {
        return reserveB * 1e18 / reserveA;
    }

    function swapBforA(uint256 amtB) external returns (uint256 outA) {
        tokenB.transferFrom(msg.sender, address(this), amtB);
        outA = reserveA - (reserveA * reserveB) / (reserveB + amtB);
        reserveB += amtB;
        reserveA -= outA;
        tokenA.transfer(msg.sender, outA);
    }

    function swapAforB(uint256 amtA) external returns (uint256 outB) {
        tokenA.transferFrom(msg.sender, address(this), amtA);
        outB = reserveB - (reserveA * reserveB) / (reserveA + amtA);
        reserveA += amtA;
        reserveB -= outB;
        tokenB.transfer(msg.sender, outB);
    }
}
