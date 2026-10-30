// Disposable PG18.6, synthetic credentials only. All installation SQL runs as NON-superuser.
import {fixture as base} from '../v4-journal-deployment/fixture.mjs';
import {render} from '../../ops/v4-journal/package.mjs';import {candidate} from '../../ops/v4-neon-durability/render.mjs';
import {execFileSync} from 'node:child_process';import path from 'node:path';
export const MIGRATOR='neondb_owner';
export function localNeonDdl(){
 const sql=candidate().sql,re=/DO \$guard\$[\s\S]*?END \$guard\$;/g,a=sql.match(re),b=render().match(re);
 if(a?.length!==1||b?.length!==1||!a[0].includes('neon.project_id')||!b[0].includes("current_setting('fsync')<>'on'"))throw Error('local_guard_cardinality');
 // Test copy ONLY: vendor hardware preflight replaced by actual strict local fsync-on preflight.
 // Every ownership/DDL/function statement is unchanged; no fake provider/quorum or production waiver.
 return sql.replace(a[0],()=>b[0]);
}
export async function fixture(){const f=await base(),pass=f.config('scout_test_owner').password;try{
 await f.raw.owner.query("CREATE ROLE neondb_owner LOGIN NOSUPERUSER CREATEROLE CREATEDB NOREPLICATION BYPASSRLS PASSWORD '"+pass+"'");
 await f.raw.owner.query('ALTER DATABASE unfarmd_v4_pilot OWNER TO neondb_owner');
 const run=(sql,options='')=>{try{return execFileSync(path.join(process.env.SCOUT_TEST_PG_BIN,'psql'),['-X','-q','-A','-t','--no-password','-v','VERBOSITY=terse'],{input:sql,encoding:'utf8',timeout:20000,env:{PATH:'/usr/bin:/bin',LANG:'C',PGHOST:'localhost',PGPORT:String(f.port),PGDATABASE:'unfarmd_v4_pilot',PGUSER:MIGRATOR,PGPASSWORD:pass,PGSSLMODE:'verify-full',PGSSLROOTCERT:f.cert,PGCHANNELBINDING:'require',PGOPTIONS:options},stdio:['pipe','pipe','pipe']});}catch(e){const error=Error('local_non_superuser_install_rejected');error.localDiagnostic=String(e.stderr??'').replaceAll(pass,'[REDACTED]');throw error;}};
 return {...f,run};
}catch(e){await f.close();throw e;}}
