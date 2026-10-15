'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import {isSolanaMint} from '../lib/solana';
import HistoryPanel from './history-panel';
import PairExplorer,{TokenIdentityMark} from './pairs/explorer';
import {CopyResearchLink,dismissResearchKeyboard} from './research-actions';
import {screenUsd,tokenResearchUrl} from './pairs/results';
import type { TrackedToken } from '../lib/tracked-tokens';
type Reward={status:string;mint?:string;mode?:string|null;quoteSymbol?:string|null;quoteMint?:string|null;distributedTokens?:number|null;payoutCount?:number|null;holderCount?:number|null;lastPayoutAt?:string|null;source?:string;fetchedAt?:string};
type Market={mint?:string;found:boolean;source:string;fetchedAt:string;pairAddress?:string;pairUrl?:string|null;base?:{name:string;symbol:string;address?:string};quote?:{symbol:string;address?:string};priceUsd?:string|null;liquidityUsd?:number|null;volume24h?:number|null;change24h?:number|null;marketCap?:number|null;note?:string};
const compact=(n:number)=>new Intl.NumberFormat('en-US',{notation:'compact',maximumSignificantDigits:4}).format(n);
const full=(n:number)=>new Intl.NumberFormat('en-US',{maximumFractionDigits:8}).format(n);
export default function ScoutClient({tokens,initialMint=''}:{tokens:TrackedToken[];initialMint?:string}){
 const [mint,setMint]=useState(initialMint),[selected,setSelected]=useState(initialMint),[error,setError]=useState(''),[loading,setLoading]=useState(Boolean(initialMint)),[market,setMarket]=useState<Market|null>(null),[reward,setReward]=useState<Reward|null>(null),[shareStatus,setShareStatus]=useState(''),[historyWarning,setHistoryWarning]=useState<string|null>(null);
 const requestId=useRef(0),lookup=useRef<HTMLDetailsElement>(null);
 const inspect=useCallback(async(value:string)=>{
  const address=value.trim();if(!isSolanaMint(address)){setError('Enter a valid Solana token mint address.');return;}
  const id=++requestId.current;setMint(address);setSelected(address);setError('');setLoading(true);setMarket(null);setReward(null);setShareStatus('');setHistoryWarning(null);
  try{
   const [m,r]=await Promise.allSettled([fetch('/api/token?mint='+encodeURIComponent(address)).then(async res=>{if(!res.ok)throw Error('Market feed unavailable');return res.json() as Promise<Market>}),fetch('/api/rewards?mint='+encodeURIComponent(address)).then(async res=>{if(!res.ok)throw Error('Reward feed unavailable');return res.json() as Promise<Reward>})]);
   if(id!==requestId.current)return;
   if(m.status==='fulfilled')setMarket(m.value);else setError('Market feed temporarily unavailable.');
   setReward(r.status==='fulfilled'?r.value:{status:'unavailable'});
  }finally{if(id===requestId.current)setLoading(false);}
 },[]);
 useEffect(()=>{const value=new URLSearchParams(window.location.search).get('mint');if(value&&isSolanaMint(value))void inspect(value);},[inspect]);
 function submit(){
  if(!isSolanaMint(mint.trim())){setError('Enter a valid Solana token mint address.');return;}
  dismissResearchKeyboard();if(lookup.current)lookup.current.open=false;
  // A real navigation refreshes server-generated exact-mint OG metadata as well.
  window.location.assign(tokenResearchUrl(mint.trim(),window.location.origin));
 }
 async function share(){
  if(!selected)return;const url=tokenResearchUrl(selected,window.location.origin);setShareStatus('');
  try{if(navigator.share){await navigator.share({title:'SCOUT Token Dossier',text:'SCOUT token dossier — sourced market and reward intelligence',url});setShareStatus('Shared');}else{await navigator.clipboard.writeText(url);setShareStatus('Report link copied');}}
  catch(e){if(e instanceof Error&&e.name==='AbortError')return;setShareStatus('Could not share; use Copy research link.');}
 }
 // The existing dossier endpoint supplies a legacy cumulative ledger, not the pair
 // contract's strict mode/interval verification. Never promote it to those tiers.
 const available=reward?.status==='available',hasTotal=available&&reward.distributedTokens!=null;
 const baseSelected=market?.base?.address===selected,quoteSelected=market?.quote?.address===selected;
 const label=baseSelected?market?.base?.symbol:quoteSelected?market?.quote?.symbol:null;
 const name=baseSelected?market?.base?.name:null;
 const quote=reward?.quoteSymbol;
 return <main id="scout-content" tabIndex={-1} className={'terminal ux-terminal flow-first'+(selected?' token-dossier':'')}>
 {selected && <><h1 tabIndex={-1} className="dossier-title">Token dossier</h1><p className="dossier-context">Read-only research · source-linked snapshots</p></>}
 {!selected && <PairExplorer tokens={tokens}/>}
 {error&&<p role="alert" className="error">{error}</p>}
 {selected&&<section className="dossier token-brief" aria-label="Token research brief" aria-busy={loading}>
  <div className="brief-identity"><TokenIdentityMark mint={selected}/><div><h2>{label||'Token'} <span>{quote?' / '+quote:''}</span></h2><p>{name|| (loading?'Loading identity…':'Name not reported')}{quote && <span> · reward quote</span>}</p></div></div>
  <dl className="brief-market" aria-label="Provider-reported USD snapshot"><div><dt>Liquidity</dt><dd>{market?.liquidityUsd==null?'Unknown':screenUsd(market.liquidityUsd)}</dd></div><div><dt>24h volume</dt><dd>{market?.volume24h==null?'Unknown':screenUsd(market.volume24h)}</dd></div></dl>
  <p className="brief-source">DexScreener · highest-liquidity Solana pool, not necessarily StonkFun. Snapshot, not live.</p>
  <div className="brief-conclusion"><span>Reward evidence</span><h3>{loading?'Checking sources…':hasTotal?'Lifetime reported':'Rewards unverified'}</h3><p>{loading?'Reading the existing market and reward sources.':hasTotal?<>StonkFun reports {compact(reward.distributedTokens!)} {quote||'quote tokens'} cumulatively (rounded; cutoff unknown). Recent flow and holder returns unverified.</>:'No usable lifetime total here. Recent flow and holder returns unverified.'}</p></div>
  {(reward?.status==='unavailable' || historyWarning) && <p className="brief-warning" role="status">{[reward?.status==='unavailable'?'Reward source unavailable.':null,historyWarning].filter(Boolean).join(' ')}</p>}
  <div className="brief-actions"><CopyResearchLink key={selected} mint={selected} label={label||selected}/><button type="button" onClick={()=>void share()}>Share report</button></div>
  {shareStatus&&<p className="research-feedback" role="status">{shareStatus}</p>}
  <details className="dossier-details quick-technical"><summary>Technical evidence</summary><div className="brief-evidence">
   <p>Research links identify this exact token, not a frozen sample. This dossier retrieves DexScreener and the legacy StonkFun ledger separately from the pair screener. Different sources and times can report different figures.</p>
   <div className="sourcelinks"><a href={'https://solscan.io/token/'+encodeURIComponent(selected)} target="_blank" rel="noopener noreferrer">Solscan ↗</a>{market?.pairUrl&&<a href={market.pairUrl} target="_blank" rel="noopener noreferrer">DexScreener source ↗</a>}{reward?.source&&<a href={reward.source} target="_blank" rel="noopener noreferrer">StonkFun source ↗</a>}<a href={'/api/token?mint='+selected}>Market JSON</a><a href={'/api/rewards?mint='+selected}>Reward JSON</a><a href={'https://stonk.fyi/tokens/'+encodeURIComponent(selected)} target="_blank" rel="noopener noreferrer">Independent record ↗</a></div>
   <dl><div><dt>Token mint · Solana</dt><dd>{selected}</dd></div><div><dt>Reward quote identity</dt><dd>{quote||'Not reported'} · {reward?.quoteMint||'Mint not reported; ticker alone does not verify identity'}</dd></div>
   {market?.base && <div><dt>Market base</dt><dd>{market.base.symbol} · {market.base.address}</dd></div>}{market?.quote && <div><dt>Market quote</dt><dd>{market.quote.symbol} · {market.quote.address}</dd></div>}
   {market?.pairAddress && <div><dt>Market pool</dt><dd>{market.pairAddress}</dd></div>}
   <div><dt>Market retrieved</dt><dd>{market?.fetchedAt?<time dateTime={market.fetchedAt}>{market.fetchedAt}</time>:'No successful read'}. Retrieval is not a market tick time.</dd></div>
   <div><dt>Reward retrieved</dt><dd>{reward?.fetchedAt?<time dateTime={reward.fetchedAt}>{reward.fetchedAt}</time>:'No successful read'}</dd></div>
   {available && <>
    {reward.distributedTokens!=null && <div><dt>Reported lifetime distribution</dt><dd>{full(reward.distributedTokens)} {quote||'quote tokens'} · cumulative, not recent flow. Start and reconciliation cutoff unknown.</dd></div>}
    {reward.payoutCount!=null && <div><dt>Provider ledger event count</dt><dd>{full(reward.payoutCount)}</dd></div>}
    {reward.holderCount!=null && <div><dt>Provider holder count</dt><dd>{full(reward.holderCount)} · not verified unique paid wallets</dd></div>}
    {reward.lastPayoutAt && <div><dt>Last reported payout</dt><dd><time dateTime={reward.lastPayoutAt}>{reward.lastPayoutAt}</time></dd></div>}
   </>}
   {reward?.mode && <div><dt>Legacy API-reported mode</dt><dd>{reward.mode} · not the pair contract’s strict settings verification</dd></div>}
   {market?.priceUsd!=null && <div><dt>Reported base-token USD price</dt><dd>{market.priceUsd}</dd></div>}
   {market?.liquidityUsd!=null && <div><dt>Reported pool liquidity · USD</dt><dd>{full(market.liquidityUsd)}</dd></div>}
   {market?.volume24h!=null && <div><dt>Reported pool 24h volume · USD</dt><dd>{full(market.volume24h)}</dd></div>}
   {market?.marketCap!=null && <div><dt>Reported market cap · USD</dt><dd>{full(market.marketCap)}</dd></div>}
   {market?.change24h!=null && <div><dt>Reported 24h price move</dt><dd>{market.change24h}%</dd></div>}
   </dl>
   <p>Market: {market?.note||'DexScreener, highest reported-liquidity Solana pool; not necessarily an official StonkFun market.'} Rewards: StonkFun public API, not independently reconciled against transactions. Missing fields are unknown, not zero. Quote symbols alone do not establish asset identity or underlying equity ownership.</p>
   <p>Holder returns unavailable: entitlement, cost basis, payout valuations, trades and fees are missing. Provider counts and cumulative distributions do not verify individual receipts, APY or profit. Recorded-point comparisons below retain their own coverage gates; this dossier does not establish the pair contract’s strict covered-interval tier.</p>

   <HistoryPanel key={selected} mint={selected} onQuality={setHistoryWarning}/>
  </div></details>
 </section>}
 <details ref={lookup} className="lookup-disclosure"><summary>{selected?'Inspect another token':'Token research by mint'}</summary>
 <form className="lookup" onSubmit={e=>{e.preventDefault();submit();}}><label htmlFor="mint">TOKEN MINT ADDRESS</label><div className="lookuprow"><input id="mint" placeholder="Paste Solana token address…" value={mint} onChange={e=>setMint(e.target.value)} autoComplete="off" spellCheck={false}/><button type="submit" disabled={loading}>{loading?'SCANNING…':'SCAN ↗'}</button></div></form>
 </details>
 {selected && <footer><p>Research only · no verified holder returns. <a href="https://github.com/fuzzysniper/scout-stonk-intel" target="_blank" rel="noopener noreferrer">Source code ↗</a></p></footer>}
 </main>;
}
