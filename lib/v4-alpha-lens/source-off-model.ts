// Actual A + B absence contracts for C. No captured-data/rendered-example input.
import {unavailable} from '../v4-solana-facts/projection';
import {isExactPublicKey} from '../onchain-mint/validation';
import {unavailableCards} from '../unfarmd-intelligence/unavailable-cards';
import type {SolanaFactProjectionV1} from '../v4-solana-facts/contract';
import type {FactCard as EvidenceCard} from '../unfarmd-intelligence/contract';
export type DisabledLensModel=Readonly<{
  sourceGo:false;onchain:SolanaFactProjectionV1;market:readonly EvidenceCard[];
  render:Readonly<{tone:'grey';observedAt:null;providersDisabled:boolean}>;
}>;
export function sourceOffLens(mint:unknown):DisabledLensModel {
  const onchain=unavailable(isExactPublicKey(mint)?mint:null,'disabled','unknown');
  const market=unavailableCards('dexscreener','disabled');
  // This entry never renders an observed card, even if upstream absence behavior drifts.
  const absent=onchain.sourceGo===false&&onchain.observations===null&&onchain.provenance===null&&
    Object.values(onchain.checks).every(c=>c.color==='grey')&&market.every(c=>c.fact===null&&c.assessment.color==='grey'&&c.evidenceRef===null);
  return Object.freeze({sourceGo:false,onchain,market,render:Object.freeze({tone:'grey',observedAt:null,providersDisabled:absent})});
}
