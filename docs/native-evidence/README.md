# NativeEvidenceV1 — controls and sampled concentration

Code-only DRAFT, exact #281 ca36baba5f8d8d2d2002bcdf6e3672c2c97aa7e5.
Original decoders, auth, ledger, SQL, STOP, UI, collector and source gates remain
byte-identical. No live source, SQL, key, provider contact or deployment.
Exact branch feat/274-native-evidence is Git-deployment-suppressed.

Contract first: a1f9a9e0d5c3336098c5750b14b738acaec66372, published on
[#274](https://github.com/fuzzysniper/scout-stonk-intel/issues/274#issuecomment-6615089453).
Contract fields stay unchanged. A owns the contract; B acquisition and C UI remain
separate. No caller-authenticated result or native bridge is introduced.

~~~ts
import {qualifyHolderCapture, analyzeNativeEvidence} from '../../lib/native-evidence';
const cap = qualifyHolderCapture(existingHolderCapture);
const evidence = analyzeNativeEvidence({mint, evaluatedAt: serverUtc, holderEvidence: cap});
// evidence.origin.providerAuthenticated === false ALWAYS.
// B separately establishes acquisition/admission outside this candidate engine.
~~~

Use A's qualifyHolderCapture wrapper for the complete three-read slice: it first
delegates every original #262 receipt/host/method/identity/slot/rights check; only
after success does it read the SAME validated batch mint using original
accountBytes / decodeMintBytes, retaining private controls bound to the original
mint-byte hash. No fourth mint RPC is needed. A directly supplied original
HolderEvidence still supports concentration, but only A's wrapper retains these
batch controls. Optional qualifyMintCapture is the original sealed onchain-capture
decoder; a separate current capture has separate provenance.
Same-slot byte/supply conflict or incompatible program/decimals withholds joint
controls/concentration; different slots never borrow an earlier supply denominator.

## Finite data coverage

| Capability | Actual calculation and original evidence | Coverage / remaining gap |
| --- | --- | --- |
| Mint/supply/controls | Original decoder; exact u64 supply/decimals, mint/freeze/delegate/hook/fee/pause/default-state/close controls. Byte and RPC hashes, original clocks/slot/paths. | Candidate only; no signer/PDA/multisig/issuer/backing proof. Null authority is present absence, not historical revocation or token safety. Unknown extensions block absence clearance; observed dangerous controls remain RED. |
| Selected concentration | Original largest<=20 selection -> exact later getMultipleAccounts batch including mint -> original getBlockTime. Sum / SAME BATCH supply; largest observed account, largest observed10, selected-total ratios. | Previously selected accounts, NOT current/full holder ranking. minContextSlot lower bound only; <=128-slot advance and changed balances retained. Calls are not atomic. Null/duplicate/mismatched/skew/zero/unsupported data withholds ratios. |
| Sampled same-owner groups | Sum balances sharing exact decoded token-owner AUTHORITY address; exact rational/floor bps. No exclusions. | Program owner, token-account authority, human, beneficial owner and relationship are distinct. CEX/custody/vault grouping is not collusion; fragmented addresses may belong to one person. Unselected balances unknown. |
| Screening | GREEN only narrow reviewed control absence; permissions RED, mutable custom controls YELLOW, unknown GRAY. >=50% sampled concentration RED, otherwise YELLOW because partial. | Deterministic review threshold, NOT fraud probability/calibrated risk score. No overall verdict. Full coverage/beneficial owners/relationships unknown. |
| Supplied transfers | <=64 supplied decoded SPL instruction candidates, <=1h named window, exact amount sums/token-account edges, per-instruction references. | NOT a transaction parser or authenticated history. Declared complete supplied scope/reviewed parsing, succeeded/exact mint, source clocks/slot/hash required. Partial/missing/duplicate/conflicting/unsupported -> NOT ESTABLISHED. Sums are instruction activity, not unique capital/net balances. Token2022 transfers unsupported. |
| Economic activity/custody | None. | Earliest buyers, wash trading, shared-funder collusion, price, quote volume, real momentum, LP custody, sellability and ROI NOT ESTABLISHED. |

## Precision and provenance

Financial quantities are BigInt-derived canonical raw strings. Each ratio publishes
numerator, denominator and floor basis points; zero denominator is undefined.
Raw amounts never pass through Number. Supply/share units are token base units,
not USD or economic value. Slots/time/decimals are bounded bookkeeping.
References retain request hash when available (null for legacy standalone mint
capture, whose original request bytes aren't retained), response/account hashes,
path, host/method, request/receipt times, context slot and requested commitment.
getBlockTime is a separate RPC block-time estimate, not receipt/account-change or
trade time. Finalized is REQUESTED, not independently replayed consensus.

Origin is ALWAYS candidate-only: synthetic/recorded/mixed labels. Caller flags,
URLs, hashes, copied JSON or timestamps cannot upgrade it. Positive GREEN/RED
rules describe candidate content; they do not authenticate acquisition.

## Acquisition still required

B supplies approved bytes and real origin/admission/STOP/rights outside this
engine; C retains origin, freshness, scope and unknowns. No result from this module
is independently authenticated. Original #262 holder validation accepts public-RPC
host names ONLY. A does not relabel Helius or widen its guard: a genuine Helius
holder bridge needs separately reviewed compatibility/method authorization.

Three-read holder recipe is not the mint-only getAccountInfo grant. Existing max
THREE attempts / FIFTEEN minutes is unchanged, not three calls plus retries.
No old budget/STOP reset. Mint plus separate holder recipe would be four calls,
NOT authorized; batch controls avoid the extra read. No SQL, provider call,
rights clearance, key or deployment occurred. Transport/auth aren't built here.

## Reproduction and evaluation

- npm ci --ignore-scripts
- NODE_OPTIONS=--import=$PWD/tests/security114/local-only.mjs bash tests/native-evidence/run.sh
- Same command with argument peers: original 294 pure mint/holder tests unchanged; NO SQL.
- Same command with argument examples: regenerate [representative outputs](LOCAL-SYNTHETIC.json).
- node --test tests/native-evidence/scope.test.mjs: finite source/mode/path/tamper checks.
- Types/lint/build/archive on actual new head; original #281 reviewers run unchanged
  on their immutable input, never widened to accept this additive module.
- Representative outputs are selected fields from actual deterministic execution
  on invented fixtures, NOT real observations. Full output uses the shared types.

After separate acquisition GO only: pre-register a fixed, unselected 20-mint list
before results (SPL/Token2022; controls present/absent/unsupported; sparse/null;
custody-heavy cases). Record every eligible/rejected/missing case and exact source
snapshot. Reconcile calculations against lawful original bytes. Report subgroup
coverage and discrepancies, not selected wins. No live evaluation, accuracy,
alpha or profitability claim now.

Rollback: close/revert only this additive draft; preserve old previews, all SQL,
STOP/counters/history/collector bytes and every suppression entry. Code review
does not authorize acquisition, installation or production.
