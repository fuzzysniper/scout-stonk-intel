import {assertUnified} from '../v4-owner-thesis/review.mjs';
// Finite #228 dependent patch. Live replacements are hash/patch-pinned before
// the original #226 composition reviewer checks their immutable input versions.

import {createHash} from 'node:crypto';
export const BASE='4af9532709c3a9bca9efe71356124328955a2877';
export const EXCEPTIONS=['app/lens/view.tsx','tests/v4-integration/assertions.mjs','tests/v4-private-integration/review.mjs','tests/v4-private-integration/scope.test.mjs','tests/v4-private-journal/scope.test.mjs'];
export const ADDITIONS=['app/lens/journal-controls.tsx','app/api/v4/theses/route.ts','app/api/v4/theses/[journalId]/route.ts',
 'lib/v4-thesis-api/owner-context.ts','lib/v4-thesis-api/owner-adapter.ts','lib/v4-thesis-api/client-contract.ts','lib/v4-thesis-api/installed.ts','lib/v4-thesis-api/handler.ts','lib/v4-thesis-api/rate.ts','lib/v4-thesis-api/rate.sql',
 'tests/v4-thesis/fixture.mjs','tests/v4-thesis/api.test.mjs','tests/v4-thesis/browser-entry.tsx','tests/v4-thesis/browser-server.mjs','tests/v4-thesis/css-loader.cjs','tests/v4-thesis/browser.spec.mjs','tests/v4-thesis/playwright.config.mjs','tests/v4-thesis/run.sh','tests/v4-thesis/__init__.py','tests/v4-thesis/engine_test.py',
 'tests/v4-thesis/review.mjs','tests/v4-thesis/review.json','tests/v4-thesis/scope.test.mjs','tests/v4-thesis/source-history.sh','tests/v4-thesis/built-off.mjs',
 'tests/v4-thesis/screenshots/local-save-history-320.png','tests/v4-thesis/screenshots/local-save-history-390.png','tests/v4-thesis/screenshots/local-save-history-1280.png',
 'docs/v4/thesis-save-228.md','.github/workflows/thesis-save.yml'];
export const sha=b=>createHash('sha256').update(b).digest('hex');
export function assertSlice(root=process.cwd()){
 assertUnified(root);
 return {additions:ADDITIONS,exceptions:EXCEPTIONS};
}
