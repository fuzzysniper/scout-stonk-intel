#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
# No fetch, providers, databases, files belonging to an owner, or storage APIs.
# The real risk implementation is unmerged: pin and compile its exact Git bytes.
journal_reference=36ede0e45046d8dba5a5163cc57ebc94434e2513
git cat-file -e "$journal_reference^{commit}"
journal_build=$(mktemp -d /tmp/unfarmd-journal-test-XXXXXX)
trap 'rm -rf "$journal_build"' EXIT
mkdir -p "$journal_build/reference" "$journal_build/current/lib"
git archive "$journal_reference" lib/unfarmd-risk | tar -x -C "$journal_build/reference"
cp -R lib/unfarmd-journal "$journal_build/current/lib/"
cat > "$journal_build/compat.ts" <<'TS'
import * as risk from './reference/lib/unfarmd-risk';
import {createJournalEngine,type RiskEngine} from './current/lib/unfarmd-journal';
const original:RiskEngine=risk;
createJournalEngine(original);
TS
./node_modules/.bin/tsc "$journal_build/compat.ts" --target ES2023 --module commonjs --strict --skipLibCheck --rootDir "$journal_build" --outDir "$journal_build/build"
UNFARMD_JOURNAL_TEST_BUILD="$journal_build/build" node --test tests/unfarmd-journal/*.test.mjs
