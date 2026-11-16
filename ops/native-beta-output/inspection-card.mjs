// Secret-free Actions output only. Never calls a service or reads a credential.
import {appendFileSync} from 'node:fs';
import {canonical} from './identity.mjs';
import {inspectionContext,inspectionCard} from './inspection-context.mjs';
import {reportFailure} from './diagnostics.mjs';
try{
 const ctx=inspectionContext(process.env),card=inspectionCard(ctx,Date.now());
 appendFileSync(process.env.GITHUB_OUTPUT,'manifest='+canonical(card.manifest)+'\n');
 appendFileSync(process.env.GITHUB_STEP_SUMMARY,'## GET-only inspection v3 — never deployment authority\n\nRun '+ctx.runId+'; SHA `'+ctx.sha+'`; expires **'+card.expiresUTC+' (UTC)** / **'+card.expiresChicago+' (America/Chicago)**.\n\nReview **inspection-read-only** in **native-pilot-setup** and approve as **fuzzysniper**. No free-text phrase is required for this GET-only inspection.\n\nPolicy: `github-environment-owner/1`; manifest SHA-256: `'+card.manifestSha256+'`. At most 18 GETs: eight fixed non-alias reads plus up to ten fixed-project/team alias pages (100 records/page, 1,000 total); policy `vercel-alias-enumeration/1`, no retries. No archive key, rebuild, CLI, publication or upload. GitHub may create automatic environment-job metadata. Expiry/denial/uncertain execution: STOP; no rerun authorized.\n');
}catch(e){console.log(JSON.stringify(reportFailure(e,'not_started')));process.exitCode=1;}
