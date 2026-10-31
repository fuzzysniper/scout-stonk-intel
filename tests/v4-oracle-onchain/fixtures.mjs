// SYNTHETIC OFFLINE ACCOUNT BYTES ONLY. No real mint observation, RPC receipt, provider grant or private key.
import {createRequire} from 'node:module';
export {MINT,OTHER,TOKEN,TOKEN2022,envelope,TIME} from '../../lib/onchain-mint/tests/fixtures.mjs';
import {MINT,OTHER,TOKEN,TIME,envelope} from '../../lib/onchain-mint/tests/fixtures.mjs';
const require=createRequire(import.meta.url),root=process.env.ORACLE_ONCHAIN_BUILD;
export const {decodeOnchainCapture}=require(root+'/lib/v4-oracle/onchain/evidence.js');
export const {inspectEvidence}=require(root+'/lib/v4-oracle/onchain/evidence.js');
export const {projectOnchainRisk}=require(root+'/lib/v4-oracle/onchain/project.js');
export const {createOnchainRiskSource,ONCHAIN_SOURCE}=require(root+'/lib/v4-oracle/onchain/index.js');
export const {planMintRead}=require(root+'/lib/v4-oracle/onchain/plan.js');
export const {isInspectView,unavailableView}=require(root+'/lib/v4-owner-preview/view-contract.js');
export const {isolatedHttpsTransport}=require(root+'/lib/onchain-mint/server/native-transport.js');
export function pubkey(address=OTHER){const chars='123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';let n=0n;for(const c of address)n=n*58n+BigInt(chars.indexOf(c));const b=Buffer.alloc(32);for(let i=31;i>=0;i--){b[i]=Number(n&255n);n>>=8n;}return b;}
export const zero=()=>Buffer.alloc(32);
export function base({mintAuthority=OTHER,freezeAuthority=null,supply=18446744073709551615n,decimals=9,initialized=1}={}){const b=Buffer.alloc(82);for(const [o,v]of [[0,mintAuthority],[46,freezeAuthority]])if(v!==null){b.writeUInt32LE(1,o);pubkey(v).copy(b,o+4);}b.writeBigUInt64LE(supply,36);b[44]=decimals;b[45]=initialized;return b;}
export function tlv(type,payload=Buffer.alloc(0)){const h=Buffer.alloc(4);h.writeUInt16LE(type,0);h.writeUInt16LE(payload.length,2);return Buffer.concat([h,payload]);}
export function extended(entries=[],options={}){return Buffer.concat([base(options),Buffer.alloc(83),Buffer.from([1]),...entries]);}
export function fee({config=null,withdraw=null,held=0n,older={epoch:1n,cap:100n,bps:100},newer={epoch:2n,cap:200n,bps:200}}={}){const b=Buffer.alloc(108);if(config)pubkey(config).copy(b,0);if(withdraw)pubkey(withdraw).copy(b,32);b.writeBigUInt64LE(held,64);for(const [o,f]of [[72,older],[90,newer]]){b.writeBigUInt64LE(f.epoch,o);b.writeBigUInt64LE(f.cap,o+8);b.writeUInt16LE(f.bps,o+16);}return b;}
export function rpc(bytes=base(),owner=TOKEN,extra={}){return {jsonrpc:'2.0',id:1,result:{context:{slot:400000001,apiVersion:'3.0.0'},value:{owner,executable:false,lamports:1461600,rentEpoch:0,data:[bytes.toString('base64'),'base64'],space:bytes.length}},...extra};}
export function capture(body=rpc(),extra={}){return {kind:'synthetic_fixture',network:'solana-mainnet',endpointHost:'mainnet.helius-rpc.com',method:'getAccountInfo',encoding:'base64',commitment:'finalized',mint:MINT,id:1,requestStartedAt:TIME,receivedAt:TIME,evaluatedAt:TIME,httpDate:null,httpStatus:200,text:JSON.stringify(body),...extra};}
export const parsed=(extra={})=>capture(envelope(),{encoding:'jsonParsed',...extra});
export async function project(c=capture(),extra={}){return projectOnchainRisk({mint:MINT,evaluatedAt:TIME,onchain:await decodeOnchainCapture(c),...extra});}
export const finding=(rows,id)=>rows.find(f=>f.id==='onchain-'+id);
export function jupiter(extra={}){return {mint:MINT,sourceUpdatedAt:TIME,receivedAt:TIME,responseSha256:'b'.repeat(64),mintAuthorityDisabled:true,freezeAuthorityDisabled:true,...extra};}
