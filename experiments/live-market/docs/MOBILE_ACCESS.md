# Future private mobile access — architecture only, NOT DEPLOYED

The existing dashboard is a working **owner-PC loopback reader**. It has no remote authentication and rejects other Host/Origin values. Do not bind it to `0.0.0.0`, tunnel it, forward ports or publish its `/state` output. Its saved summary contains source-derived rows, not a pre-sanitized public API. No cloud/mobile runtime, credential, domain or subscription is provisioned by #161.

## Smallest separately approved design

```text
Qualified source → one private acquisition worker → encrypted private journal
                         ↓ approved minimal snapshot
Owner iPhone → authenticated HTTPS read-only gateway → snapshot store
                         (no acquisition capability)
Owner incident STOP → separate authenticated control → durable disabled latch
                                                      ↓ short worker lease
```

1. **Source/license before runtime.** A dedicated standard Solana RPC provider is the first production candidate; require explicit internal-business-use, raw retention, derived-record and deletion terms, HTTP/WSS quotas and costs. PumpPortal is a separate alternative only after its business rights are resolved and a narrow adapter is reviewed. Pricing/free access is not licensing. Never borrow Agent B's credentials or proof budget. No provider is selected/qualified or funded here.
2. **Identity and privacy.** Single named-owner allowlist; passkey/MFA-capable identity provider; deny all anonymous access. Authenticate and authorize every snapshot request, with short revocable sessions, Secure/HttpOnly/SameSite cookies, CSRF protection on STOP and no bearer tokens in URLs/local storage. TLS, `no-store`, restrictive CSP, clickjacking protection, escaped text and no third-party analytics. Retain minimal auth audit logs under their own policy. Provider credentials stay worker-side, scoped/rotatable, never in browser or snapshots. Browser auth must not grant source-start/provider access.
3. **Isolation.** Dedicated approved private worker, not Vercel request handling, not the existing consumer app or Cloudflare scheduler/SLOTS. Read-only gateway has only snapshot-read rights; it cannot reach provider endpoints or journal secrets. Separate authenticated STOP endpoint can disable but **cannot enable, restart, extend leases or increase budgets**. No start button in mobile UI. Deployment, firewall, authentication and secrets require separate review/owner setup, not this PR.
4. **Budgets and restart safety.** New explicit persistent scope, not an extension of the 120s PC grant. Durable atomic connection lease/singleton and spend reservation before every connection/read; spent counters survive crash/deletion/redeploy. Explicit source event/byte/RPC/credit/$/duration limits and provider billing hard cap where supported. Unknown usage, unavailable budget store, schema drift, unexpected billing, ambiguous rights or expired lease means stop; no paid fallback. Startup defaults disabled. New runtime cost is TBD/$0 authorized today; approve a quoted ceiling before provisioning.
5. **Incident shutdown from mobile.** An owner STOP sets a durable disabled latch, revokes short acquisition leases and aborts all worker WS/HTTP/queued tasks. Worker must stop locally when lease renewal/control-store access fails. Show STOP requested/acknowledged, last worker heartbeat and unknown/unreachable state separately; HTTP success alone does not prove sockets closed. Independent runtime-level process/egress shutdown is the emergency fallback if worker fails to acknowledge. A watchdog may kill but never restart an expired/disabled worker. Recovery needs a new reviewed grant/ID, not clearing a flag from the phone.
6. **Gaps and clocks.** Preserve source/event, first receipt, finalized-check and heartbeat clocks separately; mark source clock unverified. No receipt is not proof of no events. Persist disconnect/start/stop intervals and incomplete coverage. Future bounded reconnect/backoff/backfill requires explicit provider rights and a shared durable budget; default disconnected/WAIT, no silent replay or reset. Deduplicate by source/signature/event identity, preserve revisions, provisional claims and rejected records. A provider notification never becomes independently finalized by passing through this gateway.
7. **iPhone view.** Snapshot reads never acquire or verify data. Show last worker heartbeat, snapshot age, source, provisional vs same-provider finalized counts, coverage/gaps, remaining approved budgets and STOP state. On stale/unreachable data show OFFLINE/UNKNOWN, not zero activity or a running animation. Activity remains incomplete unless the source coverage supports it. No market-cap/price/exit/return inference. Mobile refresh/back/foreground cannot start a worker or consume provider quota.
8. **Retention.** Approved raw TTL with automated audited deletion and backup expiry, plus separately permitted retention for derived snapshots/hash/decision metadata. Keep non-market spent-budget tombstones through deletion. Do not assume hashes or “sanitized” records evade source restrictions. The current PC pilot has manual deletion only and must not run unattended through the mobile week.

## Gates before any cloud/mobile activation

- Source rights resolved in writing/clear governing terms; quoted source/runtime costs and founder spend approval.
- Separately reviewed adapter/runtime, durable budgets/leases, secrets separation, authenticated gateway and incident controller; no source traffic during setup tests.
- Offline/security tests for unauthenticated access, stolen/expired sessions, CSRF STOP, snapshot-only access, clock skew, budget-store failures, replay/duplicate grants, crash/resume, TTL/deletion and network partition shutdown.
- Owner phone proves authentication, revocation, OFFLINE states and STOP acknowledgement with acquisition **disabled** first. Then a separately authorized measured pilot validates actual provider usage/disconnects and shutdown. No mobile/physical-device proof is claimed by this design.
- Named operator with mobile incident access, retention owner and emergency runtime shutdown; a reviewed go/no-go record. No week-long unattended activation merely because the founder leaves the PC.

Rollback: revoke the worker lease, retain the disabled latch/spend tombstones, stop the owned process and provider access, preserve permitted incident evidence, delete source data on its authorized schedule. Keep the public consumer app and Agent B proof untouched.
