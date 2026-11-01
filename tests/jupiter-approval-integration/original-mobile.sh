#!/usr/bin/env bash
# Original114+24 browser tests on exact reviewed inputs; loopback/mock traffic only.
set -euo pipefail
cd "$(dirname "$0")/../.."
integration_root=$PWD
integration_mobile=$(mktemp -d /tmp/jupiter-integration-mobile-XXXXXXXX)
cleanup_integration(){ git -C "$integration_root" worktree remove --force "$integration_mobile" >/dev/null 2>&1 || true; }
trap cleanup_integration EXIT
git worktree add --detach "$integration_mobile" 7e13f73d8e8a5db8c274577c9d72f096b1ee50d2 >/dev/null
ln -s "$integration_root/node_modules" "$integration_mobile/node_modules"
ln -s "$integration_root/experiments/consumer-mvp/web/node_modules" "$integration_mobile/experiments/consumer-mvp/web/node_modules"
(
 cd "$integration_mobile"
 bash tests/jupiter-approval-prototype/original-mobile.sh
 NODE_OPTIONS=--import=$PWD/tests/security114/local-only.mjs node experiments/consumer-mvp/web/node_modules/@playwright/test/cli.js test -c tests/jupiter-approval-prototype/playwright.config.mjs
 node --test tests/jupiter-approval-prototype/scope.test.mjs
)
node --test tests/jupiter-approval-integration/scope.test.mjs
