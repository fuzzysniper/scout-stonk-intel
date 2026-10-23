# UNFARMD private beta — owner execution card

**PREPARATION ONLY. No production action is approved.** This card supersedes older source/proof runbooks for this combined release. Original USDC/lookup/preflight gates, attempts and counters remain unchanged. Do not merge #168/#169/#170 separately after releasing this candidate.

Confirmed by founder (October23): existing Helius **Developer**, **10,000,000** monthly credits, **317,040** used (**9,682,960 remaining at capture**), autoscaling **Off**, displayed monthly autoscaling limit **$0**. Dedicated **UNFARMD-DATA key already created privately**; do not create another, inspect/export it or touch any proof/bot key. These are owner-reported dashboard facts, not a fresh meter reading or proof of how an already-open socket is cut off. Actual Standard WSS billing/rounding, both HTTP method weights, applicable internal-use/retention terms and cutoff behavior still need owner confirmation.

## Short founder checklist

1. **Infrastructure/release GO:** approve exact combined SHA, green checks, new Render plan/price and normal main→Vercel release. Separately approve the reviewed isolated schema/three roles and privately install the already-created DATA key plus new role credentials. Deploy everything with acquisition disabled.
2. **Private-read GO:** verify actual Render/Vercel IDs and SHA, unique production hostname, both API routes behind Vercel Authentication, separate in-memory owner capability, then explicitly enable the read/STOP API. Confirm a genuine empty/unapproved Neon snapshot from iPhone. Do not latch authenticated STOP before the first grant.
3. **Bounded-source GO:** confirm rights, physical-retention/backups, current account limits/cutoff and conservative C/R/L. Choose one attended session and approve the exact initial one-row SQL plus matching worker approval. The key/account alone authorizes nothing.
4. **Accept or stop:** view genuine stored provisional/finalized receipts on iPhone, original clocks/hashes/gaps and actual usage; issue explicit permanent STOP, verify native closure, then suspend the dedicated Render worker. No retries/rearm/reset after uncertainty.
5. **Mobile week:** current code ends after this session; it cannot provide continuous coverage. Keep OFF unless a separate versioned continuous-operation implementation, billing/retention enforcement and mobile recovery are reviewed and approved. See [separate proposal](MOBILE-WEEK.md).

Any missing approval, identity mismatch, uncertain SQL outcome, TLS/binding error, rights restriction, unknown credit weight/cutoff or inaccessible STOP is **NO-GO**. No automatic extension, fallback provider or cleared history.

## 1. Approve one source-disabled release and isolated setup

Review the candidate's exact SHA/checks and `inputs.json`. C's new private live-feed checkpoint and mobile/browser checks must be present before calling the candidate complete. Require root CI, worker CI and native integration CI green. All collector history and original backend/proof bytes must match main. Any unexpected difference is NO-GO.

Owner wording: **“GO for the reviewed combined commit [SHA] and source-disabled infrastructure setup below, including the explicitly selected Render plan/cost. No provider acquisition, SQL source grant or source enable is authorized yet.”** A GitHub main merge normally triggers the existing production Vercel deployment; approve that consequence explicitly. No disposable deployment, `--skip-domain`, domain promotion or alternate project. No new Neon project/database, subscription, plan upgrade, public RPC or collector.

After that GO, owner installs the exact reviewed `lib/live-ledger/postgres/schema.sql` **ONCE** in existing Neon `scout-onchain` / `neondb`, production branch/primary. Owner schema identity: org`org-fragrant-butterfly-26428175`, project`snowy-haze-83201847`; primary host`ep-flat-band-b5fp4ls8.c-7.us-east-2.aws.neon.tech`. Inspect the nonsecret target in the existing dashboard before SQL. STOP if `scout_live` or one of the new role names already exists; the transaction intentionally fails rather than replacing anything. No lookup migration/reinstall, policy reset or canary query.

```sh
# PC checkout of reviewed code. These commands only verify local bytes.
git rev-parse HEAD
sha256sum lib/live-ledger/postgres/schema.sql lib/live-ledger/postgres/authorize.sql
```

Expected schema SHA-256: `47669874a3b6eb6d3d701d0f1643257c8573e02302dc6f5ad5f96fdd416e5851`. Initial authorization SHA-256: `8ec4a446ae33fc3e80197f6c1ac458515eae8d70e2f1caecd3a2d3a403a10ced`. A mismatch is STOP. Owner executes the **entire** reviewed schema transaction through the existing authenticated SQL editor on the verified target, not selected fragments. It is not run by CI, deploy, application or this preparation.

The SQL transaction creates only `scout_live`, `scout_live_worker`, `scout_live_reader`, `scout_live_stop` plus their `neondb` CONNECT grants. New roles: LOGIN without initial passwords, NOINHERIT, no superuser/create-role/create-DB/replication/bypass-RLS, connection limit2. No direct table privileges; only the matching static SECURITY DEFINER function. Unexpected inherited ACLs abort the whole transaction. Owner configures **new** login passwords privately through an approved hidden-input/password-manager channel; never paste them into chat/git/SQL screenshots. Do not recreate roles through a UI flow that adds broad memberships. No `neon deploy`, schema push or automatic migration.

