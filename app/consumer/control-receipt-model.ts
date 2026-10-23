import {projectMintFacts,type MintView} from './onchain-model';
import {usableMintFacts} from './trader-model';

/** Local text only. Re-check the existing production validation boundary at the gesture.
 * A production classification is a server assertion, not independent RPC authentication.
 * Never renew source clocks or accept the trusted synthetic-offline display context.
 */
export function scoutFindings(view:MintView|'loading',mint:string,now:number):string|null {
 if(view==='loading'||view.kind!=='facts'||view.offline)return null;
 const checked=projectMintFacts(view.value,mint,now,'production');
 if(checked.kind!=='facts'||!usableMintFacts(view,now))return null;
 const {facts:f,source:s}=checked.value;
 const authority=(a:typeof f.mintAuthority)=>a.state==='present'?'PRESENT — '+a.address:'ABSENT at this slot';
 const extensions=f.extensions.assessment==='unreviewed'
  ?'UNREVIEWED — full issuance, freezing and transfer rules are not established'
  :f.extensions.assessment==='reviewed_metadata_pointer'
   ?'Metadata pointer only reviewed; no broader extension audit'
   :'None reported in the supported parsed layout';
 return [
  'SCOUT / CONTROL RECEIPT',
  'RPC-reported observation · Solana mainnet',
  'Exact mint: '+mint,
  'Exact supply (token units): '+f.supply.decimalAmount,
  'Raw supply (base units): '+f.supply.raw,
  'Decimals: '+f.supply.decimals,
  'Standard mint authority: '+authority(f.mintAuthority),
  'Standard freeze authority: '+authority(f.freezeAuthority),
  'Token program: '+(f.program==='spl_token'?'Token Program':'Token-2022')+' · '+f.ownerProgram,
  'Extension interpretation: '+extensions,
  'Reported extension names: '+(f.extensions.names.join(', ')||'None'),
  'Minting interpretation: '+f.interpretation.minting,
  'Freezing interpretation: '+f.interpretation.freezing,
  'Finalized context slot: '+s.contextSlot,
  'Original checked UTC: '+s.checkedAt,
  'Source: '+s.endpointHost+' · '+s.method+' / '+s.encoding+' · '+s.acquisition,
  'Server-reported RPC response SHA-256: '+s.responseSha256,
  'Limits: controller identities, holder concentration, liquidity control and sellability are not established. A context slot is not the last account-change time.',
  'RPC-reported, not independently replayed. Not a safety certification, signed attestation or durable receipt. Controls may change after this observation.',
 ].join('\n');
}
