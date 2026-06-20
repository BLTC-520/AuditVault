---
tags:
  - exercise
  - trigger/flash-loan
  - sector/lending
  - difficulty/advanced
generated: true
---
# 07. Flash-Loan Balance Snapshot

> **Difficulty:** advanced · **Bug class:** `trigger/flash-loan` · **Source finding:** [[31886-h-1-pool-can-be-drained-sherlock-woofi-swap-git]]

An airdrop rewards holders proportionally to their LIVE token balance. An attacker flash-borrows a fortune for one transaction, claims rewards against the borrowed balance, and repays — all atomically, for free.

**Web2 analog:** Trusting an instantaneous, attacker-inflatable metric (a spot snapshot) for a privileged decision, instead of a value the attacker cannot transiently manufacture.

## How to play
1. Read the vulnerable contract: `src/Airdrop.sol` (context: `src/FlashLender.sol`, `shared/MockERC20.sol`)
2. **Identify** — answer: *Why can the airdrop rewards be farmed for free?*
3. **Exploit** — complete `test/Exploit.t.sol`, then run:
   ```bash
   forge test --match-path '07-flashloan/test/*' -vvv
   ```
4. **Fix** *(discussion)* — this bug's real fix is architectural, so it is not auto-graded. Recommended fix:

   > Never base entitlements on a live, transiently-inflatable balance. Use a checkpointed balance captured at a fixed snapshot block (e.g. ERC20Votes/ERC20Snapshot), or accrue rewards over time held rather than instantaneous holdings. A flash loan can give any address an arbitrary balance for one transaction, so spot balanceOf must never gate value.

   See `fix/add-snapshot` in the taxonomy.

## Hints

<details>
<summary>Hint 1</summary>

What balance does claim() use to size the reward — and when is it measured?
</details>

<details>
<summary>Hint 2</summary>

A flash loan gives you a massive balance for exactly one transaction. What can you do while holding it?
</details>

<details>
<summary>Hint 3</summary>

Inside onFlashLoan(), call airdrop.claim() before repaying the loan.
</details>

## Learn more
- Real-world finding: [[31886-h-1-pool-can-be-drained-sherlock-woofi-swap-git]]
- Sector checklist: [[lending-checklist]]
- Reference solution (spoiler): `solution/Solution.t.sol`
