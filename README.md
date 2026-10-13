# SCOUT — Stonk Ecosystem Intelligence

Independent, read-only StonkFun reward transparency. **No trading or token launch functionality.**

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## V0.1
- Responsive landing page
- Solana base58 32-byte address validation
- Solscan link for entered mint
- Honest unavailable states for unintegrated reward feeds
- No wallet access, trades, or misleading yield estimates

See [SPEC.md](SPEC.md) for the 72-hour roadmap. Next: integrate a verifiable read-only reward data source and tests.

## Recorded reward history

The token dossier includes read-only `GET /api/history?mint=...` backed by GitHub-hosted snapshots from `main`, fetched on request with a five-minute server cache. Collector commits can reach an existing deployment without redeploying. Responses distinguish dataset revision/retrieval time, observation freshness, and source outages; stale or degraded current-window totals are withheld. Use **Refresh history** to recheck. Collection and GitHub delays still apply; this is not a real-time feed. See [methodology, deployment verification, security, limitations, and rollback](docs/HISTORY.md). Run `npm test` for calculator, source reader, and API regression tests.

## Intelligence Radar

Open `/radar` for a mobile-first, read-only watchlist of seven officially verified reward tokens. Rows show actual observation times, point counts, coverage, source warnings and evidence links. Missing or incomparable data remains unavailable. See [verification, methodology, operational costs and rollback](docs/RADAR.md).

## Signal Lab V1

The Radar compares observed distributions over consecutive 24h targets, with actual-hour velocity, relative velocity change and explicit coverage reasons. It defaults to evidence coverage/freshness and filters by verified quote mint. Both periods must pass; early history remains unavailable. See [matched-period methodology, caveats and rollback](docs/SIGNALS.md). No predictions, holder-profit claims or trading alerts.

## Data Health

`/status` exposes per-token actual observation freshness, coverage and dated collector/publication evidence. See [methodology, operational verification, optional alerts and rollback](docs/DATA_HEALTH.md). No uptime or production reliability claim follows from a green workflow alone.

## Daily research briefs

`/brief` opens today's UTC edition; `/brief/YYYY-MM-DD` is the canonical day URL. Provisional briefs report only coverage-backed recorded quote-distribution changes, with missing-data explanations and current Data Quality. Share links carry a version and warn if the edition changes. See [brief methodology, verification and rollback](docs/BRIEFS.md).

## Immutable research publication

Approved daily editions preserve exact source bytes and calculation evidence at `/brief/DATE/editions/ID`. Originals never become silent corrections. See [architecture, opt-in draft-PR workflow, operations and rollback](docs/ARCHIVES.md). The automation defaults off and never merges or posts to social platforms.

## Archive release verification

`npm run verify:release` performs bounded GET-only checks; `npm run archive:dry-run` replays reviewed inputs in a removed local checkout without GitHub writes or working-archive changes. See [operations, physical-phone QA, approval gates and rollback](docs/RELEASE_VERIFICATION.md). A local pass is not production or phone proof; archive automation remains off until separately approved.
