---
tags:
  - exercise
  - vuln/reentrancy/single-function
  - sector/infra
  - difficulty/intermediate
generated: true
---
# 04. Single-Function Reentrancy

> **Difficulty:** intermediate · **Bug class:** `vuln/reentrancy/single-function` · **Source finding:** [[18412-malicious-pair-can-re-enter-veryfastrouter-to-drain-original]]

An ETH bank sends funds with a low-level call before it zeroes the caller's balance. A malicious recipient re-enters withdraw() from its receive() and drains the bank.

**Web2 analog:** A TOCTOU / double-spend race: state is read and acted on before it is updated, so a re-entrant caller acts on stale state.

## How to play
1. Read the vulnerable contract: `src/EtherBank.sol`
2. **Identify** — answer: *What makes withdraw() reentrant?*
3. **Exploit** — complete `test/Exploit.t.sol`, then run:
   ```bash
   forge test --match-path '04-reentrancy/test/*' -vvv
   ```
4. **Fix** — patch `src/EtherBank.sol` so the exploit no longer works while normal use still passes. Graded by re-running the solution exploit (must now fail) and `solution/Functionality.t.sol` (must still pass). Mitigation family: `fix/use-reentrancy-guard`.

## Hints

<details>
<summary>Hint 1</summary>

Look at the ORDER of operations in withdraw(): when exactly is the balance set to zero?
</details>

<details>
<summary>Hint 2</summary>

An attacker contract's receive() runs DURING the external call — what is the balance at that moment?
</details>

<details>
<summary>Hint 3</summary>

From receive(), call bank.withdraw() again while the bank still holds funds.
</details>

<details>
<summary>Hint 4</summary>

The fix is checks-effects-interactions (zero the balance before the call) or a nonReentrant guard.
</details>

## Learn more
- Real-world finding: [[18412-malicious-pair-can-re-enter-veryfastrouter-to-drain-original]]
- Sector checklist: [[infra-checklist]]
- Reference solution (spoiler): `solution/Solution.t.sol`
