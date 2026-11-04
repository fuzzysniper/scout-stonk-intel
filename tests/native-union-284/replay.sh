#!/usr/bin/env bash
# Pure original reviewers + actual original284 rejection, NEVER SQL/root/scheduler.
set -euo pipefail
cd "$(dirname "$0")/../.."
native_union_root=$PWD
native_union_original=$(mktemp -d /tmp/native-union-original-XXXXXXXX)
native_union_sources=$(mktemp /tmp/native-union-sources-XXXXXXXX)
trap 'git -C "$native_union_root" worktree remove --force "$native_union_original" >/dev/null 2>&1 || true; rm -f "$native_union_sources"' EXIT
python3 - > "$native_union_sources" <<'PY'
import json,re
j=json.load(open('tests/native-union-284/inputs.json'))
for role in ['A','BPublished','B']:
 s=j[role];assert s is not None,'Corrective head required'
 assert re.fullmatch('[a-f0-9]{40}',s['sha'])
 assert isinstance(s['scopeTests'],list) and 1<=len(s['scopeTests'])<=4
 for p in s['scopeTests']:
  assert re.fullmatch(r'tests/[a-z0-9-]+/[a-z0-9-]+\.test\.mjs',p),p
  print(s['sha']+'\t'+p)
PY

git worktree add --detach "$native_union_original" 905f5e68a2d53a3d1e54747e0b4a9632e96b0f8a >/dev/null
ln -s "$native_union_root/node_modules" "$native_union_original/node_modules"
(
 cd "$native_union_original"
 bash tests/native-lens/replay.sh
 node --test tests/native-lens/scope.test.mjs
 # Exact38 historical cases, including real Helius rejection, not a rewritten test.
 bash tests/native-lens/run.sh
)
git worktree remove --force "$native_union_original" >/dev/null
while IFS=$'\t' read -r native_input_sha native_input_guard; do
 git worktree add --detach "$native_union_original" "$native_input_sha" >/dev/null
 ln -s "$native_union_root/node_modules" "$native_union_original/node_modules"
 (cd "$native_union_original"; node --test "$native_input_guard")
 git worktree remove --force "$native_union_original" >/dev/null
done < "$native_union_sources"
