// Only a separately approved PG job may import this, inside its OS network namespace.
import assert from 'node:assert/strict';import os from 'node:os';import fs from 'node:fs';
assert.deepEqual(Object.keys(os.networkInterfaces()),['lo']);
assert.equal(fs.readFileSync('/proc/net/route','utf8').trim().split('\n').length,1);
