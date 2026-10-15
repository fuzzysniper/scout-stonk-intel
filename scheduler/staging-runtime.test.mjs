// Offline current-Wrangler runtime test. No account, credential or outbound service.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';
import { dryRun } from './dry-run.mjs';
const require = createRequire(import.meta.url);
const { Miniflare, convertV4MiniflareOptions } = require('miniflare'); // Exact runtime dependency in Wrangler's separate lockfile.
const config = JSON.parse(await readFile(new URL('./wrangler.json',import.meta.url),'utf8'));
const { bundle } = await dryRun();
assert.doesNotMatch(bundle,/owner_app_auth_readiness|auth_readiness_unavailable/,'Owner-only helper is not a deployed entrypoint or reachable handler');

for(const activation of ['disabled', undefined, '', 'enabled', 'human-approved ', 'true']) {
test(`actual Wrangler bundle: fail closed with approved IDs and activation ${JSON.stringify(activation)}`, async () => {
 const calls=[];
 const bindings={...config.vars,APP_PRIVATE_KEY:'offline-invalid-sentinel-not-a-key'};
 if(activation===undefined) { delete bindings.ACTIVATION; delete bindings.APP_PRIVATE_KEY; }
 else bindings.ACTIVATION=activation;
 const options=convertV4MiniflareOptions({name:config.name,modules:true,script:bundle,compatibilityDate:config.compatibility_date,
  durableObjects:{ SLOTS:{className:config.durable_objects.bindings[0].class_name,useSQLite:config.exports.SlotCoordinator.storage==='sqlite'} },
  bindings,cf:false,
  outboundService:request=>{calls.push({method:request.method,url:request.url});throw new Error('offline_outbound_forbidden');},
 });
 options.telemetry={enabled:false};
 const mf=new Miniflare(options);
 try {
  await mf.ready;
  const publicProbe=await mf.dispatchFetch('https://staging.invalid/');
  assert.equal(publicProbe.status,500,'No HTTP handler is provided by the production bundle');
  const worker=await mf.getWorker();
  await worker.scheduled({cron:'17 * * * *',scheduledTime:Date.now()});
  const namespace=await mf.getDurableObjectNamespace('SLOTS');
  const stub=namespace.get(namespace.idFromName('staging-offline-test-only'));
  const send=async operation=>{
   const response=await stub.fetch('https://internal.invalid/',{method:'POST',body:JSON.stringify({operation,scheduledTime:Date.parse('2026-10-13T22:17:00Z')})});
   assert.equal(response.status,200);return response.json();
  };
  for(let i=0;i<10;i++)assert.deepEqual(await send('tick'),{action:'disabled'});
  // This queries the real slots SQL table: missing SQLite/class export would fail.
  assert.equal(await send('receipt'),null);
  assert.deepEqual(calls,[],'No GitHub/provider request is permitted by inactive staging');
 } finally {await mf.dispose();}
});
}
