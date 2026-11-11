// INVENTED OFFLINE TEST BYTES. Published account addresses are identities only;
// every amount, slot and timestamp below is synthetic, not a mainnet observation.
import {createRequire} from 'node:module';
import {join} from 'node:path';
const require=createRequire(import.meta.url);
export const build=join(process.env.PUMPSWAP_TEST_BUILD,'experiments/agent-zero-onchain');
export const p=require(join(build,'policy.js')),decoder=require(join(build,'decode.js')),pipeline=require(join(build,'pipeline.js')),approval=require(join(build,'approval.js'));
export const CHECK='2026-10-22T12:00:01.100Z';
export function json(v){if(typeof v==='bigint')return v.toString();if(Array.isArray(v))return '['+v.map(json).join(',')+']';if(v&&typeof v==='object')return '{'+Object.entries(v).map(([k,x])=>JSON.stringify(k)+':'+json(x)).join(',')+'}';return JSON.stringify(v);}
export const encode=x=>Buffer.from(json(x));
export function fixture(length=287){
 const {PIN,layout,U64_MAX}=p;
 const pool=Buffer.alloc(Math.max(length,287));Buffer.from(layout.discriminator).copy(pool);
 const values={pool_bump:254,index:0,creator:PIN.creator,base_mint:PIN.baseMint,quote_mint:PIN.quoteMint,lp_mint:PIN.lpMint,pool_base_token_account:PIN.baseVault,pool_quote_token_account:PIN.quoteVault,lp_supply:100000n,coin_creator:PIN.creator,is_mayhem_mode:false,is_cashback_coin:false,virtual_quote_reserves:-30000000n,creator_fee_bps:0n,can_edit_creator_fee:false,is_holder_reward:false,protocol_fees:20000000n,creator_fees:10000000n};
 for(const f of layout.fields){const v=values[f.name];if(f.type==='pubkey')decoder.decode58(v).copy(pool,f.offset);else if(f.type==='u64')pool.writeBigUInt64LE(v,f.offset);else if(f.type==='i128'){const unsigned=BigInt.asUintN(128,v);pool.writeBigUInt64LE(unsigned&U64_MAX,f.offset);pool.writeBigUInt64LE(unsigned>>64n,f.offset+8);}else if(f.type==='u16')pool.writeUInt16LE(v,f.offset);else pool[f.offset]=Number(v);}
 function token(mint,amount,native){const b=Buffer.alloc(165);decoder.decode58(mint).copy(b);decoder.decode58(PIN.pool).copy(b,32);b.writeBigUInt64LE(amount,64);b[108]=1;if(native){b.writeUInt32LE(1,109);b.writeBigUInt64LE(2039280n,113);}return b;}
 function mint(decimals){const b=Buffer.alloc(82);b.writeBigUInt64LE(9007199254740993000n,36);b[44]=decimals;b[45]=1;return b;}
 const buffers=[pool.subarray(0,length),token(PIN.baseMint,100000000000n,false),token(PIN.quoteMint,110000000000n,true),mint(6),mint(9)];
 function account(b,i){return {data:[b.toString('base64'),'base64'],executable:false,lamports:i===2?110002039280n:2039280n,owner:i===0?PIN.program:PIN.tokenProgram,rentEpoch:U64_MAX,space:BigInt(b.length)};}
 const rpc={jsonrpc:'2.0',id:1n,result:{context:{slot:444444444n,apiVersion:'OFFLINE-FIXTURE'},value:buffers.map(account)}};
 const block={jsonrpc:'2.0',id:2n,result:BigInt(Date.parse('2026-10-22T11:59:45Z')/1000)};
 const first=()=>({endpoint:PIN.endpoint,network:PIN.network,requestBody:p.accountsRequest(),requestedAt:'2026-10-22T12:00:00.000Z',receivedAt:'2026-10-22T12:00:00.500Z',httpDate:'Thu, 22 Oct 2026 12:00:00 GMT',status:200,body:encode(rpc)});
 const second=()=>({endpoint:PIN.endpoint,network:PIN.network,requestBody:p.timeRequest(rpc.result.context.slot.toString()),requestedAt:'2026-10-22T12:00:00.600Z',receivedAt:'2026-10-22T12:00:01.000Z',httpDate:'Thu, 22 Oct 2026 12:00:01 GMT',status:200,body:encode(block)});
 return {rpc,block,first,second,buffers,replace(i,b){rpc.result.value[i].data[0]=b.toString('base64');rpc.result.value[i].space=BigInt(b.length);}};
}
export function finish(f=fixture()){return decoder.finishObservation(decoder.prepareAccounts(f.first()),f.second(),CHECK);}
export function permit(dir){return {version:'pumpswap-owner-approval/1',approved:true,scopeSha256:p.SCOPE_HASH,reviewedCommit:'a'.repeat(40),approvedAt:'2026-10-22T11:59:00.000Z',expiresAt:'2026-10-22T12:05:00.000Z',evidenceDirectory:dir,acknowledgement:approval.ACK};}
