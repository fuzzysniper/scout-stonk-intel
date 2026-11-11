// EXPLICITLY SYNTHETIC OFFLINE captures; no live provider/account observation.
import {createRequire} from 'node:module';
import {capture,envelope,MINT,OTHER,TIME,token2022} from '../v4-solana-facts/fixtures.mjs';
export {capture,envelope,MINT,OTHER,TIME,token2022};
const require=createRequire(import.meta.url),build=process.env.V4_INTEGRATION_BUILD;
require.extensions['.css']=m=>{m.exports={default:{}};};
export const {assembleCapturedEvidence}=require(build+'/lib/v4-alpha-lens/captured-bridge.js');
export const {sourceOffLens}=require(build+'/lib/v4-alpha-lens/source-off-model.js');
export const B=require(build+'/lib/unfarmd-intelligence/index.js');
export const now=Date.parse(TIME),copy=x=>JSON.parse(JSON.stringify(x));
export function market(changes={}){
 const {pools=[{chainId:'solana',dexId:'synthetic',pairAddress:'So11111111111111111111111111111111111111112',baseToken:{address:MINT,symbol:'SYNTHETIC'},quoteToken:{address:OTHER,symbol:'SYNTHETIC'},liquidity:{usd:0},volume:{h24:0},priceUsd:'0',priceChange:{h24:0},pairCreatedAt:now-100000}],...rest}=changes;
 return {mint:MINT,bytes:new TextEncoder().encode(JSON.stringify(pools)),requestStartedMs:now,fetchedMs:now,evaluatedMs:now,acquisition:'synthetic_fixture',...rest};
}
