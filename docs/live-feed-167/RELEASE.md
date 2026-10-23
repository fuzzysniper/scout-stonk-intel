# UNFARMD private creation viewer release

23 October 2026 · issues #167/#166 · **code candidate only; SOURCE/DEPLOYMENT NO-GO**. This replaces #168's earlier exact-mint launch plan. Do not call the service live until the separately approved worker, store and protected mobile viewer demonstrate actual retained provider observations.

## One combined candidate

- Continue C's #168 from `29ae3cb86f8de5b3e00f19569cb066d64360b172`.
- A #170: `5c89f210b06906d364dce671add4fdb077a118f8`, unchanged inactive Helius worker.
- B #169: **`5390e75b1300abbe6b2b6ba8364dcaffdca4de84`**, unchanged ledger/API. This deliberately includes B's later ACL hardening and missing-control-row STOP fix after the originally requested `c4a6475` checkpoint. `scout-live/1` and worker scope remain unchanged. [Coordination](https://github.com/fuzzysniper/scout-stonk-intel/pull/169#issuecomment-6370247058).
- Current-main ancestry preserves `6a9ba2fa58235acd6c56bc4fdf09fefa38f01127` and every prior collector commit. Existing lookup/preflight gates, old APIs, collector/scheduler, root dependencies and deployment protection remain unchanged.
- Final combined SHA, exact-head CI and automatic preview are in PR #168. Review/release **that one SHA**, not a mixture of the three standalone branches. Do not additionally merge the parents into it. Any newer required A/B/main change needs a scoped refresh and renewed checks.

The homepage uses B's typed `lib/live-ledger/contract.ts`. It never connects to Helius, Render or a wallet. Original event records exist only after a successful authenticated `/api/live-events` response. No sample feed, fixture flag, cached success, public data endpoint or arbitrary-mint fallback exists in the product. SCOUT IT is visibly unavailable; its old components/tests remain historical, not mounted at `/`.

## Browser and source boundaries

1. Normal Vercel Authentication **and** the separately provisioned owner bearer are required. The bearer is entered directly into the page, never via chat, a URL or repository configuration. Input clears after submission; the read token lives only in a ref in page memory. Lock, page exit and reload clear it. No local/session storage, cookie, analytics or token logging is added.
2. Same-origin GET uses `credentials:'same-origin'`, `redirect:'error'`, `cache:'no-store'`. Cookies serve the existing hosting login; the bearer serves the additional application gate. Requests are serial, foreground only and no faster than every 5s. Hidden pages abort/pause; authorization, malformed data, timeout and storage/network errors halt without automatic retry. Manual reauthorization is explicit.
3. STOP has its own re-entry/confirmation form. It sends only an explicit empty **POST** `/api/live-events/stop`, owner bearer and `X-Scout-Live-Intent: STOP_SCOUT_LIVE`. There is no start/resume or automatic STOP. Pending/failed STOP is **unknown**, never confirmed success. Only B's valid success reply establishes the durable latch; it does not prove physical socket closure. A read cannot erase an in-memory confirmed STOP. Leaving while pending can lose acknowledgment: do not retry blindly.
4. B enforces the **actual immutable production unique host**, project/repository identity, same origin and application authorization. Preview environments and custom aliases are not admitted merely because the homepage loads. Use the real protected production unique URL after a separately approved code release. Never weaken protection, inject a bypass token, spoof hosting headers or change B's rules to make a preview pass.
5. Feed states are distinct: locked, waiting, observing, stale, disabled/unavailable and durable STOP. Provisional rows preserve signature/slot/original worker receipt and withhold mint/quote identity. Finalized rows expose the validated exact identity and original receipt hashes/clocks as **same-provider RPC-reported-finalized**, not independent replay or token safety.
6. Database snapshot and heartbeat clocks remain separate from frame/pong freshness, worker lease, open/ended gaps, errors and reserved quotas. A database refresh does not renew source evidence. Local aging can only withhold freshness. Counts describe retained bounded observations, not all market creations, unique tokens or profitable calls. Native SOL uses the protocol sentinel, not WSOL.

