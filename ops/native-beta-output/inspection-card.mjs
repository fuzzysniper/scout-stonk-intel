// Secret-free Actions output only. Never calls a service or reads a credential.
import {appendFileSync} from 'node:fs';
import {canonical} from './identity.mjs';
import {inspectionContext,inspectionCard} from './inspection-context.mjs';
import {reportFailure} from './diagnostics.mjs';
try{
 const ctx=inspectionContext(process.env),card=inspectionCard(ctx,Date.now());
 appendFileSync(process.env.GITHUB_OUTPUT,'manifest='+canonical(card.manifest)+'\n');
 appendFileSync(process.env.GITHUB_STEP_SUMMARY,'## GET-only inspection — never deployment authority\n\nRun '+ctx.runId+'; SHA `'+ctx.sha+'`; expires '+card.expiresUTC+'.\n\nReview **inspection-read-only** in **native-pilot-setup**. Copy this exact approval comment:\n\n```text\n'+card.comment+'\n```\n\nManifest SHA-256: `'+card.manifestSha256+'`. At most nine fixed GETs, no retries. No archive key, rebuild, CLI, publication or upload. GitHub may create its automatic environment-job metadata. Expiry/denial/uncertain execution: STOP; no rerun authorized.\n');
}catch(e){console.log(JSON.stringify(reportFailure(e,'not_started')));process.exitCode=1;}
