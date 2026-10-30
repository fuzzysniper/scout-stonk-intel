// Offline renderer only: no driver, network, env, credential read or execution command.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
export const BASE='76dea8aab3f26eef39c2fcbc1b0b37d13180388f';
export const A='6efb0eb66a79087b9c7a59b9a06ad584e9130ee9';
export const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
export const sha=v=>createHash('sha256').update(v).digest('hex');
export const SOURCES=['lib/v4-private-journal/schema.sql','lib/v4-thesis-api/rate.sql','ops/v4-journal/sources/owner-ledger.sql'];
const read=f=>fs.readFileSync(path.join(ROOT,f),'utf8');
export function inventory(){const m=JSON.parse(read('ops/v4-journal/sources.json'));if(m.base!==BASE||m.ownerHead!==A)throw Error('package_source_mismatch');for(const f of SOURCES)if(sha(read(f))!==m.sha256[f])throw Error('package_source_mismatch');return m;}
const once=(s,from,to)=>{if(s.split(from).length!==2)throw Error('ownership_source_patch_mismatch');return s.replace(from,()=>to);};
export function render(){
 inventory();const catalog=read('ops/v4-journal/catalog.sql').trim().replace(/;$/,'');
 const sources=SOURCES.map(f=>read(f).replace(/^BEGIN;\s*$/m,'').replace(/^COMMIT;\s*$/m,''));
 // Preserve original input bytes/provenance; scope emitted DDL to the actual object owner.
 sources[0]=once(sources[0],'REVOKE ALL ON SCHEMA unfarmd_journal FROM PUBLIC;\nSET LOCAL ROLE unfarmd_journal_owner;', 'SET LOCAL ROLE unfarmd_journal_owner;\nREVOKE ALL ON SCHEMA unfarmd_journal FROM PUBLIC;');
 sources[2]=once(sources[2],'REVOKE ALL ON SCHEMA unfarmd_v4_owner,unfarmd_v4_pilot FROM PUBLIC;', 'SET LOCAL ROLE unfarmd_v4_boundary_owner;\nREVOKE ALL ON SCHEMA unfarmd_v4_owner,unfarmd_v4_pilot FROM PUBLIC;\nRESET ROLE;');
 sources[2]=once(sources[2],'ALTER TABLE public.v4_owner_account OWNER TO unfarmd_v4_boundary_owner;', 'GRANT CREATE ON SCHEMA public TO unfarmd_v4_boundary_owner;\nALTER TABLE public.v4_owner_account OWNER TO unfarmd_v4_boundary_owner;');
 sources[2]=once(sources[2],'REVOKE ALL ON public.v4_owner_user,public.v4_owner_session,public.v4_owner_account,public.v4_owner_verification FROM PUBLIC;\nSET LOCAL ROLE unfarmd_v4_boundary_owner;', 'SET LOCAL ROLE unfarmd_v4_boundary_owner;\nREVOKE ALL ON public.v4_owner_user,public.v4_owner_session,public.v4_owner_account,public.v4_owner_verification FROM PUBLIC;');
 sources[2]+='\nRESET ROLE;\nREVOKE CREATE ON SCHEMA public FROM unfarmd_v4_boundary_owner;';
 const hardening=read('ops/v4-journal/hardening.sql'),digest=sha(JSON.stringify(['pg18-ownership/1',...SOURCES.map((f,i)=>[f,sha(sources[i])]),['hardening',sha(hardening)],['catalog',sha(catalog)]]));
 const guard=`DO $guard$ BEGIN IF current_database()<>'unfarmd_v4_pilot' OR pg_is_in_recovery() OR current_setting('server_version_num')::int<150000 OR current_setting('fsync')<>'on' OR current_setting('synchronous_commit')<>'on' THEN RAISE EXCEPTION 'isolated_primary_required';END IF; IF EXISTS(SELECT 1 FROM pg_namespace WHERE nspname IN ('scout_live','scout_mint','scout_lookup','scout_continuous')) THEN RAISE EXCEPTION 'legacy_schema_forbidden';END IF;END $guard$;`;
 return `-- UNEXECUTED REVIEW PACKAGE. Separately approved owner operation only. No database creation, passwords, policy or source enrollment.\n\\set ON_ERROR_STOP on\nBEGIN;\nSET LOCAL search_path=pg_catalog;\nDO $membership$ BEGIN IF current_setting('server_version_num')::int>=160000 THEN PERFORM set_config('createrole_self_grant','set',true);END IF;END $membership$;\nSET LOCAL lock_timeout='2s';\nSET LOCAL statement_timeout='15s';\nSET LOCAL idle_in_transaction_session_timeout='30s';\n${guard}\nSELECT pg_advisory_xact_lock(233,1);\nSELECT EXISTS(SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='unfarmd_v4_deploy' AND c.relname='installation' AND c.relkind='r') AS installed \\gset\n\\if :installed\nSET LOCAL ROLE unfarmd_v4_deploy_owner;\nDO $verify$ DECLARE actual text;BEGIN SELECT catalog_digest INTO actual FROM (${catalog}) q;IF NOT EXISTS(SELECT 1 FROM unfarmd_v4_deploy.installation WHERE singleton AND release_digest='${digest}' AND catalog_digest=actual) THEN RAISE EXCEPTION 'package_catalog_mismatch';END IF;END $verify$;\nRESET ROLE;\n\\else\nDO $fresh$ BEGIN IF EXISTS(SELECT 1 FROM pg_namespace WHERE nspname NOT IN ('public','pg_catalog','information_schema') AND nspname NOT LIKE 'pg_%') OR EXISTS(SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public') OR EXISTS(SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace WHERE n.nspname='public') OR EXISTS(SELECT 1 FROM pg_roles WHERE rolname LIKE 'unfarmd_%') OR EXISTS(SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public') THEN RAISE EXCEPTION 'fresh_isolation_required';END IF;END $fresh$;\n${sources.map(s=>s+'\nRESET ROLE;').join('\n')}\n${hardening}\nSET LOCAL ROLE unfarmd_v4_deploy_owner;\nINSERT INTO unfarmd_v4_deploy.installation SELECT true,'${digest}',catalog_digest FROM (${catalog}) q;\nRESET ROLE;\n\\endif\nCOMMIT;\n-- No roles are enabled for login. No users, sessions, policy, source budgets or keys installed.\n`;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 if(process.argv.length!==2)throw Error('renderer_accepts_no_connection_arguments');process.stdout.write(render());
}
