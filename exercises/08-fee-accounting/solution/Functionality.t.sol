// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Test} from "forge-std/Test.sol";
import {MockERC20} from "../../shared/MockERC20.sol";
import {StakingRewards} from "../src/StakingRewards.sol";

/// Legitimate behaviour that ANY valid fix must preserve:
/// a staker who is staked BEFORE rewards accrue still earns those rewards.
/// (Keep the stake / addRewards / claim signatures intact for this to compile.)
contract FeeAccountingFunctionality is Test {
    MockERC20 stakeToken;
    MockERC20 rewardToken;
    StakingRewards staking;
    address alice = makeAddr("alice");
    uint256 constant STAKE = 1_000e18;
    uint256 constant REWARDS = 1_000e18;

    function setUp() public {
        stakeToken = new MockERC20("Stake", "STK");
        rewardToken = new MockERC20("Reward", "RWD");
        staking = new StakingRewards(stakeToken, rewardToken);
        stakeToken.mint(alice, STAKE);
    }

    function test_earlyStakerEarnsRewards() public {
        vm.startPrank(alice);
        stakeToken.approve(address(staking), type(uint256).max);
        staking.stake(STAKE);     // staked BEFORE rewards
        vm.stopPrank();

        staking.addRewards(REWARDS);

        vm.prank(alice);
        staking.claim();

        assertApproxEqRel(rewardToken.balanceOf(alice), REWARDS, 0.01e18, "early staker earns ~all the rewards");
    }
}
