---
tags:
  - exercise
  - trigger/governance-vote
  - sector/governance
  - difficulty/advanced
generated: true
---
# 11. Flash-Loaned Governance Vote

> **Difficulty:** advanced · **Bug class:** `trigger/governance-vote` · **Source finding:** [[18200-proposals-could-allow-timelockadmin-takeover-trailofbits-ori]]

Governance counts a voter's CURRENT token balance as voting power. An attacker flash-borrows enough tokens for one transaction, votes a self-serving proposal past quorum, executes it to drain the treasury, and repays the loan — all atomically.

**Web2 analog:** Granting authority based on an instantaneous, attacker-inflatable metric rather than a committed/snapshotted state — the governance analogue of trusting a spot balance.

## How to play
1. Read the vulnerable contract: `src/Governance.sol` (context: `src/FlashLender.sol`, `shared/MockERC20.sol`)
2. **Identify** — answer: *Why can a flash loan capture the vote?*
3. **Exploit** — complete `test/Exploit.t.sol`, then run:
   ```bash
   forge test --match-path '11-governance-flashloan/test/*' -vvv
   ```
4. **Fix** *(discussion)* — this bug's real fix is architectural, so it is not auto-graded. Recommended fix:

   > Never derive voting power from a live balance. Snapshot balances at proposal creation (e.g. ERC20Votes / ERC20Snapshot checkpoints) so only tokens held before the proposal existed can vote, and/or require tokens to be locked for the voting period. A flash loan can mint transient balance for one transaction, so spot balanceOf must never gate governance.

   See `add-snapshot` in the taxonomy.

## Hints

<details>
<summary>Hint 1</summary>

What determines voting power in vote(), and when is it measured?
</details>

<details>
<summary>Hint 2</summary>

A flash loan lets you hold a huge balance for exactly one transaction — long enough to vote and execute.
</details>

<details>
<summary>Hint 3</summary>

Inside onFlashLoan(): vote(proposalId), then execute(proposalId), before repaying.
</details>

<details>
<summary>Hint 4</summary>

The fix snapshots voting power at proposal-creation time (checkpointed balances), so a transient flash-loaned balance carries no weight.
</details>

## Learn more
- Real-world finding: [[18200-proposals-could-allow-timelockadmin-takeover-trailofbits-ori]]
- Sector checklist: [[governance-checklist]]
- Reference solution (spoiler): `solution/Solution.t.sol`
