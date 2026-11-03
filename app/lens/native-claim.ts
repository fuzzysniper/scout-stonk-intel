import type {NativeEvidenceV1} from '../../lib/native-evidence/contract';
import type {ClaimId,ClaimOutcome} from './claim-check';
import {nativeDeadline} from './native-evidence-model';
export function nativeClaim(e:NativeEvidenceV1,id:ClaimId,now:number,withheld=false){
 const f=id==='organic'?e.findings.find(f=>f.id==='native-exit'):e.findings.find(f=>f.id==='native-'+id),deadline=f?nativeDeadline(e,f):null;
 const current=!withheld&&e.state==='candidate'&&e.consistency!=='conflict'&&!!f&&f.state==='candidate'&&deadline!==null&&Date.parse(e.evaluatedAt!)<=now&&now<deadline;
 let outcome:ClaimOutcome='NOT ESTABLISHED',reason='No current, sufficiently scoped decoded candidate supports a conclusion. Missing or expired evidence is not a contradiction.';
 if(id==='organic')reason='Mint controls and a token-account sample do not establish organic demand or returning people.';
 else if(current&&e.controls){const address=id==='mint-authority'?e.controls.mintAuthority:e.controls.freezeAuthority;if(address!==null&&f?.tone==='red'){outcome='CONTRADICTED';reason='The base permission is present in this decoded candidate. Presence is not proof of malicious intent.';}else if(address===null&&f?.tone==='green'){outcome='SUPPORTED WITHIN SCOPE';reason='This base permission is absent in the decoded candidate. A revocation event, authenticated origin and overall safety are not established.';}}
 if(e.consistency==='conflict')reason='The candidate capture contexts conflict. Reconcile their exact references before relying on a control claim.';
 return {outcome,reason,finding:f,validUntil:current?deadline:null};
}
