/** Source-free UI draft only. These checks are not an evidence or risk engine. */
export const fields = [
 ['asset', 'Asset · ticker, chain / address, or listing'],
 ['purpose', 'Purpose'], ['horizon', 'Time horizon'],
 ['thesis', 'Thesis'], ['evidence', 'Evidence / provenance notes'],
 ['counterThesis', 'Counter-thesis'], ['unknowns', 'Unknowns'],
 ['invalidation', 'Invalidation & exit rationale'],
 ['portfolio', 'Portfolio / exposure assumptions'],
 ['risk', 'Risk / cost assumptions'], ['reason', 'Decision reason'],
];
export const emptyDraft = () => Object.fromEntries(fields.map(([key]) => [key, '']));
/** @param {Record<string,string>} draft @param {boolean} affirmed */
export function completeness(draft, affirmed) {
 return [
  ...fields.map(([key, label]) => ({label, complete: Boolean(draft[key]?.trim())})),
  {label: 'Manual assumptions acknowledged', complete: affirmed},
  {label: 'Reviewed evidence integration', complete: false},
  {label: 'Reviewed risk evaluation', complete: false},
 ];
}
/** @param {string} decision @param {Record<string,string>} draft @param {boolean} affirmed */
export function decisionBlockers(decision, draft, affirmed) {
 if (!['PLAN', 'WATCH', 'PASS'].includes(decision)) return ['Choose PLAN, WATCH or PASS.'];
 if (decision === 'PLAN') return completeness(draft, affirmed).filter(item => !item.complete).map(item => item.label);
 return draft.reason?.trim() ? [] : ['Write a decision reason.'];
}
