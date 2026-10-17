/** UI projection of Agent B's readonly v1 contract, pinned unchanged in vendor/.
 * Captured evidence is never a live claim. Quantities remain withheld/null.
 */
export type SourceReceipt = Readonly<{
  id: string; label: string; endpoint: string; capturedAt: string;
  sourceGeneratedAt: string | null; receiptSha256: string; documentSha256: string;
  retainedAt: string; rights: 'unverified_metadata_only';
}>;
export type CapturedExample = Readonly<{
  mint: string; name: string; symbol: string; network: 'solana'; mode: 'retained_capture';
  quote: Readonly<{mint: string; symbol: string; name: string}>;
  explanation: readonly [string, string];
  facts: readonly Readonly<{label: string; detail: string; sourceIds: readonly string[]}>[];
  risks: readonly string[]; sources: readonly SourceReceipt[]; fullNotes: readonly string[];
  freshness: 'captured' | 'stale'; evaluatedAt: string;
  financialFigures: 'withheld'; holderReturns: 'unavailable'; coverage: 'curated_nonexhaustive';
}>;
export type ExplanationReply =
  | Readonly<{state:'supported';example:CapturedExample}>
  | Readonly<{state:'empty'|'invalid'|'needs_mint'|'unsupported'}>
  | Readonly<{state:'unavailable';reason:'evidence_unavailable'|'evidence_invalid'}>;
export type ExplainMint = (input:string) => Promise<ExplanationReply>;
export const EXAMPLES = Object.freeze([
  {mint:'DEW9dSN6QpWyNthphCpMmAbZP1Q4cEKR9xQXAri98WDP',symbol:'SI',quote:'NVDAX',quoteMint:'Xsc9qvGR1efVDFGLrVsmkzv3qi45LTBjeUKSPmx9qEh',name:'Super Inu'},
  {mint:'HTmQz7My6MehV7bjhJ6jde8nDND1yvsz68d24LP7YgUQ',symbol:'GP',quote:'GLDX',quoteMint:'Xsv9hRk1z5ystj9MhnA7Lq4vjSsLwzL2nxrwmwtD3re',name:'RuneScape Gold'},
  {mint:'6HU4CmRb15C2nQDx8Ld2f2W2wTdmog6aZiiXdrT5Pzi8',symbol:'GROK',quote:'SPCXX',quoteMint:'Xs3oZwbHvqis4NYcf4YKWmEia2eC84wSiVrcYcTqpH8',name:'Grokification'},
] as const);
