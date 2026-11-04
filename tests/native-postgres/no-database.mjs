// Non-SQL job guard. Existing external-request blocker is also loaded by the runner.
import {createRequire,syncBuiltinESMExports} from 'node:module';import cp from 'node:child_process';import {promisify} from 'node:util';
const {Client,Pool}=createRequire(import.meta.url)('pg');
for(const prototype of [Client.prototype,Pool.prototype])for(const method of ['connect','query'])prototype[method]=function(){throw Error('SQL_EXECUTION_NOT_AUTHORIZED');};
function check(args){
 const text=args.slice(0,2).flat().filter(x=>typeof x==='string').join(' ');
 const command=typeof args[0]==='string'?args[0].split('/').at(-1):'';
 if(['psql','initdb','pg_ctl','postgres','sqlite3','workerd','miniflare'].includes(command)||/(?:npm test|tests\/run\.sh|unittest discover|tests\/(?:scheduler(?:-pilot)?\.test\.mjs|v4-final\/|onchain-api\/production)|\/workerd(?: |$))/.test(text))throw Error('SQL_BACKED_COMMAND_NOT_AUTHORIZED');
}
for(const method of ['exec','execSync','execFile','execFileSync','spawn','spawnSync','fork']){const original=cp[method];const wrapped=function(...args){check(args);return original.apply(this,args);};
 if(original[promisify.custom])Object.defineProperty(wrapped,promisify.custom,{value:function(...args){check(args);return original[promisify.custom].apply(this,args);}});
 cp[method]=wrapped;
}syncBuiltinESMExports();
