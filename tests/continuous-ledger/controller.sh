#!/usr/bin/env bash
# Compile the UNMODIFIED reviewed A controller, not a replacement/model of its API.
set -euo pipefail
cd "$(dirname "$0")/../.."
controller_tree=$(mktemp -d /tmp/scout-continuous-A-XXXXXX)
trap 'rm -rf "$controller_tree"' EXIT
git archive a860f7251c3e11daf6bbc133c07bd1b62251495a experiments/continuous-stream | tar -x -C "$controller_tree"
git archive 9eab75d9a4e72be01cb0a0942decb497c4cb8130 experiments/live-stream experiments/launch-intel experiments/consumer-mvp/evidence | tar -x -C "$controller_tree"
git archive 9eab75d9a4e72be01cb0a0942decb497c4cb8130 app/consumer/live-model.ts lib/live-ledger/contract.ts | tar -x -C "$controller_tree"
ln -s "$PWD/node_modules" "$controller_tree/node_modules"
./node_modules/.bin/tsc "$controller_tree/experiments/continuous-stream/controller.ts" "$controller_tree/app/consumer/live-model.ts" --target ES2023 --module commonjs --strict --skipLibCheck --resolveJsonModule --esModuleInterop --rootDir "$controller_tree" --outDir "$controller_tree/build"
NODE_ENV=test CONTINUOUS_A_TREE="$controller_tree" CONTINUOUS_BUILD="$controller_tree/build/experiments/continuous-stream" LIVE_STREAM_BUILD="$controller_tree/build/experiments/live-stream" NODE_OPTIONS="--import=$PWD/tests/security114/local-only.mjs" node --test tests/continuous-ledger/controller.test.mjs
