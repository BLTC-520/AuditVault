// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {MockERC20} from "../../shared/MockERC20.sol";

/// @notice Token-weighted governance over a prize treasury.
/// @dev BUG: vote() counts the caller's CURRENT token balance as voting power.
///      An attacker can flash-borrow a huge balance, vote to pass a malicious
///      proposal, execute it, and repay the loan — all in one transaction.
contract Governance {
    MockERC20 public govToken;
    MockERC20 public prize;
    uint256 public constant QUORUM = 1_000_000e18;

    struct Proposal {
        address recipient;
        uint256 amount;
        uint256 votes;
        bool executed;
    }

    Proposal[] public proposals;

    constructor(MockERC20 _govToken, MockERC20 _prize) {
        govToken = _govToken;
        prize = _prize;
    }

    function propose(address recipient, uint256 amount) external returns (uint256 id) {
        proposals.push(Proposal({recipient: recipient, amount: amount, votes: 0, executed: false}));
        return proposals.length - 1;
    }

    function vote(uint256 id) external {
        proposals[id].votes += govToken.balanceOf(msg.sender); // spot balance == voting power
    }

    function execute(uint256 id) external {
        Proposal storage p = proposals[id];
        require(!p.executed, "already executed");
        require(p.votes >= QUORUM, "quorum not reached");
        p.executed = true;
        prize.transfer(p.recipient, p.amount);
    }
}
