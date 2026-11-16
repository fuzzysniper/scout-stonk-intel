#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
diagnostic_preloads="--import=$PWD/tests/native-postgres/namespace-only.mjs --import=$PWD/tests/security114/local-only.mjs --import=$PWD/tests/native-postgres/no-database.mjs"
diagnostic_args=(env -i PATH="$PATH" HOME="$HOME" NODE_OPTIONS="$diagnostic_preloads" node "$@")
if unshare --user --map-root-user --net true 2>/dev/null; then
 exec unshare --user --map-root-user --net bash -c 'set -e; ip link set lo up; exec "$@"' native "${diagnostic_args[@]}"
elif command -v sudo >/dev/null && sudo -n true 2>/dev/null; then
 exec sudo -n unshare --net bash -c 'set -e; ip link set lo up; uid=$1; gid=$2; shift 2; exec setpriv --reuid="$uid" --regid="$gid" --clear-groups "$@"' native "$(id -u)" "$(id -g)" "${diagnostic_args[@]}"
else
 echo 'REQUIRED_ISOLATION_UNAVAILABLE' >&2;exit 1
fi
