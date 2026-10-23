# Continuous backend — review only, source OFF

23 October 2026, America/Chicago. Based on production `9eab75d9a4e72be01cb0a0942decb497c4cb8130`; binds Agent A draft#172 **`a860f7251c3e11daf6bbc133c07bd1b62251495a`**. This backend PR is independent of that controller PR; it does not merge or edit A, C, collector history, the original one-shot ledger or mint-proof gates. No hosted SQL, key access, source/provider traffic, provisioning, paid service, merge or deployment is authorized/performed.

Refreshed main added collector-only `08d21ef9a9de2ee0a22463564c5f45b0b92c3b70`; that entire commit is preserved in this feature branch. The inherited release-composition test now compares original reviewed B files (allowing new v2 paths) and preserves collector bytes from the common main ancestor (allowing scheduled main appends), while still requiring unchanged original proof/worker/consumer source.

## Implemented executable contract

- Fixed `lib/scout-live/continuous-store.mjs` →`createContinuousStore()` with **`unfarmd-continuous/1` /wirev2**, exactly A's grant/command/reply types. Canonical owner grant/policy/source hashes bind every transaction. Separate native-pg DSN/roles, verified TLS/SNI, exact role/ACL/function fingerprints, bounded transactions, synchronous COMMIT before acknowledgments. No v1, memory, alternate RPC or old credential fallback. Required channel binding remains blocked, never stripped/preferred as a substitute for required.
- Additive **`scout_continuous`** schema. Owner initialization only once on an unused ledger. Parent≤7days, ends before the approved account reset, explicit credits/other-use/incident reserves and independent byte/frame/RPC/connection/child/index caps. No allowance from the dated account balance by default. Exact integer credit weights C/R are owner-reviewed conservative reservations, **not measured provider spend**.
- Parent lock serializes child creation, ticket reservations, first-seen changes and global STOP. One open child≤1h; no child UUID replay. Each connection irreversibly debits C +16MiB/20k-frame envelope; each HTTP request debits R +one RPC ticket. Per-child ceilings remain3connections/40RPC/20promotions/200newrecords; A rolls at180. Global limits never reset/refund at rollover/reconnect/STOP/restart. Byte/frame caps cover WSS application bodies, not all wire traffic or HTTP bodies; HTTP has its own attempt/1MiB cap and credit weight.
- Global STOP is permanent. No clear/start/reset/reauthorize function. Only matching fence may acknowledge native closure/close child/release after STOP. Expired occupied lease, child uncertainty, parent expiry, stale/restricted evidence, budget or external-anchor mismatch latches denial. A postmaster epoch change after acquisition starts also fails closed: database restart/restore does not silently refresh an old parent. Privileged PITR/restore still requires source OFF and independent recovery review; no claim that SQL defeats an administrator's rollback.
- V1 must **already** be permanently stopped and terminally closed before initial v2 authorization/claim. Lock its row for exclusion; never write it. An unapproved/expired v1 or uncleared worker/fence is insufficient. Complete today's pilot first; do not consume its permanent STOP merely to test the new mode.
- Rolling≤200 normalized payloads; last20 reads;1h expiry from **original** receipt. Compact first-seen signature/slot/clock/hash metadata prevents replay/resampling after eviction across children. Promotion preserves original evidence; finalized revisions reject. First-seen metadata may be purged only after parent end+1h; lifetime counters/tickets/child history remain. No raw logs, transaction bodies, financial quantities, wallet lists or ROI.

## Independent maintenance and truthful attestations

Separate maintenance role cannot acquire. Source worker cannot ingest meter, physical-retention, delivery or watchdog evidence. `maintain` runs row purge even after source STOP/outage/restart. The portable **`independentCycle`** executes real maintenance operations, leases a coalesced notice, accepts only a confirmed original-timed delivery receipt, and latches STOP on uncertain observer/delivery failure. It has no provider/channel URL, secrets, scheduler or default observer; disabled invocation calls nothing. No notification is retried after uncertainty. SQL outbox leases are fenced, expire in30s and remain uncertain; hard ceiling10,000delivery attempts per parent. Pending notices are coalesced by health/lifecycle/STOP, rather than one push per child.

The independent runtime must live outside the source worker on **already approved hosting**. No new paid service or cron/workflow was created. The authenticated maintenance API is an executable control surface, **not an installed autonomous runner**, proof of its independence or an approved notification/meter transport. Existing Render-worker suspension must remain available independently; SQL STOP cannot close a paused process or undo an admitted request.

