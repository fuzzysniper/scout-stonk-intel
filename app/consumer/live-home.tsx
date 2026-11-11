'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import Link from 'next/link';
import type {LiveEvent,StopReply} from '../../lib/live-ledger/contract';
import {OutlierMark} from './brand/outlier-mark';
import {BrandArrow} from './brand/identity';
import {age,feedClock,NATIVE_SOL,POLL_MS,type Snapshot} from './live-model';
import {readLiveFeed,stopLiveFeed,validOwnerToken,type LiveFailure} from './live-client';
import {BOUNDED_STOP_LABEL,OperationsGuide} from './operations-guide';

const failures:Record<LiveFailure,string>={denied:'Access denied. Use normal Vercel login and the separately authorized owner token.',unavailable:'Feed unavailable or disabled. No observations are inferred.',invalid_response:'Response could not be verified. No records accepted.',timeout:'Read timed out. Refresh is paused.',network:'Connection unavailable. Refresh is paused.'};
function Clock({value}:{value:string|null}){return value?<time dateTime={value}>{value.replace('T',' ').replace('Z',' UTC')}</time>:<>Unknown</>;}
function Observation({event:e,reference}:{event:LiveEvent;reference:number}){
 const final=e.finality==='rpc_reported_finalized';
 return <li className="live-event">
  <div className="live-event-top"><strong>{final?'RPC-reported-finalized':'Provisional · WAIT'}</strong><span>{age(e.receivedAt,reference)}</span></div>
  <p className="live-mint">{final?<><span>Exact creation mint</span><code dir="ltr" translate="no">{e.mint}</code></>:<>Mint identity withheld until finalized transaction verification.</>}</p>
  <dl className="live-fields"><div><dt>{final?'Notification slot · RPC corroborated':'Notification slot · provisional'}</dt><dd>{e.slot}</dd></div><div><dt>First received · worker UTC</dt><dd><Clock value={e.receivedAt}/></dd></div></dl>
  <details><summary>Original observation receipt</summary><dl className="live-fields">
   <div><dt>Original signature</dt><dd><code>{e.signature}</code></dd></div><div><dt>Source</dt><dd>Helius Standard · one bounded Pump creation stream</dd></div><div><dt>Program</dt><dd><code>{e.program}</code></dd></div><div><dt>Notification SHA-256</dt><dd><code>{e.notificationHash}</code></dd></div>
   {final&&<><div><dt>Quote identity</dt><dd>{e.quoteMint===NATIVE_SOL?'Native SOL · protocol sentinel, not WSOL or a verified SPL mint':'USDC · exact source-reported quote'}<code>{e.quoteMint}</code></dd></div><div><dt>Token program</dt><dd><code>{e.tokenProgram}</code></dd></div><div><dt>Verification completed · worker UTC</dt><dd><Clock value={e.checkedAt}/></dd></div><div><dt>RPC-reported block time</dt><dd><Clock value={e.blockTime}/></dd></div><div><dt>Transaction / verification SHA-256</dt><dd><code>{e.transactionHash}</code><code>{e.verificationHash}</code></dd></div></>}
  </dl><p>RPC-reported finality uses the same provider. Not independently replayed; no safety, liquidity or trading conclusion.</p></details>
 </li>;
}
export default function LiveHome(){
 const [snapshot,setSnapshot]=useState<Snapshot|null>(null),[mode,setMode]=useState<'locked'|'loading'|'reading'|'paused'>('locked'),[notice,setNotice]=useState('Owner authorization required. No feed checked.'),[now,setNow]=useState(0);
 const [stopBusy,setStopBusy]=useState(false),[stopAck,setStopAck]=useState<StopReply|null>(null),[stopNotice,setStopNotice]=useState(''),[confirmed,setConfirmed]=useState(false);
 const token=useRef(''),input=useRef<HTMLInputElement>(null),stopInput=useRef<HTMLInputElement>(null),active=useRef(false),epoch=useRef(0),stopEpoch=useRef(0),lastAttempt=useRef(0),timer=useRef<ReturnType<typeof setTimeout>|null>(null),abort=useRef<AbortController|null>(null),stopAbort=useRef<AbortController|null>(null),readAction=useRef<()=>void>(()=>{});
 const pause=useCallback(()=>{active.current=false;epoch.current++;if(timer.current)clearTimeout(timer.current);timer.current=null;abort.current?.abort();abort.current=null;},[]);
 const cancelStop=useCallback(()=>{stopEpoch.current++;stopAbort.current?.abort();},[]);
 const lock=useCallback(()=>{pause();cancelStop();token.current='';if(input.current)input.current.value='';if(stopInput.current)stopInput.current.value='';setSnapshot(null);setMode('locked');setStopAck(null);setStopBusy(false);setStopNotice('');setConfirmed(false);setNotice('Locked. Owner token and displayed records cleared.');},[pause,cancelStop]);
 const read=useCallback(async()=>{
  if(!active.current||document.visibilityState!=='visible'||!token.current||abort.current)return;
  const delay=POLL_MS-(Date.now()-lastAttempt.current);
  if(lastAttempt.current&&delay>0){timer.current=setTimeout(()=>readAction.current(),delay);return;}
  lastAttempt.current=Date.now();const generation=epoch.current,controller=new AbortController();abort.current=controller;setMode('loading');
  const result=await readLiveFeed(token.current,controller.signal);
  if(generation!==epoch.current)return;abort.current=null;
  if(!result.ok){active.current=false;if(result.reason==='denied')token.current='';setSnapshot(result.feed?{feed:result.feed,receivedAt:Date.now()}:null);setMode('paused');setNotice(failures[result.reason]+' No automatic retry.');return;}
  setSnapshot({feed:result.value,receivedAt:Date.now()});setNow(Date.now());setMode('reading');
  setNotice('Stored snapshot received. Automatic reads occur only while this page is visible.');
  if(result.value.status==='stopped'){active.current=false;setNotice('Durable STOP is latched. No automatic refresh or resume.');return;}
  timer.current=setTimeout(()=>readAction.current(),POLL_MS);
 },[]);
 useEffect(()=>{readAction.current=()=>void read();},[read]);
 useEffect(()=>{
  const clock=setInterval(()=>setNow(Date.now()),1000);
  const visibility=()=>{
   if(document.visibilityState!=='visible'){epoch.current++;abort.current?.abort();abort.current=null;if(timer.current)clearTimeout(timer.current);timer.current=null;if(active.current){setMode('paused');setNotice('Refresh paused while this page is hidden. Original source clocks continue aging.');}}
   else if(active.current)readAction.current();
  };
  document.addEventListener('visibilitychange',visibility);window.addEventListener('pagehide',lock);
  return()=>{clearInterval(clock);document.removeEventListener('visibilitychange',visibility);window.removeEventListener('pagehide',lock);pause();cancelStop();token.current='';};
 },[lock,pause,cancelStop]);
 function connect(event:React.FormEvent){
  event.preventDefault();const supplied=input.current?.value??'';if(input.current)input.current.value='';
  pause();setSnapshot(null);
  if(!validOwnerToken(supplied)){token.current='';setMode('locked');setNotice('Enter the separately authorized owner token. Nothing was sent.');return;}
  token.current=supplied;active.current=true;setNotice('Reading stored observations; this does not activate the worker.');readAction.current();
 }
 async function stop(event:React.FormEvent){
  event.preventDefault();const supplied=stopInput.current?.value??'';if(stopInput.current)stopInput.current.value='';
  if(stopBusy)return;
  if(!confirmed||!validOwnerToken(supplied)){setStopNotice('Confirm STOP and enter the separate owner authorization token. Nothing was sent.');return;}
  pause();setMode('paused');setStopBusy(true);setStopAck(null);setStopNotice('STOP pending. Durable STOP is not yet confirmed.');
  const generation=++stopEpoch.current,controller=new AbortController();stopAbort.current=controller;
  const result=await stopLiveFeed(supplied,controller.signal);
  if(generation!==stopEpoch.current)return;stopAbort.current=null;setStopBusy(false);setConfirmed(false);
  if(result.ok){setStopAck(result.value);setStopNotice('Durable STOP confirmed. Source socket closure is not yet verified; confirm worker closure or use the separately approved emergency pause.');}
  else setStopNotice('STOP NOT CONFIRMED. No automatic retry. Use the owner incident procedure; do not assume the source closed.');
 }
 const clock=snapshot?feedClock(snapshot,now||snapshot.receivedAt):null;
 const stopUncertain=stopBusy||stopNotice.startsWith('STOP NOT CONFIRMED');
 const status=stopAck?'stopped':stopUncertain?'unavailable':clock?.status??(mode==='loading'?'reading':mode==='locked'?'locked':'unavailable');
 const label={observing:'Observing · bounded source',waiting:'Waiting · no source activity established',stale:'Stale · freshness not established',stopped:'STOPPED · durable latch',disabled:'Source unavailable · disabled',unavailable:'Unavailable · status unknown',locked:'Private viewer · locked',reading:'Reading stored observations'}[status];
 const feed=snapshot?.feed,h=feed?.health,b=feed?.budget;
 return <div className="consumer-home unfarmd live-home">
  <a className="skip-link" href="#live-content">Skip to observations</a>
  <header className="site-header"><Link className="wordmark" href="/" prefetch={false} aria-label="UNFARMD home"><OutlierMark/><span className="wordmark-lockup"><span className="brand-name">UNFARMD<BrandArrow/></span><span className="brand-caption">PRIVATE CREATION RESEARCH</span></span></Link><span className="preview-label">Read only</span></header>
  <main id="live-content" tabIndex={-1}>
   <section className="live-intro"><p className="eyebrow">SCOUT / CREATION OBSERVATIONS</p><h1>Creation observations</h1><p>Latest 20 stored Pump creations. Provisional: wait. Finalized: RPC-reported by the same provider.</p><p className="live-limit">Partial, bounded coverage. No trading signals, token safety verdicts or Pump.fun affiliation.</p></section>
   <section className="live-auth" aria-label="Private feed authorization"><h2>Private access</h2><p>Vercel login + owner token required. Token stays in page memory only. Reading never starts the source.</p><form onSubmit={connect} autoComplete="off"><label htmlFor="live-owner-token">Owner authorization token</label><input id="live-owner-token" ref={input} type="password" autoComplete="off" autoCapitalize="off" spellCheck={false} maxLength={128} disabled={stopBusy}/><div className="live-actions"><button className="primary" type="submit" disabled={stopBusy||mode==='loading'}>Read observations</button><button type="button" className="secondary" onClick={lock} disabled={stopBusy}>Lock &amp; clear</button></div></form><p className="live-notice" role="status">{notice}</p></section>
   <section className="live-status" aria-label="Source and worker status" aria-busy={mode==='loading'}><p className="eyebrow">ORIGINAL BOUNDED V1 STATUS</p><h2>{label}</h2>
    {feed&&<p>Database snapshot · <Clock value={feed.observedAt}/> · {clock&&age(feed.observedAt,clock.at)}</p>}
    <p>Dashboard access is separate from source readiness. This panel reports bounded v1 only, not continuous-parent status. Refreshing the database view does not refresh the provider’s evidence.</p>
    <dl className="live-fields live-health"><div><dt>Last snapshot worker / source connection</dt><dd>{h?`${h.state} / ${h.sourceState}`:'Unknown'}</dd></div><div><dt>Last provider frame</dt><dd><Clock value={h?.lastFrameAt??null}/>{h?.lastFrameAt&&clock&&<> · {age(h.lastFrameAt,clock.at)}</>}</dd></div><div><dt>Last provider pong</dt><dd><Clock value={h?.lastPongAt??null}/>{h?.lastPongAt&&clock&&<> · {age(h.lastPongAt,clock.at)}</>}</dd></div><div><dt>Database heartbeat</dt><dd><Clock value={h?.heartbeatAt??null}/></dd></div><div><dt>Worker lease until</dt><dd><Clock value={h?.leaseUntil??null}/></dd></div><div><dt>Declared gaps / errors</dt><dd>{h?`${h.gaps} / ${h.errors}`:'Unknown'}</dd></div><div><dt>Open gap since</dt><dd><Clock value={h?.gapSince??null}/></dd></div><div><dt>Last gap ended</dt><dd><Clock value={h?.gapEndedAt??null}/></dd></div><div><dt>Last RPC duration</dt><dd>{h?.lastRpcElapsedMs===null||h?.lastRpcElapsedMs===undefined?'Unknown':`${h.lastRpcElapsedMs} ms`}</dd></div><div><dt>Stop / worker reason</dt><dd>{h?.reason??'Not supplied'}</dd></div></dl>
    <p>Gaps are declared interruptions, not a count of every missed creation. A database heartbeat alone does not prove source health. Provider evidence older than 45s or an expired lease cannot establish observing.</p>
    <details><summary>Reserved budget &amp; retention</summary><dl className="live-fields"><div><dt>Connection / HTTP tickets spent</dt><dd>{b?`${b.connectionsUsed}/${b.connectionsMax} connections · ${b.rpcUsed}/${b.rpcMax} HTTP reads`:'Unknown'}</dd></div><div><dt>Reserved frames / bytes</dt><dd>{b?`${b.framesReserved} / ${b.bytesReserved}`:'Unknown'}</dd></div><div><dt>Received frames / bytes</dt><dd>{b?`${b.framesReceived} / ${b.bytesReceived}`:'Unknown'}</dd></div><div><dt>Credits reserved / cap</dt><dd>{b?`${b.creditsReserved} / ${b.creditsMax??'Unknown'}`:'Unknown'}</dd></div><div><dt>Authorized session ends</dt><dd><Clock value={b?.expiresAt??null}/></dd></div></dl><p>Current worker grant is at most one hour, not a week-long service. Retained records expire from reads after one hour, capped at 200. Physical purge and backups can outlast logical expiry after outage or STOP. Reservations are not refunded after uncertainty.</p></details>
   </section>
   <section className="live-observations" aria-labelledby="observations-title"><h2 id="observations-title">Latest observations</h2><p>{feed?.counts?`Retained counts: ${feed.counts.provisional} provisional · ${feed.counts.finalized} RPC-reported-finalized. Showing latest ${feed.events?.length??0}, at most 20.`:'Retained counts unknown. No successful empty feed is inferred.'}</p>
    {feed?.events?.length?<ol className="live-events">{feed.events.map(e=><Observation key={e.signature} event={e} reference={clock?.at??Date.parse(feed.observedAt)}/>)}</ol>:feed?.events&&feed.events.length===0?<p>No retained observations in this database snapshot. This does not prove no creations occurred.</p>:<p>No accepted feed snapshot. Records are withheld.</p>}
   </section>
   <details className="live-owner-stop"><summary>{BOUNDED_STOP_LABEL}</summary><p><strong>Original bounded v1 only. This does not STOP a continuous parent.</strong></p><p>Separately authenticated, explicit STOP. No start, resume or automatic STOP. Leaving this page while STOP is pending can lose the acknowledgment; never assume it succeeded. This latches future work; already admitted work and physical socket closure require independent confirmation.</p><form onSubmit={event=>void stop(event)} autoComplete="off"><label htmlFor="live-stop-token">Re-enter owner token for STOP</label><input id="live-stop-token" ref={stopInput} type="password" autoComplete="off" autoCapitalize="off" spellCheck={false} maxLength={128} disabled={stopBusy}/><label className="live-confirm"><input type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)} disabled={stopBusy}/>I intend to latch STOP for this source session.</label><button type="submit" className="secondary live-stop-button" disabled={!confirmed||stopBusy}>{stopBusy?'STOP pending…':'STOP source'}</button></form><p role="status" className="live-stop-notice">{stopNotice}</p>{stopAck&&<p>Bounded v1 STOP acknowledgment · <Clock value={stopAck.observedAt}/>. Earlier event/source clocks remain unchanged.</p>}</details>
   <OperationsGuide/>
   <section className="live-unavailable" aria-label="Exact-mint analysis unavailable"><h2>SCOUT IT · unavailable</h2><p>Arbitrary-mint analysis is parked. Its source approval remains disabled; this viewer never requests mint facts or the separate proof POST. A creation receipt does not establish supply, mint/freeze controls, holder quality, liquidity or returns.</p></section>
  </main><footer className="site-footer"><p>UNFARMD · independent research. RPC-reported evidence, not independent replay. No wallet, trade, public feed or automatic callout.</p></footer>
 </div>;
}
