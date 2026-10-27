/** Exact unsigned fixed decimal. No binary floating-point financial arithmetic. */
export const SCALE=1_000_000_000n;
export const CENT=10_000_000n;
export const MAX_INPUT=999_999_999_999_999_999n;
// ≤9 whole digits +≤9 fractional digits; no exponent, signs, whitespace or coercion.
export function decimal(value:unknown,places=9):bigint|null {
 if(typeof value!=='string'||value.length>19||value.trim()!==value||! /^(0|[1-9]\d{0,8})(?:\.\d{1,9})?$/.test(value))return null;
 const [whole,fraction='']=value.split('.');if(fraction.length>places)return null;
 const n=BigInt(whole)*SCALE+BigInt(fraction.padEnd(9,'0'));return n<=MAX_INPUT?n:null;
}
export function format(n:bigint):string {
 if(n<0n)throw Error('negative_decimal');const f=String(n%SCALE).padStart(9,'0').replace(/0+$/,'');
 return String(n/SCALE)+(f?'.'+f:'');
}
export const ceilDiv=(n:bigint,d:bigint):bigint=>{if(n<0n||d<=0n)throw Error('invalid_ratio');return (n+d-1n)/d;};
export const roundCents=(n:bigint)=>ceilDiv(n,CENT)*CENT;
export const money=(n:bigint)=>({currency:'USD' as const,amount:format(roundCents(n))});
export const min=(...values:bigint[])=>values.reduce((a,b)=>a<b?a:b);
