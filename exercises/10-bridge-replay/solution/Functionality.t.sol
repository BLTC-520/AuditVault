// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Test} from "forge-std/Test.sol";
import {MockERC20} from "../../shared/MockERC20.sol";
import {SignedVault} from "../src/SignedVault.sol";

/// Legitimate behaviour any valid fix must preserve: a single authorized
/// withdrawal still succeeds.
contract BridgeReplayFunctionality is Test {
    MockERC20 token;
    SignedVault vault;
    address alice = makeAddr("alice");
    uint256 constant SIGNER_PK = 0xA11CE;
    uint256 constant AMOUNT = 100e18;

    function setUp() public {
        token = new MockERC20("Bridged", "BRG");
        vault = new SignedVault(token, vm.addr(SIGNER_PK));
        token.mint(address(vault), 1_000e18);
    }

    function test_authorizedWithdrawalWorks() public {
        bytes32 hash = keccak256(abi.encodePacked(alice, AMOUNT));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(SIGNER_PK, hash);
        vault.withdraw(alice, AMOUNT, v, r, s);
        assertEq(token.balanceOf(alice), AMOUNT, "a single valid authorization must still pay out");
    }
}
