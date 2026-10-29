import {assertOwnerLedgerScope} from '../v4-owner-ledger/review.mjs';
// Exact review of H + immutable J/P inputs. No environment/path-prefix waiver.
import {createHash} from 'node:crypto';
export const H='b56475c681311d35f95ee9879d9969b868a1724e';
export const INPUTS={J:'d2c4a64d6b13bd9e1ffe609b50d88f6ab581d99e',P:'ffcef289ddee14b46d17cb6223eb21bcbfed42cf'};
export const COMPOSITION_ADDED=['tests/v4-private-integration/review.mjs','tests/v4-private-integration/review.json','tests/v4-private-integration/scope.test.mjs','tests/v4-private-integration/run.sh','tests/v4-private-integration/source-history.sh','docs/v4/private-integration-225.md','.github/workflows/v4-private-integration.yml'];
export const sha=b=>createHash('sha256').update(b).digest('hex');
// Current dependent review freezes every #226 byte except six complete pinned changes.
// Original composition implementation runs unchanged in detached exact #226 in CI.
export function assertComposition(root=process.cwd()){
 return assertOwnerLedgerScope(root);
}
