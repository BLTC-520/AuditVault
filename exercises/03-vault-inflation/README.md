---
tags:
  - exercise
  - trigger/first-deposit
  - sector/vault
  - difficulty/intermediate
generated: true
---
# 03. Vault Share Inflation (First-Deposit Attack)

> **Difficulty:** intermediate · **Bug class:** `trigger/first-deposit` · **Source finding:** [[47446-price-inflation-attack-ottersec-none-blend-capital-pdf]]

An ERC4626-style vault mints the first deposit 1:1 and derives shares from its live token balance. An attacker seeds 1 wei, donates tokens to inflate the share price, and makes the next depositor's shares round down to zero.

**Web2 analog:** A rounding / order-of-operations flaw combined with trusting externally-mutable state — like a TOCTOU race where the 'price' you read can be changed between observation and use.

## How to play
1. Read the vulnerable contract: `src/InflatableVault.sol` (context: `shared/MockERC20.sol`)
2. **Identify** — answer: *Which combination enables the inflation attack?*
3. **Exploit** — complete `test/Exploit.t.sol`, then run:
   ```bash
   forge test --match-path '03-vault-inflation/test/*' -vvv
   ```
4. **Fix** — patch `src/InflatableVault.sol` so the exploit no longer works while normal use still passes. Graded by re-running the solution exploit (must now fail) and `solution/Functionality.t.sol` (must still pass). Mitigation family: `fix/add-check`.

## Hints

<details>
<summary>Hint 1</summary>

What does the share math do on the very first deposit, when totalShares == 0?
</details>

<details>
<summary>Hint 2</summary>

totalAssets() reads the vault's raw token balance — what happens if you transfer tokens to it directly, without depositing?
</details>

<details>
<summary>Hint 3</summary>

Seed 1 wei (1 share), donate a large amount to inflate totalAssets(), then the victim's deposit rounds down to 0 shares.
</details>

<details>
<summary>Hint 4</summary>

A common fix: mint 'dead' shares on the first deposit, or use a virtual shares/assets offset so the price can't be trivially inflated.
</details>

## Learn more
- Real-world finding: [[47446-price-inflation-attack-ottersec-none-blend-capital-pdf]]
- Sector checklist: [[vault-checklist]]
- Reference solution (spoiler): `solution/Solution.t.sol`
