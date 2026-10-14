import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';
import { assertInactiveConfig, dryRunArguments } from '../scheduler/staging-policy.mjs';
const config = JSON.parse(await readFile(new URL('../scheduler/wrangler.json', import.meta.url), 'utf8'));

test('standalone inactive Worker has actual SQLite export, only approved nonsecret App IDs, no trigger, route, account, secret or deploy script', async () => {
 assertInactiveConfig(config);
 assert.equal(config.main,'staging-entry.ts');
 assert.deepEqual(config.durable_objects.bindings,[{name:'SLOTS',class_name:'SlotCoordinator'}]);
 assert.deepEqual(config.exports.SlotCoordinator,{type:'durable-object',storage:'sqlite'});
 assert.equal(config.workers_dev,false); assert.equal(config.preview_urls,false);
 assert.deepEqual(config.vars,{ACTIVATION:'disabled',APP_ID:'5310753',INSTALLATION_ID:'171233795',REPOSITORY_ID:'1415026436'});
 for (const key of ['triggers','routes','route','account_id','env','migrations','services','kv_namespaces','assets','secrets_store_secrets']) assert.ok(!(key in config),key);
 const source=await readFile(new URL('../scheduler/worker.ts',import.meta.url),'utf8');
 assert.match(source,/export class SlotCoordinator/);
 const entry=await readFile(new URL('../scheduler/staging-entry.ts',import.meta.url),'utf8');
 assert.match(entry,/export \{ SlotCoordinator \} from '\.\/worker'/);
 assert.match(entry,/export \{ default \} from '\.\/worker'/);
 assert.doesNotMatch(entry,/export \*|fetch\s*\(/);
 const handlers=source.slice(source.indexOf('const worker ='));
 assert.doesNotMatch(handlers,/(?:^|\n)\s+(?:async\s+)?fetch\s*\(/);
 assert.match(handlers,/env.ACTIVATION !== "human-approved"/);
 const project=JSON.parse(await readFile(new URL('../scheduler/package.json',import.meta.url),'utf8'));
 assert.equal(project.name,config.name); assert.equal(project.private,true);
 assert.deepEqual(project.devDependencies,{wrangler:'4.150.0'});
 assert.ok(!('deploy' in project.scripts));
 const lock=JSON.parse(await readFile(new URL('../scheduler/package-lock.json',import.meta.url),'utf8'));
 assert.equal(lock.packages['node_modules/wrangler'].version,'4.150.0');
 assert.equal(lock.packages['node_modules/workerd'].version,'1.20261006.1');
});
test('policy rejects activation, surfaces, extra credentials, legacy storage and destructive lifecycle drift', () => {
 const mutations=[
  c=>c.vars.ACTIVATION='human-approved', c=>c.workers_dev=true, c=>c.preview_urls=true,
  c=>c.triggers={crons:['17 * * * *']}, c=>c.routes=['*/*'], c=>c.route='example.com/*',
  c=>c.vars.APP_PRIVATE_KEY='test-only-not-a-real-key', c=>c.vars.APP_ID='test-only',
  c=>c.vars.INSTALLATION_ID='171233796', c=>c.vars.REPOSITORY_ID=1415026436,
  c=>delete c.vars.APP_ID, c=>c.vars.GITHUB_TOKEN='not-a-credential',
  c=>c.secrets=['APP_PRIVATE_KEY'], c=>c.triggers={crons:[]},
  c=>c.account_id='test-only', c=>c.env={production:{}},
  c=>c.services=[{binding:'OTHER',service:'other-worker'}],
  c=>c.exports.SlotCoordinator.storage='legacy-kv', c=>c.exports.SlotCoordinator.state='deleted',
  c=>c.migrations=[{tag:'v1',new_classes:['SlotCoordinator']}],
  c=>c.durable_objects.bindings[0].script_name='production-worker',
  c=>c.durable_objects.bindings[0].class_name='WrongClass',
 ];
 for (const mutate of mutations) {
  const changed=structuredClone(config); mutate(changed);
  assert.throws(()=>assertInactiveConfig(changed),/stop for human review/);
 }
});
test('dry-run arguments cannot omit dry-run or pass an environment/deploy override', async () => {
 assert.deepEqual(dryRunArguments('/test/config.json','/test/output'),['deploy','--dry-run','--config','/test/config.json','--outdir','/test/output']);
 const run=promisify(execFile);
 await assert.rejects(run(process.execPath,[fileURLToPath(new URL('../scheduler/dry-run.mjs',import.meta.url)),'--env','production']),error=> {
  assert.match(error.stderr,/dry_run_accepts_no_arguments/);return true;
 });
});

test('tracked files contain no private key envelope; local credential files are ignored', async () => {
 const root=fileURLToPath(new URL('../',import.meta.url));
 const run=promisify(execFile);
 const {stdout}=await run('git',['ls-files','-z'],{cwd:root,maxBuffer:1024*1024});
 // Build delimiters so this check never introduces a key-shaped fixture itself.
 const privateKey=new RegExp('-----BEGIN '+'(?:RSA |EC |ENCRYPTED )?PRIVATE KEY-----[A-Za-z0-9+/=\\r\\n\\t ]{64,}-----END '+'(?:RSA |EC |ENCRYPTED )?PRIVATE KEY-----');
 for(const path of stdout.split('\0').filter(Boolean)) {
  const bytes=await readFile(new URL(path,new URL('../',import.meta.url)));
  assert.equal(privateKey.test(bytes.toString('utf8')),false,`private key envelope in ${path}`);
 }
 for(const path of ['scheduler/.dev.vars','scheduler/.env','scheduler/operator.pem','scheduler/operator.key','scheduler/operator.p8','scheduler/operator.p12','scheduler/operator.pfx']) {
  await run('git',['check-ignore','--quiet',path],{cwd:root});
 }
});

test('policy rejection diagnostics never serialize an accidentally configured secret', () => {
 const candidate=structuredClone(config);
 candidate.vars.APP_PRIVATE_KEY='offline-sensitive-sentinel-not-a-key';
 assert.throws(()=>assertInactiveConfig(candidate),error=>{
  assert.match(error.message,/stop for human review/);
  assert.doesNotMatch(error.stack,/offline-sensitive-sentinel/);
  assert.equal(error.actual,false); assert.equal(error.expected,true);
  return true;
 });
});
