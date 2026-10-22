import {readFileSync,statSync} from 'node:fs';
import {join} from 'node:path';
import {UNOBSERVED_ONCHAIN,canonical,isExactSolanaMint,micros,object,sha,time,validateObservation,type Observation} from './core';
/** Fixed local paths only. Never reads credentials, URLs or production state. */
export function repositoryCatalogue(root:string,now:string):{revision:string;candidates:Observation[];scope:string;warnings:string[]}{
 if(statSync(join(root,'data/reward-snapshots.json')).size>2*1024*1024)throw Error('dataset_too_large');
 const bytes=readFileSync(join(root,'data/reward-snapshots.json'));if(bytes.length>2*1024*1024)throw Error('dataset_too_large');
 if(statSync(join(root,'data/tracked-mints.json')).size>65536)throw Error('catalogue_too_large');
 const catalogueBytes=readFileSync(join(root,'data/tracked-mints.json'));if(catalogueBytes.length>65536)throw Error('catalogue_too_large');
 const revision=sha(bytes),catalogSha256=sha(catalogueBytes),dataset=object(JSON.parse(bytes.toString('utf8'))),tracked=JSON.parse(catalogueBytes.toString('utf8'));
 if(!Array.isArray(tracked)||tracked.length>50)throw Error('invalid_allowlist');
 const candidates:Observation[]=[],warnings:string[]=[],seen=new Set<string>();
 for(const raw of tracked){const t=object(raw);if(!isExactSolanaMint(t.mint)||seen.has(t.mint))throw Error('duplicate_or_invalid_allowlist_identity');seen.add(t.mint);
  const rows=dataset[t.mint];if(!Array.isArray(rows)||rows.length>2000){warnings.push('Missing or oversized records for '+t.mint);continue;}
  const valid:Record<string,unknown>[]=[],byTime=new Map<string,Set<string>>();
  for(const r of rows){try{const row=object(r),at=time(row.observedAt);if(micros(at)>micros(now)||row.source!==t.source)throw Error('invalid_record');if(row.quoteMint!==undefined&&!isExactSolanaMint(row.quoteMint))throw Error('invalid_quote');if(row.providerGeneratedAt!==undefined&&micros(time(row.providerGeneratedAt))>micros(at))throw Error('invalid_provider_clock');const key=micros(at).toString(),hash=sha(JSON.stringify(row));const set=byTime.get(key)||new Set();set.add(hash);byTime.set(key,set);valid.push(row);}catch{warnings.push('Excluded malformed/future/identity-mismatched observation for '+t.mint);}}
  valid.sort((a,b)=>micros(a.observedAt as string)<micros(b.observedAt as string)?-1:micros(a.observedAt as string)>micros(b.observedAt as string)?1:0);
  const conflict=[...byTime.values()].some(s=>s.size>1),selected=valid.length?[valid[0],valid[valid.length-1]]:[];
  const hashes=new Set<string>();for(const r of selected){const hash=sha(JSON.stringify(r));if(hashes.has(hash))continue;hashes.add(hash);
   candidates.push(validateObservation({onchain:{...UNOBSERVED_ONCHAIN},mint:t.mint,name:t.name,observedAt:r.observedAt,providerGeneratedAt:r.providerGeneratedAt??null,source:{kind:'repo_reward',locator:r.source,datasetSha256:revision,catalogSha256,recordSha256:hash},quoteMint:r.quoteMint??null,pool:isExactSolanaMint(t.poolMint)?t.poolMint:null,quality:conflict?'conflicting_duplicates':'capture_only',note:'Existing tracked sample, not an emerging-token search. Provider reward statement only; no onchain identity/finality, price or return verified. Financial quantities withheld; source retention/publication rights unresolved.'},'recorded'));
  }
 }
 return {revision,candidates,scope:'Existing tracked-mint allowlist only; earliest/latest retained captures. No exhaustive discovery or opportunity ranking.',warnings:[...new Set(warnings)]};
}
export const observationKey=(o:Observation)=>sha(canonical({mint:o.mint,observedAt:o.observedAt,recordSha256:o.source.recordSha256,catalogSha256:o.source.catalogSha256}));
