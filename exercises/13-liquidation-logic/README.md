---
tags:
  - exercise
  - vuln/logic/liquidation-logic
  - sector/lending
  - difficulty/advanced
generated: true
---
# 13. Liquidating a Healthy Position

> **Difficulty:** advanced · **Bug class:** `vuln/logic/liquidation-logic` · **Source finding:** [[15976-h-03-interest-rates-are-incorrect-on-liquidation-code4rena-p]]

A lending market lets a liquidator repay a borrower's debt and seize their collateral — but liquidate() never checks that the position is actually underwater. Any healthy, over-collateralised position can be liquidated and drained.

**Web2 analog:** A state-changing action whose precondition is never enforced — like a 'cancel order' endpoint that doesn't verify the order is actually cancellable.

## How to play
1. Read the vulnerable contract: `src/Lending.sol` (context: `shared/MockERC20.sol`)
2. **Identify** — answer: *Why can a healthy position be liquidated?*
3. **Exploit** — complete `test/Exploit.t.sol`, then run:
   ```bash
   forge test --match-path '13-liquidation-logic/test/*' -vvv
   ```
4. **Fix** — patch `src/Lending.sol` so the exploit no longer works while normal use still passes. Graded by re-running the solution exploit (must now fail) and `solution/Functionality.t.sol` (must still pass). Mitigation family: `add-check`.

## Hints

<details>
<summary>Hint 1</summary>

What precondition should a liquidation require? Find where liquidate() checks it.
</details>

<details>
<summary>Hint 2</summary>

liquidate() seizes collateral regardless of whether the borrower is actually underwater.
</details>

<details>
<summary>Hint 3</summary>

Just call liquidate(victim) — the healthy position is seized anyway.
</details>

<details>
<summary>Hint 4</summary>

The fix requires the position to be underwater (collateral * price < debt) before allowing liquidation.
</details>

## Learn more
- Real-world finding: [[15976-h-03-interest-rates-are-incorrect-on-liquidation-code4rena-p]]
- Sector checklist: [[lending-checklist]]
- Reference solution (spoiler): `solution/Solution.t.sol`
