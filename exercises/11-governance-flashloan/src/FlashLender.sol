// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {MockERC20} from "../../shared/MockERC20.sol";

interface IFlashBorrower {
    function onFlashLoan(uint256 amount) external;
}

/// @notice A zero-fee flash lender for the governance token.
contract FlashLender {
    MockERC20 public token;

    constructor(MockERC20 _token) {
        token = _token;
    }

    function flashLoan(uint256 amount) external {
        uint256 balBefore = token.balanceOf(address(this));
        token.transfer(msg.sender, amount);
        IFlashBorrower(msg.sender).onFlashLoan(amount);
        require(token.balanceOf(address(this)) >= balBefore, "loan not repaid");
    }
}