## Owner release sequence

**PC — preparation and exact-code approval:**

- Review combined PR SHA/CI, [verification](VERIFICATION.md), unchanged A/B trees and old security/collector state. Review frontend receipt labels and STOP semantics. No schema or backend algorithm is rewritten by C.
- Privately verify the **existing** Helius account's actual rights, plan/credit weights and hard overage controls; approve derived display, normalized-record retention, physical purge/backup limits and exact capped session. Do not buy another subscription or reuse the restricted proof key/budget.
- Approve Render plan/cost, one dedicated worker/instance, separate DATA key and worker/reader/STOP roles, source allowance and installation separately. Secrets are owner-managed through the approved service configuration; none are requested by this task.

**PC — separate infrastructure/code GOs, not executed here:**

- Target the existing Vercel `riskledgerapp/scout-stonk-intel` project (`prj_OaA9snVrMUkpXuz6cMSKfSZ6fx5Q`), and the dedicated inactive Render worker from B's inert manifest. Preserve existing Vercel protection and legacy proof controls. No domain move or route exception.
- Founder approves exact-head merge/release consequences separately. Record actual resulting deployed SHA, immutable READY production ID/host, environment and effective protection on **both** feed/STOP routes, not just the homepage. A build/preview success is not this evidence.
- Owner independently approves/installs B's reviewed isolated schema/roles and one authorization row, verifying current SQL digests and actual combined code head. Keep source off initially. Follow [B's owner runbook](../operations/scout-live-ledger.md) and [A's bounded source runbook](../../experiments/live-stream/RUNBOOK.md), not expired USDC proof windows.
- Verify the dedicated worker's exact build/start/Node24.19 and current combined-head binding, store identity and approved expiry; source remains OFF. `UNFARMD_DATA_ACTIVATION`/approval, store/API flags and the false example grant are not changed by this integration. An owner must separately authorize every environment/DB/deployment change.

**Distinct source GO and actual acceptance:**

- Only after rights/costs/key/retention/hosted security/STOP plan pass, owner may separately authorize one bounded Helius session. No approval is inferred from this PR. Current grant/session and logical record retention are **at most one hour**, not a service that will run for a week without a PC.
- Observe genuine provider messages and selected finalized creations through A → B → authenticated C. Reconcile original signature/slot/receipt, hashes, mint/program/quote and verification completion with the actual authorized evidence. No fixtures or one-shot PumpSwap snapshot substitute for this flow.
- Complete [iPhone acceptance and STOP](IPHONE.md). Retain sanitized counts/clock evidence, not tokens, provider endpoints/keys or private financial information. A measured miss stays a miss. If no actual retained events or protected iPhone success exists, do not announce a live MVP.

## Incident and rollback

From iPhone, separately authenticated STOP is the only mutation. Require actual acknowledgment, then verify native closure/worker state; STOP cannot cancel already admitted work or physically close a paused process. If persistence is unavailable or uncertain, use the owner-approved emergency Render pause/termination and key procedure from A/B's runbooks. Do not improvise credential changes or assume closing the browser stopped the source. Never clear STOP, reset tickets, extend a grant or scale a replacement to bypass an uncertain lease.

Before activation: hold #168; no live state exists to undo. After an approved pilot: latch STOP, confirm native closure and owner-approved dedicated-worker pause, then separately disable only the new API/store/source configuration through normal reviewed operations. Preserve the control row, spent quotas, ambiguous attempts and original evidence. Physical retention cleanup/backup decisions need their own authorization.

For a UI regression, revert only C's live-viewer commit via review against then-current main; restoring the old exact-mint view does **not** activate GET. Do not revert A/B storage/control or old cleanup/proof gates as part of a cosmetic rollback. For the whole combined release, inspect the exact reviewed revert/deployment compatibility and keep source stopped; never reset main or lose collector history. Any production rollback remains an owner action, not authorized here.
