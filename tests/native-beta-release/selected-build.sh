#!/usr/bin/env bash
# Replay unchanged original OFF artifact guards, then test the ACTUAL installed head.
# Only synthetic request bindings; no grants, credentials, database, provider or deployment.
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
# Original reviewed RC remains unmodified and has its exact original OFF guards.
git checkout --detach d64e371c1e96b12ab569d48646eeac211f7dfded >/dev/null
NEXT_TELEMETRY_DISABLED=1 npm run build
git restore -- next-env.d.ts
node tests/native-lens/artifact.mjs
node tests/native-beta-release/artifact.mjs
node --test tests/native-beta-release/scope.test.mjs
cd "$selected_root"
# Actual clean successor SHA/tree and observed IDs, not a generated fixture commit.
[[ -z "$(git status --porcelain --untracked-files=normal)" ]]
NEXT_TELEMETRY_DISABLED=1 npm run build
git restore -- next-env.d.ts
node tests/native-beta-release/artifact.mjs
# Public candidate-schema fixture helpers only; no test-cap constructor or altered source.
./node_modules/.bin/tsc lib/native-pilot/admission/contract.ts lib/native-pilot/admission/github.ts --allowJs --target ES2023 --module commonjs --moduleResolution node --strict --skipLibCheck --esModuleInterop --rootDir . --outDir "$selected_compile"
mkdir -p "$selected_compile/experiments/jupiter-beta-approval/integration"
cp experiments/jupiter-beta-approval/integration/json.mjs "$selected_compile/experiments/jupiter-beta-approval/integration/"
cp experiments/jupiter-beta-approval/protocol.mjs "$selected_compile/experiments/jupiter-beta-approval/"
ln -s "$selected_root/node_modules" "$selected_compile/node_modules"
NODE_PATH="$selected_root/node_modules/next/dist/compiled:$selected_root/node_modules" ADMISSION_BUILD="$selected_compile" NATIVE_RC_TESTED_HEAD="$selected_head" NODE_ENV=production node --conditions=react-server tests/native-beta-release/selected-probe.mjs
node tests/native-admission/artifact.mjs
