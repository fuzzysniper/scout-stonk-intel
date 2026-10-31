#!/usr/bin/env bash
# Original finite scope guards run on exact reviewed INPUTS; current runtime tests
# run on the actual aggregate. Neither peer's whole-tree reviewer is weakened.
set -euo pipefail
cd "$(dirname "$0")/../.."
repo254=$PWD
if [[ "${1:-}" == inputs ]];then
  for peer254 in $(node -e "for(const p of require('./tests/oracle-lens/review.json').peers) console.log(p.sha)");do
    tree254=$(mktemp -d /tmp/oracle254-peer-XXXXXX)
    cleanup254(){ git -C "$repo254" worktree remove --force "$tree254" >/dev/null; }
    trap cleanup254 EXIT
    git worktree add --detach "$tree254" "$peer254" >/dev/null
    ln -s "$repo254/node_modules" "$tree254/node_modules"
    if [[ -f "$tree254/tests/v4-oracle-onchain/run.sh" ]];then
      (cd "$tree254" && NODE_OPTIONS="--import=$tree254/tests/security114/local-only.mjs" bash tests/v4-oracle-onchain/run.sh)
    elif [[ -f "$tree254/tests/v4-oracle-farming/run.sh" ]];then
      (cd "$tree254" && NODE_OPTIONS="--import=$tree254/tests/security114/local-only.mjs" bash tests/v4-oracle-farming/run.sh)
    else exit 1;fi
    cleanup254;trap - EXIT
  done
  exit
fi
build254=$(mktemp -d /tmp/oracle254-peers-build-XXXXXX)
trap 'rm -rf "$build254"' EXIT
./node_modules/.bin/tsc lib/v4-oracle/onchain/*.ts lib/v4-oracle/farming/*.ts lib/onchain-mint/server/native-transport.ts --target ES2023 --module commonjs --moduleResolution node --lib ES2023,DOM --strict --skipLibCheck --esModuleInterop --rootDir . --outDir "$build254"
export ORACLE_ONCHAIN_BUILD="$build254" FARM_BUILD="$build254" NODE_PATH="$PWD/node_modules/next/dist/compiled:$PWD/node_modules" NODE_ENV=test
node --conditions=react-server --test --test-concurrency=1 tests/v4-oracle-onchain/controls.test.mjs tests/v4-oracle-onchain/security.test.mjs tests/v4-oracle-farming/analytics.test.mjs tests/v4-oracle-farming/adversarial.test.mjs
