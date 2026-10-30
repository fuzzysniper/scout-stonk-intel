/** UNEXECUTED operator entry. NO public signup or runtime enrollment credential. Default trust OFF.
 * Run only after separate exact hosted SQL/credential/enrollment approval; stdin contains local private inputs.
 */
import {createPublicKey} from 'node:crypto';import {Pool} from 'pg';
import {StrictJournalClient} from '../v4-journal/native-tls.mjs';
import {OWNER_RELEASE_PUBLIC_KEY_PEM,VERCEL_PROJECT_ID} from '../../lib/v4-owner-preview/trust';
import {OwnerReleaseAuthority} from '../../lib/v4-owner-preview/release';
import {AUTH_SQL_SHA} from '../../lib/v4-owner-preview/sql-pins';
import {issuerConfiguration} from '../../lib/v4-owner-preview/bootstrap';
import {createOwnerIssuer} from '../../lib/v4-owner-preview/auth';
import {parsePacket} from '../../lib/trader-pulse/validation';
async function main(){
 if(OWNER_RELEASE_PUBLIC_KEY_PEM===null||process.argv.slice(2).join(' ')!=='--enroll-once')throw Error('owner_enrollment_off');
 // Public deployment identity + signed release, verified BEFORE restricted credentials or stdin password.
 const env=process.env;if(env.VERCEL_ENV!=='preview'||env.VERCEL_PROJECT_ID!==VERCEL_PROJECT_ID||!env.VERCEL_URL||env.VERCEL_URL.includes('/')||env.VERCEL_URL.includes(':'))throw Error('owner_enrollment_off');
 const identity={kind:'private_preview' as const,commit:env.VERCEL_GIT_COMMIT_SHA??'',deployment:env.VERCEL_DEPLOYMENT_ID??'',project:VERCEL_PROJECT_ID,origin:'https://'+env.VERCEL_URL},authority=new OwnerReleaseAuthority(createPublicKey(OWNER_RELEASE_PUBLIC_KEY_PEM),identity,AUTH_SQL_SHA),release=authority.admit(parsePacket(env.UNFARMD_OWNER_RELEASE??''));if(!release)throw Error('owner_enrollment_off');
 const need=(n:string)=>{const v=env[n];if(!v)throw Error('owner_configuration_unavailable');return v;};
 const pools:Pool[]=[];try{const ca=need('UNFARMD_OWNER_PG_CA'),pool=(dsn:string,role:'unfarmd_v4_issuer_login'|'unfarmd_v4_enroll_login',max:number)=>{const p=new Pool({...issuerConfiguration(dsn,ca,role),Client:StrictJournalClient,max});p.on('error',()=>{});pools.push(p);return p;};
  const issuer=createOwnerIssuer({authority,release,pool:pool(need('UNFARMD_OWNER_ISSUER_DSN'),'unfarmd_v4_issuer_login',1),enrollmentPool:pool(need('UNFARMD_OWNER_ENROLL_DSN'),'unfarmd_v4_enroll_login',2),tlsHost:issuerConfiguration(need('UNFARMD_OWNER_ISSUER_DSN'),ca).host!,secret:need('UNFARMD_OWNER_AUTH_SECRET')});
  let text='';for await(const chunk of process.stdin){text+=chunk.toString('utf8');if(Buffer.byteLength(text)>2048)throw Error('owner_input_limit');}const input=parsePacket(text) as {email?:unknown;password?:unknown};if(!input||typeof input.email!=='string'||typeof input.password!=='string'||Object.keys(input).sort().join(',')!=='email,password')throw Error('owner_input_invalid');
  await issuer.enroll(input.email,input.password);process.stdout.write('ENROLLED: disable enrollment LOGIN; verify actual browser sign-in separately.\n');
 }finally{await Promise.allSettled(pools.map(p=>p.end()));}
}
main().catch(()=>{process.stderr.write('ENROLLMENT DENIED OR UNCERTAIN: HOLD; inspect owner/account state without exposing passwords before any deliberate retry.\n');process.exitCode=1;});
