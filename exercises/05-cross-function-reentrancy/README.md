---
tags:
  - exercise
  - vuln/reentrancy/cross-function
  - sector/infra
  - difficulty/intermediate
generated: true
---
# 05. Cross-Function Reentrancy

> **Difficulty:** intermediate · **Bug class:** `vuln/reentrancy/cross-function` · **Source finding:** [[18201-reentrancy-and-untrusted-contract-call-in-mintmultiple-diffi]]

A bank guards withdraw() with a reentrancy lock — but leaves transfer() unguarded. During withdraw()'s external call you cannot re-enter withdraw, but you CAN call transfer() to move your not-yet-zeroed balance to an accomplice.

**Web2 analog:** Inconsistent locking: one critical section is synchronized but a sibling that touches the same state is not — a partial mutex that a determined caller routes around.

## How to play
1. Read the vulnerable contract: `src/VaultBank.sol`
2. **Identify** — answer: *Why does the reentrancy guard fail to stop the attack?*
3. **Exploit** — complete `test/Exploit.t.sol`, then run:
   ```bash
   forge test --match-path '05-cross-function-reentrancy/test/*' -vvv
   ```
4. **Fix** — patch `src/VaultBank.sol` so the exploit no longer works while normal use still passes. Graded by re-running the solution exploit (must now fail) and `solution/Functionality.t.sol` (must still pass). Mitigation family: `fix/use-reentrancy-guard`.

## Hints

<details>
<summary>Hint 1</summary>

withdraw() IS guarded — so re-entering withdraw() directly will revert. What else touches balanceOf?
</details>

<details>
<summary>Hint 2</summary>

During the callback your balance hasn't been zeroed yet. Is there an unguarded function that lets you move it?
</details>

<details>
<summary>Hint 3</summary>

From receive(), call transfer() to push your balance to a helper contract, then withdraw it from there.
</details>

<details>
<summary>Hint 4</summary>

The fix: apply the reentrancy guard to transfer() too, or follow checks-effects-interactions in withdraw().
</details>

## Learn more
- Real-world finding: [[18201-reentrancy-and-untrusted-contract-call-in-mintmultiple-diffi]]
- Sector checklist: [[infra-checklist]]
- Reference solution (spoiler): `solution/Solution.t.sol`
