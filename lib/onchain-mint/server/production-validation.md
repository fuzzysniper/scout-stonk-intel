# Backend validation and security review — #111

2026-10-18 UTC. Recovered original work intact at feature checkpoint `9c71d4a`
(pushed before further edits). Feature branch includes latest main/#112
`bea9b7b91d2b8c00a3f89d1bcee80ed89eb4f656`. No work was reconstructed or lost.
Environment: Node 24.19.0, npm 11.9.0, PostgreSQL 17.11, local Chromium. CI separately
uses its existing Node 20 configuration; its eventual run is linked in the PR.

## Completed checks

| Actual command/check | Result |
| --- | --- |
| `npm ci --cache /tmp/scout111-npm-cache` | Exit 0, 351 packages. All pre-existing lockfile package entries unchanged. |
| `SCOUT_TEST_PG_BIN=<local 17/bin> npm test` | Exit 0, **903** tests: 501 app/OG/archive/staging, 84 evidence, 68 mint engine, 126 API/security, 106 Python, 18 scheduler. No failures/skips. |
| Focused API runner | 53 existing route + 19 reference protocol + **44 real PostgreSQL** + **10 real local TLS** cases passed. All provider data synthetic/offline. |
| `bash tests/consumer-homepage/run-onchain.sh` | Exit 0, scoped consumer unit/SSR/transport test file passed. |
| `npx tsc --noEmit` | Exit 0, including a final run after production build; generated next-env changes restored. |
| `npm run lint` | Exit 0, no lint warnings/errors. |
| `npm run build` | Exit 0, actual Next production build including native server route. |
| `bash scripts/archive-tool.sh check origin/main` | Exit 0, append-only/reproduction passed. |
| `npm run archive:dry-run` | Exit 0; disposable local checkout cleaned; no publication/network. |
| Existing Playwright consumer config | **69 passed**, 320/390/1280; actual Next production failure path, SSR/OG/terminal, exact links, keyboard/axe and synthetic-only success/rejection cases. |
| Production client JS inspection | 41 JS files: no SCOUT secret names, production store policy or synthetic test-secret markers. |
| Protected-scope comparison to main | Consumer, consumer UI tests, retained data, collector, scheduler, workflows/Cloudflare and app/api/og unchanged by this branch. |
| `git diff --check` / changed-file secret scan | Passed; no private-key/token patterns, credential files, generated database/TLS material or unintended files staged. |
| `npm audit --omit=dev --json` | **Exit 1**, pre-existing advisories below. Not represented as a clean audit. |

Browser dependencies were installed with their existing isolated lockfile using
`npm ci --prefix experiments/consumer-mvp/web --cache /tmp/scout111-npm-cache`.
The actual invocation used the unchanged
`tests/consumer-homepage/playwright.config.mjs` against the final build. Its cwd
was `/tmp/scout111-browser-qa` with read-only-use symlinks to app/tests/experiments/
.next, a separate screenshot directory and the original baseline-metrics directory
symlink. This preserved #112's screenshots/docs byte-for-byte. A local-only Node
preload blocked non-loopback Fetch and HTTP(S); browser tests also reject unexpected
external traffic. The 45 regenerated PNGs are genuine local browser output, not
authentic provider/iPhone evidence. No frontend/test-definition edits were needed.

## What the real-engine tests establish

- Four independent native pools race one SQL policy row and receive one globally
  precharged lease. Parallel handler initialization creates one pool per isolate.
  PostgreSQL, not a JavaScript reducer, executes actual schema/function commands.
- A real uncommitted admission holds the row lock; other requests time out and
  authorize no source call. ROLLBACK restores quota/fence. Completion/slot updates
  stay invisible until COMMIT. Missing function/state never auto-bootstraps.
- Lease ID/mint/expiry fencing, replay/slot regression, expired/unknown operations,
  lost admission/completion acknowledgement and circuit clearing all fail closed.
  Immediate-stop/crash recovery replays real WAL and retains counters, slot,
  fence, in-flight reservation and terminal circuit across new connections.
- Real outage and wrong-password SCRAM failures are bounded and redacted. The
  actual restricted login can execute the function but cannot select/update/reset
  state, bootstrap, create objects or change/drop the function. Asynchronous
  commits and future/corrupt clocks/counters cannot authorize source attempts.
- Fixed-window client/global/source budgets, spacing, daily persistence, cache
  capacity/expiry/MAC, original source clocks, HMAC-only identity retention,
  missing secrets and request/hosting spoof rejection are exercised against SQL.
- Exact zero and unsupported Token-2022 states reach the merged #112 consumer
  projection correctly. Production rejects synthetic acquisition and expired
  original observations, even when evaluatedAt changes. Every positive envelope
  in tests is synthetic, including the production classification replay.
