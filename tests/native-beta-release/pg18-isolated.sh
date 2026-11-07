#!/usr/bin/env bash
# Same B-approved OS boundary; only native-only relevant integration entry differs.
set -euo pipefail
cd "$(dirname "$0")/../.."
node --input-type=module -e "import {requireLocalPg18Approval} from './tests/native-postgres/pg18-approval.mjs'; requireLocalPg18Approval();"
current_pg_bin=${SCOUT_TEST_PG_BIN:?Checksum-pinned PG18 build required}
[[ "$($current_pg_bin/postgres --version)" == 'postgres (PostgreSQL) 18.6' ]]
current_root=$PWD
current_args=(env -i PATH="$PATH" SCOUT_TEST_PG_BIN="$current_pg_bin" SCOUT_TEST_PG_SHARE="${SCOUT_TEST_PG_SHARE:?}" NODE_OPTIONS="--import=$current_root/tests/native-postgres/namespace-only.mjs" bash tests/native-beta-release/pg18.sh)
if unshare --user --map-root-user --net true 2>/dev/null; then
 exec unshare --user --map-root-user --net bash -c 'set -e; ip link set lo up; uid=$1; gid=$2; shift 2; exec unshare --user --map-user="$uid" --map-group="$gid" "$@"' current "$(id -u)" "$(id -g)" "${current_args[@]}"
elif command -v sudo >/dev/null && sudo -n true 2>/dev/null; then
 exec sudo -n unshare --net bash -c 'set -e; ip link set lo up; uid=$1; gid=$2; shift 2; exec setpriv --reuid="$uid" --regid="$gid" --clear-groups "$@"' current "$(id -u)" "$(id -g)" "${current_args[@]}"
else
 echo 'HOLD: loopback-only OS namespace unavailable; no SQL executed' >&2;exit 1
fi
