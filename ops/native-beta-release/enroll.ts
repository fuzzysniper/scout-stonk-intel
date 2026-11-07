/** UNINSTALLED operator-only entry. No public signup/policy mutation or legacy signer.
 * Exact owned enrollment login and private stdin are supplied ONLY after separate GO. */
import fs from 'node:fs';import {Pool} from 'pg';
import {StrictJournalClient} from '../v4-journal/native-tls.mjs';
import {nativeIssuerConfiguration,prepareNativeOwnerEnrollment} from '../../lib/native-pilot/runtime/owner';
import {need,hash} from '../../lib/native-pilot/plan';
import {privateEnrollment} from './enrollment-packet';
async function main(){
 const record=JSON.parse(fs.readFileSync('ops/native-beta-release/owner-enrollment.json','utf8'));
 need(Object.keys(record).sort().join(',')==='configuration,mode,sourceGo,version'&&record.version==='native-owner-enrollment/1'&&record.sourceGo===false);
 if(record.mode==='off'&&record.configuration===null)return;
 need(record.mode==='installed'&&process.argv.slice(2).join(' ')==='--enroll-once');
 let text='';for await(const part of process.stdin){text+=part.toString('utf8');need(Buffer.byteLength(text)<=8192);}
 const {configuration:c,password}=privateEnrollment(record,text);text='';const p=c.policy;
 const ca=process.env.UNFARMD_NATIVE_PG_CA,secret=process.env.UNFARMD_NATIVE_AUTH_SECRET;need(ca&&secret&&hash(ca)===c.caSha256&&hash(secret)===c.authSecretSha256);
 const issuerDsn=process.env.UNFARMD_NATIVE_AUTH_ISSUER_DSN,enrollDsn=process.env.UNFARMD_NATIVE_AUTH_ENROLL_DSN;need(issuerDsn&&enrollDsn);const pools:Pool[]=[];
 try{const pool=(dsn:string,enrollment=false)=>{const x=new Pool({...nativeIssuerConfiguration(dsn,ca,enrollment),Client:StrictJournalClient,max:enrollment?2:1});x.on('error',()=>{});pools.push(x);return x;};
  const owner=prepareNativeOwnerEnrollment({policy:p,pool:pool(issuerDsn),enrollmentPool:pool(enrollDsn,true),secret,tlsHost:nativeIssuerConfiguration(issuerDsn,ca).host!,expiresAt:c.expiresAt});
  await owner.enroll(c.ownerEmail,password);process.stdout.write('ENROLLED: disable enrollment LOGIN; separately verify actual owner sign-in. Sources remain unapproved.\n');
 }finally{await Promise.allSettled(pools.map(x=>x.end()));}
}
main().catch(()=>{process.stderr.write('NATIVE_OWNER_ENROLLMENT_HOLD: denied or uncertain; preserve records, no automatic retry.\n');process.exitCode=1;});