- A temporary loopback TLS server exercises native node:https through a test-only
  wire seam. Actual CA/hostname failure, header/body limits, compressed-body refusal,
  redirect/error refusal and abort propagation pass; no retry or global Fetch use.
  Invalid target/protocol/method/batch/mint/duplicate JSON reaches no wire operation.
  The real 5-second service deadline and shared terminal circuit are also tested.

These are actual database/TLS integration proofs **with synthetic local data**,
not hosted failover/credential validation or authentic source acquisition. Local
test-owner counter seeding and schema resets are isolated fixtures; the deployed
app role has neither privileges nor code paths to perform those operations.

## Security findings and remaining gates

The focused review checked parameterized SQL and fixed SECURITY DEFINER search_path,
least privilege, COMMIT-before-authorization, uncertain-write handling, monotonic
fencing, exact mint and source/slot/clock validation, bounded bytes/time/queues,
immutable OFF-before-I/O, hosting trust, private handle serialization, redacted
errors, secret/fixture exclusion from client bundles and original expiry semantics.

An actual installed-framework finding was corrected: Next 15.5.9's Fetch wrapper
records full queries in `http.url`/metrics. The native HTTPS path now bypasses that
wrapper; real local TLS tests poison global Fetch and still succeed. Operator APM/
proxy/native HTTP instrumentation still needs explicit URL-redaction review before
any credential-bearing request. No real credential was read to perform this check.

The production-only npm audit reports **3 baseline packages: Next critical,
PostCSS high and sharp high** (1 critical / 2 high package entries, not an exploit
assessment). Their lockfile entries match main exactly. Representative advisories:
[Next AVIF RCE](https://github.com/advisories/GHSA-2xp9-vwfh-vxw4),
[PostCSS source-map read](https://github.com/advisories/GHSA-fxqj-rqcc-2cmp),
[sharp/librsvg](https://github.com/advisories/GHSA-wq5f-xc86-pv6w).
No pg/pg dependency advisory was reported. Framework/image dependency remediation
and applicability review belong in a separate change and are **additional blockers
before future activation**; this PR does not silently upgrade the application.

Outstanding owner gates are explicit in [PRODUCTION.md](PRODUCTION.md): human code/
schema/dependency review; new SCOUT key in the existing paid Helius account; approved
dedicated database role/primary/TLS/durability/quota/connection/cost/retention/terms;
verified direct Vercel identity and logging; separately approved one-mint authentic
capture; source-format/clock/lag review; separately approved activation code change
and actual deployed/iPhone Safari checks. Idle expired rows and WAL/backups are not
physical timed erasure. Terminal circuits deliberately trade availability for safety.

The prior bounded canonical deployed request failed at the environment network
boundary before an app response; A separately recorded CONNECT 403 for homepage/
API/terminal in #111. No bypass/retry, deployment observation, physical iPhone,
current provider facts, consensus, equity/backing/reward/holder-return assurance
or present-day source permission is claimed. Production RPC is still OFF. Zero
Helius/mainnet/provider/account calls, billing/provisioning, live secret access,
old bot changes or production data/collector/Cloudflare/treasury operations occurred.

## Reproduction and output hashes

Use the commands above with local PostgreSQL 15+ binaries and OpenSSL. The runner
fails if PostgreSQL is missing; it never skips or uses the reference reducer in
place of real SQL. Final local output SHA-256 values (traceability, not independent
attestation; raw local logs were under `/tmp/scout111-*`):

```text
npm-ci             efb449eeeaa918adcfa0d44f00a94ae0998572a4ef30973b354f993e38dec97d
full-test-final    ba823c72768ec5ece496d4abcef0c4be49dcb4e93ae20e2b11b975091283afaa
typecheck-final    e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
lint-final         fcf6b46859f0ed1122c0cc24aa92fdbd60df1dc55e7b54bcb37b6e40f6377696
build-final        a91264cfbd7605fc3c268fb281a3e1de9e0cdec2e7ed8870731b0d6e320fcd7f
archive-check      e765fbe4200d783e0905d0a7a988284227807c7adc86191e92cbc87dbc55af64
archive-dry-run    a1c4ed0591edac18534372e3594ab4e8ea015380af319c6b085cd26390e47c80
browser-final      1e5b298ebd9e99157d3d54a554e0bf044704af90d497a18027c27483a96a1f17
schema.sql         0c17d81d047664db8c771547d653154f24f5bdcc440b3eaeb0577c746aa8f6dc
bootstrap.sql      860138b4fa2ad47c832eb12f211f4ed08fdbbeb2f7188dbe2bc357da854c7e7a
```

Rollback is specified in PRODUCTION.md: keep/restore the OFF gate first, preserve
#112 and retained data, never reset the durable policy to refill quota or touch
the former bot credential. No infrastructure was created here to tear down.
