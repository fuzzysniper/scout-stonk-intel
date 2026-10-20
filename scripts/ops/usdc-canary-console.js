/* Owner console tool: pasting defines a function and sends NOTHING. After separate
 * release/invocation approval, call once from the authenticated normal production
 * unique URL. No key, cookie export, bypass token, wallet or CLI RPC is needed.
 */
globalThis.scoutUsdcCanary = async function scoutUsdcCanary({deploymentHost,commitSha,go}={}) {
 const need=b=>{if(!b)throw Error('SCOUT_CANARY_UNVERIFIED_STOP_NO_RETRY');};
 const mint='EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',intent='usdc-read-once-v1';
 need(go==='ONE_USDC_POST' && typeof deploymentHost==='string' &&
  /^scout-stonk-intel-[a-z0-9]{6,64}-riskledgerapp\.vercel\.app$/.test(deploymentHost) &&
  /^[a-f0-9]{40}$/.test(commitSha??'') && location.origin==='https://'+deploymentHost);
 need(Date.now()>=Date.parse('2026-10-20T00:00:00.000Z') && Date.now()<Date.parse('2026-10-21T00:00:00.000Z'));
 const marker='scout-usdc-canary/1';
 need(!globalThis.__scoutUsdcAttempted && sessionStorage.getItem(marker)===null);
 sessionStorage.setItem(marker,'attempted:'+commitSha);globalThis.__scoutUsdcAttempted=true;
 const started=Date.now(),controller=new AbortController(),timer=setTimeout(()=>controller.abort(),12000);let reader;
 const bounded=async promise=>{
  need(!controller.signal.aborted);let stop;
  try{return await Promise.race([promise,new Promise((_,reject)=>{stop=()=>reject(Error('stopped'));controller.signal.addEventListener('abort',stop,{once:true});})]);}
  finally{controller.signal.removeEventListener('abort',stop);}
 };
 try {
  const res=await bounded(fetch('/api/mint-facts?mint='+mint,{method:'POST',mode:'same-origin',credentials:'same-origin',
   cache:'no-store',redirect:'error',referrerPolicy:'same-origin',headers:{'X-SCOUT-Canary-Intent':intent},signal:controller.signal}));
  need(!res.redirected && /^application\/json(?:\s*;\s*charset=utf-8)?$/i.test(res.headers.get('content-type')??'') && res.body);
  reader=res.body.getReader();const chunks=[];let length=0;
  while(true){const c=await bounded(reader.read());if(c.done)break;need(chunks.length<1024);length+=c.value.byteLength;need(length<=32768);chunks.push(c.value);}
  const raw=new Uint8Array(length);let offset=0;for(const c of chunks){raw.set(c,offset);offset+=c.byteLength;}
  const b=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(raw)),received=Date.now();need(b?.version==='mint-facts/1' && b.mint===mint);
  if(res.status!==200) {
   const reasons=['disabled','admission_limited','circuit_open','timeout','access_denied','rate_limited','upstream_unavailable',
    'network_unavailable','invalid_response','response_too_large','rpc_error','stale_source','invalid_clock'];
   need(b.facts===null && b.source===null && reasons.includes(b.reason));
   return {ok:false,httpStatus:res.status,reason:b.reason,action:'STOP_NO_RETRY',deploymentHost,commitSha,
    startedAt:new Date(started).toISOString(),receivedAt:new Date(received).toISOString()};
  }
  need(res.headers.get('x-scout-delivery')==='rpc' && res.headers.get('x-scout-canary')===intent && res.headers.get('x-scout-deployment-host')===deploymentHost &&
   res.headers.get('x-scout-commit')===commitSha && /^[A-Za-z0-9_:.-]{1,160}$/.test(res.headers.get('x-vercel-id')??''));
  const f=b.facts,s=b.source;
  need(b.status==='verified_onchain_mint_at_slot' && f?.mint===mint && f.network==='solana-mainnet' && f.initialized===true &&
   f.program==='spl_token' && f.ownerProgram==='TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA' &&
   f.extensions?.assessment==='none' && Array.isArray(f.extensions.names) && f.extensions.names.length===0 && f.extensions.metadataPointer===null);
  need(typeof f.supply?.raw==='string' && /^(0|[1-9][0-9]{0,19})$/.test(f.supply.raw) && BigInt(f.supply.raw)<=18446744073709551615n && f.supply.decimals===6);
  const digits=f.supply.raw.padStart(7,'0');need(f.supply.decimalAmount===digits.slice(0,-6)+'.'+digits.slice(-6));
  const exactKey=v=>{
   if(typeof v!=='string'||v.length<32||v.length>44)return false;
   const alphabet='123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';let n=0n;
   for(const c of v){const x=alphabet.indexOf(c);if(x<0)return false;n=n*58n+BigInt(x);}
   return v.match(/^1*/)[0].length+(n===0n?0:Math.ceil(n.toString(16).length/2))===32;
  };
  for(const a of [f.mintAuthority,f.freezeAuthority])need(a && (a.state==='absent'&&a.address===null||a.state==='present'&&exactKey(a.address)));
  need(f.interpretation?.minting===(f.mintAuthority.state==='present'?'authority_present':'authority_absent') &&
   f.interpretation?.freezing===(f.freezeAuthority.state==='present'?'authority_present':'authority_absent'));
  need(s?.endpointHost==='mainnet.helius-rpc.com' && s.acquisition==='production_rpc' && s.method==='getAccountInfo' &&
   s.encoding==='jsonParsed' && s.commitment==='finalized' && s.freshness==='fresh' && s.assurance==='rpc_reported_not_independently_replayed' &&
   s.slotTime===null && /^[1-9][0-9]{0,15}$/.test(s.contextSlot??'') && BigInt(s.contextSlot)<=9007199254740991n && /^[a-f0-9]{64}$/.test(s.responseSha256??''));
  const times=[s.requestStartedAt,s.responseReceivedAt,s.checkedAt,s.evaluatedAt].map(Date.parse);
  need(times.every(Number.isSafeInteger) && times[0]>=started-1000 && times[1]>=times[0] && times[1]-times[0]<=5000 &&
   times[2]===times[1] && times[3]>=times[1] && times[3]<=received+1000 && times[1]<=received+1000 && received-times[1]<=60000);
  need(s.httpDate===null || typeof s.httpDate==='string' && Number.isFinite(Date.parse(s.httpDate)) && Date.parse(s.httpDate)<=times[1] && times[1]-Date.parse(s.httpDate)<=60000);
  const apiResponseSha256=Array.from(new Uint8Array(await bounded(crypto.subtle.digest('SHA-256',raw))),n=>n.toString(16).padStart(2,'0')).join('');
  return {ok:true,version:'scout-usdc-canary-receipt/1',deploymentHost,commitSha,vercelRequestId:res.headers.get('x-vercel-id'),mint,
   program:f.program,ownerProgram:f.ownerProgram,supply:{raw:f.supply.raw,decimals:6,decimalAmount:f.supply.decimalAmount},
   mintAuthority:{state:f.mintAuthority.state,address:f.mintAuthority.address},freezeAuthority:{state:f.freezeAuthority.state,address:f.freezeAuthority.address},
   contextSlot:s.contextSlot,slotTime:null,requestStartedAt:s.requestStartedAt,responseReceivedAt:s.responseReceivedAt,httpDate:s.httpDate,
   sourceRpcResponseSha256:s.responseSha256,apiResponseSha256,assurance:'rpc_reported_not_independently_replayed',
   hashScope:'Source hash is server-reported raw RPC bytes; API hash is independently computed here. Raw RPC bytes are not returned.',action:'STOP_NO_RETRY'};
 } catch {throw Error('SCOUT_CANARY_UNVERIFIED_STOP_NO_RETRY');}
 finally {clearTimeout(timer);controller.abort();if(reader)void reader.cancel().catch(()=>undefined);}
};
