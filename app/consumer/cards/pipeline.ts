/** Local evidence inspection/rehearsal only. No fetch, persistence, public collector or rights override. */
import {normalizeCapture,verifyRegistry,validSubject,fixtureSeries,type Capture,type Subject,type Normalized,type FixturePoint} from './receipts';
import {analyzeSeries,compareObserved,utcTime,type SeriesFinding} from './performance';
import {CARDS} from './identity';
export type PipelineInput={version:'cards-research-input/1';context:'public_source_inspection'|'synthetic_offline_rehearsal';asOf:string;startAt:string;endAt:string;registry:Capture;subjects:Subject[];captures:{subjectMint:string;receipt:Capture}[]};
export function runPipeline(input:PipelineInput){
 if(!input||input.version!=='cards-research-input/1'||!['public_source_inspection','synthetic_offline_rehearsal'].includes(input.context))throw Error('invalid_pipeline_input');
 const now=utcTime(input.asOf),start=utcTime(input.startAt),end=utcTime(input.endAt);
 if(now===null||start===null||end===null||end-start!==86400000||now<end)throw Error('invalid_pipeline_input');
 if(!Array.isArray(input.subjects)||input.subjects.length<1||input.subjects.length>4||input.subjects.some(s=>!validSubject(s))||new Set(input.subjects.map(s=>s.mint)).size!==input.subjects.length||new Set(input.subjects.map(s=>s.poolMint)).size!==input.subjects.length)throw Error('invalid_pipeline_subjects');
 if(!Array.isArray(input.captures)||input.captures.length>128||input.captures.some(c=>!c||!input.subjects.some(s=>s.mint===c.subjectMint)||!c.receipt||typeof c.receipt.bodyBase64!=='string')||input.captures.reduce((n,c)=>n+c.receipt.bodyBase64.length,0)>12*1024*1024)throw Error('receipt_limit');
 const fixture=input.context==='synthetic_offline_rehearsal',expected=fixture?'synthetic_offline':'public_source';
 const registryVerified=input.registry?.evidenceClass===expected&&verifyRegistry(input.registry,input.asOf);
 const subjects=input.subjects.map(subject=>{
  const captures=input.captures.filter(c=>c.subjectMint===subject.mint);
  const results:Normalized[]=captures.map(c=>!registryVerified?{state:'withheld',reason:'registry_unverified'}:c.receipt.evidenceClass!==expected?{state:'withheld',reason:'synthetic_not_live'}:normalizeCapture(c.receipt,subject,input.asOf));
  const records=results.flatMap(r=>r.state==='normalized'?[r.record]:[]),points=records.filter((r):r is FixturePoint=>r.kind==='synthetic_point');
  const series=fixtureSeries(subject,points);
  const finding:SeriesFinding|null=fixture?analyzeSeries(series,input.startAt,input.endAt,input.asOf):null;
  return {subject,results,records,series,finding};
 });
 const comparison=fixture?compareObserved(subjects.map(s=>s.series),CARDS.mint,input.startAt,input.endAt,input.asOf):null;
 return {input,registryVerified,subjects,comparison};
}
/** Deliberately construct metadata only. CLI and browser never serialize internal raw/financial fields. */
export function publicPipelineReport(result:ReturnType<typeof runPipeline>){
 const {input}=result,fixture=input.context==='synthetic_offline_rehearsal';
 return {version:'cards-research-report/1',policy:'cards-normalized-24h-v1',context:input.context,synthetic:fixture,
  period:{startAt:input.startAt,endAt:input.endAt,asOf:input.asOf,hours:24},registryRecordMatched:result.registryVerified,
  coverage:{scope:'operator_selected_exact_pool_sample',complete:false,atomic:false,subjectCount:input.subjects.length},
  subjects:result.subjects.map(s=>({identity:{mint:s.subject.mint,poolMint:s.subject.poolMint,quoteMint:s.subject.quoteMint},captures:s.results.length,normalizedSnapshots:s.records.filter(r=>r.kind==='untimed_usd_snapshot').length,
   qualifiedPublicPricePoints:0,offlineFixturePoints:s.records.filter(r=>r.kind==='synthetic_point').length,
   state:'insufficient_data',reasons:[...new Set([...s.results.flatMap(r=>r.state==='withheld'?[r.reason]:[]),...(!result.registryVerified?['registry_unverified']:[]),...(fixture?['synthetic_fixture_not_live']:(s.records.length?['actual_market_time_missing','quote_price_history_missing']:['price_history_missing'])),...(s.finding?.state==='withheld'?[s.finding.reason]:[]),'source_rights_unverified'])],
   metrics:{appreciation:null,maximumDrawdown:null,sampledPeak:null,momentum:null,marketCap:null,holderReturn:null},
   sourceReceipts:s.records.map(r=>({...r.source})),decimalHandling:s.records.some(r=>r.kind==='untimed_usd_snapshot')?'original_numeric_lexemes_preserved':'not_established'})),
  ranking:{state:'withheld',rows:[],reason:fixture?'synthetic_fixture_not_live':'no_qualified_timestamped_quote_price_history'},
  rights:{publication:'withheld',permission:'unverified',approvalOverrideAvailable:false},
  interpretation:'source_capture_metadata_not_market_history_or_holder_return'};
}
