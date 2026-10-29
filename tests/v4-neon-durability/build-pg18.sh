#!/usr/bin/env bash
# Disposable CI/local build only. No service registration or database is created.
set -euo pipefail
cd "$(dirname "$0")/../.."
for build_tool in gcc make bison flex m4 curl tar python3; do command -v "$build_tool" >/dev/null; done
pg18_build_root=$(mktemp -d /tmp/unfarmd-pg18-XXXXXX)
pg18_archive="$pg18_build_root/source.tar.gz"
curl --fail --silent --show-error --location --max-time 120 https://github.com/postgres/postgres/archive/724edf9bde9d356724ad384a2e196edc3c9f80f7.tar.gz -o "$pg18_archive"
python3 - "$pg18_archive" <<'PY'
import hashlib,json,sys
pin=json.load(open('ops/v4-neon-durability/evidence.json'))['localPostgresSource']
assert pin['commit']=='724edf9bde9d356724ad384a2e196edc3c9f80f7'
assert hashlib.sha256(open(sys.argv[1],'rb').read()).hexdigest()==pin['archiveSha256']
PY
mkdir "$pg18_build_root/source"
tar -xzf "$pg18_archive" --strip-components=1 -C "$pg18_build_root/source"
(cd "$pg18_build_root/source" && ./configure --prefix="$pg18_build_root/install" --without-readline --without-icu --without-zlib --with-openssl && make -j4 && make install) > "$pg18_build_root/build.log" 2>&1
"$pg18_build_root/install/bin/postgres" --version | python3 -c 'import sys; assert sys.stdin.read().strip()=="postgres (PostgreSQL) 18.6"'
if [[ -n "${GITHUB_ENV:-}" ]];then
 printf 'SCOUT_TEST_PG_BIN=%s\nSCOUT_TEST_PG_SHARE=%s\n' "$pg18_build_root/install/bin" "$pg18_build_root/install/share/postgresql" >> "$GITHUB_ENV"
else
 printf 'SCOUT_TEST_PG_BIN=%s\nSCOUT_TEST_PG_SHARE=%s\n' "$pg18_build_root/install/bin" "$pg18_build_root/install/share/postgresql"
fi
