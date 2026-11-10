#!/usr/bin/env bash
# BUILD ONLY. Never starts an operator, reads credentials, executes SQL or deploys.
set -euo pipefail
cd "$(dirname "$0")/../.."
operator_output=${1:?Explicit new operator build directory required}
[[ "$operator_output" == /* && ! -e "$operator_output" ]]
mkdir -m700 "$operator_output"
./node_modules/.bin/tsc ops/native-beta-release/enroll.ts ops/native-beta-release/checkpoint-server.ts --target ES2023 --module commonjs --moduleResolution node --allowJs --strict --skipLibCheck --esModuleInterop --rootDir . --outDir "$operator_output"
mkdir -p "$operator_output/experiments/jupiter-beta-approval/integration/durable" "$operator_output/experiments/jupiter-beta-approval/integration/services" "$operator_output/ops/v4-journal" "$operator_output/ops/native-beta-release"
cp experiments/jupiter-beta-approval/protocol.mjs "$operator_output/experiments/jupiter-beta-approval/"
cp experiments/jupiter-beta-approval/integration/json.mjs "$operator_output/experiments/jupiter-beta-approval/integration/"
cp experiments/jupiter-beta-approval/integration/durable/anchor.mjs "$operator_output/experiments/jupiter-beta-approval/integration/durable/"
cp experiments/jupiter-beta-approval/integration/services/{auth,peers}.mjs "$operator_output/experiments/jupiter-beta-approval/integration/services/"
cp ops/v4-journal/{native-tls.mjs,sources.json} "$operator_output/ops/v4-journal/"
cp ops/native-beta-release/{installation,owner-enrollment,checkpoint-installation}.json "$operator_output/ops/native-beta-release/"
ln -s "$PWD/node_modules" "$operator_output/node_modules"
printf 'BUILT ONLY: %s\n' "$operator_output"
