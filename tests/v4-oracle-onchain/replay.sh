#!/usr/bin/env bash
# Current #251 functional runtime vs last complete native/guard-audited #248 exact history; never rebaseline an old guard.
set -euo pipefail
cd "$(dirname "$0")/../.."
root=$PWD
frozen=$(mktemp -d /tmp/oracle252-parent-XXXXXX)
trap 'git worktree remove --force "$frozen" >/dev/null 2>&1 || true' EXIT
node --test tests/v4-oracle-onchain/scope.test.mjs
case "${1:-}" in native) ref=8c89c37a2d738ec1e9ab48b9a7a38510b7f30e2e;; *) ref=aa58f76bcde6fef761683a6fbcd552c00ee34312;; esac
git worktree add --detach "$frozen" "$ref"
ln -s "$root/node_modules" "$frozen/node_modules"
ln -s "$root/experiments/consumer-mvp/web/node_modules" "$frozen/experiments/consumer-mvp/web/node_modules"
case "${1:-}" in
 native) (cd "$frozen" && bash tests/v4-pg18-install/run.sh);;
 source|root|history|guards) (cd "$frozen" && bash tests/v4-pg18-install/replay.sh "$1");;
 built)
  artifact=$(sha256sum .next/BUILD_ID)
  node tests/v4-oracle-onchain/built-off.mjs
  [[ "$(sha256sum .next/BUILD_ID)" == "$artifact" ]];;
 *) exit 2;;
esac
node --test tests/v4-oracle-onchain/scope.test.mjs