| Gate | Exact required observation | Backend behavior |
| --- | --- | --- |
| Meter | Actual DATA-attributable/reconciled original timestamp≤5min, remaining balance, provider hard-cap evidence through parent end, external cumulative ticket/credit anchor | Missing/stale/mismatch denies; worker heartbeat never renews it. Reserved credits are not substituted for measured use. |
| Retention | Successful SQL deletion **and** independent physical-through evidence≤60s, genuine backup exclusion | `purgeThrough` is the older checkpoint. `DELETE`, vacuum or a new receipt hash alone does not prove WAL/PITR/storage erasure. |
| Notifications | Actual receiver delivery receipt≤5min, approved channel and bounded health checks | Enqueue/lease is not delivery. Expired inflight notice becomes uncertain and stops source; no automatic retry. |
| Watchdog | Independent/shutdown-capable receipt≤30s with external ticket/credit high-water | Source self-heartbeat cannot supply it. A tick independently catches expired source lease/assurances and queues STOP. |
| Legacy retirement | Actual v1 permanent STOP plus terminal close state | No automatic reset, adoption or overlap. |

**These external observations are not implemented by invented healthy defaults.** Only the trusted, separately credentialed maintenance integration may submit them; hashes identify retained owner-reviewed evidence, not cryptographic proof of an arbitrary assertion. Original clocks must strictly advance and cannot be future-dated. The backend does not query Helius or infer rights/billing from API availability. Actual meter acquisition, approved notification delivery, independent invocation, shutdown capability and physical/backup evidence remain unproven.

**Physical-retention blocker:** a normal Neon `DELETE` does not establish backup exclusion or immediate physical erasure. We have not verified that this existing project's PITR/WAL/backups can meet A's literal `backupsExcluded=true` contract. Do not set it merely because rights were reviewed or rows disappeared. Obtain suitable provider evidence, or separately review a compatible retention/controller contract. Do not change existing project backup policies to manufacture readiness. Until resolved, continuous source is NO-GO.

## Private mobile/control API — separate from v1

Canonical browser types: `lib/scout-continuous/api-contract.ts`; full worker wire: `contract.ts`. C owns future frontend adoption; current homepage remains unchanged and its v1 STOP **does not stop a continuous parent**.

| Route | Auth/intent | Response |
| --- | --- | --- |
| `GET /api/live-events/continuous` | Vercel Authentication +separate owner bearer, same-origin cookies | `unfarmd-continuous-feed/1`: parent/grant/head/limits/usage/assurances/gates/maintenance plus nested unchanged `scout-live/1` feed (latest20). Disabled/unavailable parent/feed are null. |
| `POST /api/live-events/continuous/stop` | Same protections; empty body; `X-Scout-Live-Intent: STOP_SCOUT_CONTINUOUS`, `X-Scout-Continuous-Parent`, `X-Scout-Continuous-Grant` | Exact parent/grant-bound permanent global STOP. `closureAcknowledged` is fenced worker acknowledgment, not independent suspension proof. |
| `POST /api/live-events/continuous/maintenance` | Separate maintenance capability, legitimate protected-origin access; intent`MAINTAIN_SCOUT_CONTINUOUS`; strict≤8KiB JSON | Fixed tick/meter/retention/watchdog/notice-lease/ack/incident operations. No URL, secret, SQL, grant-install or source-enable input. |

Only actual native production Vercel project`prj_OaA9snVrMUkpXuz6cMSKfSZ6fx5Q`, immutable commit metadata and its unique HTTPS hostname qualify. Aliases, query overrides, cross-origin/missing fetch-site, wrong method/intent/target, payload STOP and stalled bodies fail closed. Responses private/no-store, no CORS. Outer Vercel API-route protection must be owner-verified; a protected homepage/preview is insufficient. No cookie export/bypass or cloud-agent invocation. Independent noninteractive execution needs its own reviewed supported authentication path; do not weaken protection to make it convenient.

