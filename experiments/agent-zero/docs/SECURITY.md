# Security, recovery and review gates

## Threat boundary

Local owner-only experiment; no production route, provider adapter, credential reader, database, wallet, signing or execution endpoint. Bind is fixed to `127.0.0.1`. Exact Host prevents DNS rebinding; cross-origin Origin / Sec-Fetch-Site is denied. Mutation additionally requires same-origin JSON and a non-simple local header; no CORS. Static paths are allowlisted. CSP restricts all assets/connections to self and forbids framing. User text uses DOM text nodes, not HTML insertion. POST ≤32 KiB; source ≤2 MiB, catalog ≤64 KiB; ledger ≤32 MiB / 10,000 events. No silent network fallback or automatic write retry.

This does not defend against a compromised owner account/device, same-origin malicious code, malicious local processes, privileged filesystem changes, or a rewritten repository. No authentication for other users is provided; never forward/tunnel/host the port. No telemetry or third-party asset request is used. Source locators are text, never automatically fetched.

## Storage and replay

Each mode has a separate journal outside the checkout. New POSIX files are 0600; private directory 0700 (Windows ACL / preexisting-directory review is manual). The app rejects checkout paths and symlinks into it; ledger symlinks are refused. No financial data belongs in Git, screenshots, issue comments or chat. Downloaded exports are also private and unencrypted.

Every entry includes canonical schema version, sequence, mode, original UTC, request ID/digest, previous hash and SHA-256 hash. Validity is rechecked on read, including decision evidence/policy/criteria, original quote/pool identity and causal order. Backward clocks, malformed/truncated tails and conflicting IDs fail closed. App writes append, fsync before acknowledgement and hold an exclusive writer lock. Identical mutation retries return the original receipt; a changed payload with that ID fails. Import is idempotent per record, **not atomic across the batch**; after a failed acknowledgement inspect the journal before a deliberate retry. No writer auto-retries.

These are application immutability and local tamper evidence, **not a signature, independent timestamp or write-once medium**. Whole-file owner rewrites remain possible; independent anchors are a future requirement. No ledger upload/import or transaction reconciliation is implemented. Source/catalog byte hashes identify bytes, not source authenticity, financial truth or redistribution permission.

## Operator recovery

1. Stop every local Agent 0 process. Copy the entire private directory to an owner-controlled backup; record hashes/size without publishing contents. Do not continue in a browser claiming an append succeeded after an error.
2. A `.lock` is never cleared automatically. Confirm no writer remains before separately moving the stale lock aside. Do not delete a lock from an active process.
3. A torn tail, broken chain or contradictory event requires operator examination against the backup and last acknowledged head. Do not silently trim/rebuild financial history. Keep corrupt bytes as evidence; do not claim the app repaired them. A separately reviewed recovery/import tool is needed if valid recovery cannot be established.
4. Rebuild/run after correcting only the verified operational cause; re-read the journal before retrying with the same mutation. Missing/corrupt source files remain unavailable, never trigger a provider call. A partly loaded synthetic walkthrough may be discarded only as a clearly disposable demo after backup; genuine journals must not be reset for convenience.

## Approval gates / rollback

GO: private local metadata review, decisions and labeled offline arithmetic. NO-GO: actual market ranking, real NAV/ROI, live exposure or claim of proven edge. Human review is required for merge, source rights/acquisition, authentic finalized evidence, external anchoring/reconciliation, custody setup and each future actual capital decision. No approval is implied by a UI action or “shadow” label. No schedule, secret, LOOKUP_APPROVAL, RPC, SQL, Vercel, collector or Cloudflare change is included.

Rollback: stop the local process; keep private journals/backups intact; remove/revert only this `experiments/agent-zero/` addition. There is no production feature or account to disable and no dependency/workflow migration. Existing #137/#143/#148 branches are unchanged.

## Brand provenance

The read-only bone Outlier mark `web/outlier.svg` is copied from PR #144, commit `8d1bbdf13273cff03b962208b0ba87657607cba2`, path `docs/brand/unfarmd-symbols/final/outlier-reversed.svg`. File SHA-256: `1f3aa392567a9b79f627f9d324166cda32ac589ca355f98c16586a5a5ded9dab`. Founder direction only; trademark/commercial clearance remains pending. No consumer artwork or prior branch was modified.
