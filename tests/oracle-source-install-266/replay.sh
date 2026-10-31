#!/usr/bin/env bash
# Original #265 source/security/guard suites run unchanged at their reviewed immutable input.
set -euo pipefail
cd "$(dirname "$0")/../.."
node --test tests/oracle-source-install-266/scope.test.mjs
root266=$PWD
input266=$(mktemp -d /tmp/source266-parent-XXXXXX)
trap 'git -C "$root266" worktree remove --force "$input266" >/dev/null 2>&1 || true' EXIT
git worktree add --detach "$input266" f80ecba0d39ad854d189ff5b4c699f4310a45c1d
ln -s "$root266/node_modules" "$input266/node_modules"
if [[ -d "$root266/experiments/consumer-mvp/web/node_modules" ]];then ln -s "$root266/experiments/consumer-mvp/web/node_modules" "$input266/experiments/consumer-mvp/web/node_modules";fi
(cd "$input266"
 export NODE_OPTIONS="--import=$PWD/tests/security114/local-only.mjs"
 case "${1:-}" in
 head)
  bash tests/oracle-regression-265/run.sh
  bash tests/oracle-regression-265/replay.sh diagnostics
  bash tests/oracle-v5/run.sh peers
  bash tests/oracle-lens/source-tests.sh
  bash tests/oracle-lens/peer-tests.sh
  npx tsc --noEmit
  npm run lint
  npm run build
  git restore -- next-env.d.ts
  node tests/v4-oracle-onchain/built-off.mjs
  bash tests/oracle-regression-265/run.sh artifact
  bash scripts/archive-tool.sh check 412ba2bdacb4dbcff8c11eda3a751edc1b758d32;;
 browser)
  bash tests/oracle-regression-265/replay.sh browser-original
  bash tests/oracle-regression-265/browser.sh
  npm run build
  git restore -- next-env.d.ts
  bash tests/oracle-regression-265/browser.sh artifact;;
 inputs) bash tests/oracle-regression-265/replay.sh aggregate;;
 native-root) bash tests/oracle-regression-265/replay.sh a-native-root;;
 history) bash tests/oracle-regression-265/replay.sh a-history;;
 *) exit 2;;
 esac)
node --test tests/oracle-source-install-266/scope.test.mjs
