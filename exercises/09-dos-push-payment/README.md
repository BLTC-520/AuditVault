---
tags:
  - exercise
  - vuln/dos/unbounded-loop
  - sector/infra
  - difficulty/intermediate
generated: true
---
# 09. Push-Payment Denial of Service

> **Difficulty:** intermediate · **Bug class:** `vuln/dos/unbounded-loop` · **Source finding:** [[18211-external-calls-in-loop-can-lead-to-denial-of-service-trailof]]

A distributor pushes ETH to every registered participant in a loop and requires each send to succeed. A single participant whose receive() reverts makes the whole loop revert, so nobody can be paid and the funds are frozen.

**Web2 analog:** A batch job that aborts the entire run on the first failed item — one poisoned record blocks processing for everyone (no isolation / no dead-letter handling).

## How to play
1. Read the vulnerable contract: `src/Distributor.sol`
2. **Identify** — answer: *Why can one participant freeze everyone's funds?*
3. **Exploit** — complete `test/Exploit.t.sol`, then run:
   ```bash
   forge test --match-path '09-dos-push-payment/test/*' -vvv
   ```
4. **Fix** — patch `src/Distributor.sol` so the exploit no longer works while normal use still passes. Graded by re-running the solution exploit (must now fail) and `solution/Functionality.t.sol` (must still pass). Mitigation family: `redesign-logic`.

## Hints

<details>
<summary>Hint 1</summary>

distribute() sends to every participant in one transaction and insists each send succeeds.
</details>

<details>
<summary>Hint 2</summary>

What happens to the whole loop if just one recipient's receive() reverts?
</details>

<details>
<summary>Hint 3</summary>

Register a contract whose receive() reverts, then distribute() can never complete.
</details>

<details>
<summary>Hint 4</summary>

The robust fix is the pull-payment pattern (let each user withdraw their own share); a minimal fix stops one failed send from reverting the others.
</details>

## Learn more
- Real-world finding: [[18211-external-calls-in-loop-can-lead-to-denial-of-service-trailof]]
- Sector checklist: [[infra-checklist]]
- Reference solution (spoiler): `solution/Solution.t.sol`
