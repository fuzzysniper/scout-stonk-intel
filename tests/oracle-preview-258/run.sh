#!/usr/bin/env bash
# Frozen-input reviewers remain original; current behavior runs on actual HEAD.
set -euo pipefail
cd "$(dirname "$0")/../.."
root258=$PWD
case "${1:-review}" in
 review)
  build258=$(mktemp -d /tmp/oracle258-gate-XXXXXX)
  trap 'rm -rf "$build258"' EXIT
  ./node_modules/.bin/tsc lib/v4-ca-intelligence/private-development-gate.ts --target ES2023 --module commonjs --moduleResolution node --lib ES2023,DOM --strict --skipLibCheck --rootDir . --outDir "$build258"
  export ORACLE_PREVIEW_BUILD="$build258"
  node --test tests/oracle-preview-258/review.test.mjs tests/oracle-preview-258/gate.test.mjs
  ;;
 inputs|a-native-root|a-history)
  case "$1" in inputs) ref258=9d0cb2d9f3130ae95a175161e38ce155e05de22d;; *) ref258=d303cca4911d865e935379d4477a89cdbe63e62d;; esac
  tree258=$(mktemp -d /tmp/oracle258-input-XXXXXX)
  trap 'git -C "$root258" worktree remove --force "$tree258" >/dev/null' EXIT
  git worktree add --detach "$tree258" "$ref258" >/dev/null
  ln -s "$root258/node_modules" "$tree258/node_modules"
  if [[ -d "$root258/experiments/consumer-mvp/web/node_modules" ]];then ln -s "$root258/experiments/consumer-mvp/web/node_modules" "$tree258/experiments/consumer-mvp/web/node_modules";fi
  cd "$tree258"
  export NODE_OPTIONS="--import=$tree258/tests/security114/local-only.mjs"
  case "$1" in
   inputs)
    node --test tests/oracle-lens/scope.test.mjs
    bash tests/oracle-lens/peer-tests.sh inputs
    ;;
   a-native-root)
    bash tests/v4-oracle-onchain/replay.sh native
    bash tests/v4-oracle-onchain/replay.sh source
    bash tests/v4-oracle-onchain/replay.sh root
    ;;
   a-history) bash tests/v4-oracle-onchain/replay.sh history;;
  esac
  ;;
 *) exit 2;;
esac
