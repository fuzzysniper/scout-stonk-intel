#!/usr/bin/env bash
# Execute the EXACT immutable root prefix before its first PostgreSQL harness.
# The remaining root PG suites are NOT passed or waived: no-SQL authorization HOLD.
set -euo pipefail
cd "$(dirname "$0")/../.."
pilot_prefix=$(python3 - <<'PY'
from pathlib import Path
s=Path('tests/run.sh').read_text()
marker='bash tests/onchain-api/run.sh\n'
assert s.count(marker)==1
print(s.split(marker)[0])
PY
)
bash -c "$pilot_prefix" tests/run.sh
NODE_ENV=test node tests/live-ledger/api.test.mjs
bash tests/live-feed/run.sh
NODE_ENV=test node --test tests/continuous-ledger/api.test.mjs tests/continuous-ledger/final-gates.test.mjs
# Python discovery recursively launches real PostgreSQL integration tests too;
# it is included in the same explicit SQL authorization HOLD, never auto-run here.
# Scheduler regression uses actual local SQLite; also outside this no-SQL grant.
printf '%s\n' 'NO-SQL ROOT PORTION ONLY; full npm test / native PG suites remain NOT RUN TO COMPLETION.'
