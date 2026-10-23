# Owner-PC execution card — one session, not authorization

Prepared October 23, 2026. **Current decision: BLOCKED. Commands 1–8 are preparation/local viewing; command 9 is forbidden until a separate founder GO.** This card does not grant source rights or change any gate. Use the final human-reviewed PR #161 SHA, not a moving branch name. Calendar labels such as “tomorrow” do not create an approval window.

## Before opening PowerShell

- Use a dedicated clean checkout on the owner Windows PC, Node 20+ and Git. Use normal TLS/network settings. No Helius/key/wallet/account/funding, paid fallback or production service is needed. Do not remove a managed proxy or TLS guard to make this work. Windows/NTFS/physical-device acceptance remains owner-operated, not tested on a Windows PC by the agent.
- In File Explorer, create `%USERPROFILE%\UNFARMDPrivate` and `%USERPROFILE%\.unfarmd-market-pilot` outside all Git trees, shared/synced folders and links/junctions. In each folder's **Properties → Security → Advanced**, disable inherited access, remove other-user/group grants and retain your own account's access. Verify the resulting ACL; Windows ACLs are **not** enforced/verified by the Node mode-bit guard. Use an encrypted local drive; do not upload these folders. If unable to establish private access, stop.
- Copy `experiments\live-market\approval.example.json` using Explorer to `%USERPROFILE%\UNFARMDPrivate\pilot-approval.json`. Keep all three GO flags **false**, the zero head/hash and disabled sentence until a separate approval actually exists. The original checked-in template remains unchanged. Edit only this private copy; do not put it in Git or add credentials.
- Retain the selected source's dated applicable terms/clauses and written clarification if necessary in `%USERPROFILE%\UNFARMDPrivate\approved-scope.txt`, including the reviewed head/budgets and actual grant if obtained. [SOURCES.md](SOURCES.md) separates documentation evidence from permission. PumpPortal's personal-use/free offering is not UNFARMD business authorization and is not required for an independent RPC-only choice. No private/business/retention grant is made here.
- Decide who will delete **all source-derived pilot files, including summary**, within 24 hours. If leaving the PC for a week, complete the permitted review and deletion before leaving; do not rely on an absent owner or an uninstalled deletion daemon. Keep permanent `spent\` budget tombstones. Do not leave this process running for mobile access.

## Ten commands maximum

Run one line at a time from the dedicated repository root in PowerShell. Replace `REVIEWED_PR161_SHA` with the final reviewed 40-character SHA from the PR. Stop on any error or mismatch; do not reset, clean, force-push or overwrite concurrent work.

```powershell
git fetch origin main feat/live-market-pilot
git status --short
git checkout --detach "REVIEWED_PR161_SHA"
npm ci --ignore-scripts
npm ci --prefix experiments/live-market --ignore-scripts
(Get-FileHash -Algorithm SHA256 "${env:USERPROFILE}\UNFARMDPrivate\approved-scope.txt").Hash.ToLowerInvariant()
node experiments/live-market/run.mjs scope
node experiments/live-market/run.mjs view
# STOP HERE. Close the local view with Ctrl+C. No source has been authorized.
# Command 9 ONLY after the separate rights/head/window/budget GO described below:
node experiments/live-market/run.mjs pilot --owner-go --approval "${env:USERPROFILE}\UNFARMDPrivate\pilot-approval.json"
node experiments/live-market/run.mjs status
```

After command 1, check the PR on GitHub: if the current head differs from the reviewed head, stop for review. After command 2, any output means stop and preserve those files. Command 3 must check out the specified reviewed SHA. Command 6 hashes only your private record, never contacts a provider; if that record changes, its hash must be recomputed before any GO. Command 7 must match the source pair/caps/hash below. Command 8 prints a random `127.0.0.1` URL: open only that local URL; NOT RUN/NULL counts are intentional. Its polling has no provider capability. Ctrl+C closes it before proceeding. During command 9 the same process prints the live local-view URL; the phone cannot reach it. On normal stop the source and view both close; command 10 reads the saved local summary without acquisition. No provider preflight, ping, endpoint test or second pilot is included.

## One-session approval mapping — owner only, after permission

The existing [disabled JSON template](../approval.example.json) is the exact parser shape. Do not add fields. Fill it manually in the private copy **only after** the founder has separately approved:

| Template field | Required value / evidence |
|---|---|
| `version` / `scopeHash` | Preserve `owner-pc-launch-pilot/1` / `32752e12d052b82a0433503a05f35776ee22be79a58108e816e34b88f31f37d7`. |
| `head` | Final approved 40-character PR SHA, identical to detached checkout. A later docs/code commit requires fresh exact-head review. |
| `pilotId` | Fresh `pilot-` plus 12–60 lowercase letters/digits/hyphens; never reuse an ID or prior budget. |
| `notBefore` / `expiresAt` | Explicit UTC with `Z`, e.g. the format `yyyy-MM-ddTHH:mm:ssZ`; ≤15-minute approval window, ≥120 seconds remaining at launch. Use actual session clocks, not example dates. |
| `termsEvidence` | Nonzero lowercase SHA256 printed by command 6 for the final private approved-scope/rights record. A hash/checkbox cannot create permission. |
| `sourceGo` / `rpcGo` / `privateResearchPermitted` | All stay false until the actual separate grant, then owner may set true. |
| `retentionHours` / `maxCostUsd` / `publicOrCommercialPublication` | Preserve `24` / `0` / `false`; incompatible rights mean STOP, not a silent template change. |
| `approval` | Only after GO: `OWNER APPROVES THIS EXACT HEAD AND ONE PRIVATE ZERO-COST PILOT`. |

Proposed grant, **not issued by this document**: “I approve this exact head/scope and the two pinned public RPC endpoints for one private development session, with the caps below, a new ID/window, documented permitted use and 24h raw deletion. No budget reuse, retries, provider fallback, publication, persistent operation or Agent B resources.”

Pinned endpoints: `wss://api.mainnet-beta.solana.com/` and `https://api.mainnet-beta.solana.com/`. One connection attempt / 120 seconds / 2,000 frames / 4,194,304 stream payload bytes / 65,536 bytes per frame / three selected candidates / six reads / 262,144 bytes per HTTP response / 5-second timeout / $0 paid spend / no retry or reconnect. Only `logsSubscribe`, `getTransaction`, `getSignatureStatuses`; no transaction submission. Canonical public-host differences require separately reviewed scope/code approval, never URL substitution.

