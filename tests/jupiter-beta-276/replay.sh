#!/usr/bin/env bash
# Original reviewers on their exact inputs. No SQL execution/installation or provider access.
set -euo pipefail
cd "$(dirname "$0")/../.."
beta_root=$PWD
beta_input=$(mktemp -d /tmp/jupiter-beta-original-XXXXXXXX)
cleanup_beta(){ git -C "$beta_root" worktree remove --force "$beta_input" >/dev/null 2>&1 || true; }
trap cleanup_beta EXIT
at_beta(){
 local beta_sha=$1; shift
 git -C "$beta_root" worktree add --detach "$beta_input" "$beta_sha" >/dev/null
 ln -s "$beta_root/node_modules" "$beta_input/node_modules"
 (cd "$beta_input"; NODE_OPTIONS="--import=$PWD/tests/security114/local-only.mjs" "$@")
 git -C "$beta_root" worktree remove --force "$beta_input" >/dev/null
}
at_beta f80ecba0d39ad854d189ff5b4c699f4310a45c1d bash tests/oracle-regression-265/replay.sh diagnostics
at_beta 8effe6ba0967d7a83e976840d5ed8df1d95fcbf5 node --test tests/oracle-integration-271/verify.test.mjs
at_beta 09a11e700ea932c7b161664cdf5bbc9b3dcbe00b node --test tests/oracle-ca-recovery-v2/scope.test.mjs
at_beta 0b342b7f2447e4ab07b09d9a8a36feb66daacbc9 node --test tests/oracle-claim-266/scope.test.mjs
at_beta 3316612ce256f9827b88e6272c3cec9fefb3f79b node --test tests/oracle-take-274/scope.test.mjs
at_beta b0c0db20c54b46119fe41d96e448eaf1574adecb node --test tests/oracle-union-274/scope.test.mjs
