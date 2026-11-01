#!/usr/bin/env bash
# Screenshot-only immutable273 input. No original test or product source is modified.
set -euo pipefail
cd "$(dirname "$0")/../.."
take_root=$PWD
take_input=$(mktemp -d /tmp/oracle-take-before-XXXXXXXX)
take_before_build=$(mktemp -d /tmp/oracle-take-before-build-XXXXXXXX)
take_server_pid=''
cleanup(){ if [[ -n "$take_server_pid" ]];then kill -TERM "$take_server_pid" 2>/dev/null || true;wait "$take_server_pid" 2>/dev/null || true;fi;git -C "$take_root" worktree remove --force "$take_input" >/dev/null;rm -rf "$take_before_build"; }
trap cleanup EXIT
trap 'exit 0' TERM INT
git worktree add --detach "$take_input" 0b342b7f2447e4ab07b09d9a8a36feb66daacbc9 >/dev/null
ln -s "$take_root/node_modules" "$take_input/node_modules"
cd "$take_input"
./node_modules/.bin/tsc next-env.d.ts app/lens/ca-view.tsx app/api/v4/ca-intelligence/compose-oracle.ts lib/v4-oracle/onchain/*.ts lib/onchain-mint/server/native-transport.ts tests/oracle-claim-266/browser-entry.tsx --jsx react-jsx --target ES2023 --module commonjs --moduleResolution node --lib ES2023,DOM --strict --skipLibCheck --esModuleInterop --rootDir . --outDir "$take_before_build"
mkdir -p "$take_before_build/ops/v4-journal"
ln -s "$take_input/ops/v4-journal/native-tls.mjs" "$take_before_build/ops/v4-journal/native-tls.mjs"
ln -s "$take_input/ops/v4-journal/envelope.mjs" "$take_before_build/ops/v4-journal/envelope.mjs"
export ORACLE_CLAIM_BUILD="$take_before_build" ORACLE_LENS_BUILD="$take_before_build" ORACLE_ONCHAIN_BUILD="$take_before_build" ORACLE_NATIVE_BUILD="$take_before_build" HOLDER_BUILD="$take_before_build" NODE_PATH="$take_root/node_modules/next/dist/compiled:$take_root/node_modules" NODE_ENV=test NODE_OPTIONS="--import=$take_input/tests/security114/local-only.mjs"
node --conditions=react-server tests/oracle-claim-266/browser-server.mjs &
take_server_pid=$!
wait "$take_server_pid"
