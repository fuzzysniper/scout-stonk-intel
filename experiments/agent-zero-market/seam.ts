import { freeze, mint, record } from './model';
import { assertReport, type ResearchReport } from './engine';
/** Read-only attachment, never a #150 observation/outcome/command or journal import. */
export function attachSyntheticResearch<T>(existing: T, research: ResearchReport) {
 assertReport(research);
 const v = record(existing), performance = record(v.performance), policy = record(v.policy);
 if (v.mode !== 'recorded' || !Array.isArray(v.candidates) || v.candidates.some(raw => { const c = record(raw); mint(c.mint); return record(c.qualification).state !== 'INSUFFICIENT EVIDENCE'; }) || policy.liveAllocationCents !== 0 || performance.eligibleCandidates !== 0 || performance.nav !== null || performance.netReturn !== null || performance.pricedGenuineOutcomes !== 0) throw Error('agent0_boundary_not_supported');
 if (research.version !== 'offline-market-report/1' || research.assurance !== 'SYNTHETIC_OFFLINE' || research.realMoneyEligible !== 0 || research.liveNav !== null || research.alphaEstimate !== null || research.liveAcquisition !== 'DISCONNECTED_NO_ADAPTER') throw Error('synthetic_research_only');
 // Do not freeze/mutate the caller's journal-derived view; preserve its exact reference.
 return Object.freeze({ existing, research: freeze(research), targetMode: 'synthetic' as const, journalCommands: Object.freeze([]), eligibleRealMoneyCandidates: 0 as const });
}
