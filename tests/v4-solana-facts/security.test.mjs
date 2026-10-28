import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

const modulePath = resolve(process.env.V4_FACT_BUILD, 'lib/v4-solana-facts/index.js');
test('startup + OFF cannot read an API key, invoke a transport, create a socket or schedule acquisition', () => {
  const script = `
    let attempts = 0;
    const deny = () => { attempts++; throw Error('unauthorized I/O'); };
    globalThis.fetch = deny; globalThis.WebSocket = deny; globalThis.setInterval = deny;
    const nativeEnv = process.env;
    process.env = new Proxy(nativeEnv, {get(target, key) {
      if (/HELIUS|SOURCE_GO|RPC_ENDPOINT|RPC_ENABLED/.test(String(key))) return deny();
      return target[key];
    }});
    const { readHeliusFacts } = require(${JSON.stringify(modulePath)});
    Promise.all([readHeliusFacts('11111111111111111111111111111111'), readHeliusFacts('bad')]).then(results => {
      if (attempts !== 0 || results[0].reason !== 'disabled' || results[1].reason !== 'invalid_mint') process.exit(1);
    }).catch(() => process.exit(1));
  `;
  const result = spawnSync(process.execPath, ['-e', script], { encoding: 'utf8', timeout: 10000 });
  assert.equal(result.status, 0, result.stderr); assert.equal(result.signal, null);
});
test('fixed import graph contains only pure decoder/policy/validation/types; no legacy runtime or source manifest', () => {
  const expected = {
    'lib/v4-solana-facts/index.ts': ['../onchain-mint/validation', './projection', './contract'],
    'lib/v4-solana-facts/projection.ts': ['../onchain-mint/decoder', '../onchain-mint/validation', '../onchain-mint/policy', './contract'],
    'lib/v4-solana-facts/contract.ts': ['../onchain-mint/contract'],
    'lib/onchain-mint/decoder.ts': ['./contract', './policy', './validation'],
    'lib/onchain-mint/policy.ts': ['./validation'],
    'lib/onchain-mint/validation.ts': [],
    'lib/onchain-mint/contract.ts': [],
  };
  for (const [file, imports] of Object.entries(expected)) {
    const source = readFileSync(file, 'utf8');
    const found = [...source.matchAll(/(?:from|import)\s+["']([^"']+)["']/g)].map(m => m[1]);
    assert.deepEqual([...new Set(found)], imports, file);
    assert.doesNotMatch(source, /\b(?:fetch|WebSocket|setInterval|setTimeout)\s*\(|process\.env|import\s*\(|\brequire\s*\(/, file);
  }
});
