// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Test} from "forge-std/Test.sol";
import {MockERC20} from "../../shared/MockERC20.sol";
import {InflatableVault} from "../src/InflatableVault.sol";

/// Legitimate behaviour that ANY valid fix must preserve:
/// two honest depositors each get back approximately what they put in.
contract VaultFunctionality is Test {
    MockERC20 token;
    InflatableVault vault;
    address alice = makeAddr("alice");
    address bob = makeAddr("bob");
    uint256 constant DEPOSIT = 1_000e18;

    function setUp() public {
        token = new MockERC20("Asset", "AST");
        vault = new InflatableVault(token);
        token.mint(alice, DEPOSIT);
        token.mint(bob, DEPOSIT);
    }

    function test_honestDepositorsGetFairValue() public {
        vm.startPrank(alice);
        token.approve(address(vault), type(uint256).max);
        vault.deposit(DEPOSIT);
        vm.stopPrank();

        vm.startPrank(bob);
        token.approve(address(vault), type(uint256).max);
        vault.deposit(DEPOSIT);
        vm.stopPrank();

        // Each redeems their shares and should recover ~their deposit (allow 1%).
        // NOTE: read shares into a local BEFORE vm.prank — a nested call in the
        // argument would otherwise consume the prank (Foundry single-call gotcha).
        uint256 aliceShares = vault.shares(alice);
        vm.prank(alice);
        vault.redeem(aliceShares);

        uint256 bobShares = vault.shares(bob);
        vm.prank(bob);
        vault.redeem(bobShares);

        assertApproxEqRel(token.balanceOf(alice), DEPOSIT, 0.01e18, "alice recovers ~her deposit");
        assertApproxEqRel(token.balanceOf(bob), DEPOSIT, 0.01e18, "bob recovers ~his deposit");
    }
}
