import {assertUnified} from '../v4-owner-thesis/review.mjs';
// Finite dependent review of exact #226; no source manifest rebaseline, directory or env waiver.
import fs from 'node:fs';import path from 'node:path';
import {createHash} from 'node:crypto';
export const PARENT='4af9532709c3a9bca9efe71356124328955a2877';
export const sha=b=>createHash('sha256').update(b).digest('hex');
export function assertOwnerLedgerScope(root=process.cwd()){
 assertUnified(root);
 const read=f=>fs.readFileSync(path.join(root,f));
 return JSON.parse(read('tests/v4-private-integration/review.json'));
}
