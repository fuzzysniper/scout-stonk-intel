# SCOUT scheduler staging — inactive

Standalone Worker tooling only; the Next.js app stays in the root project.
Requires Node >=22 (validated with Node 24.19.0). From repository root:

```sh
npm --prefix scheduler ci
npm --prefix scheduler run dry-run
npm --prefix scheduler test
```

These commands install locked development tools and validate locally. The dry-run
accepts no override arguments, never deploys, and removes temporary output. No
public fetch, routes, previews, Cron, credentials or enabled activation are supplied.
`SLOTS` binds the unchanged `SlotCoordinator` using declarative SQLite exports.

[Human PC deployment/removal, approvals, CPU/budget limits and exact results](../docs/CLOUDFLARE_STAGING.md).
No deploy script, auto-upgrade or scheduler activation is included. Human approval
of a staging deployment does not authorize App/secrets setup or an hourly pilot.

[Issue #68 hourly pilot NO-GO checklist and owner-only auth proof](../docs/HOURLY_PILOT_READINESS.md). The auth CLI is not a deployment hook and must never be run by Codex with a real key; it requires separate owner consent. No activation or Cron command is provided.
