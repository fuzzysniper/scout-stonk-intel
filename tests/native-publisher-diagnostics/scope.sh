#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
base=0a5abd56faa4fbb7aa0049f0207d139a23c051f6
mkdir -p node_modules/.cache/native-publisher-diagnostics
git diff --name-only "$base" HEAD > node_modules/.cache/native-publisher-diagnostics/changed-paths
git show "$base:vercel.json" > node_modules/.cache/native-publisher-diagnostics/vercel.baseline
node --input-type=module <<'JS'
import fs from 'node:fs';
import assert from 'node:assert/strict';
const allowed=new Set(['ops/native-pilot-admission/publisher.mjs','vercel.json','.github/workflows/native-publisher-diagnostics.yml','tests/native-publisher-diagnostics/contracts.test.mjs','tests/native-publisher-diagnostics/diagnostics.test.mjs','tests/native-publisher-diagnostics/run.sh','tests/native-publisher-diagnostics/scope.sh','tests/native-publisher-diagnostics/README.md']);
const changed=fs.readFileSync('node_modules/.cache/native-publisher-diagnostics/changed-paths','utf8').trim().split('\n').filter(Boolean);
assert.ok(changed.length>0);for(const path of changed)assert.ok(allowed.has(path),'Unapproved path: '+path);
const before=JSON.parse(fs.readFileSync('node_modules/.cache/native-publisher-diagnostics/vercel.baseline','utf8'));
const after=JSON.parse(fs.readFileSync('vercel.json','utf8'));
assert.equal(after.git.deploymentEnabled['fix/289-publisher-diagnostics-off'],false);
delete after.git.deploymentEnabled['fix/289-publisher-diagnostics-off'];assert.deepEqual(after,before);
for(const [file,needle]of [['lib/native-pilot/index.ts','NATIVE_PILOT_ENABLED=false'],['lib/native-pilot/admission/gates.ts','NATIVE_SETUP_RUNTIME_ENABLED=false'],['lib/native-lens/policy.ts','NATIVE_LENS_SOURCE_ENABLED=false']])assert.ok(fs.readFileSync(file,'utf8').includes(needle),file);
console.log('Exact-parent eight-path scope, original Git suppression and all three source-OFF gates PASS');
JS
