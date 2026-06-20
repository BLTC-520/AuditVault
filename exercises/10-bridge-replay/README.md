---
tags:
  - exercise
  - vuln/bridge/replay
  - sector/bridge
  - difficulty/advanced
generated: true
---
# 10. Signature Replay

> **Difficulty:** advanced · **Bug class:** `vuln/bridge/replay` · **Source finding:** [[16739-replay-attack-and-revocation-inversion-on-confidentialapprov]]

A vault releases tokens against a message signed by a trusted signer. The signed message is just (recipient, amount) with no nonce and no record of spent authorizations, so the same signature can be submitted again and again.

**Web2 analog:** A replay attack on an auth token / signed request that lacks a nonce or single-use guarantee — capture once, resubmit forever.

## How to play
1. Read the vulnerable contract: `src/SignedVault.sol` (context: `shared/MockERC20.sol`)
2. **Identify** — answer: *Why can one authorization drain more than its amount?*
3. **Exploit** — complete `test/Exploit.t.sol`, then run:
   ```bash
   forge test --match-path '10-bridge-replay/test/*' -vvv
   ```
4. **Fix** — patch `src/SignedVault.sol` so the exploit no longer works while normal use still passes. Graded by re-running the solution exploit (must now fail) and `solution/Functionality.t.sol` (must still pass). Mitigation family: `add-nonce`.

## Hints

<details>
<summary>Hint 1</summary>

You hold exactly one valid signature. What stops you from using it twice?
</details>

<details>
<summary>Hint 2</summary>

Look for any per-signature or per-nonce bookkeeping in withdraw(). There is none.
</details>

<details>
<summary>Hint 3</summary>

Call withdraw() with the same (v, r, s) twice to withdraw 2x.
</details>

<details>
<summary>Hint 4</summary>

The fix records each used message hash (or includes a nonce in the signed message) and rejects re-use.
</details>

## Learn more
- Real-world finding: [[16739-replay-attack-and-revocation-inversion-on-confidentialapprov]]
- Sector checklist: [[bridge-checklist]]
- Reference solution (spoiler): `solution/Solution.t.sol`
