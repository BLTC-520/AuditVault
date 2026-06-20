// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {MockERC20} from "../../shared/MockERC20.sol";

/// @notice Rewards holders proportionally to how many `token`s they hold.
/// @dev BUG: it snapshots holdings via a live `balanceOf` (spot), so a caller
///      can flash-borrow a huge balance, claim, and repay — all in one tx.
contract Airdrop {
    MockERC20 public token;
    MockERC20 public reward;
    mapping(address => bool) public claimed;

    constructor(MockERC20 _token, MockERC20 _reward) {
        token = _token;
        reward = _reward;
    }

    function claim() external {
        require(!claimed[msg.sender], "already claimed");
        claimed[msg.sender] = true;
        reward.mint(msg.sender, token.balanceOf(msg.sender)); // spot-balance snapshot
    }
}
