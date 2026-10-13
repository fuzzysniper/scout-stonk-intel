#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
verification_mode=${1:-}
shift || true
case "$verification_mode" in
  smoke) verification_entry=verify-release ;;
  dry-run) verification_entry=publication-dry-run ;;
  *) echo 'Use smoke or dry-run; no workflow is invoked.' >&2; exit 1 ;;
esac
verification_build_dir=$(mktemp -d)
trap 'rm -rf "$verification_build_dir"' EXIT
./node_modules/.bin/tsc scripts/verify-release.ts scripts/publication-dry-run.ts scripts/archive-tool.ts --resolveJsonModule --target ES2023 --module commonjs --strict --skipLibCheck --esModuleInterop --rootDir . --outDir "$verification_build_dir"
if [[ "$verification_mode" == 'smoke' && "${SCOUT_VERIFY_ENV_PROXY:-0}" == '1' ]]; then
  NODE_PATH="$PWD/node_modules" node --use-env-proxy "$verification_build_dir/scripts/$verification_entry.js" "$@"
else
  NODE_PATH="$PWD/node_modules" node "$verification_build_dir/scripts/$verification_entry.js" "$@"
fi
