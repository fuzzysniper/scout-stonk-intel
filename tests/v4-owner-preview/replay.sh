#!/usr/bin/env bash
# All original reviewers execute unchanged on their exact inputs. New composition has its own finite manifest.
set -euo pipefail
cd "$(dirname "$0")/../.."
root=$PWD
frozen=$(mktemp -d /tmp/owner243-source-XXXXXX)
trap 'git worktree remove --force "$frozen" >/dev/null 2>&1 || true' EXIT
git worktree add --detach "$frozen" 2f1eca1976d0bda04c94b6b1ce099494d804d779
ln -s "$root/node_modules" "$frozen/node_modules"
ln -s "$root/experiments/consumer-mvp/web/node_modules" "$frozen/experiments/consumer-mvp/web/node_modules"
case "${1:-}" in
 source) (cd "$frozen" && bash tests/v4-ca-intelligence/run.sh);;
 native) bash tests/v4-neon-host/affected.sh; (cd "$frozen" && node --test tests/v4-ca-intelligence/scope.test.mjs);;
 root|history|browser) (cd "$frozen" && bash tests/v4-ca-intelligence/replay.sh "$1");;
 *) exit 2;;
esac
