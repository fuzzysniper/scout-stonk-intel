import type {FailureReason,Provider,SourceProjection} from './contract';
import {admit,asset} from './internal';
import {unavailableCards} from './unavailable-cards';
export function sourceFailure(provider:Provider,mint:string,reason:FailureReason):SourceProjection {
  const identity=asset(mint);
  return admit({version:'unfarmd-source-projection/1',asset:identity,provider,evidence:null,pool:null,
    facts:unavailableCards(provider,reason)});
}
