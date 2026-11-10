#!/usr/bin/env bash
# Public tool/package installation must finish BEFORE this egress-free build boundary.
set -euo pipefail
packet_root=$(cd "$(dirname "$0")/../.." && pwd)
[[ "$#" == 5 && ( "$1" == build || "$1" == verify-build ) ]]
packet_args=(env -i PATH="$PATH" HOME="$HOME" node "$packet_root/ops/native-beta-output/build.mjs" "$@")
if unshare --user --map-root-user --net true 2>/dev/null; then
 exec unshare --user --map-root-user --net bash -c 'set -e; ip link set lo up; exec "$@"' native "${packet_args[@]}"
elif command -v sudo >/dev/null && sudo -n true 2>/dev/null; then
 exec sudo -n unshare --net bash -c 'set -e; ip link set lo up; uid=$1; gid=$2; shift 2; exec setpriv --reuid="$uid" --regid="$gid" --clear-groups "$@"' native "$(id -u)" "$(id -g)" "${packet_args[@]}"
else
 echo 'NATIVE_BUILD_HOLD: mandatory OS egress boundary unavailable; no build or upload.' >&2;exit 1
fi
