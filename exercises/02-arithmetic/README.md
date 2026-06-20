---
tags:
  - exercise
  - vuln/arithmetic/underflow
  - sector/infra
  - difficulty/beginner
generated: true
---
# 02. Unchecked Underflow

> **Difficulty:** beginner · **Bug class:** `vuln/arithmetic/underflow` · **Source finding:** [[27047-h-01-underflow-in-updatetranscoderwithfees-can-cause-corrupt]]

Solidity 0.8 reverts on overflow by default — but this ledger opts out with `unchecked` in the wrong place and skips the balance check, so a sender wraps a zero balance into a huge one.

**Web2 analog:** Classic integer overflow/underflow (CWE-191): trusting arithmetic that silently wraps instead of validating bounds first.

## How to play
1. Read the vulnerable contract: `src/Ledger.sol`
2. **Identify** — answer: *Why can an attacker with a zero balance steal the pool?*
3. **Exploit** — complete `test/Exploit.t.sol`, then run:
   ```bash
   forge test --match-path '02-arithmetic/test/*' -vvv
   ```
4. **Fix** — patch `src/Ledger.sol` so the exploit no longer works while normal use still passes. Graded by re-running the solution exploit (must now fail) and `solution/Functionality.t.sol` (must still pass). Mitigation family: `fix/add-check`.

## Hints

<details>
<summary>Hint 1</summary>

What does `unchecked { x -= y }` do when y is greater than x?
</details>

<details>
<summary>Hint 2</summary>

transfer() never checks that you actually have the tokens you're sending.
</details>

<details>
<summary>Hint 3</summary>

Transfer 1 wei from a zero balance to underflow, then withdraw the real ETH the contract holds.
</details>

## Learn more
- Real-world finding: [[27047-h-01-underflow-in-updatetranscoderwithfees-can-cause-corrupt]]
- Sector checklist: [[infra-checklist]]
- Reference solution (spoiler): `solution/Solution.t.sol`
