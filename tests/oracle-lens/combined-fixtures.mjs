// Local-only invented source inputs exercise the REAL unmodified A/B projectors.
import {require,build,inspection} from './fixtures.mjs';
import {full} from '../v4-oracle-farming/fixture.mjs';
const {composeOracle}=require(build+'/app/api/v4/ca-intelligence/compose-oracle.js');
const {analyzeFarmEvidence}=require(build+'/lib/v4-oracle/farming/index.js');
export async function combinedFixture(mint,mode){
 if(mode==='integrated')return composeOracle(inspection(mint),'2026-10-31T00:00:00.000Z');
 if(mode==='onchain-positive'){
  const f=await import('../v4-oracle-onchain/fixtures.mjs');
  return {...inspection(f.MINT),riskFindings:await f.project()};
 }
 const input=full(),farmEvidence=analyzeFarmEvidence(input);
 // Rebind only the invented UI Jupiter identity; B calculations use their own exact test mint.
 return {...inspection(input.mint),riskFindings:farmEvidence.findings,farmEvidence};
}
