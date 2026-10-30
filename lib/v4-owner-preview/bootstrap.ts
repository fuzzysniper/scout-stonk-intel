import 'server-only';
import {createPrivateKey,createPublicKey} from 'node:crypto';
import {Pool,type ClientConfig} from 'pg';
import {StrictJournalClient,pinnedNeonConfiguration} from '../../ops/v4-journal/native-tls.mjs';
import {envelopeKeys} from './keys';
import {parsePacket} from '../trader-pulse/validation';
import {OwnerReleaseAuthority,TARGET,type DeploymentIdentity} from './release';
import {AUTH_SQL_SHA} from './sql-pins';
import {createOwnerPreview,type OwnerPreview} from './runtime';
import {OWNER_RELEASE_PUBLIC_KEY_PEM,VERCEL_PROJECT_ID} from './trust';
export function issuerConfiguration(dsn:string,ca:string,role:'unfarmd_v4_issuer_login'|'unfarmd_v4_enroll_login'='unfarmd_v4_issuer_login'):ClientConfig{
 const u=new URL(dsn);if(!['postgres:','postgresql:'].includes(u.protocol)||u.hostname!==TARGET.host||u.port&&u.port!=='5432'||u.pathname!=='/'+TARGET.database||u.hash||u.username!==role||!u.password||u.password.length>1024||u.searchParams.get('sslmode')!=='verify-full'||u.searchParams.get('channel_binding')!=='require'||[...u.searchParams].length!==2||!ca.includes('BEGIN CERTIFICATE'))throw Error('owner_issuer_target_denied');
 return {host:TARGET.host,port:5432,user:u.username,password:decodeURIComponent(u.password),database:TARGET.database,connectionTimeoutMillis:1000,query_timeout:1200,statement_timeout:800,ssl:{ca,servername:TARGET.host,rejectUnauthorized:true,minVersion:'TLSv1.2'},enableChannelBinding:true};
}
/** Server-only loader. No public env toggle. Trust+signature+immutable Vercel identity precede ALL secrets. */
export function bootstrapOwnerPreview():OwnerPreview|null{
 if(OWNER_RELEASE_PUBLIC_KEY_PEM===null)return null;
 const pools:Pool[]=[];try{
  if(process.env.VERCEL_ENV!=='preview'||process.env.VERCEL_PROJECT_ID!==VERCEL_PROJECT_ID)return null;
  const commit=process.env.VERCEL_GIT_COMMIT_SHA,deployment=process.env.VERCEL_DEPLOYMENT_ID,url=process.env.VERCEL_URL;if(!commit||!deployment||!url||url.includes('/')||url.includes(':'))return null;
  const identity:DeploymentIdentity={kind:'private_preview',commit,deployment,project:VERCEL_PROJECT_ID,origin:'https://'+url};
  const authority=new OwnerReleaseAuthority(createPublicKey(OWNER_RELEASE_PUBLIC_KEY_PEM),identity,AUTH_SQL_SHA),raw=process.env.UNFARMD_OWNER_RELEASE;if(!raw||raw.length>8192)return null;
  const release=authority.admit(parsePacket(raw));if(!release)return null;
  // Only this admitted branch reads approved restricted credentials. There is no discovery/fallback.
  const need=(name:string)=>{const value=process.env[name];if(!value)throw Error('owner_configuration_unavailable');return value;};
  const secret=need('UNFARMD_OWNER_AUTH_SECRET'),ca=need('UNFARMD_OWNER_PG_CA'),csrfKey=Buffer.from(need('UNFARMD_OWNER_CSRF_KEY'),'base64url');if(csrfKey.length!==32)throw Error('owner_configuration_unavailable');
  const issuer=issuerConfiguration(need('UNFARMD_OWNER_ISSUER_DSN'),ca),reader=pinnedNeonConfiguration(need('UNFARMD_OWNER_READER_DSN'),ca),journal=pinnedNeonConfiguration(need('UNFARMD_OWNER_JOURNAL_DSN'),ca);
  if(reader.user!=='unfarmd_v4_auth_login'||journal.user!=='unfarmd_v4_journal_login')throw Error('owner_role_denied');
  const pool=(config:ClientConfig)=>{const p=new Pool({...config,max:1,Client:StrictJournalClient});p.on('error',()=>{});pools.push(p);return p;};
  const keys=envelopeKeys(need('UNFARMD_OWNER_WRAPPED_KEYS'),authority.inspect(release)!.journalOwnerId);
  const delegationKey=createPrivateKey(need('UNFARMD_OWNER_JOURNAL_SIGNING_KEY'));
  return createOwnerPreview({authority,release,issuerPool:pool(issuer),readerPool:pool(reader),journalPool:pool(journal),ratePool:pool(journal),tlsHost:TARGET.host,secret,csrfKey,delegationKey,keys});
 }catch{for(const p of pools)void p.end().catch(()=>{});return null;}
}