[Founder custom-domain finding](https://github.com/fuzzysniper/scout-stonk-intel/issues/167#issuecomment-6373320821): an anonymous`unfarmd.com`503disabled response establishes only the OFF gate, not authentication. This PR does not loosen host policy or change protection/aliases. Verify owner-selected **All Deployments** protection/route exceptions on the immutable host; the custom domain remains outside this pilot API's allowlist pending separate review.

| Runtime | New bindings (never values in git/chat/browser) |
| --- | --- |
| Same existing Render source worker | `SCOUT_CONTINUOUS_WORKER_DATABASE_URL`, `SCOUT_CONTINUOUS_STORE_ENABLED=false`; existing isolated DATA key only after separate source GO. A mode stays disabled, old DATA mode disabled. |
| Existing Vercel private API | `SCOUT_CONTINUOUS_READER_DATABASE_URL`, `SCOUT_CONTINUOUS_STOP_DATABASE_URL`, `SCOUT_CONTINUOUS_OWNER_TOKEN`; `SCOUT_CONTINUOUS_API_ENABLED=false` |
| Independent maintenance on approved existing hosting | `SCOUT_CONTINUOUS_MAINTENANCE_DATABASE_URL`, separate maintenance token if using HTTP; `SCOUT_CONTINUOUS_MAINTENANCE_ENABLED=false`. Never in Render source or browser. |

All four roles LOGIN/NOINHERIT, no memberships/elevated flags, connection limit2, matching static function only and no direct table/old-schema access. No role passwords in migration. New DSNs pin existing `neondb` primary; native TLS and `channel_binding=require` rejection remain strict. No Helius/mint-proof/bot credential is read by this backend.

## Owner GO / NO-GO card

Current decision: **CODE REVIEW ONLY; CONTINUOUS NO-GO.** No grant/window selected.

1. Review exact B head +A172head, full CI/native controller tests and protected-tree diff. Finish today's separately approved bounded pilot/actual event and STOP acceptance first, preserve every spent/uncertain state.
2. Resolve rights (normalized/index/audit/backup retention), physical exclusion, actual account cutoff/billing/reset and attributable usage; choose explicit cumulative caps, C/R and other-consumer/incident reserves. No use of the remaining subscription by default; no new paid service/upgrade. Existing commercial-hosting terms and actual one-worker plan still need owner approval.
3. Separately approve isolated schema/roles and privately scoped credentials. **Do not execute here.** Owner verifies local SQL bytes, entire `lib/scout-continuous/postgres/schema.sql` transaction and correct existing Neon target. It aborts if already installed/unexpected inherited ACLs; never drop/reinstall/reset. Owner privately sets restricted login passwords without adding memberships.
4. Review/install a genuinely independent maintenance runtime and approved real observers/channel on existing authorized hosting. Prove purge after STOP/outage, physical/backup evidence, external anchor, fresh real meter, delivery/ack, shutdown watchdog and missing-monitor alarm. A source worker cannot monitor its own suspension. A stopped database cannot send notifications; independent runtime must detect that outage and suspend source through an approved emergency path.
5. C integrates the parent read/STOP API on its own branch. Prove actual protected iPhone login/capability, exact parent/grant STOP, permanent latch and native closure/emergency suspend. Do not use v1 STOP for parent control.
6. Only then choose parent times≤7days/before reset, exact combined/deployed SHA/service, explicit limits/weights/reserves/evidence hashes. Separately approve **one initial owner authorization** via `authorize.sql` with reviewed nonsecret JSON in`reviewed_grant`. Run through an existing verified secure owner connection; never DSN/password arguments. The returned canonical hash must exactly match A's grant. Any error/uncertain outcome→STOP/no rerun or counter repair.
7. Distinct continuous source GO enables only the reviewed parent/mode on the same worker. Observe one bounded real segment, attributable spend, real events/quotes/clocks/gaps, actual renewal/no overlap, purge, delivery and mobile STOP before unattended approval. Local synthetic sources do not satisfy this step.

No phase is implied by prior hosting/key/pilot approval. If any requirement fails, remain source OFF. There is no automatic clock extension, retry/rearm, fresh parent reset or public feed authorization.

## Recovery / rollback

Before activation, leave all new flags false and close/revise this draft without altering the bounded release. After a separately approved source session: authenticated **parent** STOP, verify closure or suspend/terminate the same dedicated worker, disable new source/store flags, keep independent purge/monitor/notification running. Never delete global control, tickets, spent children, counters or uncertain fences. API-only rollback does not stop a worker; v1 STOP is not parent STOP. Database outage/epoch change, unknown COMMIT, missing monitor or uncertain delivery requires external owner-approved suspension, not blind restart. Restored data must be purged before exposure; source remains OFF pending independent high-water/retention review.

## Offline evidence / reproduction

Tests use disposable PostgreSQL17/TLS with a test CA and synthetic roles, receipts and source callbacks; none are genuine provider facts. `controller.sh` extracts exact A#172a860 and unchanged bounded/C modules into a temporary directory, compiles them, and drives the actual PostgreSQL adapter: >200records across children, exact cumulative reservations, parent STOP and close. It checks C's existing strict decoder against the nested feed. No A/C file is edited.

```sh
npm ci
SCOUT_TEST_PG_BIN=/path/to/local/pg/bin SCOUT_TEST_PG_SHARE=/path/to/local/pg/share npm test
bash tests/continuous-ledger/controller.sh
npx tsc --noEmit
npm run lint
NODE_OPTIONS=--import=$PWD/tests/security114/local-only.mjs npm run build
bash scripts/archive-tool.sh check origin/main
```

The new PR-only CI has no dispatch, production secrets, provider calls, hosted migration or deployment steps. Full results, exact SHA and SQL digests are recorded on the draft PR after execution; no unfinished check is represented as passed.
