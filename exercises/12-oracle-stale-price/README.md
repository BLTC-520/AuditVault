---
tags:
  - exercise
  - vuln/oracle/stale-price
  - sector/lending
  - difficulty/intermediate
generated: true
---
# 12. Stale Oracle Price

> **Difficulty:** intermediate · **Bug class:** `vuln/oracle/stale-price` · **Source finding:** [[63737-h-01-zero-heartbeat-can-cause-reward-claim-failures-pashov-a]]

A lending desk values collateral with a price feed but never checks how old the price is. When the feed stalls, the protocol keeps lending against a frozen, no-longer-accurate price.

**Web2 analog:** Trusting cached data past its TTL — serving a stale value because nothing checks the timestamp / freshness before using it.

## How to play
1. Read the vulnerable contract: `src/StaleLending.sol` (context: `src/PriceFeed.sol`, `shared/MockERC20.sol`)
2. **Identify** — answer: *What is missing from borrow()?*
3. **Exploit** — complete `test/Exploit.t.sol`, then run:
   ```bash
   forge test --match-path '12-oracle-stale-price/test/*' -vvv
   ```
4. **Fix** — patch `src/StaleLending.sol` so the exploit no longer works while normal use still passes. Graded by re-running the solution exploit (must now fail) and `solution/Functionality.t.sol` (must still pass). Mitigation family: `add-check`.

## Hints

<details>
<summary>Hint 1</summary>

borrow() destructures (price, updatedAt) from the feed but only uses one of them.
</details>

<details>
<summary>Hint 2</summary>

How old is the price by the time the attacker borrows? Is anything checking that?
</details>

<details>
<summary>Hint 3</summary>

Just call borrow() — the contract happily uses the 7-day-old price.
</details>

<details>
<summary>Hint 4</summary>

The fix requires block.timestamp - updatedAt to be within a maximum age (heartbeat) before trusting the price.
</details>

## Learn more
- Real-world finding: [[63737-h-01-zero-heartbeat-can-cause-reward-claim-failures-pashov-a]]
- Sector checklist: [[lending-checklist]]
- Reference solution (spoiler): `solution/Solution.t.sol`
