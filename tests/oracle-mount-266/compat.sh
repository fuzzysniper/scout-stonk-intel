#!/usr/bin/env bash
# Read-only dependency compatibility: temporary merge, never pushed or used for source activation.
set -euo pipefail
cd "$(dirname "$0")/../.."
root266=$PWD
joint266=$(mktemp -d /tmp/oracle266-compat-XXXXXX)
trap 'git -C "$root266" worktree remove --force "$joint266" >/dev/null' EXIT
git worktree add --detach "$joint266" HEAD >/dev/null
ln -s "$root266/node_modules" "$joint266/node_modules"
cd "$joint266"
git -c user.name='ORACLE local compatibility' -c user.email='local-test@invalid.example' merge --no-ff --no-edit ace0e291ae9fd3f61b28ceebbd48fdfd6b73e43b >/dev/null
node --input-type=module <<'JS'
import fs from 'node:fs';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';import {execFileSync} from 'node:child_process';
const ref='ace0e291ae9fd3f61b28ceebbd48fdfd6b73e43b';for(const f of ['ops/v4-owner-auth/source-admission.sql','lib/v4-owner-preview/sql-pins.ts'])assert.deepEqual(fs.readFileSync(f),execFileSync('git',['show',ref+':'+f]));
assert.equal(createHash('sha256').update(fs.readFileSync('ops/v4-owner-auth/source-admission.sql')).digest('hex'),'205791aa4d5a02f46d043e866e254833b4fa8079d5f9ebda5a7f1bcb9e605447');
console.log('Temporary B268 exact installer/pin + C mount compatibility; no hosted install or retained merge.');
JS
NODE_OPTIONS="--import=$joint266/tests/security114/local-only.mjs" bash tests/oracle-mount-266/run.sh
