import {test} from 'node:test';
import assert from 'node:assert/strict';
import {EXECUTION_FLAGS, EXPECTED, SELECT_ONLY_SQL, validateIntent, poolOptions, runReadOnlySmoke, main} from '../../scripts/ops/scout-neon-smoke.mjs';

// OFFLINE ONLY. All credentials, pools and SQL responses below are synthetic.
const fakeEnv = Object.freeze({
  VERCEL: '1', VERCEL_ENV: 'production', VERCEL_PROJECT_ID: EXPECTED.vercelProjectId,
  SCOUT_MINT_STORE_DATABASE_URL: 'postgresql://scout_mint_app:' + 'x'.repeat(40) + '@' + EXPECTED.host + '/neondb?sslmode=require',
});
const approved = [...EXECUTION_FLAGS];
function fakePool({assertionFailure=false, queryFailure=false}={}) {
  const actions=[];
  const client={
    async query(query) {
      actions.push(query);
      if (query===SELECT_ONLY_SQL) {
        if (queryFailure) throw Error('synthetic failure with private-looking details');
        const rows=[Object.fromEntries(Array.from({length:14},(_,i)=>['pass_'+i,true]))];
        if (assertionFailure) rows[0].pass_1=false;
        return {rowCount:1,rows};
      }
      return {rowCount:0,rows:[]};
    },
    release(destroy) {actions.push(destroy?'release_destroy':'release');},
  };
  return {actions, async connect(){actions.push('connect');return client}, async end(){actions.push('end')}};
}

test('import/help is inert and SQL has no executable DML or step call',async()=>{
  assert.equal(await main(['--help'],{}),0);
  assert.match(SELECT_ONLY_SQL,/pg_stat_ssl/);
  // Strip SQL string literals, including privilege names, before checking keywords.
  assert.doesNotMatch(SELECT_ONLY_SQL.replace(/'[^']*'/g, "''"),
    /\b(?:INSERT|UPDATE|DELETE|TRUNCATE|CREATE|ALTER|DROP|GRANT|REVOKE|scout_mint\.step)\b/i);
});

test('approval, pinned Vercel identity, URL, user and host fail closed before pool creation',async()=>{
  const bad=[
    [[],fakeEnv],[['--execute'],fakeEnv],[['--approve-production-read-only'],fakeEnv],
    [[...approved,'--other'],fakeEnv],[approved,{...fakeEnv,VERCEL:'0'}],
    [approved,{...fakeEnv,VERCEL_ENV:'preview'}],
    [approved,{...fakeEnv,VERCEL_PROJECT_ID:'prj_wrong'}],
    [approved,{...fakeEnv,SCOUT_MINT_STORE_DATABASE_URL:fakeEnv.SCOUT_MINT_STORE_DATABASE_URL.replace('scout_mint_app','neondb_owner')}],
    [approved,{...fakeEnv,SCOUT_MINT_STORE_DATABASE_URL:fakeEnv.SCOUT_MINT_STORE_DATABASE_URL.replace(EXPECTED.host,'ep-evil.us-east-2.aws.neon.tech')}],
    [approved,{...fakeEnv,SCOUT_MINT_STORE_DATABASE_URL:fakeEnv.SCOUT_MINT_STORE_DATABASE_URL+'#secret'}],
    [approved,{...fakeEnv,SCOUT_MINT_STORE_DATABASE_URL:fakeEnv.SCOUT_MINT_STORE_DATABASE_URL.replace('?sslmode=require','?sslmode=disable')}],
    [approved,{...fakeEnv,SCOUT_MINT_STORE_DATABASE_URL:fakeEnv.SCOUT_MINT_STORE_DATABASE_URL.replace('neondb?','postgres?')}],
    [approved,{...fakeEnv,SCOUT_MINT_STORE_DATABASE_URL:'postgresql://scout_mint_app:short@'+EXPECTED.host+'/neondb'}],
    [approved,{...fakeEnv,SCOUT_MINT_STORE_DATABASE_URL:undefined}],
  ];
  for (const [argv,env] of bad) {
    let connected=0;
    await assert.rejects(runReadOnlySmoke({argv,env,openPool:()=>{connected++;throw Error('network attempt')}}));
    assert.equal(connected,0);
  }
});

test('pool parameters mirror native pg, TLS, SNI and bounded timeouts',()=>{
  const cfg=poolOptions(validateIntent(approved,fakeEnv));
  assert.equal(cfg.host,EXPECTED.host);
  assert.equal(cfg.user,'scout_mint_app');
  assert.equal(cfg.port,5432);
  assert.deepEqual(cfg.ssl,{rejectUnauthorized:true,servername:EXPECTED.host});
  assert.equal(cfg.enableChannelBinding,true);
  assert.equal(cfg.sslnegotiation,'postgres');
  assert.equal(cfg.max,1);
  assert.equal(cfg.query_timeout,1000);
});

test('synthetic success makes only read-only statements and rolls back',async()=>{
  const pool=fakePool();
  assert.deepEqual(await runReadOnlySmoke({argv:approved,env:fakeEnv,openPool:cfg=>{assert.equal(cfg.user,'scout_mint_app');return pool}}),
    {ok:true,checks:14,persistentWrites:0});
  assert.deepEqual(pool.actions,['connect','BEGIN TRANSACTION READ ONLY',SELECT_ONLY_SQL,'ROLLBACK','release','end']);
});

test('synthetic privilege failure fails and destroys transaction connection',async()=>{
  const pool=fakePool({assertionFailure:true});
  await assert.rejects(runReadOnlySmoke({argv:approved,env:fakeEnv,openPool:()=>pool}),/read_only_assertions_failed/);
  assert.deepEqual(pool.actions.slice(-3),['ROLLBACK','release_destroy','end']);
});

test('synthetic query failure rolls back and destroys transaction connection',async()=>{
  const pool=fakePool({queryFailure:true});
  await assert.rejects(runReadOnlySmoke({argv:approved,env:fakeEnv,openPool:()=>pool}));
  assert.deepEqual(pool.actions.slice(-3),['ROLLBACK','release_destroy','end']);
});
