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

The token dossier includes a read-only historical-rewards panel backed by `GET /api/history?mint=...` and deployment-bundled reward snapshots. It is not continuously updated production history: hourly repository commits do not automatically refresh a running deployment. [Issue #4](https://github.com/fuzzysniper/scout-stonk-intel/issues/4) is required before promoting continuously updated comparisons. Window totals remain unavailable until recorded coverage and data quality are adequate. See [methodology, limitations, verification, and rollback](docs/HISTORY.md). Run `npm test` for the history calculator and API regression tests.
