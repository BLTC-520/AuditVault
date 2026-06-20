// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {MockERC20} from "../../shared/MockERC20.sol";

/// @notice Distributes rewards to stakers pro-rata via an accumulator.
/// @dev BUG: claim() pays `staked * accRewardPerShare` with NO per-user reward
///      debt. A user who stakes *after* rewards have accrued can immediately
///      claim as if they had been staked the whole time — stealing earlier
///      stakers' rewards.
contract StakingRewards {
    MockERC20 public stakeToken;
    MockERC20 public rewardToken;
    uint256 public accRewardPerShare; // scaled 1e18
    uint256 public totalStaked;
    mapping(address => uint256) public staked;

    constructor(MockERC20 _stakeToken, MockERC20 _rewardToken) {
        stakeToken = _stakeToken;
        rewardToken = _rewardToken;
    }

    function addRewards(uint256 amount) external {
        require(totalStaked > 0, "no stakers");
        accRewardPerShare += amount * 1e18 / totalStaked;
        rewardToken.mint(address(this), amount);
    }

    function stake(uint256 amount) external {
        stakeToken.transferFrom(msg.sender, address(this), amount);
        staked[msg.sender] += amount;
        totalStaked += amount;
    }

    function claim() external returns (uint256 reward) {
        reward = staked[msg.sender] * accRewardPerShare / 1e18; // no reward debt subtracted
        rewardToken.transfer(msg.sender, reward);
    }
}
