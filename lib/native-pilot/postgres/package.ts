import 'server-only';
import {policy,type Policy,need,digest} from '../plan';
import {seed,canonical} from './protocol';
export type Durability=Readonly<{mode:'local-fsync'}>|Readonly<{mode:'neon-safekeeper-quorum/v1';tenantId:string;timelineId:string;admissionSha256:string;custodySha256:string}>;
/** Pure UNEXECUTED owner packet; accepts no DSN, passwords or connection. No overwrite/upsert/reset. */
export function bootstrapSql(pInput:Policy,d:Durability){
 const p=policy(pInput),s=seed(p),quote=(v:string)=>"'"+v.replaceAll("'","''")+"'";
 need(d.mode==='local-fsync'||d.mode==='neon-safekeeper-quorum/v1'&&/^[a-f0-9]{32}$/.test(d.tenantId)&&/^[a-f0-9]{32}$/.test(d.timelineId)&&digest(d.admissionSha256)&&digest(d.custodySha256));
 return `-- UNEXECUTED native-only one-policy authorization. No source activation, logins or reset.\nBEGIN;\nSET LOCAL search_path=pg_catalog;\nSET LOCAL synchronous_commit=on;\nDO $target$ BEGIN IF current_database()<>'unfarmd_v4_pilot' OR current_setting('server_version_num')::int/10000<>18 OR pg_is_in_recovery() THEN RAISE EXCEPTION 'native_target_held'; END IF; END $target$;\nGRANT unfarmd_native_owner TO CURRENT_USER WITH INHERIT FALSE, SET TRUE;\nSET LOCAL ROLE unfarmd_native_owner;\nINSERT INTO unfarmd_native.policies(policy_hash,record_text,durability,state,head,state_hash) VALUES(${quote(s.checkpoint.policyHash)},${quote(s.recordText)},${quote(canonical(d))}::jsonb,${quote(canonical(s.state))}::jsonb,${quote(s.checkpoint.head)},${quote(s.checkpoint.stateHash)});\nINSERT INTO unfarmd_native.history VALUES(${quote(s.checkpoint.policyHash)},0,'seed',${quote(s.checkpoint.head)},${quote(s.checkpoint.head)},${quote(s.checkpoint.stateHash)},${quote(canonical(s.state))}::jsonb);\nRESET ROLE;\nGRANT unfarmd_native_owner TO CURRENT_USER WITH INHERIT FALSE, SET FALSE;\nCOMMIT;\n`;
}
