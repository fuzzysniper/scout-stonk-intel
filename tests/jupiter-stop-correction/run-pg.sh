#!/usr/bin/env bash
# No image, host network, inherited credentials or existing DB. Fail if isolation fails.
set -euo pipefail
cd "$(dirname "$0")/../.."
correction_root=$PWD
correction_node=$(command -v node)
correction_bin=${SCOUT_TEST_PG_BIN:?Build the pinned PostgreSQL18 source first}
[[ "$($correction_bin/postgres --version)" == 'postgres (PostgreSQL) 18.6' ]]
correction_args=(env -i PATH="$PATH" NODE_ENV=test UNFARMD_BETA_LOCAL_PG=isolated-synthetic-only SCOUT_TEST_PG_BIN="$correction_bin" "$correction_node" --import="$correction_root/tests/jupiter-stop-correction/local-only.mjs" --test --test-concurrency=1 "$correction_root/tests/jupiter-stop-correction/postgres.test.mjs")
if unshare --user --map-root-user --net true 2>/dev/null; then
 # Outer mapping brings lo up; nested mapping runs initdb/postgres as NON-root.
 exec unshare --user --map-root-user --net bash -c 'set -e; ip link set lo up; uid=$1; gid=$2; shift 2; exec unshare --user --map-user="$uid" --map-group="$gid" "$@"' correction "$(id -u)" "$(id -g)" "${correction_args[@]}"
elif command -v sudo >/dev/null && sudo -n true 2>/dev/null; then
 # Dedicated GitHub runner fallback; no persistent kernel/sysctl/network changes.
 exec sudo -n unshare --net bash -c 'set -e; ip link set lo up; uid=$1; gid=$2; shift 2; exec setpriv --reuid="$uid" --regid="$gid" --clear-groups "$@"' correction "$(id -u)" "$(id -g)" "${correction_args[@]}"
else
 echo 'BLOCKED: disposable network namespace unavailable; no SQL executed' >&2
 exit 1
fi
