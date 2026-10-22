// Offline verification against an owner/reviewer supplied official source file.
// No fetch, git, RPC, installs, provider URLs or writes.
import fs from 'node:fs';
import {createHash} from 'node:crypto';
const filename=process.argv[2];
if(process.argv.length!==3)throw Error('Usage: node verify-idl.mjs <local-official-pump_amm.json>');
if(fs.statSync(filename).size>262144)throw Error('IDL size limit');
const bytes=fs.readFileSync(filename),idl=JSON.parse(bytes.toString('utf8')),layout=JSON.parse(fs.readFileSync(new URL('./official-layout.json',import.meta.url),'utf8'));
const need=(ok,label)=>{if(!ok)throw Error(label);};
need(createHash('sha256').update(bytes).digest('hex')===layout.idlSha256,'Exact official IDL byte hash mismatch');
const pool=idl.types.filter(x=>x.name==='Pool');need(pool.length===1&&pool[0].type.kind==='struct','Pool type');
let offset=8;
const fields=pool[0].type.fields.map(f=>{const bytes={u8:1,u16:2,pubkey:32,u64:8,bool:1,i128:16}[f.type];need(bytes,'Unsupported field type');const row={name:f.name,type:f.type,offset,bytes};offset+=bytes;return row;});
need(idl.address===layout.program&&offset===layout.serializedSize,'Program/size mismatch');
need(JSON.stringify(fields)===JSON.stringify(layout.fields),'Field/order/offset/type mismatch');
need(JSON.stringify(idl.metadata)===JSON.stringify(layout.metadata),'Metadata mismatch');
need(JSON.stringify(idl.accounts.find(x=>x.name==='Pool').discriminator)===JSON.stringify(layout.discriminator),'Discriminator mismatch');
console.log(`PASS: exact official IDL SHA-256, Pool discriminator, program, metadata and all ${fields.length} field offsets/types; 287 bytes. No RPC.`);
