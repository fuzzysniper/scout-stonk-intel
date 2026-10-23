import type {LiveEvent,LiveFeed,StopReply} from '../../lib/live-ledger/contract';

export const POLL_MS=5000,PROVIDER_FRESH_MS=45000,SNAPSHOT_FRESH_MS=15000;
const program='6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P';
export const NATIVE_SOL='11111111111111111111111111111111';
const quotes=[NATIVE_SOL,'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'];
const programs=['TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA','TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb'];
type Obj=Record<string,unknown>;
const object=(v:unknown):v is Obj=>!!v&&typeof v==='object'&&!Array.isArray(v);
const keys=(v:unknown,names:string):v is Obj=>object(v)&&Object.keys(v).sort().join(',')===names.split(',').sort().join(',');
const number=(v:unknown,max=Number.MAX_SAFE_INTEGER):v is number=>Number.isSafeInteger(v)&&Number(v)>=0&&Number(v)<=max;
const hash=(v:unknown)=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);
const clock=(v:unknown):v is string=>typeof v==='string'&&/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{3})?Z$/.test(v)&&Number.isFinite(Date.parse(v));
const nullableClock=(v:unknown)=>v===null||clock(v);
function address(v:unknown,bytes:number):v is string{
 if(typeof v!=='string'||v.length>88||!v.length)return false;
 const alphabet='123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';let n=0n,count=0;
 for(const c of v){const i=alphabet.indexOf(c);if(i<0)return false;n=n*58n+BigInt(i);}
 for(let p=n;p>0n;p>>=8n)count++;for(const c of v){if(c!=='1')break;count++;}return count===bytes;
}
function event(v:unknown):v is LiveEvent{
 if(!keys(v,'signature,slot,receivedAt,source,program,notificationHash,finality,mint,quoteMint,tokenProgram,transactionHash,verificationHash,checkedAt,blockTime')||!address(v.signature,64)||!number(v.slot)||v.slot===0||!clock(v.receivedAt)||v.source!=='helius_standard'||v.program!==program||!hash(v.notificationHash))return false;
 if(v.finality==='provisional')return ['mint','quoteMint','tokenProgram','transactionHash','verificationHash','checkedAt','blockTime'].every(k=>v[k]===null);
 return v.finality==='rpc_reported_finalized'&&address(v.mint,32)&&quotes.includes(String(v.quoteMint))&&v.mint!==v.quoteMint&&programs.includes(String(v.tokenProgram))&&hash(v.transactionHash)&&hash(v.verificationHash)&&clock(v.checkedAt)&&Date.parse(v.checkedAt)>=Date.parse(v.receivedAt)&&nullableClock(v.blockTime)&&(v.blockTime===null||Date.parse(String(v.blockTime))<=Date.parse(v.checkedAt));
}
/** Validate the real browser contract; no fixture switch, fallback records or source inference. */
export function decodeFeed(v:unknown):LiveFeed|null{
 if(!keys(v,'version,status,observedAt,events,counts,health,budget,retention')||v.version!=='scout-live/1'||!['disabled','unavailable','waiting','observing','stale','stopped'].includes(String(v.status))||!clock(v.observedAt))return null;
 if(v.status==='disabled'||v.status==='unavailable')return ['events','counts','health','budget','retention'].every(k=>v[k]===null)?v as LiveFeed:null;
 if(!Array.isArray(v.events)||v.events.length>20||!v.events.every(event)||new Set(v.events.map(e=>e.signature)).size!==v.events.length)return null;
 const {counts:c,health:h,budget:b,retention:r}=v;
 if(!keys(c,'provisional,finalized')||!number(c.provisional,200)||!number(c.finalized,200)||Number(c.provisional)+Number(c.finalized)>200)return null;
 if(!keys(h,'state,heartbeatAt,leaseUntil,sourceState,lastFrameAt,lastPongAt,lastRpcElapsedMs,gapSince,gapEndedAt,gaps,errors,stopped,reason')||!['unapproved','idle','connected','stale','stopped'].includes(String(h.state))||!['connecting','open','closed'].includes(String(h.sourceState))||typeof h.stopped!=='boolean'||!number(h.gaps)||!number(h.errors)||!(h.reason===null||typeof h.reason==='string'&&/^[a-z0-9_:-]{1,100}$/.test(h.reason))||!(h.lastRpcElapsedMs===null||number(h.lastRpcElapsedMs,5000))||!['heartbeatAt','leaseUntil','lastFrameAt','lastPongAt','gapSince','gapEndedAt'].every(k=>nullableClock(h[k])))return null;
 if(!keys(b,'connectionsUsed,connectionsMax,rpcUsed,rpcMax,framesReserved,bytesReserved,creditsReserved,creditsMax,framesReceived,bytesReceived,expiresAt')||!['connectionsUsed','connectionsMax','rpcUsed','rpcMax','framesReserved','bytesReserved','creditsReserved','framesReceived','bytesReceived'].every(k=>number(b[k]))||!(b.creditsMax===null||number(b.creditsMax))||!nullableClock(b.expiresAt))return null;
 if(!keys(r,'seconds,maxRecords,expiresOnRead')||r.seconds!==3600||r.maxRecords!==200||r.expiresOnRead!==true)return null;
 if((v.status==='stopped')!==h.stopped||v.events.some(e=>Date.parse(e.receivedAt)>Date.parse(String(v.observedAt))+5000))return null;
 if(v.events.filter(e=>e.finality==='provisional').length>Number(c.provisional)||v.events.filter(e=>e.finality==='rpc_reported_finalized').length>Number(c.finalized))return null;
 return v as LiveFeed;
}
export function decodeStop(v:unknown):StopReply|null{return keys(v,'version,status,observedAt')&&v.version==='scout-live/1'&&v.status==='stopped'&&clock(v.observedAt)?v as StopReply:null;}
export type Snapshot={feed:LiveFeed;receivedAt:number};
/** Age existing evidence against the original DB clock; rendering never renews it. */
export function feedClock(snapshot:Snapshot,now:number){
 const elapsed=now-snapshot.receivedAt,at=Date.parse(snapshot.feed.observedAt)+Math.max(0,elapsed);
 const h=snapshot.feed.health;
 const sourceTimes=[h?.lastFrameAt,h?.lastPongAt].filter((v):v is string=>typeof v==='string').map(Date.parse);
 const sourceAge=sourceTimes.length?at-Math.max(...sourceTimes):null;
 const stale=elapsed<0||elapsed>SNAPSHOT_FRESH_MS||snapshot.feed.status==='stale'||snapshot.feed.status==='observing'&&(!h||sourceAge===null||sourceAge<0||sourceAge>PROVIDER_FRESH_MS||!h.leaseUntil||at>=Date.parse(h.leaseUntil));
 const status:LiveFeed['status']=['stopped','disabled','unavailable'].includes(snapshot.feed.status)?snapshot.feed.status:stale?'stale':snapshot.feed.status;
 return {at,elapsed,sourceAge,status};
}
export function age(at:string|null,reference:number){if(at===null)return 'Unknown';const seconds=Math.floor((reference-Date.parse(at))/1000);return seconds<0?'Clock order unverified':seconds<60?`${seconds}s ago`:`${Math.floor(seconds/60)}m ${seconds%60}s ago`;}
