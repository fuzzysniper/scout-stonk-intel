// Original262 invented bytes only. Real A engine is REQUIRED by this harness.
import {fixture as holderFixture,mutateAccount,mutateResponse,mintBytes,account,token2022,key,MINT,SPL} from '../oracle-holders-260/fixtures.mjs';
export {MINT};
export function nativeInputs(mode='sample',time=Date.now()){
 const f=holderFixture(4),baseline=Date.parse(f.evaluatedAt),shift=time-baseline;
 const shiftClock=s=>new Date(Date.parse(s)+shift).toISOString();
 f.evaluatedAt=shiftClock(f.evaluatedAt);for(const r of [f.selection,f.snapshot,f.clock]){r.requestStartedAt=shiftClock(r.requestStartedAt);r.receivedAt=shiftClock(r.receivedAt);}mutateResponse(f,'clock',r=>r.result+=Math.floor(shift/1000));
 if(mode==='warning'){mutateAccount(f,0,b=>{b.writeUInt32LE(1,0);Buffer.from(Array.from({length:32},(_,i)=>i+2)).copy(b,4);});mutateAccount(f,1,b=>{b.writeBigUInt64LE(600000n,64);});mutateResponse(f,'selection',r=>r.result.value[0].amount='600000');}
 if(mode==='incomplete')mutateResponse(f,'snapshot',r=>r.result.value[2]=null);
 if(mode==='token2022')token2022(f,[[65000,Buffer.from([1])]]);
 let independent=null;if(mode==='conflict')independent={kind:'synthetic_fixture',network:'solana-mainnet',endpointHost:'mainnet.helius-rpc.com',method:'getAccountInfo',encoding:'base64',commitment:'finalized',mint:MINT,id:1,requestStartedAt:f.snapshot.requestStartedAt,receivedAt:f.snapshot.receivedAt,evaluatedAt:f.evaluatedAt,httpDate:null,httpStatus:200,text:JSON.stringify({jsonrpc:'2.0',id:1,result:{context:{slot:100},value:account(mintBytes(2000000n),SPL)}})};
 return {holder:f,independent,mint:MINT,evaluatedAt:f.evaluatedAt};
}
export async function engineScenario(api,mode='sample'){
 const input=nativeInputs(mode,Date.now()-(mode==='stale'?120000:0));
 if(mode==='unknown')return api.analyzeNativeEvidence({mint:MINT,evaluatedAt:input.evaluatedAt});
 const holderEvidence=await api.qualifyHolderCapture(input.holder),mintEvidence=input.independent?await api.qualifyMintCapture(input.independent):undefined;
 const data=api.analyzeNativeEvidence({mint:MINT,evaluatedAt:input.evaluatedAt,holderEvidence,mintEvidence});
 if(mode==='wrong-mint')return {...data,mint:key(8)};
 if(mode==='source-injection')return {...data,origin:{...data.origin,providerAuthenticated:true}};
 if(mode==='malformed')return {...data,concentration:{...data.concentration,selectedTotal:{numeratorRaw:'1',denominatorRaw:'0',basisPointsFloor:'not-a-floor'}}};
 return data;
}
