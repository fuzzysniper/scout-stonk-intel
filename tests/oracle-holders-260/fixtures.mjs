// Invented offline bytes ONLY. No real provider, mint, wallet or transaction captured.
import {createHash} from 'node:crypto';
const B58='123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
export function encode(b){let n=0n;for(const x of b)n=n*256n+BigInt(x);let s='';while(n){s=B58[Number(n%58n)]+s;n/=58n;}for(const x of b){if(x!==0)break;s='1'+s;}return s;}
export const bytes=n=>Buffer.from(Array.from({length:32},(_,i)=>(n+i)%256)),key=n=>encode(bytes(n));
export const MINT=key(1),SPL='TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',T22='TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb';
export const at=ms=>new Date(Date.parse('2026-10-31T12:00:30.000Z')+ms).toISOString(),ASOF=at(7000);
export const hash=b=>createHash('sha256').update(b).digest('hex');
export function mintBytes(supply=1000000n,decimals=6){const b=Buffer.alloc(82);b.writeBigUInt64LE(supply,36);b[44]=decimals;b[45]=1;return b;}
export function tokenBytes(n,amount=10000n){const b=Buffer.alloc(165);bytes(1).copy(b,0);bytes(100+n).copy(b,32);b.writeBigUInt64LE(amount,64);b[108]=1;return b;}
export function withExtensions(b,kind,entries=[]){const head=Buffer.alloc(166);b.copy(head);head[165]=kind;return Buffer.concat([head,...entries.map(([t,v])=>{const h=Buffer.alloc(4);h.writeUInt16LE(t);h.writeUInt16LE(v.length,2);return Buffer.concat([h,v]);})]);}
export const account=(b,owner=SPL)=>({data:[b.toString('base64'),'base64'],owner,executable:false,lamports:2039280,rentEpoch:0,space:b.length});
const request=(id,method,params)=>JSON.stringify({jsonrpc:'2.0',id,method,params});
export function capture(requestBody,result,index){const id=260001+index;return {endpointHost:'api.mainnet.solana.com',requestBody,responseBytes:Buffer.from(JSON.stringify({jsonrpc:'2.0',id,result})),httpStatus:200,requestStartedAt:at(index*2500),receivedAt:at(index*2500+1000)};}
export function fixture(count=20){const names=Array.from({length:count},(_,i)=>key(i+10));return {kind:'synthetic_fixture',network:'solana-mainnet-beta',mint:MINT,evaluatedAt:ASOF,rights:{analysis:'approved_private',reviewSha256:'b'.repeat(64)},
 selection:capture(request(260001,'getTokenLargestAccounts',[MINT,{commitment:'finalized'}]),{context:{slot:100},value:names.map(address=>({address,amount:'10000',decimals:6,uiAmount:0.01,uiAmountString:'0.01'}))},0),
 snapshot:capture(request(260002,'getMultipleAccounts',[[MINT,...names],{encoding:'base64',commitment:'finalized',minContextSlot:100}]),{context:{slot:100},value:[account(mintBytes()),...names.map((_,i)=>account(tokenBytes(i)))]},1),
 clock:capture(request(260003,'getBlockTime',[100]),Math.floor(Date.parse('2026-10-31T12:00:00.000Z')/1000),2)};}
export function mutateResponse(f,field,fn){const root=JSON.parse(Buffer.from(f[field].responseBytes).toString('utf8'));fn(root);f[field].responseBytes=Buffer.from(JSON.stringify(root));}
export function mutateAccount(f,n,fn){mutateResponse(f,'snapshot',r=>{const a=r.result.value[n],b=Buffer.from(a.data[0],'base64'),out=fn(b,a)??b;a.data=[out.toString('base64'),'base64'];a.space=out.length;});}
export function token2022(f,accountExtensions=[]){mutateResponse(f,'snapshot',r=>{r.result.value[0]=account(withExtensions(mintBytes(),1),T22);for(let i=1;i<r.result.value.length;i++)r.result.value[i]=account(withExtensions(tokenBytes(i-1),2,accountExtensions),T22);});}
