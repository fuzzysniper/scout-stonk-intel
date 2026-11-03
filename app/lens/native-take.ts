/** C editorial ordering over A's actual findings. No new risk thresholds or math. */
import type {NativeEvidenceV1,NativeFindingV1} from '../../lib/native-evidence/contract';
import {nativeDeadline,nativePriority} from './native-evidence-model';
export type NativeTakeReference=Readonly<{kind:'native';finding:NativeFindingV1;evidence:NativeEvidenceV1;current:boolean;expiresAt:number|null}>;
export type NativeTakePart=Readonly<{text:string;tone:'red'|'yellow'|'green'|'gray';references:readonly NativeTakeReference[]}>;
export function nativeTake(e:NativeEvidenceV1,now=Date.now(),withheld=false){
 const refs=nativePriority(e.findings).map(f=>{const deadline=nativeDeadline(e,f),current=!withheld&&e.state==='candidate'&&deadline!==null&&Date.parse(e.evaluatedAt!)<=now&&now<deadline;return {kind:'native' as const,finding:f,evidence:e,current,expiresAt:current?deadline:null};});
 const red=refs.find(r=>r.current&&r.finding.tone==='red'),available=refs.find(r=>r.current&&r.finding.state==='candidate'),history=refs.find(r=>r.finding.evidenceIds.length>0);
 const part=(text:string,tone:NativeTakePart['tone'],r?:NativeTakeReference):NativeTakePart=>({text,tone,references:r?[r]:[]});
 let take=part('No defensible thesis established.','gray',history),breaks=part('A current, coherent capture and its original references are required.','gray',history);
 if(withheld)breaks=part('Thesis withdrawn after STOP; see the owner control for its outcome.','gray',history);
 else if(e.consistency==='conflict'){take=part('Capture evidence conflicts; no coherent thesis is established.',red?'red':'gray',red??history);breaks=part('Reconcile the exact control and balance contexts before relying on this reading.',red?'red':'gray',red??history);}
 else if(red){take=part('A candidate warning takes priority; a demand thesis is unestablished.','red',red);breaks=part(red.finding.summary+' This is not proof of intent.','red',red);}
 else if(available){take=part('Decoded candidate evidence describes only its declared scope; demand remains unestablished.','gray',available);breaks=part('Expiry, incomplete coverage or conflicting capture context withdraws this reading.','gray',available);}
 const why=part('Not established: no supported price, momentum or continuing-demand history.','gray');
 const unknown=part('Organic demand, beneficial owners, LP withdrawal control and executable exit remain unknown.','gray');
 const used=[...take.references,...breaks.references],deadlines=used.map(r=>r.expiresAt).filter((x):x is number=>x!==null),lead=used.find(r=>r.current),source=lead&&e.references.find(r=>lead.finding.evidenceIds.includes(r.id));
 return {take,breaks,why,unknown,test:true,withheld,sourceOff:e.state==='unavailable',validUntil:deadlines.length?Math.min(...deadlines):null,freshness:source?{native:true,observedAt:source.receivedAt,receivedAt:source.receivedAt}:null};
}
