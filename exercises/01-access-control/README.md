---
tags:
  - exercise
  - vuln/access-control/missing-modifier
  - sector/infra
  - difficulty/beginner
generated: true
---
# 01. Unprotected Privileged Function

> **Difficulty:** beginner · **Bug class:** `vuln/access-control/missing-modifier` · **Source finding:** [[38189-lack-of-access-control-in-poke-function-allows-in-unlimited]]

A treasury guards withdrawAll() with an owner check, but leaves the setOwner() setter wide open. One unprotected privileged function undermines every other guard.

**Web2 analog:** A broken access-control check (IDOR / missing authorization): an endpoint that lets any caller perform an admin-only action.

## How to play
1. Read the vulnerable contract: `src/Treasury.sol`
2. **Identify** — answer: *Which function lets anyone take control of the treasury?*
3. **Exploit** — complete `test/Exploit.t.sol`, then run:
   ```bash
   forge test --match-path '01-access-control/test/*' -vvv
   ```
4. **Fix** — patch `src/Treasury.sol` so the exploit no longer works while normal use still passes. Graded by re-running the solution exploit (must now fail) and `solution/Functionality.t.sol` (must still pass). Mitigation family: `fix/add-access-control`.

## Hints

<details>
<summary>Hint 1</summary>

withdrawAll() correctly requires you to be the owner — so how could an attacker satisfy that check?
</details>

<details>
<summary>Hint 2</summary>

Look at every state-changing function, not just the withdraw path. Which one changes who the owner is?
</details>

<details>
<summary>Hint 3</summary>

setOwner() has no msg.sender check at all. Call it first, then withdraw.
</details>

## Learn more
- Real-world finding: [[38189-lack-of-access-control-in-poke-function-allows-in-unlimited]]
- Sector checklist: [[infra-checklist]]
- Reference solution (spoiler): `solution/Solution.t.sol`
