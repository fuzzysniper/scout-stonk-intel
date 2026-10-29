import {assertFinal} from '../v4-final/review.mjs';
// Original #235 metadata retained; exact final umbrella replaces no source manifest.
import fs from 'node:fs';import path from 'node:path';import {createHash} from 'node:crypto';
export const BASE='4af9532709c3a9bca9efe71356124328955a2877';
export const INPUTS={A:'6efb0eb66a79087b9c7a59b9a06ad584e9130ee9',B:'76dea8aab3f26eef39c2fcbc1b0b37d13180388f'};
export const RESOLUTIONS=['app/lens/view.tsx','tests/v4-integration/assertions.mjs','tests/v4-private-integration/review.mjs','tests/v4-private-integration/scope.test.mjs','tests/v4-private-journal/scope.test.mjs','tests/v4-owner-ledger/review.mjs','tests/v4-owner-ledger/scope.test.mjs','tests/v4-thesis/review.mjs'];
export const ADDED=['lib/v4-owner-thesis/index.ts','lib/v4-owner-thesis/bridge.ts',...['review.mjs','review.json','scope.test.mjs','fixture.mjs','bridge.test.mjs','browser-server.mjs','browser.spec.mjs','playwright.config.mjs','run.sh','source-history.sh','__init__.py','engine_test.py'].map(f=>'tests/v4-owner-thesis/'+f),...['320','390','1280'].map(n=>'tests/v4-owner-thesis/screenshots/local-bridge-'+n+'.png'),'docs/v4/owner-thesis-231.md','.github/workflows/v4-owner-thesis.yml'];
export const sha=b=>createHash('sha256').update(b).digest('hex');
export function assertUnified(root=process.cwd()){assertFinal(root);return JSON.parse(fs.readFileSync(path.join(root,'tests/v4-owner-thesis/review.json')));}
