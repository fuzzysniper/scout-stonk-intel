#!/usr/bin/env bash
# Full original guards on exact inputs, never adjusted/waived for the union.
set -euo pipefail
cd "$(dirname "$0")/../.."
root_union274=$PWD
node --test tests/oracle-union-274/scope.test.mjs
dir_union274=$(mktemp -d /tmp/oracle274-immutable-XXXXXX)
cleanup_union274(){ git -C "$root_union274" worktree remove --force "$dir_union274" >/dev/null 2>&1 || true; }
trap cleanup_union274 EXIT
at_union274(){
 local ref_union274=$1; shift
 git -C "$root_union274" worktree add --detach "$dir_union274" "$ref_union274" >/dev/null
 ln -s "$root_union274/node_modules" "$dir_union274/node_modules"
 if [[ -d "$root_union274/experiments/consumer-mvp/web/node_modules" ]];then ln -s "$root_union274/experiments/consumer-mvp/web/node_modules" "$dir_union274/experiments/consumer-mvp/web/node_modules";fi
 (cd "$dir_union274"; export NODE_OPTIONS="--import=$PWD/tests/security114/local-only.mjs"; "$@")
 git -C "$root_union274" worktree remove --force "$dir_union274" >/dev/null
}
case "${1:-}" in
 inputs)
  at_union274 8effe6ba0967d7a83e976840d5ed8df1d95fcbf5 node --test tests/oracle-integration-271/verify.test.mjs
  at_union274 09a11e700ea932c7b161664cdf5bbc9b3dcbe00b node --test --test-concurrency=1 tests/oracle-ca-recovery-v2/scope.test.mjs tests/oracle-ca-recovery-v2/verifier.test.mjs tests/oracle-ca-recovery-v2/postgres.test.mjs
  at_union274 0b342b7f2447e4ab07b09d9a8a36feb66daacbc9 node --test tests/oracle-claim-266/scope.test.mjs
  at_union274 3316612ce256f9827b88e6272c3cec9fefb3f79b node --test tests/oracle-take-274/scope.test.mjs
  at_union274 94cadce1b6831d03fc58b89477353311a356ed53 node --test tests/oracle-integration-274/preflight.test.mjs
  ;;
 reviews) at_union274 09a11e700ea932c7b161664cdf5bbc9b3dcbe00b bash tests/oracle-ca-recovery-v2/replay.sh reviews;;
 native-root) at_union274 09a11e700ea932c7b161664cdf5bbc9b3dcbe00b bash tests/oracle-ca-recovery-v2/replay.sh native-root;;
 history) at_union274 09a11e700ea932c7b161664cdf5bbc9b3dcbe00b bash tests/oracle-ca-recovery-v2/replay.sh history;;
 *) exit 2;;
esac
node --test tests/oracle-union-274/scope.test.mjs
