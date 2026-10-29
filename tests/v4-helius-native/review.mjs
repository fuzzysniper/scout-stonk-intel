import {assertFinal} from '../v4-final/review.mjs';
// Original #234 metadata retained; exact final umbrella freezes all three inputs.
import fs from 'node:fs';import path from 'node:path';import {createHash} from 'node:crypto';
export const PARENT='6efb0eb66a79087b9c7a59b9a06ad584e9130ee9';
export const sha=b=>createHash('sha256').update(b).digest('hex');
export function assertNativeScope(root=process.cwd()){assertFinal(root);return JSON.parse(fs.readFileSync(path.join(root,'tests/v4-private-integration/review.json')));}
