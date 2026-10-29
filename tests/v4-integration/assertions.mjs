// Review-only exact source composition, never a directory-wide/safety exemption.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {PILOT_ADDED} from '../v4-helius-pilot/review.mjs';
import {assertComposition} from '../v4-private-integration/review.mjs';
export const SOURCE_BASE='5c6e36fef0fc15acb07c954566a3975cb77fc102';
export const BASE='222ccf29de01b6bf05fae6d4fa332c26b2acc2de';
export const SOURCES={C:{head:'ec527f8b4e3fb7f0c0df7b77c459ec6502267100',count:15},A:{head:'d6af31935f6202a3c8ee243735fc86d13f601a58',count:9},B:{head:'6ed24c97146a39599ad0855a809735f08c83f2b8',count:19}};
export const EXCEPTIONS=['app/lens/view.tsx','tests/lens/security.test.mjs','lib/unfarmd-intelligence/source-off.ts','tests/unfarmd-intelligence/scope.test.mjs','lib/v4-solana-facts/projection.ts'];
export const ADDED=['lib/unfarmd-intelligence/unavailable-cards.ts','lib/v4-alpha-lens/source-off-model.ts','lib/v4-alpha-lens/captured-bridge.ts',
 'tests/v4-integration/assertions.mjs','tests/v4-integration/source-manifest.json','tests/v4-integration/exceptions.json',
 'tests/v4-integration/fixtures.mjs','tests/v4-integration/bridge.test.mjs','tests/v4-integration/scope.test.mjs',
 'tests/v4-integration/run.sh','tests/v4-integration/source-history.sh','tests/v4-integration/snapshots.sh',
 'tests/v4-integration/browser.spec.mjs','tests/v4-integration/playwright.config.mjs','tests/v4-integration/__init__.py','tests/v4-integration/engine_test.py',
 'docs/v4/integration-218.md','docs/v4/integration-218-qa.json','.github/workflows/v4-integration.yml',
 ...['before-390','after-320','after-390','after-1280'].map(n=>'tests/v4-integration/screenshots/'+n+'.png'),...PILOT_ADDED];
export const digest=b=>createHash('sha256').update(b).digest('hex');
export function assertV4(root=process.cwd()){
 assertComposition(root);
 // Every original manifest/exception and source path is byte-pinned to #226 by that finite review.
 // Unchanged original guard additionally runs in the detached parent tree.
 return JSON.parse(fs.readFileSync(path.join(root,'tests/v4-integration/source-manifest.json')));
}
