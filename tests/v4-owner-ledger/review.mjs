import {assertNativeScope} from '../v4-helius-native/review.mjs';
// Finite dependent review of exact #226; no source manifest rebaseline, directory or env waiver.

import {createHash} from 'node:crypto';
export const PARENT='4af9532709c3a9bca9efe71356124328955a2877';
export const sha=b=>createHash('sha256').update(b).digest('hex');
// New source-only dependent review freezes the complete #229 tree, with TWO exact test-review exceptions.
// Original #229 and its original reviewers run unchanged in detached CI trees as well.
export function assertOwnerLedgerScope(root=process.cwd()){
 return assertNativeScope(root);
}
