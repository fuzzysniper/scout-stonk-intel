#!/usr/bin/env bash
# Clean UNPUBLISHED fixture child: only OFF→installed public synthetic plan changes.
# Actual shipped head remains OFF. No tracked head, remote ref or deployment changes.
set -euo pipefail
cd "$(dirname "$0")/../.."
selected_root=$PWD
selected_head=$(git rev-parse HEAD)
selected_fixture=$(mktemp -d /tmp/native-selected-build-XXXXXXXX)
selected_compile=$(mktemp -d /tmp/native-selected-compile-XXXXXXXX)
trap 'git -C "$selected_root" worktree remove --force "$selected_fixture" >/dev/null 2>&1 || true; rm -rf "$selected_compile"' EXIT
git worktree add --detach "$selected_fixture" "$selected_head" >/dev/null
ln -s "$selected_root/node_modules" "$selected_fixture/node_modules"
cd "$selected_fixture"
python3 - <<'PY'
import json
p='ops/native-beta-release/installation.json';x=json.load(open(p));assert x['mode']=='off' and x['controlPlan'] is None
x['mode']='installed';x['controlPlan']={'workflowId':10001,'setupEnvironmentId':20001,'sourceEnvironmentId':20002,'branch':x['branch']}
open(p,'w').write(json.dumps(x,indent=2)+'\n')
PY
git add ops/native-beta-release/installation.json
[[ "$(git diff --cached --name-only)" == ops/native-beta-release/installation.json ]]
git -c user.name='SYNTHETIC Unpublished Build Fixture' -c user.email=fixture@example.invalid commit -m 'SYNTHETIC LOCAL selected-profile fixture ONLY; no operational approval' >/dev/null
NEXT_TELEMETRY_DISABLED=1 npm run build
git restore -- next-env.d.ts
# Public candidate-schema fixture helpers only; no test-cap constructor or altered source.
./node_modules/.bin/tsc lib/native-pilot/admission/contract.ts lib/native-pilot/admission/github.ts --allowJs --target ES2023 --module commonjs --moduleResolution node --strict --skipLibCheck --esModuleInterop --rootDir . --outDir "$selected_compile"
mkdir -p "$selected_compile/experiments/jupiter-beta-approval/integration"
cp experiments/jupiter-beta-approval/integration/json.mjs "$selected_compile/experiments/jupiter-beta-approval/integration/"
cp experiments/jupiter-beta-approval/protocol.mjs "$selected_compile/experiments/jupiter-beta-approval/"
ln -s "$selected_root/node_modules" "$selected_compile/node_modules"
NODE_PATH="$selected_root/node_modules/next/dist/compiled:$selected_root/node_modules" ADMISSION_BUILD="$selected_compile" NATIVE_RC_TESTED_HEAD="$selected_head" NODE_ENV=production node --conditions=react-server tests/native-beta-release/selected-probe.mjs
node tests/native-admission/artifact.mjs
