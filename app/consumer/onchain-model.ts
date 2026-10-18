import {isExactSolanaMint} from '../../experiments/consumer-mvp/evidence/guards';

/** Consumer availability only, NOT a replacement for Agent B's MintFactsV1 wire schema.
 * No source adapter/route is merged. There is deliberately no fetch, fixture,
 * environment/query override or path that promotes an address to verified here.
 */
export type MintFactsAvailability={state:'source_unavailable';reason:'integration_pending';mint:string;checkedSlot:null;checkedAt:null};
export function unavailableMintFacts(mint:unknown):MintFactsAvailability|null {
 if(!isExactSolanaMint(mint))return null;
 return {state:'source_unavailable',reason:'integration_pending',mint,checkedSlot:null,checkedAt:null};
}
export function addressQuery(mint:string):string {
 if(!isExactSolanaMint(mint))throw Error('invalid_exact_address');
 return '/?mint='+encodeURIComponent(mint);
}
export function explorerAddress(mint:string):string {
 if(!isExactSolanaMint(mint))throw Error('invalid_exact_address');
 return 'https://explorer.solana.com/address/'+encodeURIComponent(mint)+'?cluster=mainnet-beta';
}
export const mintFactDefinitions=[
 {title:'Token supply',text:'Supply is the number of token units recorded at a particular slot. It is not a price, a circulating-supply estimate or anyone’s balance.'},
 {title:'Mint authority',text:'A mint authority can allow new tokens to be issued. No mint authority would mean that this issuance authority is absent at the checked slot; it would not mean the token is safe.'},
 {title:'Freeze authority',text:'A freeze authority can allow token accounts to be frozen. Its absence would not prove unrestricted transfers or safety: Token-2022 extensions may add other controls.'},
 {title:'Other controls',text:'Token-2022 can have additional features affecting transfers or control. Unreviewed extensions must stay unknown, even when supply and authority fields are readable.'},
] as const;
