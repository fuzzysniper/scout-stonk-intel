/** Navigation and operator guidance only. No probes, capability transfer or mutations. */
export const BOUNDED_STOP_LABEL='Original bounded v1 · STOP only';
export const PARENT_CONTROL_PATH='/api/live-events/continuous/control';

export function OperationsGuide(){
 return <section className="live-parent-operations" aria-labelledby="parent-operations-title">
  <h2 id="parent-operations-title">Continuous-parent operations</h2>
  <p><strong>Separate from bounded v1.</strong> The dashboard’s feed and v1 STOP do not report or stop a continuous parent.</p>
  <p id="parent-control-boundary">Parent control availability: <strong>not checked</strong>. Opening a protected page does not prove source readiness or STOP.</p>
  <a className="parent-control-link" href={PARENT_CONTROL_PATH} referrerPolicy="no-referrer" aria-describedby="parent-control-boundary">Open protected parent control</a>
  <p>Authenticate separately there. This dashboard does not forward its owner token. Verify the exact parent and grant before any separately approved parent STOP. This link cannot enable the control or start a source.</p>
  <p>If the page says <strong>Control disabled</strong>, leave it disabled. That response proves neither production SSO nor a completed parent STOP.</p>
  <details className="live-emergency">
   <summary>Emergency if parent STOP is unavailable</summary>
   <p>Follow the owner-approved incident procedure to manually <strong>Suspend</strong> the dedicated UNFARMD Render background worker. Verify the exact service first; do not touch another bot or worker.</p>
   <p>Confirm control-plane suspension, then independently confirm worker and native-socket closure. A Render status alone is not closure evidence. Do not resume, restart or reset STOP to test the screen or resolve an uncertain result.</p>
   <p>No Render action is performed by this dashboard.</p>
  </details>
 </section>;
}
