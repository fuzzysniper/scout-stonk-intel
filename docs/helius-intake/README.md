# Honest Helius RawBatch intake — #284 corrective A draft

Exact base:905f5e68a2d53a3d1e54747e0b4a9632e96b0f8a.
Additive interface first:62992d1630c0f6f261c3d594b1609262d0c935ae.
Original NativeEvidenceV1, B's structural copy, all old public-RPC/mint/token
decoders, math/thresholds, B/C runtime/auth/state/SQL/routes and source flags remain
unchanged. Only A's analytics inspection hook and exports recognize a NEW cap.
Exact fix/284-helius-evidence-intake Git deployment suppression preceded first push.

## B/C interface

~~~ts
import {intakeHeliusBatch, analyzeNativeEvidence} from '../../lib/native-evidence';
// Intake has been checked against B's actual Intake/RawBatch types, not a mock schema.
const input = intakeHeliusBatch(rawBatch);
const evidence = input ? analyzeNativeEvidence(input) : null;
// evidence.origin.providerAuthenticated is ALWAYS false, including positive offline cases.
~~~

qualifyHeliusBatch creates a distinct process-local HeliusHolderEvidenceV1;
inspectHeliusEvidence returns its sealed candidate details or null. Original
inspectHolderEvidence does NOT recognize it; copies/JSON/flags cannot mint it.
HeliusRawBatchV1 exactly matches B's three Capture records, kind/mint/evaluatedAt
and rightsReviewSha256. The claimed digest is metadata, not legal permission.
No source-specific approved Review or native transport attestation is manufactured.

## What changed

The public decoder hardcodes public-RPC hosts; B honestly emits Helius. That is
why exact #284 previously spent three attempts then stopped without analytics.
New intake uses the ACTUAL Helius endpoint/method/original request/response/account
byte hashes and clocks. It never calls the public decoder with a substituted
host, creates a getAccountInfo capture, changes request IDs, or spends a fourth call.

JSON-RPC qualification is necessarily additive: original private public-host
qualification cannot be called on Helius. It reuses numericJson/integer, data,
clock/raw, largestRequest/accountsRequest/clockRequest/HOLDER_BOUNDS, accountBytes,
decodeTokenAccount and decodeMintBytes. No second binary parser. Original guards
and behavior remain frozen; explicit Helius envelope checks mirror their
request/response size, ID, mint/program/decimals, duplicate/order, lower-bound/
<=128slot advance, timing/spacing and blockTime requirements.

Both supply and controls are decoded from snapshot.value[0], the SAME balance
batch. No independent mint request or earlier denominator. Exact BigInt/rational
analysis is unchanged. Unknown extensions keep supported controls narrow and
concentration GRAY. Zero supply/empty selection has no ratio, not zero risk.

All RPC methods retain request-only finality, provider-served slots and separate
getBlockTime estimates. minContextSlot is a lower bound, not snapshot pinning.
Accounts are bound positionally to the exact requested address order, NOT to an
address echoed by the account data (none is provided). Response permutation that
preserves every layout/balance cannot be independently detected from mint/account
bytes alone; do not claim a validator/account inclusion proof.
Source host is never authentication; no native/authenticated observation exists
through this module. B's actual admitted source and receipt binding remain separate.

Known internal response/account byte copies are cleared on exit. Caller buffers
are not changed; no raw responses are retained in capabilities. JS strings/runtime
copies are not a guaranteed physical erasure mechanism.

## Actual regression coverage

| Path | Proven offline | Not proven |
| --- | --- | --- |
| Positive actual B sequence | Original acquire + original local fsync/anchor ledger + original recipe/mock wire -> real new qualifier -> real analytics; exactly3 reads,3 spent/completed credits; expected supply1,000,000 and selected200,000; honest Helius refs; original C schema/projection accepts24 findings. | TLS/provider origin, real owner session, remote transactional durability, actual source authorization or mounted current C adapter. |
| >2^53 / grouping | Actual B byte sequence, u64 supply18446744073709551615, sampled/grouped18014398509481984, rational strings. | Humans/beneficial owners, full holders, pool/CEX exclusions, collusion or price. |
| Receipt/admission negatives | Wrong/mixed host, mint/program/order/ID/hash, malformed/stale/skew/null/extension cases; B rejects tampered analytic receipt hash, spends all3 and STOPs; no fourth read/retry/refund. | No new database/remote-store concurrency or recovery proof. |
| Original rejection | Unchanged #284 functional and finite review runs on exact original905f5e6; its honest Helius incompatibility is retained, not rewritten. | A's new injected intake does not silently replace C's old nativeIntake; C must integrate explicitly. |
| Origin/unknowns | New and old caps cannot impersonate each other; JSON/copied flags fail; every offline success candidate_only/providerAuthenticated:false; unknown extensions/zero supply remain withheld. | No authentic native evidence, complete histories, funding/wash/momentum, ROI/exitability. |

Representative [LOCAL/SYNTHETIC output](LOCAL-SYNTHETIC.json) is generated by the
actual offline state-machine tests, not a stand-in analytic object.

## Exact command allowlist — no SQL

- npm ci --ignore-scripts
- NODE_OPTIONS=--import=$PWD/tests/security114/local-only.mjs bash tests/helius-intake/run.sh
- Same runner with examples regenerates the committed synthetic report.
- bash tests/native-evidence/run.sh (unchanged70 functional/security cases)
- bash tests/native-evidence/run.sh peers (unchanged294 pure decoder cases)
- NODE_OPTIONS=--import=$PWD/tests/security114/local-only.mjs bash tests/helius-intake/replay.sh
  runs original C38 and its finite scope2 on exact #284, no baseline changes.
- node --test tests/helius-intake/scope.test.mjs
- npx tsc --noEmit; npm run lint; offline npm run build; archive-tool check exact284.

Never blanket npm test, root Python/SQLite, native PostgreSQL, scheduler, SQL
installers, provider commands or current hosted endpoint tests. This work uses
B's original JSONL filesystem ONLY as a local regression fixture. It is NOT the
solution to B's Vercel storage-placement defect, and proves no remote-PG behavior.

## Gates and rollback

Code-only intake readiness, NOT activation. C must explicitly integrate this
exact entry with B's separately reviewed remote-state successor and test the
actual combined head. Original C runtime entry remains unchanged. Actual owner
access, scoped key, method rights/debits, remote state/independent anchor,
deployment and live three-attempt/fifteen-minute source GO remain unapproved.
No code/source/rights/SQL/private-key/service setup or old counter reset is
implied. No RPC, provider call, real credential/signature, SQL or deployment run.

Close/revert this corrective draft only. Keep every original PR head, decoder,
counter/STOP/history and all old deployment suppression entries intact.
