import type {Assumptions} from '../../../lib/unfarmd-risk';
import type {DeskEvaluation} from '../integration/model';
import styles from './journey.module.css';
export default function RiskSummary({evaluation}:{evaluation:DeskEvaluation|null}){
 const calculation=evaluation?.risk.calculation,c=calculation,chosen=c?.proposed??c?.ceiling,a=evaluation?.plan?.assumptions as Assumptions|undefined;
 return <section className={styles.model} aria-label="Your modeled risk">
  <h3>{c?.proposed?'Your proposed holding':'Your risk model'}</h3>
  {c&&chosen?<>
   <p className={styles.help}>{c.proposed?'Calculated from your entered quantity.':'Ceiling only — you have not selected a quantity.'} {evaluation?.recordable?'Inputs passed the manual checks.':'A calculation is available; resolve the blockers before recording.'}</p>
   <dl className={styles.metrics}>
    <div><dt>{c.proposed?'Proposed quantity':'Maximum modeled quantity'}</dt><dd>{chosen.units}</dd></div>
    <div><dt>Planned loss · USD</dt><dd>{chosen.plannedLoss.amount}</dd></div>
    <div><dt>Cash needed with modeled costs · USD</dt><dd>{chosen.entryCashWithCosts.amount}</dd></div>
   </dl>
   {c.omittedCosts&&<p className={styles.warning}>Costs are omitted, not estimated.</p>}
   <details><summary>Calculation details</summary><dl className={styles.metrics}>
    <div><dt>Your entry / exit prices · USD</dt><dd>{a?.entry.price.amount} / {a?.invalidation.price.amount}</dd></div>
    <div><dt>Your price-assumption time · UTC</dt><dd>{a?.entry.asOf}</dd></div><div><dt>Validity · seconds</dt><dd>{a?.entry.validForSeconds}</dd></div>
    <div><dt>Remaining allocation · USD</dt><dd>{c.remainingAllocation.amount}</dd></div><div><dt>Quantity ceiling</dt><dd>{c.ceiling.units}</dd></div>
    <div><dt>Per-unit modeled downside · USD</dt><dd>{c.perUnitPlannedDownside}</dd></div><div><dt>Fixed cost reserved once · USD</dt><dd>{c.fixedRoundTrip.amount}</dd></div>
   </dl><p className={styles.help}>Quantity rounds down. Modeled loss and cash round up to cents. These quantities are not verified tradable lots. No account or market was checked.</p></details>
  </>:<p className={styles.help}>No valid calculation yet. Missing values remain unknown.</p>}
 </section>;
}
