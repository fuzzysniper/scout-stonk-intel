# Collector reliability — issue #22 operator report

**Finding:** history is sparse because very few scheduled executions appear in Actions, while the observed executions collected and persisted their actual observations. The internal reason GitHub omitted/delayed the other opportunities is **unverified**. This is not a proven provider outage, permission failure, billing limit or dropped-job count.

Cutoff: **2026-10-13T16:29:25Z**; base main [`47391568c28a`](https://github.com/fuzzysniper/scout-stonk-intel/commit/47391568c28aeb7fa90f5dcde2dcfb08ffd44ce7). [Sanitized evidence JSON](evidence/collector-reliability-2026-10-13.json) includes full SHAs, exact hashes, run/job/step times, summaries and per-token timestamps/gaps. The API returned all five collector runs (`total_count=5`, `per_page=100`); a 16:38 UTC recheck still returned five. No cancelled/failed/queued run or rerun appears; historical run deletion cannot be ruled out.

## Attempts versus opportunities

Collector creation: Oct 12 **15:42:15 UTC**, [introduction `13d8d81`](https://github.com/fuzzysniper/scout-stonk-intel/commit/13d8d81bcb56187255ac1a7032603220509faf21). Workflow is currently active. Cron `17 * * * *` is unchanged in both workflow revisions; first opportunity was 16:17.

Since introduction: **25 nominal opportunities, 24 past 15-minute grace, 3 scheduled attempts, 2 manual attempts**. In the trailing 24h window (Oct 12 16:29:25 to cutoff): **24 opportunities, 23 mature, 3 scheduled creations, 1 manual creation**. Twenty mature hourly buckets have no listed scheduled creation. These buckets **do not identify intended slots or prove twenty dropped jobs**. The final 16:17 opportunity is still within grace.

| Run/event | Created = run-started UTC | New recorded UTC / mints | Dataset commit |
| --- | --- | --- | --- |
| [38272331847](https://github.com/fuzzysniper/scout-stonk-intel/actions/runs/38272331847), manual | Oct 12 15:43:36 | 15:43:41 / KNOTS | [`804c6ee7d882`](https://github.com/fuzzysniper/scout-stonk-intel/commit/804c6ee7d882c52fd334c2df3f3f132a9a9c2dff) |
| [38304889111](https://github.com/fuzzysniper/scout-stonk-intel/actions/runs/38304889111), manual | Oct 12 20:32:28 | 20:32:33 / KNOTS | [`027ab3eb95ac`](https://github.com/fuzzysniper/scout-stonk-intel/commit/027ab3eb95acce515beb79dc74e5764036384759) |
| [38319900484](https://github.com/fuzzysniper/scout-stonk-intel/actions/runs/38319900484), schedule | Oct 12 23:01:12 | 23:01:18–19 / all 7 | [`b4ad30fb4922`](https://github.com/fuzzysniper/scout-stonk-intel/commit/b4ad30fb49226b2de86fef5ce30b7acc70018857) |
| [38342446125](https://github.com/fuzzysniper/scout-stonk-intel/actions/runs/38342446125), schedule | Oct 13 03:35:41 | 03:35:49–51 / all 7 | [`9d458ffc943d`](https://github.com/fuzzysniper/scout-stonk-intel/commit/9d458ffc943dfbda584743f5da8f93e5e984e132) |
| [38393086625](https://github.com/fuzzysniper/scout-stonk-intel/actions/runs/38393086625), schedule | Oct 13 11:51:10 | 11:51:17–18 / all 7 | [`fdce3c1d95e1`](https://github.com/fuzzysniper/scout-stonk-intel/commit/fdce3c1d95e1d4cf1d78ddf5c56aab6c5dcc4e1a) |

All collection/persistence steps succeeded; actual Git parents match run `head_sha`, and added times fall inside collection steps. The two instrumented summaries name those exact run IDs, report 7 collected/0 failed/0 skipped, and match committed snapshot hashes. Old green steps alone do not prove completeness; actual diffs establish their added points. Jobs start 2–3s after creation and last 5–13s, with no observed many-hour runner queue.

Scheduled creation offsets from the **nearest preceding nominal slot** are 44m12s, 18m41s and 34m10s; intended-event timestamps are unavailable. [GitHub documents delayed/dropped schedules at high load](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule); its [official reusable source](https://github.com/github/docs/blob/main/data/reusables/actions/schedule-delay.md) was read. Minute 17 already avoids the top of the hour. Neither a cron change nor blind provider retries is justified: retries cannot help absent execution or reconstruct missed counters.

## Data, provider, persistence and overlap evidence

Latest dataset SHA-256: `6952f44f1eaf69a0f3eab67f87b62cbcfaa6d214e51d0f5cf0dd7602b141fdb1`. Independent raw main retrieval matches it. Evidence JSON preserves all six byte revisions and additions. [Radar merge `47bdc17`](https://github.com/fuzzysniper/scout-stonk-intel/commit/47bdc17f114362a37b036e61bfc5494477830839), Oct 12 20:59:15 UTC, added genuine feature-branch points at 20:41:27–29; this is not another scheduled execution. The other six mints were not configured on main earlier.

| Mint label | Stored points | Maximum gap | Latest Oct 13 UTC |
| --- | --- | --- | --- |
| KNOTS | 6 | 8h15m27s | 11:51:17 |
| ALLINU | 4 | 8h15m28s | 11:51:17 |
| ZCAT | 4 | 8h15m27s | 11:51:17 |
| BANKROLL | 4 | 8h15m27s | 11:51:17 |
| NEARKAT | 4 | 8h15m27s | 11:51:17 |
| MASK | 4 | 8h15m28s | 11:51:18 |
| SI | 4 | 8h15m27s | 11:51:18 |

Scheduled observation gaps are 4h34m31–32s and 8h15m27–28s. Latest age at cutoff is 4h38m07–08s. The unchanged two-hour gap/three-hour stale safeguards prevent complete comparisons. All **30 genuine points** are preserved.

- **Provider:** instrumented attempts are complete; no provider failure explains absent runs. Provider behavior during unexecuted opportunities is unknown. Earlier manual attempts were KNOTS-only.
- **Persistence:** no collection-without-persistence or rejected push is established. Real remote commits, parent linkage, added records and matching summary hashes corroborate publication. Never equate a green collection step with persistence.
- **Logs:** fresh downloads were denied by the environment proxy at `results-receiver.actions.githubusercontent.com`. Findings use authenticated job metadata and Git bytes, not claimed rereading of accepted-push text. Prior log confirmations remain attributed to [DATA_HEALTH.md](DATA_HEALTH.md). No signed URLs/credentials/raw logs are committed.
- **Audit overlap:** only audit run [38420708084](https://github.com/fuzzysniper/scout-stonk-intel/actions/runs/38420708084): created Oct 13 15:16:59, job 15:17:01–15, checked 15:17:06, publication 15:17:09–10, commit `47391568c28a`. It did not overlap a collector job or change snapshot bytes. Both jobs already serialize without cancellation. Audit creation itself is 7h33m59s after nominal 07:43; monitoring on the same scheduler cannot guarantee timely detection.
- **Source lag:** five-minute caching cannot explain missing multi-hour commits in Git itself. Matching raw bytes do not independently prove deployed-host propagation; no production host was altered/inspected. Follow [HISTORY.md](HISTORY.md)'s separate approved procedure.

## Bounded improvement and 24–48h monitoring

The existing audit now adds **operator-only recent-cadence metadata and job-summary text**: up to 48 candidates instead of 12, still at most six GETs, existing 1 MiB/eight-second limits, five-minute job, and twelve published phase-detail rows. The public validator strips the extra operator metadata. No UI, collector, workflow, permissions, allowlist, reward calculations, gap gates or archive activation changes.

The window is at most 24h, starts no earlier than workflow creation, and distinguishes manual/scheduled creation and 15-minute grace. Duplicate-hour creations cannot fill two hours. Truncated/duplicate/unordered pages give incomplete evidence and **null** missing counts; full history or an ordered page reaching the boundary proves listing coverage. Invalid/future metadata is unavailable, not false zero. This improves diagnosis only when the audit executes; it does not restore scheduler delivery or add polling/retries/alerts.

After human review, observe **24 consecutive opportunities**, preferably 48, without dispatch. Record complete listings, workflow revision, run IDs/attempts, job/step intervals, per-mint outcomes, actual observation times and confirmed main commits/hashes. Inspect artifacts on provider/push failures; page incomplete evidence read-only. Recovery requires genuinely newer points and real coverage under unchanged safeguards, not green jobs/fetch times. Separately verify approved deployed-host revision after five-minute cache expiry. Keep 7d comparisons unavailable until adequate genuine history exists.

**Acceptance:** complete 24–48h execution evidence, attributable per-mint outcomes/revisions, no unexplained provider/persistence failures, and actual gaps/freshness supporting the gates. Otherwise hourly reliability remains unestablished and comparisons unavailable. Owner-side Actions/quota/default-branch/service inspection or an external scheduler requires separate review; no permission changes, force repair, invented backfill or archive activation are authorized here.

## Checks, risk and rollback

Node 20.20.2/npm 11.9.0. Final results:

| Command | Result |
| --- | --- |
| `npm ci` | Exit 0; 310 packages |
| `npm test` | Exit 0; 109 JavaScript and 25 Python tests passed, none failed/skipped |
| `npx tsc --noEmit` | Exit 0 |
| `npm run lint` | Exit 0; no lint errors/warnings |
| `npm run build` | Exit 0 |
| `PYTHONDONTWRITEBYTECODE=1 python3 -m unittest discover -s tests -p '*_test.py'` | Exit 0; 25 collector/ops tests |
| `bash scripts/archive-tool.sh check origin/main` | Exit 0; append-only/reproduction passed |

Existing ESLint installation deprecation and edge-runtime/static-generation build warnings remain. New ops tests cover missed/late creation, grace, incomplete evidence, activation, partial providers, overlap, stale/recovery and conflicts. The real existing persistence block runs against disposable local Git clones: a competing audit commit rejects the stale push while preserving remote history/local artifacts. No live workflows are dispatched. The status test's stale hard-coded 3-run/1-schedule assertion now verifies actual bundled audit IDs/time/count as genuine diagnostics advance.

Risks: larger bounded responses can hit existing limits; creation buckets are not intended-slot attribution; the audit cannot report when itself unscheduled. All data, workflows, financial code and archives remain untouched. No UI change, so screenshots are unnecessary.

Rollback: revert this feature through a reviewed PR, restoring audit diagnostics/tests only. Preserve subsequent real observations, diagnostics, allowlist and immutable archives. No migration, deletion, force push, activation, production deployment or permission revocation is needed. Await human approval before merge or operational rollout.
