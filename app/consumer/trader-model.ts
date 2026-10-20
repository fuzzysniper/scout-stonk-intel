/** Deterministic consumer interpretation of ACCEPTED MintFactsV1 only. No scoring or source activation. */
import type {MintView} from './onchain-model';
export type Concern={id:'mint_authority'|'freeze_authority'|'extensions';title:string;explanation:string;field:string;trigger:string;mint:string;slot:string;checkedAt:string;responseSha256:string;sourceHost:string;synthetic:boolean};
export function usableMintFacts(view:MintView|'loading',now=Date.now()):view is Extract<MintView,{kind:'facts'}>{
 return view!=='loading'&&view.kind==='facts'&&Number.isFinite(now)&&now<=view.expiresAt&&now>=Date.parse(view.value.source.checkedAt)-1000;
}
export function tokenConcerns(view:MintView|'loading',now=Date.now()):Concern[]{
 if(!usableMintFacts(view,now))return [];
 const {facts:f,source:s}=view.value;
 const evidence={mint:view.value.mint,slot:s.contextSlot,checkedAt:s.checkedAt,responseSha256:s.responseSha256,sourceHost:s.endpointHost,synthetic:view.offline};
 const rows:Concern[]=[];
 if(f.mintAuthority.state==='present')rows.push({...evidence,id:'mint_authority',title:f.extensions.assessment==='unreviewed'?'A minting control is present':'Supply can increase',explanation:f.extensions.assessment==='unreviewed'?'A standard mint authority is present, but additional issuance rules are not fully reviewed. Its presence alone does not establish all Token-2022 controls.':'A standard mint authority is present. That control permits issuing additional tokens; this does not show that anyone will use it.',field:'facts.mintAuthority',trigger:'present · '+f.mintAuthority.address});
 if(f.freezeAuthority.state==='present')rows.push({...evidence,id:'freeze_authority',title:'A freezing control is present',explanation:f.extensions.assessment==='unreviewed'?'A standard freeze authority is present, but extensions are not fully reviewed. This does not establish every freezing or transfer rule, or identify who controls that authority.':'The standard freeze authority can freeze token accounts. The source does not tell us who ultimately controls that authority or how it will be used.',field:'facts.freezeAuthority',trigger:'present · '+f.freezeAuthority.address});
 if(f.extensions.assessment==='unreviewed')rows.push({...evidence,id:'extensions',title:'Additional controls are unreviewed',explanation:'Token-2022 extensions are outside the reviewed layout. Issuance, freezing and transfer restrictions are not fully established, even when standard authorities are absent.',field:'facts.extensions.assessment / names',trigger:'unreviewed · '+(f.extensions.names.join(', ')||'names not supplied')});
 return rows;
}
export function concernSummary(view:MintView|'loading',now=Date.now()){
 if(!usableMintFacts(view,now))return 'Controls not verified';
 const rows=tokenConcerns(view,now);return rows.length?`${rows.length} ${rows.length===1?'check needs':'checks need'} attention`:'Standard authorities absent; other risks unknown';
}
export const unverifiedProperties=[
 {title:'Who holds the supply',detail:'Holder concentration, insider allocations and related wallets are not checked.'},
 {title:'Who controls liquidity',detail:'LP ownership, locks, removability and pool reserves are not verified.'},
 {title:'Whether you can sell',detail:'No transaction, transfer simulation or sellability test is performed.'},
 {title:'What holders receive',detail:'Distribution, payout entitlement, asset backing and realized holder returns are not established.'},
] as const;
export type MarketReadiness='matched'|'quote_side'|'no_match'|'stale_response'|'invalid_clock'|'invalid_identity';
/** Retrieval is a host clock, never a market tick. Even recent transport does not unlock figures. */
export function marketReadiness(value:{state:'not_found'|'quote_side'|'matched';mint:string;pool:string|null;baseMint:string|null;quoteMint:string|null;retrievedAt:string},now:number):MarketReadiness{
 if(value.state!=='not_found'&&(value.baseMint===value.quoteMint||value.pool===value.baseMint||value.pool===value.quoteMint||value.state==='matched'&&value.baseMint!==value.mint||value.state==='quote_side'&&value.quoteMint!==value.mint))return 'invalid_identity';
 const captured=Date.parse(value.retrievedAt);
 if(!Number.isFinite(now)||!Number.isFinite(captured)||captured>now+1000)return 'invalid_clock';
 if(now-captured>60000)return 'stale_response';
 return value.state==='not_found'?'no_match':value.state;
}
