import 'server-only';
import type {Pool} from 'pg';
import {prepareLookup} from '../v4-ca-intelligence/engine';
import {nativeBinding} from '../v4-ca-intelligence/wire';
import type {createOwnerIssuer} from './auth';
import {SourcePolicyAuthority,type SourceApproval} from './source-policy';
import {createSourceLedger} from './source-ledger';
import {createSourceOwner} from './source-owner';
/** Complete genuine owner/SQL/native port assembly, UNSELECTED by installed runtime.
 * A's code-OFF native binding still denies before auth, keys, budget or network, even after a signed policy.
 * A separately reviewed source-GO change is required. Never substitute the old exact-three pilot.
 */
export function prepareOwnerCa(config:Readonly<{issuer:ReturnType<typeof createOwnerIssuer>;authority:SourcePolicyAuthority;approval:SourceApproval;pool:Pool;tlsHost:string;keys:(provider:'jupiter'|'helius')=>unknown}>){
 const p=config.authority.inspect(config.approval);if(!p)throw Error('source_not_admitted');
 const ledger=createSourceLedger(config),authorization=createSourceOwner(config.issuer,config.authority,config.approval,ledger);
 const lookup=prepareLookup(p.policy,{authorization,ledger:ledger.ledger,keys:config.keys,now:Date.now,monotonic:()=>performance.now()},nativeBinding);
 return Object.freeze({lookup,ledger,authorization});
}
