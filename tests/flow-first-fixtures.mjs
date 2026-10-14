// Explicit synthetic UI test fixtures only. Stdout goes to a removed temporary file.
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const { summarizeRadar } = await import(pathToFileURL(path.join(process.env.HISTORY_TEST_BUILD,'lib/radar.js')).href);
const tokens=JSON.parse(await readFile(new URL('../data/tracked-mints.json',import.meta.url),'utf8'));
const token=tokens[0],now=new Date('2030-10-14T21:00:00Z');
const dataset={kind:'github_snapshot',source:'https://raw.githubusercontent.com/fuzzysniper/scout-stonk-intel/main/data/reward-snapshots.json',revision:'sha256:ISOLATED-SYNTHETIC-UI-TEST',dataFetchedAt:now.toISOString(),sourceStatus:'available',cacheSeconds:300,continuouslyUpdated:false};
const point=(hour,total)=>({observedAt:new Date(+now+hour*3600000).toISOString(),distributedTokens:total,quoteMint:token.quoteMint,quoteSymbol:token.quoteSymbol,source:token.source});
const fixtures={};
for(const [name,points] of Object.entries({window:Array.from({length:25},(_,i)=>point(i-24,i)),matched:Array.from({length:49},(_,i)=>point(i-48,i)),zero:[point(-1,10),point(0,10)],gap:[point(-8,10),point(0,12)],stale:[point(-5,10),point(-4,12)],empty:[]})){
 fixtures[name]=summarizeRadar({[token.mint]:points},[token],dataset,'coverage',now);
}
fixtures.unavailable=summarizeRadar({},tokens,{...dataset,sourceStatus:'unavailable'},'coverage',now);
console.log(JSON.stringify(fixtures));
