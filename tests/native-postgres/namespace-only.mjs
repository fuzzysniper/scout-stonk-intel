// Runs before DB/harness imports. OS namespace is the egress boundary; never a JS-only claim.
import assert from 'node:assert/strict';import os from 'node:os';import fs from 'node:fs';
assert.deepEqual(fs.readFileSync('/proc/net/dev','utf8').trim().split('\n').slice(2).map(line=>line.trim().split(':')[0]),['lo']);
assert.deepEqual(Object.keys(os.networkInterfaces()),['lo']);
assert.ok(Object.values(os.networkInterfaces()).flat().every(a=>a.internal&&['127.0.0.1','::1'].includes(a.address)));
assert.equal(fs.readFileSync('/proc/net/route','utf8').trim().split('\n').length,1);
assert.ok(fs.readFileSync('/proc/net/ipv6_route','utf8').trim().split('\n').filter(Boolean).every(line=>line.trim().split(/\s+/).at(-1)==='lo'));
for(const name of Object.keys(process.env))assert.ok(!/(DATABASE_URL|PGHOST|PGPASSWORD|NEON|HELIUS|API_KEY|TOKEN|SECRET|CREDENTIAL|PROXY|COOKIE|AUTHORIZATION)/i.test(name),'inherited credential/proxy environment denied');