## 2. Install separate secrets; deploy only disabled code

| Runtime | Approved new bindings only |
| --- | --- |
| Render dedicated worker | `SCOUT_LIVE_WORKER_DATABASE_URL`, existing privately created key as `UNFARMD_HELIUS_DATA_KEY`; public exact service pin`SCOUT_LIVE_RENDER_SERVICE_ID`; unarmed`UNFARMD_DATA_APPROVAL_JSON` |
| Existing Vercel production project | `SCOUT_LIVE_READER_DATABASE_URL`, `SCOUT_LIVE_STOP_DATABASE_URL`, new strong random base64url`SCOUT_LIVE_OWNER_TOKEN` (32bytes or stronger) |
| Browser | Owner app capability entered from the owner's password manager into memory only. **No DATA key or DSN.** No URL/localStorage/analytics/logs. |

New DSNs must use the exact role/`neondb`/primary host and native verified TLS. Keep any mandatory `channel_binding=require` restriction: this pg adapter will block it, not downgrade. If required binding is blocked, STOP and separately review strict SCRAM-PLUS compatibility; do not merge #139 or change an existing DSN automatically. Local TLS/SCRAM testing does not prove production PLUS negotiation.

Vercel target: existing project`prj_OaA9snVrMUkpXuz6cMSKfSZ6fx5Q`. Deploy through the normal separately approved GitHub→main flow only. Keep `SCOUT_LIVE_API_ENABLED=false` initially. Preserve every existing production variable/gate/alias. Record actual deployment ID, **unique HTTPS host**, project and actual immutable Git SHA. If squash/merge changes SHA, verify the reviewed runtime tree and record the actual deployed SHA; never authorize source against an obsolete PR SHA. Recheck appended collector history and CI if main changes.

Render: owner approves the exact new background-worker plan/price before provisioning. Apply `ops/render/scout-live.render.yaml` for a **new** service, one instance, auto-deploy false; no old trading service, env group, autoscaling or cron. Actual commands: `bash experiments/live-stream/render-build.sh`; `node experiments/live-stream/run.mjs`; Node`24.19.0`. Select the approved immutable commit, not an unreviewed “latest”. Keep `UNFARMD_DATA_ACTIVATION=disabled`, `SCOUT_LIVE_STORE_ENABLED=false`; unarmed example's source/deployment GO flags stay false. The key's presence is not permission. Expected actual runtime startup is `DISABLED`, `sourceConnected:false`, `counts:null`; no source connection or SQL acquisition. Check native Render service ID/commit against owner records before any enable.

## 3. Verify private access with source OFF

Fresh founder login on the **unique production Vercel host**. Incognito must require Vercel Authentication for both feed GET and STOP POST; homepage-only evidence is insufficient. Review API protection exceptions/bypasses. App also requires its separate owner bearer, correct production project and same origin. No auth bypass/cookie export or cloud-agent substitution. Canonical aliases are intentionally not accepted by this pilot API.

After separate owner API-read/configuration GO, set only `SCOUT_LIVE_API_ENABLED=true` through the reviewed production configuration/release path. On iPhone, C fetches `GET /api/live-events` with `credentials:'same-origin'`, `redirect:'error'`, no query overrides and the memory-only owner bearer. Native reader role checks TLS, database/role, ACLs and function hashes on every read. A genuine installed/unapproved store reports waiting/empty; an outage/missing row reports unavailable with unknown fields. This proves the reader path only, not worker credentials, source delivery or Helius use.

**Do not press authenticated permanent STOP as a harmless pre-activation smoke test.** It irreversibly latches this initial ledger and prevents its later first grant. Offline tests prove STOP persistence; production unauthenticated/invalid-intent requests must deny without mutation. Actual owner STOP acceptance occurs after the bounded genuine-event session. Never clear STOP to recover from a premature test.

## 4. Approve exactly one bounded source session

Choose a founder-attended UTC window only after deployments/access are ready; suggested first duration **10minutes**, never more than the existing1h maximum. No fixed time or approval is selected by this card. Record the current paid-plan balance/reset, rights/retention evidence and cutoff semantics. Explicitly approve one-hour read expiry/200normalized-row cap plus physical deletion/backup behavior: purge occurs on worker commands; after STOP/outage it can lag. If the applicable rights require a stricter physical bound, source stays OFF until that is solved.

Approve conservative integer weights `C` (whole worst-case connection receive envelope incl rounding/control/overshoot), `R` (worst weight of either HTTP method/failure) and `L` (session ceiling). No invented prices/defaults. Existing maximums remain3attempts,20kframes/16MiB per connection,40HTTP attempts,20promotions,1MiB/HTTP, zero HTTP retry. For a first **single-connection** grant with up to40RPC reads, require `L=C+40R<2C`; otherwise choose a separately reviewed smaller scope or STOP, never silently remove the condition. This is atomic reserved allowance, not measured Helius spend. Account's remaining snapshot is not automatically allocated to this worker.

