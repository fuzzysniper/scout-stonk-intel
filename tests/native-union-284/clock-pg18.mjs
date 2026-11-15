// Uses the SAME real approved PG schema, restricted role, native TLS/PLUS and B/A path.
import {requireLocalPg18Approval} from '../native-postgres/pg18-approval.mjs';requireLocalPg18Approval();await import('../native-postgres/namespace-only.mjs');
const {createNativePgContext}=await import('./pg18-context.mjs'),{startBrowserHarness}=await import('./browser-server.mjs'),{session}=await import('./session.mjs'),{createRequire}=await import('node:module'),{execFile}=await import('node:child_process'),{promisify}=await import('node:util'),{existsSync}=await import('node:fs');
const require=createRequire(import.meta.url),{StrictJournalClient,strictBindingEstablished}=require(process.env.REMOTE_BUILD+'/ops/v4-journal/native-tls.mjs');
const context=await createNativePgContext();let server;
try{
 server=await startBrowserHarness({storageKind:'actual-postgres-18',makeSession:async mode=>{
  const scenario=await context.scenario(),client=await scenario.pool.connect();try{if(!(client instanceof StrictJournalClient)||!strictBindingEstablished(client)||String((await client.query('SHOW server_version_num')).rows[0].server_version_num).slice(0,2)!=='18')throw Error('ACTUAL_PG18_PLUS_REQUIRED');}finally{client.release();}return session(mode,{pgScenario:scenario});
 }});
 const chrome=['/usr/bin/google-chrome','/usr/bin/chromium'].find(p=>existsSync(p));
 try{const r=await promisify(execFile)(process.execPath,['experiments/consumer-mvp/web/node_modules/@playwright/test/cli.js','test','-c','tests/native-union-284/clock-diagnose.config.mjs'],{env:{...process.env,NATIVE_UNION_REQUIRE_PG:'1',...(chrome?{CONSUMER_CHROMIUM_PATH:chrome}:{})},maxBuffer:16*1024*1024});process.stdout.write(r.stdout);process.stderr.write(r.stderr);}catch(e){if(e.stdout)process.stdout.write(e.stdout);if(e.stderr)process.stderr.write(e.stderr);process.exitCode=1;}
}finally{await server?.close();await context.close();}
