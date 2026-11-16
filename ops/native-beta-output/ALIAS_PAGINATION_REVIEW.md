# Alias completeness correction — code only, not inspection or deployment GO

Installed input: `c4cecb3ae8370713d78d08ff308a65632c7719d3`. Preserve it and run43792519144/job133054096204. Its actual sanitized log reports RUN_IDENTITY, OWNER_CONTROLS and PROJECT_AND_PROTECTION pass;6 calls; ALIAS_PAGE_COMPLETE/predicate_false; CLI not_started; sourceGo/activate false. It does not reveal which truthy pagination field triggered that predicate or how many aliases existed. No claim of >100 aliases, no reconstruction of the original response, no retry.

## Official contract (public documentation only, checked 2026-11-16)

- [GET /v4/aliases](https://vercel.com/docs/rest-api/aliases/list-aliases): projectId/teamId filters; numeric `until` for older records; required aliases and pagination objects.
- [Vercel SDK Pagination](https://github.com/vercel/sdk/blob/main/src/models/pagination.ts): numeric count, nullable numeric next and prev. [ListAliases](https://github.com/vercel/sdk/blob/main/src/models/listaliasesop.ts) uses that schema.
- [Vercel CLI getAliases](https://github.com/vercel/vercel/blob/main/packages/cli/src/util/alias/get-aliases.ts): passes the supplied next timestamp as until (this CLI source uses the older alias route; the v4 API documents the same timestamp parameter). It is source evidence only; the inspector neither imports nor executes the CLI.
- [Webhooks](https://vercel.com/docs/rest-api/webhooks/get-a-list-of-webhooks): fixed project/team GET, array response, no documented cursor. Existing empty-array/no-handler rule and the prior explicit wrapper remain enforced.
- [Integration configurations](https://vercel.com/docs/rest-api/integrations/get-configurations-for-the-authenticated-user-or-team): `/v1/integrations/configurations?view=account&teamId=…`, array response; project view could filter authorization-flow configurations and is not used. Empty/missing/global/applicable project scopes stay HOLD; prior explicit wrapper remains fail-closed on continuation. No integration-type filtering. Legacy endpoint is comparison only and never a fallback.

The former boolean rejects genuine continuation instead of enumerating it. It also conflates undocumented `pagination.until` with continuation. New parsing does not silently ignore that field: unknown pagination keys/missing required fields are a separate shape HOLD. Only explicit numeric next progresses, and only explicit null terminates. String/URL/boolean/zero/negative/unsafe/nondecreasing cursors are rejected, not coerced. Endpoint-specific docs/SDK schemas are authoritative; rendered example placeholders are not captured responses.

## Finite budget and safety

Inspection manifest/result v3, alias policy `vercel-alias-enumeration/1`, binds maxRequests18, maxAliasPages10, maxAliasRecords1000, aliasPageSize100. v1/v2 cards cannot authorize v3, even with a genuine owner review. Same sole owner/environment/run/attempt1/SHA/branch/30-minute expiry; every read rechecks expiry. Same4-second request timeout,1MiB response cap, no retry/redirect. A one-page success still uses9 GETs; worst case8 non-alias reads+10 alias pages=18. The existing five-minute workflow execution timeout is unchanged.

Every page is a reconstructed canonical `/v4/aliases?projectId=<pinned>&teamId=<pinned>&limit=100[&until=<validated integer>]`. No response URL is followed. Count must match rows. Cursors strictly decrease. Duplicate names or IDs, conflicting assignments, wrong project, malformed pages, missing required production aliases, caps, denied reads or uncertainty STOP. Seeing the four required domains never short-circuits enumeration. All1000 records may succeed only when page10 explicitly terminates; otherwise HOLD, no page11.

Shared `readAliases` covers inspection and uploader before/after checks. Uploader keeps its exact text authorization, journal, single CLI attempt, unchanged-domain and all other controls. Its existing24-Vercel-GET cap accommodates10 pages before+10 after+4 fixed Vercel reads; no uploader permission/window change. An acknowledged upload with incomplete post-read remains a failure with acknowledged journal, never success or retry.

Diagnostics expose only requested/validated page counts, record count and finite termination state. No alias rows/domains/cursors, response bodies, creator/bypass data, credential material or exception text. Existing inspection JSON goes identically to logs and Summary. Native HTTPS only; CLI/archive/decryption/publication imports stay unreachable in inspection.

## Limits and gates

Pagination is a bounded traversal of the API view, not an atomic platform snapshot. Concurrent changes may cause duplicates/conflicts and HOLD; unseen concurrent insertions cannot be disproved by this API. Uploader still compares the full pre/post returned map. This does not prove external-handler absence beyond API visibility or authorize mutation. An unexpected webhook/integration is a stop for owner review, not permission to delete or disable it.

C owns the separate dependency/security draft. This patch leaves all installed package/lock/security-validator bytes exact. Eight app/inspection passes do not clear the independent full uploader audit. No future run, installation, deployment, archive reuse, credentials or source permission is authorized here. Original encrypted artifacts/receipts and every old approval/run remain unchanged.

Public-source bytes checked (not operational responses): SDK listaliases SHA256 `d5a0af1ad892944b81cd077a6328ba51be0105ece3e0530b544b0e0c5b2d7ad3`; SDK pagination `c575b2bd1576fb5c29099575c7293e6bfd6a24efa39e3af2de2b1d7ae4579310`; CLI get-aliases source `0c2c20beed35569d831eae26caf6f82b8029b53f9ec3e825495072e1ca47e603`. No CLI was invoked for this contract research.
