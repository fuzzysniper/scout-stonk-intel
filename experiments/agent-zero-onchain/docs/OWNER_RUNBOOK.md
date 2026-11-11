# Owner PC: one bounded development probe — approval required

**Do not run the live command yet.** The implementation PR is draft. This task authorizes code/offline review only. It has made **zero mainnet RPC calls**. The founder's subsequent authorization is separate from Agent B's Helius/Neon proof and GeckoTerminal C0.

## Exact GO sentence to authorize later

> I approve ONE owner-PC development probe for issue #153 at reviewed commit **[INSERT EXACT PR HEAD SHA]**, using only **https://api.mainnet-beta.solana.com/**. Permit at most **two serial RPC attempts total**: one **getMultipleAccounts(finalized, base64)** for the five published accounts in scope **8bc80f985d5b89154f09753be405a4f832e9ea3cc6eb706adb7f837cf020cb56**, then one **getBlockTime** for that returned slot. Each attempt has a **10-second deadline**, no retries, redirects or fallback. Store raw responses/hashes and metadata only in **[INSERT ABSOLUTE PRIVATE DIRECTORY OUTSIDE GIT]**. Approval expires at **[INSERT UTC, WITHIN 24 HOURS]**. No Helius/Neon access, production activation, trading, deployment or merge. Stop at the first failure; do not reset/reuse the approval.

The [scope](request-scope.json) spells out all five full addresses and limits; the [README](../README.md) explains decoding, freshness and source limitations. This sentence is a review template, **not received authorization**.

## Before approval: no live requests

1. Use a clean separate checkout/worktree at the exact reviewed PR head; do not change Agent B's workspace. Inspect `git rev-parse HEAD` and `git status --short`. Check the pinned official IDL still matches the reviewed official revision before approving; a changed layout requires review, not a live guess. The offline `verify-idl.mjs` accepts a locally supplied official file; it never fetches one.
2. Use Node 20. With the root locked dependencies already installed, run `node experiments/agent-zero-onchain/test.mjs`. It compiles locally and runs mocked tests; no approval or RPC is needed. Root install/types/lint/build/archive/CI evidence is in the PR. `node experiments/agent-zero-onchain/run.mjs --help` must say DISABLED.
3. Use a direct, approved owner-PC network path with ordinary TLS verification. Configured proxy, `CI`, `VERCEL`, or disabled TLS verification causes a local stop. Do **not** unset inherited cloud/corporate guard variables to bypass policy. No key, URL override, `.env`, connection string, account creation or purchase is required. Public RPC is shared and can deny/rate-limit the request.
4. Review private directory ACLs/storage/sync/retention and the public-RPC development-use scope. No data is to be uploaded, committed or commercially published. This is a private diagnostic, not a production data license or reliable feed.

## After the exact written GO only: Windows PowerShell

From the reviewed checkout, prepare the file **outside Git**. The values below are local filesystem preparation, not an RPC command. Change the private directory only to the one the founder approved; leave its `observation` subdirectory nonexistent.

```powershell
$privateDir = Join-Path $env:USERPROFILE 'Documents\UNFARMD-private\pump153'
New-Item -ItemType Directory -Force -Path $privateDir | Out-Null
$approvalPath = Join-Path $privateDir 'approval.json'
if (Test-Path $approvalPath) { throw 'Existing approval: stop and review; do not overwrite or reset.' }
$approval = Get-Content -Raw 'experiments/agent-zero-onchain/approval.example.json' | ConvertFrom-Json
$approval.reviewedCommit = (git rev-parse HEAD).Trim() # Must equal the SHA explicitly approved.
$approval.approvedAt = [DateTime]::UtcNow.ToString('yyyy-MM-ddTHH:mm:ss.fffZ')
$approval.expiresAt = 'REPLACE_WITH_THE_EXACT_FOUNDER_APPROVED_UTC_EXPIRY'
$approval.evidenceDirectory = Join-Path $privateDir 'observation'
$approval.approved = $true # Only after the separate written GO above.
$utf8 = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($approvalPath, ($approval | ConvertTo-Json -Depth 10), $utf8)
```

Recheck the approved SHA, expiry, [scope hash](request-scope.json), full accounts and private path. The committed template remains `approved:false`; never commit an approved copy. Then **one deliberate invocation**:

```powershell
node experiments/agent-zero-onchain/run.mjs --one-shot-dev-probe $approvalPath
$LASTEXITCODE
```

The launcher compiles reviewed TypeScript using existing root dependencies into an OS temporary directory, runs only the gated CLI, then removes **compiled temporary files only**. It does not install, fetch, alter evidence, reset claims or deploy anything. On Windows the local filesystem ACL, not Unix mode bits alone, governs privacy.

## Interpret the result; never retry automatically

- **Exit 0 / accepted:true:** inspect private `result.json`, both original `.bin` bodies, metadata and attempt records. Check exact account identities, pool layout/defaulted fields, `finalizedContextSlot`, original timestamps, estimated block time/age, hashes, raw base/quote amounts, **signed** virtual amount and exact rational **wSOL/base**. A positive snapshot is RPC-reported evidence, not an independent consensus proof, current trade price, safety verdict or performance record. Do not promote it into Agent 0 eligibility.
- **Exit 1:** no accepted price. Preserve `.spent`, attempts, any complete raw responses and sanitized failure. A 403/429/timeout, null block time, stale context, new layout, Token-2022 account or persistence failure ends this authorization. Remaining nominal capacity is not permission to retry. Obtain a **new explicit** owner decision if another attempt is desired; do not copy/recreate/delete/reset the original approval or use another host/key.
- `.spent` can exist even when **zero** RPC calls were made, because a local persistence failure after claiming must fail closed. It is a conservative one-use marker, not a signed or tamper-proof budget against a hostile local owner. The code records the reviewed commit as an owner attestation, not independently authenticated running code.
- No source activation, hosted SQL, provider account, wallet action, publication, merge or production deployment follows from this run. Stop after reviewing this one observation. Any discovery/event/candle experiment needs its own source contract, budget, rights and approval.
