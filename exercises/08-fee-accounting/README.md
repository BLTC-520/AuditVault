---
tags:
  - exercise
  - vuln/logic/reward-calculation
  - sector/staking
  - difficulty/advanced
generated: true
---
# 08. Reward Accounting: Missing Reward Debt

> **Difficulty:** advanced · **Bug class:** `vuln/logic/reward-calculation` · **Source finding:** [[19837-h-01-wrong-fee-calculation-after-totalsupply-was-0-code4rena]]

A MasterChef-style staking pool uses an accumulator (accRewardPerShare) but forgets per-user reward debt. A user who stakes AFTER rewards accrue can immediately claim as if they had been staked the whole time — stealing earlier stakers' rewards.

**Web2 analog:** An accounting invariant that isn't enforced per-account: crediting a user for activity that happened before they existed, because the baseline (their starting offset) was never recorded.

## How to play
1. Read the vulnerable contract: `src/StakingRewards.sol` (context: `shared/MockERC20.sol`)
2. **Identify** — answer: *Why can a late staker steal earlier stakers' rewards?*
3. **Exploit** — complete `test/Exploit.t.sol`, then run:
   ```bash
   forge test --match-path '08-fee-accounting/test/*' -vvv
   ```
4. **Fix** — patch `src/StakingRewards.sol` so the exploit no longer works while normal use still passes. Graded by re-running the solution exploit (must now fail) and `solution/Functionality.t.sol` (must still pass). Mitigation family: `fix/redesign-logic`.

## Hints

<details>
<summary>Hint 1</summary>

What is accRewardPerShare already equal to by the time the attacker stakes?
</details>

<details>
<summary>Hint 2</summary>

claim() multiplies your stake by the GLOBAL accumulator — it never asks when you joined.
</details>

<details>
<summary>Hint 3</summary>

Stake the same amount as the victim AFTER addRewards() runs, then claim immediately.
</details>

<details>
<summary>Hint 4</summary>

The MasterChef fix: store rewardDebt = staked * accRewardPerShare at stake time, and pay (staked * accRewardPerShare) - rewardDebt.
</details>

## Learn more
- Real-world finding: [[19837-h-01-wrong-fee-calculation-after-totalsupply-was-0-code4rena]]
- Sector checklist: [[staking-checklist]]
- Reference solution (spoiler): `solution/Solution.t.sol`
