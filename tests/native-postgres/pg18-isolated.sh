#!/usr/bin/env bash
# Existing owner approval is checked before any namespace or SQL.
set -euo pipefail
cd "$(dirname "$0")/../.."
node --input-type=module -e "import {requireLocalPg18Approval} from './tests/native-postgres/pg18-approval.mjs'; requireLocalPg18Approval();"
remote_pg_bin=${SCOUT_TEST_PG_BIN:?Build the exact reviewed PG18 source first}
[[ "$($remote_pg_bin/postgres --version)" == 'postgres (PostgreSQL) 18.6' ]]
remote_root=$PWD
remote_args=(env -i PATH="$(dirname "$(command -v node)"):/usr/bin:/bin" SCOUT_TEST_PG_BIN="$remote_pg_bin" SCOUT_TEST_PG_SHARE="${SCOUT_TEST_PG_SHARE:?}" NODE_OPTIONS="--import=$remote_root/tests/native-postgres/namespace-only.mjs" bash tests/native-postgres/pg18.sh)
if unshare --user --map-root-user --net true 2>/dev/null; then
 exec unshare --user --map-root-user --net bash -c 'set -e; ip link set lo up; uid=$1; gid=$2; shift 2; exec unshare --user --map-user="$uid" --map-group="$gid" "$@"' native "$(id -u)" "$(id -g)" "${remote_args[@]}"
elif command -v sudo >/dev/null && sudo -n true 2>/dev/null; then
 exec sudo -n unshare --net bash -c 'set -e; ip link set lo up; uid=$1; gid=$2; shift 2; exec setpriv --reuid="$uid" --regid="$gid" --clear-groups "$@"' native "$(id -u)" "$(id -g)" "${remote_args[@]}"
else
 echo 'HOLD: no isolated loopback-only namespace; no SQL executed' >&2;exit 1
fi
