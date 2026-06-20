# AuditVault CTF — Local Learning Website

A local web app that turns the `exercises/` Foundry challenges into a guided
**Identify → Exploit → Fix** workflow, graded by running the real `forge` test suite.

```
┌─ pick an exercise ─┐   1. Identify  multiple-choice: spot the vulnerable line
│  8 bug classes,    │   2. Exploit   write the exploit; it must drain the target
│  ranked by         │   3. Fix       patch the contract; the exploit must now fail
│  difficulty        │                while normal use still passes
└────────────────────┘
```

## Requirements

- [Foundry](https://book.getfoundry.sh/) (`forge` on your `PATH`)
- Node.js ≥ 18 (uses only built-in modules — **no `npm install` needed**)

First time only, install forge-std for the exercises project:

```bash
cd ..            # the exercises/ directory
forge install foundry-rs/forge-std
forge build
```

## Run

```bash
cd exercises/web
npm start
# → AuditVault CTF running at http://127.0.0.1:4626
```

Open <http://127.0.0.1:4626>. Set a different port with `PORT=5000 npm start`.

## Test

```bash
npm test                                   # node:test, zero deps
node --test --experimental-test-coverage   # with coverage
```

The forge integration tests are slow (they compile + run real Solidity).

## How grading works

| Stage | Pass condition |
| --- | --- |
| **Identify** | answer index matches the manifest (checked server-side; the answer is never sent to the browser) |
| **Exploit** | your code is written into a sandbox copy of the exercise's test, and `forge test` passes |
| **Fix** | your patched contract **compiles**, the `Functionality.t.sol` check still **passes**, and the reference exploit now **fails** |

Two advanced exercises (oracle spot-price, flash-loan) have an **explain-mode**
fix: the real remedy is architectural (TWAP, balance snapshots), so the app shows
the recommended fix instead of auto-grading it.

## Architecture

```
web/
  server.js          node:http entry (loopback only); /api/* → API, else static
  src/
    config.js        paths + limits (code size cap, forge timeout, port)
    validate.js      trust-boundary input validation (ids, stage, code, answer)
    manifest.js      loads exercises/NN/manifest.json (answer stripped for clients)
    forgeRunner.js   sandboxed forge execution (temp dir, timeout, never mutates source)
    api.js           JSON API: list / detail / run
    static.js        static file serving with a path-traversal guard
  public/            vanilla SPA (index.html, app.js, style.css)
  test/              node:test suites
```

Per-exercise content lives in `exercises/NN-*/manifest.json` (the single source of
truth for the quiz, hints, and stage config).

## Security note

This tool **compiles and runs user-supplied Solidity** via `solc` and forge's
in-process EVM. The EVM has no host access, but `forge`/`solc` run as your user.
It binds to `127.0.0.1` only and is intended strictly as a **single-user local
dev tool** — do not expose it on a network or run untrusted submissions on a
shared machine.
