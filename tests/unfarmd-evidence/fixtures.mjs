/** INVENTED OFFLINE ONLY. Nothing in this module is an authentic observation, grant or source activation. */
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
export const api = require(`${process.env.UNFARMD_EVIDENCE_BUILD}/lib/unfarmd-evidence/index.js`);
export const mint = '11111111111111111111111111111111'; // A format-test public key, NOT a verified token mint.
export const asset = () => api.resolveAssetIdentity({kind:'solana_mint', chain:'solana:mainnet', address:mint});
export const ref = () => ({id:'invented-offline-reference',sha256:null});
export const rights = () => ({status:'permitted',uses:['private_research'],retention:'permitted',reference:ref()});
export const entitlement = () => ({status:'authorized',reference:ref()});
export const source = () => ({providerId:'invented-test-provider',sourceId:'invented-test-source',method:'rpc',rights:rights(),entitlement:entitlement()});
export const entry = () => ({
  id:'invented-observation',assetKey:asset().asset.assetKey,category:'fact',subject:'mint_authority',
  statement:'INVENTED OFFLINE: a source-reported claim for schema testing, not observed token data.',quantity:null,
  origin:'synthetic_fixture',representation:'raw',derivedFrom:[],contradicts:[],source:source(),
  clocks:{observedAt:'2026-10-27T12:00:00Z',receivedAt:'2026-10-27T12:00:01Z',reportedAt:null,observedClock:'provider_reported'},
  coverage:{kind:'point_in_time',chain:'solana:mainnet',from:null,to:null,exhaustive:false},
  verification:{tier:'provider_reported',finality:'finalized_reported',reference:null},reference:ref(),maxAgeSeconds:300,unknowns:[],
});
export const policy = () => ({providerId:'invented-test-provider',sourceId:'invented-test-source',state:'reviewed',origin:'synthetic_fixture',assetKinds:['solana_mint'],chains:['solana:mainnet'],methods:['rpc'],rights:rights(),entitlement:entitlement(),maxAgeSeconds:300});
export const context = () => ({evaluatedAt:'2026-10-27T12:00:02Z',mode:'offline_fixture',intendedUse:'private_research',sourcePolicies:[policy()]});
export const doc = () => ({version:'unfarmd-evidence/1',asset:asset(),entries:[entry()]});
export function report(d=doc(), c=context()) { const result=api.evaluateEvidence(d,c); if(!result.ok) throw new Error(JSON.stringify(result)); return result.value; }
