#!/usr/bin/env bash
# Exact-head integrated Preview synthetic artifact runner. The C/#269 original
# artifact is IMMUTABLE: its expected branch name was the C-only draft.
# This wrapper substitutes only that exact literal in a TEMPORARY copy, so
# original guards and code remain untouched. All source egress stays blocked.
set -euo pipefail
cd "$(dirname "$0")/../.."
source_artifact=tests/oracle-mount-266/artifact.mjs
tmp_artifact=$(mktemp "tests/oracle-mount-266/.oracle271-artifact-XXXXXXXX.mjs")
build=$(mktemp -d /tmp/oracle271-compiled-XXXXXXXX)
cleanup(){ rm -f "$tmp_artifact"; rm -rf "$build"; }
trap cleanup EXIT
node --input-type=module - "$source_artifact" "$tmp_artifact" <<'JS'
import fs from 'node:fs';
import assert from 'node:assert/strict';
const [src,dest]=process.argv.slice(2);
const actual=fs.readFileSync(src,'utf8');
const from="VERCEL_GIT_COMMIT_REF:'feat/266-native-oracle-mount'";
const to="VERCEL_GIT_COMMIT_REF:'integration/271-oracle-native-source-reviewed'";
assert.equal(actual.split(from).length,2,'expected exact original C synthetic branch marker once');
const adapted=actual.replace(from,to);
assert.equal(adapted.replace(to,from),actual,'only reviewed branch marker replaced');
fs.writeFileSync(dest,adapted,{mode:0o600});
JS
# Reuse original exact compilation root and safety constraints from C/#269.
./node_modules/.bin/tsc next-env.d.ts app/lens/ca-view.tsx app/api/v4/ca-intelligence/route.ts app/api/v4/ca-intelligence/compose-oracle.ts app/api/v4/native-mint/route.ts app/api/v4/native-owner/'[...all]'/route.ts lib/v4-oracle/onchain/*.ts lib/v4-oracle/mount/*.ts lib/v4-oracle/native-mint/*.ts lib/v4-oracle/holders/*.ts lib/v4-owner-preview/*.ts lib/v4-owner-ledger/*.ts lib/v4-owner-thesis/*.ts lib/v4-private-journal/*.ts lib/v4-thesis-api/*.ts lib/v4-ca-intelligence/*.ts lib/onchain-mint/server/native-transport.ts tests/oracle-mount-266/browser-entry.tsx --jsx react-jsx --target ES2023 --module commonjs --moduleResolution node --lib ES2023,DOM --strict --skipLibCheck --esModuleInterop --rootDir . --outDir "$build"
mkdir -p "$build/ops/v4-journal"
ln -s "$PWD/ops/v4-journal/native-tls.mjs" "$build/ops/v4-journal/native-tls.mjs"
ln -s "$PWD/ops/v4-journal/envelope.mjs" "$build/ops/v4-journal/envelope.mjs"
export ORACLE_266_BUILD="$build" ORACLE_LENS_BUILD="$build" ORACLE_NATIVE_BUILD="$build" ORACLE_ONCHAIN_BUILD="$build" HOLDER_BUILD="$build" JOURNAL_BUILD="$build" V4_CA_BUILD="$build" NODE_PATH="$PWD/node_modules/next/dist/compiled:$PWD/node_modules" NODE_ENV=test
node --conditions=react-server "$tmp_artifact"
