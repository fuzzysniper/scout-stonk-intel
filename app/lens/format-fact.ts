import type {FactView} from '../../lib/v4-owner-preview/view-contract';

/** Display-only rounding. Exact raw provider decimal is always shown on expand. */
export function formatFact(f:FactView):{value:string;unit:string}{
 if(f.value===null)return {value:'—',unit:''};
 const raw=f.value;
 if(!/^-?(?:0|[1-9]\d*)(?:\.\d+)?$/.test(raw))return {value:raw,unit:''};
 const n=Number(raw);
 if(!Number.isFinite(n)||Math.abs(n)>1e15)return {value:raw,unit:f.unit==='percent'?'%':''};
 if(f.id==='priceUsd'){
  const v=Math.abs(n)>=0.01?new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:Math.abs(n)<1?5:2}).format(n)
   :n===0?'$0':('$'+n.toExponential(3));
  return {value:v,unit:''};
 }
 if(f.unit.startsWith('USD'))return {value:new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',notation:Math.abs(n)>=1000?'compact':'standard',maximumFractionDigits:2}).format(n),unit:''};
 if(f.unit==='percent')return {value:(n>0?'+':'')+new Intl.NumberFormat('en-US',{maximumFractionDigits:2}).format(n),unit:'%'};
 if(f.unit==='ratio')return {value:new Intl.NumberFormat('en-US',{maximumFractionDigits:1}).format(n*100),unit:'%'};
 if(f.unit==='transactions'||f.unit==='provider_reported_traders'||f.unit==='provider_reported_holders')
  return {value:new Intl.NumberFormat('en-US',{notation:Math.abs(n)>=10000?'compact':'standard',maximumFractionDigits:1}).format(n),unit:''};
 return {value:raw,unit:''};
}
