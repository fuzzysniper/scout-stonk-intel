# Owner-PC read-only pilot — human operation only

For the final PC-day sequence, use the [ten-command execution card](RUN_CARD.md). It includes private Windows evidence setup, the unchanged disabled approval template mapping, the actual dashboard, kill/recovery and sanitized reporting. [Future mobile access](MOBILE_ACCESS.md) is architecture only; no remote dashboard or week-long unattended process is authorized.

**STOP at approval. Nothing here authorizes acquisition.** Source qualification is currently BLOCKED. First ask whether FuzzySniper already has one authorized original receipt with exact signatures/slots/finality/raw requests/responses and original clocks; if it does, reuse that authorized evidence instead of duplicating a feed. No assumed entitlement to private service data or commercial retention.

The [founder-mobile checklist](FOUNDER_MOBILE.md) is for source/rights and scope review. **This runbook operates only the already-implemented public Solana RPC pilot.** It does not connect to PumpPortal, accept its URLs/keys, authorize a fallback, or use Helius. Reported free PumpPortal creation/migration access does not clear its still-unverified retention/use terms.

## 1. Review offline, without connecting

Use a clean dedicated checkout of the exact reviewed PR SHA on the owner Windows PC, Node 20+ and Git. No wallet, API key, trading account, Helius key or production service is needed. Never run the pilot in Codex, CI, Vercel or a proxy-configured environment; do not remove safeguards to bypass a network policy.

```powershell
git fetch origin feat/live-market-pilot
# Compare the fetched SHA with the final human-reviewed PR head BEFORE checkout.
git rev-parse origin/feat/live-market-pilot
# In this dedicated clean checkout, replace the token below with that reviewed SHA.
git checkout --detach <REVIEWED_40_CHARACTER_SHA>
git rev-parse HEAD
git status --short
npm ci
npm ci --prefix experiments/live-market --ignore-scripts
node experiments/live-market/run.mjs scope
node experiments/live-market/run.mjs status
node experiments/live-market/run.mjs view
```

`status`/`view` read only owner-local records. Their NOT RUN / SOURCE DISABLED state and NULL counts are intentional. Viewing, refreshing and polling cannot consume RPC quota. View binds `127.0.0.1` on a random port, prints the local URL and closes after ten minutes; Ctrl+C closes earlier. Keep it private, do not forward ports or publish raw receipt files. Physical iPhone cannot reach this loopback listener; mobile QA is Chromium viewport testing, not a physical-device claim.

If Git reports local changes or the fetched PR head differs from the reviewed head, **stop**; do not reset, clean, force-push or incorporate concurrent work blindly. `view` intentionally stays open: press Ctrl+C before continuing. Do not use the illustrative `<...>` token literally or checkout another PR.

## 2. Separate source/rights + budget approval

Resolve current endpoint terms and the exact **private internal business research**, 24h raw retention and deletion scope; commercial/public redistribution remains forbidden. If written permission is needed, obtain it yourself before GO. The source inquiry is in [SOURCES.md](SOURCES.md); no provider was contacted. Confirm public endpoint/alias availability during the one approved attempt only, not a hidden preflight. No paid fallback, key creation, wallet funding or alternate endpoint.

The actual pinned source pair is `wss://api.mainnet-beta.solana.com/` and `https://api.mainnet-beta.solana.com/`, program `6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P`. Official docs now list a different canonical host; this head makes no silent switch. Caps: 120s, one WS attempt, 2,000 frames, 4,194,304 stream payload bytes, 65,536 bytes/frame, three selected signatures, six total read attempts, 262,144 bytes/HTTP response, 5s timeouts, zero retries/reconnects and $0 paid budget. A ping/control frame or public-endpoint denial can end the session early. No guarantee of an event or successful finalization.

Store a written approved-scope record privately outside Git and calculate its SHA256 (e.g. `Get-FileHash -Algorithm SHA256 <approved-record>`). This hash is a reference, not a substitute for permission. Copy `approval.example.json` to an owner-only private directory **outside all Git trees**, restrict NTFS ACLs to your account and use encrypted storage. Do not store any private key, RPC credential, wallet or position in it.

