---
tags:
  - exercise
generated: true
---
# AuditVault CTF Exercises

Hands-on Foundry exercises. For each one you **identify** the bug, **exploit** it, then **fix** it — every exercise is anchored to a real finding in the vault.

## Setup
```bash
cd exercises
forge install foundry-rs/forge-std   # first time only
forge build
```

Run one exercise's exploit:
```bash
forge test --match-path '03-vault-inflation/test/*' -vvv
```

Prefer a guided UI? See `web/` for the local learning website.

## Curriculum

| # | Exercise | Difficulty | Bug class |
| ---: | --- | --- | --- |
| 01 | [[01-access-control/README\|Unprotected Privileged Function]] | beginner | `vuln/access-control/missing-modifier` |
| 02 | [[02-arithmetic/README\|Unchecked Underflow]] | beginner | `vuln/arithmetic/underflow` |
| 03 | [[03-vault-inflation/README\|Vault Share Inflation (First-Deposit Attack)]] | intermediate | `trigger/first-deposit` |
| 04 | [[04-reentrancy/README\|Single-Function Reentrancy]] | intermediate | `vuln/reentrancy/single-function` |
| 05 | [[05-cross-function-reentrancy/README\|Cross-Function Reentrancy]] | intermediate | `vuln/reentrancy/cross-function` |
| 06 | [[06-oracle-spot-price/README\|Spot-Price Oracle Manipulation]] | advanced | `vuln/oracle/spot-price` |
| 07 | [[07-flashloan/README\|Flash-Loan Balance Snapshot]] | advanced | `trigger/flash-loan` |
| 08 | [[08-fee-accounting/README\|Reward Accounting: Missing Reward Debt]] | advanced | `vuln/logic/reward-calculation` |
| 09 | [[09-dos-push-payment/README\|Push-Payment Denial of Service]] | intermediate | `vuln/dos/unbounded-loop` |
| 10 | [[10-bridge-replay/README\|Signature Replay]] | advanced | `vuln/bridge/replay` |
| 11 | [[11-governance-flashloan/README\|Flash-Loaned Governance Vote]] | advanced | `trigger/governance-vote` |
| 12 | [[12-oracle-stale-price/README\|Stale Oracle Price]] | intermediate | `vuln/oracle/stale-price` |
| 13 | [[13-liquidation-logic/README\|Liquidating a Healthy Position]] | advanced | `vuln/logic/liquidation-logic` |
