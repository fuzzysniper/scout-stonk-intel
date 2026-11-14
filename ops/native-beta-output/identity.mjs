// Read-only identity/canonicalization. No archive, CLI, provider or database import.
import fs from 'node:fs';import {createHash} from 'node:crypto';
export const policy=JSON.parse(fs.readFileSync(new URL('./policy.json',import.meta.url)));
export const hash=b=>createHash('sha256').update(b).digest('hex');
export function need(x){if(!x)throw Error('NATIVE_BUILD_HOLD');}
export function canonical(x){if(x===null||typeof x==='string'||typeof x==='boolean')return JSON.stringify(x);if(typeof x==='number'){need(Number.isSafeInteger(x));return String(x);}if(Array.isArray(x))return '['+x.map(canonical).join(',')+']';need(x&&Object.getPrototypeOf(x)===Object.prototype);return '{'+Object.keys(x).sort().map(k=>JSON.stringify(k)+':'+canonical(x[k])).join(',')+'}';}
