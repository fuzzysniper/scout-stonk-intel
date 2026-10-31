import {isExactPublicKey} from '../../onchain-mint/validation';
import {TOKEN_PROGRAM,TOKEN_2022_PROGRAM} from '../../onchain-mint/policy';
import type {Controls,TransferFee} from './contract';
const B58='123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
export function requireValue(x:unknown):asserts x {if(!x)throw Error('unsupported_or_malformed_account');}
export function key(bytes:Uint8Array,nullable=false):string|null {
 requireValue(bytes.length===32);if(nullable&&bytes.every(b=>b===0))return null;
 let n=0n;for(const b of bytes)n=(n<<8n)+BigInt(b);let result='';while(n){result=B58[Number(n%58n)]+result;n/=58n;}
 for(const b of bytes){if(b!==0)break;result='1'+result;}requireValue(isExactPublicKey(result));return result;
}
function cOption(b:Buffer,o:number):string|null {const tag=b.readUInt32LE(o);requireValue(tag===0||tag===1);return tag===0?null:key(b.subarray(o+4,o+36));}
const ACCOUNT_ONLY=new Set([2,5,7,8,11,13,15,17,27]);
function fee(b:Buffer,o:number):TransferFee {const basisPoints=b.readUInt16LE(o+16);requireValue(basisPoints<=10000);return {epoch:b.readBigUInt64LE(o).toString(),maximumFeeRaw:b.readBigUInt64LE(o+8).toString(),basisPoints};}
/** Orthogonal binary reader: the existing jsonParsed decoder cannot retain raw extension states.
 * Exact upstream Mint82/Token2022 type165/TLV166 layout. No provider flags or inferred JSON defaults.
 */
export function decodeMintBytes(data:Buffer,owner:string):Controls {
 requireValue([TOKEN_PROGRAM,TOKEN_2022_PROGRAM].includes(owner)&&data.length>=82&&data.length<=8192&&data.length!==355);
 requireValue(data[45]===1);
 const controls:Controls={program:owner===TOKEN_PROGRAM?'spl_token':'token_2022',ownerProgram:owner,initialized:true,decimals:data[44],rawSupply:data.readBigUInt64LE(36).toString(),mintAuthority:cOption(data,0),freezeAuthority:cOption(data,46),
 permanentDelegate:null,transferHook:null,transferFee:null,defaultAccountState:null,nonTransferable:false,pausable:null,mintCloseAuthority:null,extensionTypes:[],unsupported:[],extensionCoverage:'complete_reviewed'};
 if(owner===TOKEN_PROGRAM){requireValue(data.length===82);return controls;}
 if(data.length===82)return controls;
 requireValue(data.length>=166&&data.subarray(82,165).every(b=>b===0)&&data[165]===1);
 const types:number[]=[],unsupported:number[]=[];let state={...controls};let offset=166;
 while(offset<data.length){
  if(data.subarray(offset).every(b=>b===0))break;
  requireValue(data.length-offset>=4&&types.length<32);
  const type=data.readUInt16LE(offset),length=data.readUInt16LE(offset+2);offset+=4;
  requireValue(type!==0&&!types.includes(type)&&!ACCOUNT_ONLY.has(type)&&offset+length<=data.length);
  const b=data.subarray(offset,offset+length);offset+=length;types.push(type);
  const size=(n:number)=>requireValue(length===n);
  switch(type){
   case 1:{size(108);const older=fee(b,72),newer=fee(b,90);requireValue(BigInt(newer.epoch)>=BigInt(older.epoch));state.transferFee={configAuthority:key(b.subarray(0,32),true),withdrawWithheldAuthority:key(b.subarray(32,64),true),withheldRaw:b.readBigUInt64LE(64).toString(),older,newer};break;}
   case 3:size(32);state.mintCloseAuthority=key(b,true);break;
   case 6:size(1);requireValue(b[0]===1||b[0]===2);state.defaultAccountState=b[0]===2?'frozen':'initialized';break;
   case 9:size(0);state.nonTransferable=true;break;
   case 12:size(32);state.permanentDelegate=key(b,true);break;
   case 14:size(64);state.transferHook={authority:key(b.subarray(0,32),true),programId:key(b.subarray(32,64),true)};break;
   case 18:size(64);key(b.subarray(0,32),true);key(b.subarray(32,64),true);break; // metadata pointer does not verify content/issuer
   case 26:size(33);requireValue(b[32]===0||b[32]===1);state.pausable={authority:key(b.subarray(0,32),true),paused:b[32]===1};break;
   default:unsupported.push(type); // Includes confidential/scaled/interest/permissioned-burn/variable metadata: never guessed absent.
  }
 }
 const has=(n:number)=>types.includes(n);
 requireValue(!(has(16)&&!(has(1)&&has(4)))&&!(has(1)&&has(4)&&!has(16))&&!(has(24)&&!has(4))&&!(has(25)&&has(10))&&!(has(9)&&has(4)&&!has(24)));
 state={...state,extensionTypes:types,unsupported,extensionCoverage:unsupported.length?'incomplete_or_unsupported':'complete_reviewed'};
 return state;
}
export function strictBase64(s:unknown):Buffer {
 requireValue(typeof s==='string'&&s.length<=10924&&s.length>=4&&s.length%4===0&&/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(s));
 const b=Buffer.from(s as string,'base64');requireValue(b.length<=8192&&b.toString('base64')===s);return b;
}