Owner wording: **“GO for INITIAL source session [UUID], actual Render service [ID]/immutable SHA [SHA], scope [SCOPE], UTC[start,end], approved C/R/L, private-use/retention and account evidence [hashes]. Authorize only the reviewed one-row SQL and this bounded Helius source; preserve all prior state. Emergency STOP and suspension of this dedicated service are authorized; no reset/retry/rearm.”**

Only after that distinct GO does the owner execute the exact `lib/live-ledger/postgres/authorize.sql` with its nonsecret psql variables: `session`, `head` (ACTUAL Render build SHA), `start_utc`, `end_utc`, `connection_credits`, `rpc_credits`, `credit_limit`. Use the owner's existing secure connection setup; never put a connection URL/password in process arguments or chat. The script validates initial-unused state, approved bounds and one affected row atomically. Zero rows/error/uncertain execution → STOP/no source enable, no rerun/reset. Review via separately authorized owner inspection if status is uncertain.

```sh
# OWNER ONLY, AFTER distinct SQL/source GO. Existing secure psql service configured
# privately by owner; all SCOUT_* below contain reviewed NONSECRET metadata only.
# No URL, password, API key or new credential file in this checkout/command.
psql -X -v ON_ERROR_STOP=1 \
  -v session="$SCOUT_SESSION_UUID" -v head="$SCOUT_ACTUAL_RENDER_SHA" \
  -v start_utc="$SCOUT_START_UTC" -v end_utc="$SCOUT_END_UTC" \
  -v connection_credits="$SCOUT_CONNECTION_CREDITS" \
  -v rpc_credits="$SCOUT_RPC_CREDITS" -v credit_limit="$SCOUT_CREDIT_LIMIT" \
  -f lib/live-ledger/postgres/authorize.sql
```

Do not run this command without the owner's existing verified secure connection context; a default/unidentified target is NO-GO. `starts_at` must not be more than30seconds in the past and expiry must remain more than1minute away when SQL executes; deployment/login/setup must already be ready. Missing the planned cutoff means stand down, not silently substitute clocks or repeat the SQL. Record the exact nonsecret rendered metadata/digest and commit privately before approval.

Then owner installs the matching `UNFARMD_DATA_APPROVAL_JSON` (same UUID/head/scope/service/clocks and evidence hashes; explicit true owner GO flags), enables `SCOUT_LIVE_STORE_ENABLED=true` and `UNFARMD_DATA_ACTIVATION=enabled` on that exact worker under the approved release/configuration procedure. A validates native Render identity/build, then PostgreSQL claims/fences/precharges before any WSS or HTTP. No homepage/GET invokes Helius. If any identity/clock/role/TLS/rights/quota is uncertain, deny rather than repair live.

## 5. Genuine acceptance; close the session

From iPhone on the protected unique host, verify **actual stored** messages: signature, original receive clock/slot/hash, no mint on provisional rows; sampled exact mint/quote/token program and two response hashes only after source validation. Native SOL sentinel`11111111111111111111111111111111` is native SOL, not WSOL or verified SPL mint. “RPC-reported-finalized” is same-provider corroboration, not independent consensus. DB heartbeat and actual frame/pong clocks differ. Reconcile gaps/errors and reserved vs received counters. Record honest no-event/withheld/cap/error outcomes; no automatic second session.

Owner presses one authenticated **STOP**: POST`/api/live-events/stop`, empty body, same-origin browser, owner bearer, `X-Scout-Live-Intent: STOP_SCOUT_LIVE`. Confirm JSON stopped response and fresh subsequent read with durable latch; owner checks worker native socket closure/terminal release. STOP prevents new tickets but cannot un-send a previously admitted RPC or force-close a paused process. If closure/ack is uncertain, owner immediately suspends the **dedicated** Render service; no restart/retry/reclaim. Disable DATA activation/store; keep counters, fence/uncertainty history and permanent STOP intact. Owner pauses the worker to end ongoing hosting charges.

Record attributable settled provider meter delta and real active time/bytes/RPC methods, not SQL reservedcredits as spend. Retain only permission-covered normalized evidence/aggregates. Owner-approved cleanup deletes expired `scout_live.events` only; never control/old history. If no genuine event completes validation, report the measured miss.

## What happens during the mobile-only week

This successful session ends. The current one-shot ledger **cannot safely renew**; at most1h is not7days of coverage. Rows expire from reads after1h and may no longer be viewable during the week. Permanent counters/STOP remain. Do not leave a “live” badge or rotate sessions/reset SQL to pretend otherwise. See the separate [mobile-week proposal](MOBILE-WEEK.md); no new continuous mechanism is approved or implemented by this release.
