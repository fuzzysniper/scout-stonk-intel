#!/usr/bin/env bash
# Whole-tree security assertions run unchanged on their actual immutable input.
set -euo pipefail
cd "$(dirname "$0")/../.."
repo261=$PWD
case "${1:-foundation}" in
 foundation|a-native-root|a-history) refs261='34d6a59763d62399cdcd94f7bccb7ea89e579a18';;
 peers) refs261='ad8a82a55b0214d3c21287522e29c9608e55ab09 e6d049045f387609bc821c7337721678c9b12a79';;
 *) exit 2;;
esac
for ref261 in $refs261;do
 tree261=$(mktemp -d /tmp/oracle261-input-XXXXXX)
 trap 'git -C "$repo261" worktree remove --force "$tree261" >/dev/null' EXIT
 git worktree add --detach "$tree261" "$ref261" >/dev/null
 ln -s "$repo261/node_modules" "$tree261/node_modules"
 if [[ -d "$repo261/experiments/consumer-mvp/web/node_modules" ]];then ln -s "$repo261/experiments/consumer-mvp/web/node_modules" "$tree261/experiments/consumer-mvp/web/node_modules";fi
 (
  cd "$tree261"
  export NODE_OPTIONS="--import=$tree261/tests/security114/local-only.mjs"
  case "${1:-foundation}" in
   foundation) bash tests/oracle-preview-258/run.sh review;bash tests/oracle-preview-258/run.sh inputs;;
   peers)
    if [[ "$ref261" == ad8a82a55b0214d3c21287522e29c9608e55ab09 ]];then bash tests/oracle-native-259/run.sh;else bash tests/oracle-holders-260/run.sh;fi;;
   *) bash tests/oracle-preview-258/run.sh "$1";;
  esac
 )
 git -C "$repo261" worktree remove --force "$tree261" >/dev/null
 trap - EXIT
done
