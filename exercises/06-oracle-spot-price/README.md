---
tags:
  - exercise
  - vuln/oracle/spot-price
  - sector/lending
  - difficulty/advanced
generated: true
---
# 06. Spot-Price Oracle Manipulation

> **Difficulty:** advanced · **Bug class:** `vuln/oracle/spot-price` · **Source finding:** [[55274-h-01-domain-pricing-relies-on-pool-price-which-can-be-manipu]]

A lending desk values collateral using a constant-product AMM's SPOT price. An attacker swaps to pump the price, then borrows far more than the collateral is really worth — draining the desk.

**Web2 analog:** Trusting an attacker-controllable data source as ground truth — like using a client-supplied value for a security decision instead of a trusted server-side source.

## How to play
1. Read the vulnerable contract: `src/LendingDesk.sol` (context: `src/MiniAMM.sol`, `shared/MockERC20.sol`)
2. **Identify** — answer: *Why can the lending desk be drained?*
3. **Exploit** — complete `test/Exploit.t.sol`, then run:
   ```bash
   forge test --match-path '06-oracle-spot-price/test/*' -vvv
   ```
4. **Fix** *(discussion)* — this bug's real fix is architectural, so it is not auto-graded. Recommended fix:

   > Never price assets off a manipulable spot price. Use a manipulation-resistant oracle: a time-weighted average price (TWAP) over many blocks, or an external oracle (e.g. Chainlink) with freshness and deviation checks. Spot reserves can be moved within a single transaction (often with a flash loan), so any single-block price is untrustworthy for valuation.

   See `fix/use-twap` in the taxonomy.

## Hints

<details>
<summary>Hint 1</summary>

How does LendingDesk decide how much tokenB your collateral is worth?
</details>

<details>
<summary>Hint 2</summary>

priceAinB() = reserveB / reserveA. What happens to that ratio right after a big swap?
</details>

<details>
<summary>Hint 3</summary>

Swap to pump A's price, then borrow against a small amount of A at the inflated valuation.
</details>

## Learn more
- Real-world finding: [[55274-h-01-domain-pricing-relies-on-pool-price-which-can-be-manipu]]
- Sector checklist: [[lending-checklist]]
- Reference solution (spoiler): `solution/Solution.t.sol`
