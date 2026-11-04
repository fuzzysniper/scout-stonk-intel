// TEST-ONLY owner approval. No environment flag, runtime/source enrollment or hosted authority.
import fs from 'node:fs';import {createHash} from 'node:crypto';
export const LOCAL_PG18_APPROVAL=Object.freeze({
 version:'native-local-pg18-approval/1',
 ownerApproval:'https://github.com/fuzzysniper/scout-stonk-intel/pull/284#issuecomment-6622419328',
 correction:'https://github.com/fuzzysniper/scout-stonk-intel/pull/286#issuecomment-6642663957',
 input:'55a15a939d31ea9f7b79a289f930d9e2d8026d30',
 installerSha256:'2ddbab84d1165686ad413dc2cb4886cb66231c4a7cc6f2ffd0f0881396180643',
 scope:'disposable-local-ci-postgresql18-only',externalEgress:false,hosted:false,activate:false
});
export function requireLocalPg18Approval(){
 const a=LOCAL_PG18_APPROVAL;
 if(a.scope!=='disposable-local-ci-postgresql18-only'||a.externalEgress!==false||a.hosted!==false||a.activate!==false||
 createHash('sha256').update(fs.readFileSync(new URL('../../lib/native-pilot/postgres/schema.sql',import.meta.url))).digest('hex')!==a.installerSha256)throw Error('LOCAL_PG18_SQL_NOT_AUTHORIZED');
}
