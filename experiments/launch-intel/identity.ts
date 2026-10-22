import {createHash} from 'node:crypto';

const alphabet='123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
export function base58(bytes:Uint8Array):string {
 let n=BigInt('0x'+(Buffer.from(bytes).toString('hex')||'00')), out='';
 while(n){out=alphabet[Number(n%58n)]+out;n/=58n;}
 for(const b of bytes){if(b!==0)break;out='1'+out;}
 return out;
}
export function bytes58(s:unknown,size?:number):Buffer {
 if(typeof s!=='string'||s.length<1||s.length>(size===undefined?12288:Math.ceil(size*1.4)))throw Error('invalid_base58');
 let n=0n;for(const c of s){const d=alphabet.indexOf(c);if(d<0)throw Error('invalid_base58');n=n*58n+BigInt(d);}
 const raw=n?Buffer.from(n.toString(16).padStart(Math.ceil(n.toString(16).length/2)*2,'0'),'hex'):Buffer.alloc(0);
 const z=s.length-s.replace(/^1+/,'').length,b=Buffer.concat([Buffer.alloc(z),raw]);
 if((size!==undefined&&b.length!==size)||base58(b)!==s)throw Error('invalid_base58');return b;
}
export const hash=(b:string|Uint8Array)=>createHash('sha256').update(b).digest('hex');
const P=(1n<<255n)-19n;
const mod=(x:bigint)=>(x%P+P)%P;
function pow(a:bigint,n:bigint){let r=1n;for(;n;n>>=1n,a=mod(a*a))if(n&1n)r=mod(r*a);return r;}
function onCurve(b:Buffer){
 const v=Buffer.from(b),sign=v[31]>>7;v[31]&=127;const y=BigInt('0x'+Buffer.from(v).reverse().toString('hex'));
 if(y>=P)return false;const yy=mod(y*y),d=mod(-121665n*pow(121666n,P-2n)),den=mod(d*yy+1n);
 if(!den)return false;const xx=mod((yy-1n)*pow(den,P-2n));
 return xx===0n?sign===0:pow(xx,(P-1n)/2n)===1n;
}
/** Solana find_program_address: SHA256, descending bump, reject Ed25519 points. */
export function pda(seeds:Uint8Array[],program:string):string {
 const pk=bytes58(program,32);if(seeds.length>15||seeds.some(s=>s.length>32))throw Error('invalid_seed');
 for(let bump=255;bump>=0;bump--){const b=createHash('sha256').update(Buffer.concat([...seeds.map(s=>Buffer.from(s)),Buffer.from([bump]),pk,Buffer.from('ProgramDerivedAddress')])).digest();if(!onCurve(b))return base58(b);}
 throw Error('no_pda');
}
