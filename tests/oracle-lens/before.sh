#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
root=$PWD
parent=$(mktemp -d /tmp/oracle254-before-XXXXXX)
build=$(mktemp -d /tmp/oracle254-before-build-XXXXXX)
server_pid=''
cleanup(){
 if [[ -n "$server_pid" ]];then kill "$server_pid" 2>/dev/null || true; wait "$server_pid" 2>/dev/null || true;fi
 git worktree remove --force "$parent" >/dev/null 2>&1 || true
 rm -rf "$build"
}
trap cleanup EXIT
git worktree add --detach "$parent" 8c89c37a2d738ec1e9ab48b9a7a38510b7f30e2e
ln -s "$root/node_modules" "$parent/node_modules"
mkdir -p "$parent/tests/oracle-lens"
cp tests/oracle-lens/browser-entry.tsx "$parent/tests/oracle-lens/browser-entry.tsx"
./node_modules/.bin/tsc "$parent/next-env.d.ts" "$parent/app/lens/ca-view.tsx" "$parent/tests/oracle-lens/browser-entry.tsx" --jsx react-jsx --target ES2023 --module commonjs --moduleResolution node --lib ES2023,DOM --strict --skipLibCheck --esModuleInterop --rootDir "$parent" --outDir "$build"
export ORACLE_LENS_BUILD="$build" ORACLE_LENS_SOURCE_ROOT="$parent" ORACLE_LENS_PORT=3855 NODE_PATH="$root/node_modules/next/dist/compiled:$root/node_modules" NODE_ENV=test
node --conditions=react-server tests/oracle-lens/browser-server.mjs &
server_pid=$!
node tests/oracle-lens/before.mjs
