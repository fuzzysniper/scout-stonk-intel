/** Preserve source capture microseconds; never round future/skew boundary checks. */
export function utcMicroseconds(value:unknown):bigint|null {
 if(typeof value!=='string')return null;
 const match=/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})(?:\.(\d{1,6}))?(?:Z|\+00:00)$/.exec(value);
 if(!match)return null;const base=Date.parse(match[1]+'Z');
 if(!Number.isFinite(base)||new Date(base).toISOString().slice(0,19)!==match[1])return null;
 return BigInt(base)*1000n+BigInt((match[2]??'').padEnd(6,'0'));
}
