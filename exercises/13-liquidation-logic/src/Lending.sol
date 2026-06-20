// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {MockERC20} from "../../shared/MockERC20.sol";

/// @notice A minimal collateralised lending market with liquidations.
/// @dev BUG: liquidate() never checks that the position is actually underwater.
///      Anyone can liquidate a perfectly healthy, over-collateralised position,
///      repay its (small) debt, and seize all of its (large) collateral.
contract Lending {
    MockERC20 public collateralToken;
    MockERC20 public debtToken;
    uint256 public price = 100; // 1 collateral unit is worth `price` debt units

    mapping(address => uint256) public collateral;
    mapping(address => uint256) public debt;

    constructor(MockERC20 _collateral, MockERC20 _debt) {
        collateralToken = _collateral;
        debtToken = _debt;
    }

    function setPrice(uint256 _price) external {
        price = _price; // stands in for an oracle update
    }

    function deposit(uint256 amount) external {
        collateralToken.transferFrom(msg.sender, address(this), amount);
        collateral[msg.sender] += amount;
    }

    function borrow(uint256 amount) external {
        require(collateral[msg.sender] * price >= debt[msg.sender] + amount, "undercollateralized");
        debt[msg.sender] += amount;
        debtToken.transfer(msg.sender, amount);
    }

    function liquidate(address user) external {
        // BUG: no health check — a healthy position can be liquidated.
        uint256 d = debt[user];
        debtToken.transferFrom(msg.sender, address(this), d); // liquidator repays the debt
        uint256 c = collateral[user];
        collateral[user] = 0;
        debt[user] = 0;
        collateralToken.transfer(msg.sender, c); // ...and seizes ALL the collateral
    }
}