## Kill, report and close

- **Ctrl+C in the pilot terminal** kills source I/O and queued work. Backup: Explorer creates an ordinary empty file named exactly `STOP` (not `STOP.txt`) in `%USERPROFILE%\.unfarmd-market-pilot`; 100ms polling stops the process. Leave it present to prevent another session. If hung, terminate only the owned worker PID in Task Manager. Timers are not protection against OS/disk stalls.
- Crash: preserve `connection.lock`, pilot files and permanent spent markers. Verify the process/connection is dead before owner-reviewed stale-lock removal. No restart is authorized; a future attempt needs a new ID and budget. Do not delete state to reset limits.
- Fill the [sanitized report template](RESULT_REPORT.example.json) from actual terminal/summary fields. Counts are null before running; failures/zero arrivals remain failures/zero, never synthetic replacements. Report same-provider finality, not independent validation. Raw payloads, exact candidate identities, signatures, rows, private paths, rights correspondence and source hashes stay private; sanitized output still needs retention/publication review.
- Copy `counts` as reported: `frames` includes the subscription acknowledgement; `rejected`, `ignored`, `duplicates` and candidate/finality counts are different counters, not an additive population partition. Do not calculate “accepted launches” by subtraction. Copy `rpcOwnerClockRoundTripMs` as owner-clock request/response timing, not independently verified event/discovery latency. Source clocks and the number of missed launches remain unknown.
- Respect the printed `rawRetentionDeleteByUtc`; delete only the spent pilot's source-derived directory after stopping and permitted review. Preserve `spent\` permanently. Keep rights records only as permitted. No merge, deployment or persistent-feed GO follows from a successful session.

If SHA, source permission, ACLs, deletion ownership or founder GO remains unresolved on PC day, stop after command 8. That is an honest readiness rehearsal, not a live-feed success.
