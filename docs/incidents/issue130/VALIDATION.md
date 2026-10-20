# Offline incident evidence

## Before correction — expected RED, not a passed test

The server code was byte-identical to reviewed commit `8df27bd` (current main's only later changes were collector data). Compiled that unchanged code to `/tmp/scout130-before`, then ran the new real local TLS-proxy test. Actual output:

```text
FAIL: TLS proxy: verified native client TLS and plaintext backend must not falsely fail compatibility
AssertionError: {"status":503,"reason":"upstream_unavailable","stubCalls":0,"seq":"0"}
503 !== 200
tests1; pass0; fail1
```

Before reaching this assertion, the test proved the actual node-postgres client socket encrypted/authorized, exact pinned SNI and TLS1.2/1.3, plus backend `ssl=false,version=null`. No hosted traffic or provider attempt. This is a deterministic **conditional reproduction**, not the original production invocation trace.

## After correction

The only production logic change removes the backend TLS predicate. The same test passes. A causal SQL test separately verifies retained catalog gates=true and old backend predicate+same gates=false in one local transaction, without invoking admission. The fault matrix covers native CA/hostname/plaintext rejection, unchanged fingerprint/config/grants, POST translation, configuration/construction/admission errors, source5xx versus different source reasons, missing policy, lost admission/completion acknowledgements and charged-state/no-rearm behavior.

All source responses, hosting headers and credentials are explicitly synthetic. PostgreSQL, SCRAM authentication, TLS sockets and the proxy are real but strictly local (loopback/Unix socket). The injected stub's trusted `production_rpc` profile exercises production projection; **it is not authentic Helius or Vercel evidence**. No exposed cookie, original client headers or real credential values enter tests/artifacts. Test-owner resets affect only disposable local fixtures; no production state was read or reset.

Actual local outcomes (Node24.19.0, PostgreSQL17; no skips):

| Check | Result |
| --- | --- |
| Unchanged deployed-code reproduction | Expected RED,1 failure with exact503/upstream_unavailable before any stub call/reservation |
| Corrected incident suite | PASS:12 tests, including causal SQL comparison, real proxy/TLS/SCRAM and negative/fencing cases |
| `npm test` | PASS:1,004 results =898 Node +106 Python, zero failures/skips; includes the12 new cases |
| `npm ci`, TypeScript, lint | PASS; no dependency/lockfile changes |
| Production build | PASS, existing external-egress blocker loaded |
| Archive append-only/reproduction check | PASS; no data/archive edits |
| Production dependency audit | PASS, zero findings at every severity; no full-dev clearance claimed |

Actual GitHub CI will be linked in the PR after inspecting its results. Reproduction commands:

```sh
npm ci
# PostgreSQL15+ installed locally, or existing test-only binary/share selectors:
SCOUT_TEST_PG_BIN=/workspace/scout111-tools/extracted/usr/lib/postgresql/17/bin \
SCOUT_TEST_PG_SHARE=/workspace/scout111-tools/extracted/usr/share/postgresql/17 npm test
npx tsc --noEmit
npm run lint
NODE_OPTIONS=--import="$PWD/tests/security114/local-only.mjs" npm run build
bash scripts/archive-tool.sh check origin/main
npm audit --omit=dev
```

No runtime logging, source transport, credential parser, activation pins, request budgets, expiry, schema/function/body fingerprint or API response contract is changed. No browser/production smoke invocation is part of verification.
