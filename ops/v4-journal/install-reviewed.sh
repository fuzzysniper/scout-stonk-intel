#!/usr/bin/env bash
# Owner Codespaces command only. Default verifies locally; --execute prompts privately via libpq.
set -euo pipefail
cd "$(dirname "$0")/../.."
mode=${1:---verify}
[[ $# -le 1 && "$mode" =~ ^--(verify|render|execute)$ ]] || { echo 'Use --verify, --render or --execute' >&2; exit 2; }
installer_sha=e4e1cd5e8336cf93051a2bd9cb3999bce178e8e110df3b1d9e6ba7b82aa2afb3
installer_sql=$(mktemp /tmp/unfarmd-247-XXXXXX.sql)
trap 'rm -f "$installer_sql"' EXIT
node ops/v4-neon-durability/render.mjs > "$installer_sql"
printf '%s  %s\n' "$installer_sha" "$installer_sql" | sha256sum --check --status
if [[ "$mode" == --render ]];then cat "$installer_sql";exit 0;fi
printf 'Verified installer SHA256 %s\n' "$installer_sha"
[[ "$mode" == --execute ]] || exit 0
# Existing owner approval #247. No env URL/password, old service, retry or psql startup file.
# Password goes directly to the native client's private prompt, never shell history or this script.
env -u PGPASSWORD -u PGPASSFILE -u PGSERVICE -u PGSERVICEFILE -u PGOPTIONS -u PGHOST -u PGHOSTADDR -u PGDATABASE -u PGUSER -u PGPORT -u PGSSLCERT -u PGSSLKEY \
 PGSSLMODE=verify-full PGCHANNELBINDING=require PGSSLROOTCERT=/etc/ssl/certs/ca-certificates.crt PGCONNECT_TIMEOUT=10 PGAPPNAME=unfarmd-pg18-install-247 \
 psql -X --quiet --password --host=ep-tiny-truth-b4bx6xt9.c-6.us-east-2.aws.neon.tech --port=5432 --username=neondb_owner --dbname=unfarmd_v4_pilot --set=ON_ERROR_STOP=1 --file="$installer_sql"
printf 'Installer transaction completed. Roles remain NOLOGIN; no policy, owner or source enrollment.\n'
