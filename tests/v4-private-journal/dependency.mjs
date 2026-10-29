import {assertComposition} from '../v4-private-integration/review.mjs';
// Finite dependent #222 scope; never a directory-wide exemption or environment bypass.
import {createHash} from 'node:crypto';
export const BASE='b56475c681311d35f95ee9879d9969b868a1724e';
export const EXCEPTIONS=['tests/v4-integration/assertions.mjs','tests/v4-integration/scope.test.mjs'];
export const ADDITIONS=[
 'lib/v4-private-journal/index.ts','lib/v4-private-journal/contract.ts','lib/v4-private-journal/validation.ts','lib/v4-private-journal/auth.ts',
 'lib/v4-private-journal/crypto.ts','lib/v4-private-journal/schema.sql','lib/v4-private-journal/repository.ts',
 'tests/v4-private-journal/run.sh','tests/v4-private-journal/fixtures.mjs','tests/v4-private-journal/security.test.mjs','tests/v4-private-journal/postgres.test.mjs',
 'tests/v4-private-journal/dependency.mjs','tests/v4-private-journal/scope.test.mjs','tests/v4-private-journal/dependency.json',
 'tests/v4-private-journal/__init__.py','tests/v4-private-journal/engine_test.py',
 'docs/v4/private-journal-222.md','.github/workflows/private-journal.yml'];
export const sha=b=>createHash('sha256').update(b).digest('hex');
export function assertJournalScope(root=process.cwd()){
 assertComposition(root);
 return ADDITIONS;
}
