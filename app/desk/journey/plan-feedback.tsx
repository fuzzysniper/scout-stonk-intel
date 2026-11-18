import type {RefObject} from 'react';
import {feedbackMessage,type planFeedback} from './feedback';
import styles from './journey.module.css';
type Feedback=ReturnType<typeof planFeedback>;
export default function PlanFeedback({feedback,ready,checked,failed,onNext,onCheck,feedbackRef}:{feedback:Feedback;ready:boolean;checked:boolean;failed:boolean;onNext:()=>void;onCheck:()=>void;feedbackRef:RefObject<HTMLElement|null>}){
 return <section id="journey-plan-feedback" ref={feedbackRef} tabIndex={-1} aria-label="Plan readiness" className={styles.feedback}>
  <h2>{ready?'Plan ready to record':'Plan incomplete'}</h2>
  <p className={styles.help}>{failed?'Could not record this plan. Nothing was recorded.':ready?'Manual inputs passed the checks. No decision recorded yet.':checked?'Not recorded yet. Let’s take one step at a time.':'Not ready to record. Start with the next requirement.'}</p>
  {!ready&&<>
   <p className={styles.next}><strong>Next:</strong> {feedback.next?feedbackMessage(feedback.next.issue):'Review the validation details before trying again.'}</p>
   <button type="button" className={styles.primary} onClick={onNext}>{feedback.next?'Go to next missing step':'Review validation details'}</button>
   <ul className={styles.feedbackGroups} aria-label="Outstanding plan groups">{feedback.groups.map(group=><li key={group.label}>{group.label}<span>{group.count} {group.count===1?'input':'inputs'}</span></li>)}</ul>
   <p className={styles.help}>{feedback.fieldCount} flagged {feedback.fieldCount===1?'input':'inputs'} · {feedback.groups.length} {feedback.groups.length===1?'area':'areas'} to review.</p>
   <button type="button" className={styles.textButton} onClick={onCheck}>Check my plan</button>
   <details id="journey-all-issues"><summary id="journey-issue-details">Show all issues ({feedback.errors.length})</summary>
    {feedback.errors.length?<ul className={styles.issueDetails}>{feedback.errors.map((issue,index)=><li key={`${issue.field}:${issue.code}:${index}`}>{feedbackMessage(issue)} <code>{issue.field} · {issue.code}</code></li>)}</ul>:<p className={styles.help}>No field-level details returned. Review your inputs; no record is assumed successful.</p>}
   </details>
  </>}
 </section>;
}