Only after founder authorization, manually fill: exact `head`, unchanged scope hash, new `pilotId` (never reuse), a UTC `notBefore`/`expiresAt` window ≤15 minutes with ≥120 seconds remaining at launch, evidence hash, and the exact approval sentence shown in `policy.ts`. Set `sourceGo`, `rpcGo`, `privateResearchPermitted` true **only if actually approved**; keep `maxCostUsd=0`, retention 24h and publication false. Approval parser rejects extra fields, duplicate JSON keys, stale/mismatched head/scope or missing grants.

Use UTC with seconds (not PowerShell's seven-digit tick format), for example after approval: `[DateTime]::UtcNow.ToString("yyyy-MM-dd'T'HH:mm:ss'Z'")` and `[DateTime]::UtcNow.AddMinutes(5).ToString("yyyy-MM-dd'T'HH:mm:ss'Z'")`. These only print clocks; they do not grant approval or start acquisition.

The fixed state root is `$env:USERPROFILE\.unfarmd-market-pilot`. It must be outside Git, without symlinks and have an owner-only ACL. A global `connection.lock` blocks concurrent pilots; `spent\<pilotId>.json` is permanent even after raw deletion. Leave prior #154 probe directories and budgets untouched.

## 3. One deliberate run, only after GO

```powershell
node experiments/live-market/run.mjs pilot --owner-go --approval "C:\OwnerPrivate\pilot-approval.json"
```

Use the actual outside-Git path you reviewed. All source endpoints and caps are pinned; no URL/key CLI overrides exist. The durable lock/spent marker precede DNS/socket creation. Watch the printed loopback URL: original notifications populate provisional rows with unknown mint/quote, selected supported original transactions can then populate exact identities with **same-provider RPC-reported finalized** labels. Unsupported records remain WAIT/withheld. Do not expect all candidates to verify: only the first three are selected, failed reads are spent, and stream/byte caps may stop earlier than 120 seconds.

The same process closes all source I/O and local view on cap/error/end and prints actual counts/latencies/gaps and the raw deletion deadline. Then inspect saved evidence without acquisition:

```powershell
node experiments/live-market/run.mjs status
node experiments/live-market/run.mjs view
```

Capture: exact head/scope/pilot ID, received frame/candidate counts, finalized same-provider count, **independent-provider count zero**, rejected/ignored/duplicate counts, RPC attempts/bytes/RTT, source-clock lag caveats, gap/stop reason and complete private raw hashes. No guarantees of latency, complete launches, volume, liquidity, edge or executable returns. Share only a redacted operational summary after confirming rights; no raw financial/identity data automatically enters GitHub or a public page.

## 4. Kill, crash and raw retention

- **Ctrl+C** aborts WS/HTTP and pending queue; source callbacks after stopping cannot acquire. Or create `$env:USERPROFILE\.unfarmd-market-pilot\STOP` (ordinary empty file); a 100ms poll stops source I/O. Keep STOP present to prevent another run. OS/disk stalls may delay process timers; Task Manager can terminate this owned process if unresponsive. No auto recovery.
- After a crash, **do not delete/reuse the pilot directory or spent marker**. Inspect the local lock's PID, verify that this worker is dead and its source connection closed. Only after owner review remove the stale `connection.lock`; retain `spent\` permanently. Resume requires a newly approved head/window/unique ID/budget. Start-to-end and between-run gaps remain unknown; no automatic historical fill.
- Raw retention is an **owner-operated 24h deletion obligation**, not an installed daemon. A `rawRetentionDeleteByUtc` deadline is saved/printed. After stopping and any approved private review, delete only that pilot's raw directory by the deadline, preserving the permanent `spent\` markers. Do not delete `.unfarmd-market-pilot` wholesale to reset budgets. No raw retention/publication beyond approved rights; long-term derived evidence needs its own permission. This PR never deletes existing real data itself.

## Pilot acceptance / subsequent GO

PASS only if actual original events arrive, supported exact identities and finalized corroborations match their raw receipts, counts/bytes/latencies/gaps agree, duplicate/cap/kill behavior works and rights/deletion remain compliant. Zero events or zero verified creations is a **measured miss**, not a success claim. Report any cap/429/403/schema/clock/stream failure; do not retry. Ask for a separate dedicated-provider/runtime/credential/cost approval only after reviewing the real pilot. No persistent process, production launch, public alert, trade or merge follows automatically.
