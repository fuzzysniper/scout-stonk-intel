#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
guided_build=$(mktemp -d /tmp/unfarmd-guided209-XXXXXX)
trap 'rm -rf "$guided_build"' EXIT
./node_modules/.bin/tsc app/desk/journey/model.ts app/desk/journey/feedback.ts app/desk/journey/sequence.ts --target ES2023 --module commonjs --strict --skipLibCheck --rootDir . --outDir "$guided_build"
DESK_INTEGRATION_BUILD="$guided_build" node --test tests/desk-journey/adapter.test.mjs tests/desk-integration/adapter.test.mjs tests/desk-guided209/sequence.test.mjs
node --test tests/desk-guided209/scope.test.mjs
# Current A fixture and actual typed A/B linkage; no provider, database or storage.
bash tests/unfarmd-source-selection/run.sh
./node_modules/.bin/tsc tests/v3-release/link-fixtures.ts --target ES2023 --module commonjs --strict --skipLibCheck --rootDir . --outDir "$guided_build/link"
UNFARMD_V3_LINK_BUILD="$guided_build/link" node --test tests/v3-release/link.test.mjs
# Current B replay. Its unmodified whole-aggregate scope guard deliberately
# rejects this successor UI; source-history.sh runs the original full B guards.
mkdir -p "$guided_build/journal/reference" "$guided_build/journal/current/lib"
git archive 36ede0e45046d8dba5a5163cc57ebc94434e2513 lib/unfarmd-risk | tar -x -C "$guided_build/journal/reference"
cp -R lib/unfarmd-journal "$guided_build/journal/current/lib/"
cat > "$guided_build/journal/compat.ts" <<'TS'
import * as risk from './reference/lib/unfarmd-risk';
import {createJournalEngine,type RiskEngine} from './current/lib/unfarmd-journal';
const original:RiskEngine=risk;
createJournalEngine(original);
TS
./node_modules/.bin/tsc "$guided_build/journal/compat.ts" --target ES2023 --module commonjs --strict --skipLibCheck --rootDir "$guided_build/journal" --outDir "$guided_build/journal/build"
UNFARMD_JOURNAL_TEST_BUILD="$guided_build/journal/build" node --test tests/unfarmd-journal/replay.test.mjs
