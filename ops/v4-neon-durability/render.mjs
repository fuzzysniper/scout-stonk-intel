// Pure OFFLINE candidate renderer. Does not select a provider, connect or execute SQL.
import fs from 'node:fs';import {fileURLToPath} from 'node:url';import path from 'node:path';
import {render as conventional,sha} from '../v4-journal/package.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
export const OLD_STEP="IF current_setting('fsync')<>'on' OR current_setting('synchronous_commit')<>'on' OR pg_is_in_recovery() THEN RAISE EXCEPTION 'pilot_durability_required';END IF;";
export const NEW_STEP="IF unfarmd_v4_deploy.neon_durability_admitted(NULL) IS DISTINCT FROM true THEN RAISE EXCEPTION 'pilot_durability_required';END IF;";
const replaceOne=(text,from,to)=>{if(text.split(from).length!==2)throw Error('reviewed_patch_mismatch');return text.replace(from,()=>to);};
export function candidate(){
 const source=fs.readFileSync(path.join(root,'lib/v4-owner-ledger/schema.sql'),'utf8');
 // Select the step function itself, never valid_mint's independent body.
 const step=source.slice(source.indexOf('CREATE FUNCTION unfarmd_v4_pilot.step')).split('AS $f$')[1].split('$f$;')[0];
 if(!step)throw Error('source_function_missing');
 const patchedStep=replaceOne(step,OLD_STEP,NEW_STEP),admission=fs.readFileSync(path.join(root,'ops/v4-neon-durability/admission.sql'),'utf8');
 if(!admission.includes("IS NOT DISTINCT FROM 'ep-tiny-truth-b4bx6xt9.c-6.us-east-2.aws.neon.tech'")||!admission.includes("IS DISTINCT FROM 'ep-tiny-truth-b4bx6xt9.c-6.us-east-2.aws.neon.tech'"))throw Error('direct_host_pin_missing');
 const admissionBody=admission.split('AS $neon$')[1]?.split('$neon$;')[0];if(!admissionBody)throw Error('admission_function_missing');
 let sql=conventional();
 sql=replaceOne(sql,OLD_STEP,NEW_STEP);
 const old="current_setting('fsync')<>'on'";
 const guard="(current_setting('fsync')<>'off' OR current_setting('full_page_writes')<>'off' OR current_setting('synchronous_standby_names')<>'walproposer' OR current_setting('server_version_num')::int/10000<>18 OR current_setting('neon.project_id',true) IS DISTINCT FROM 'twilight-hall-57571802' OR current_setting('neon.branch_id',true) IS DISTINCT FROM 'br-sweet-voice-b4x4et5q' OR (SELECT count(*) FROM pg_settings WHERE name IN ('neon.project_id','neon.branch_id') AND context='postmaster')<>2 OR current_setting('neon.tenant_id',true) IS NULL OR current_setting('neon.timeline_id',true) IS NULL OR NOT EXISTS(SELECT 1 FROM pg_settings WHERE name='neon.tenant_id' AND context='postmaster') OR NOT EXISTS(SELECT 1 FROM pg_settings WHERE name='neon.timeline_id' AND context='postmaster'))";
 sql=replaceOne(sql,old,guard);
 const needle='INSERT INTO unfarmd_v4_deploy.installation SELECT true,';sql=replaceOne(sql,needle,admission+'\n'+needle);
 const oldDigest=/release_digest='([a-f0-9]{64})'/.exec(sql)?.[1];if(!oldDigest||sql.split(oldDigest).length!==3)throw Error('release_digest_mismatch');
 const digest=sha(JSON.stringify(['unfarmd-neon-durability/1',oldDigest,sha(guard),sha(admission),sha(patchedStep)]));sql=sql.replaceAll(oldDigest,digest);
 return Object.freeze({sql,sqlSha256:sha(sql),stepSha256:sha(patchedStep),admissionSha256:sha(admissionBody),releaseSha256:digest});
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){if(process.argv.length!==2)throw Error('no_connection_arguments');process.stdout.write(candidate().sql);}
