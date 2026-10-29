import 'server-only';
/** Hosted/public selection remains unconditionally OFF. No dependencies or environment reads. */
export function ownerPilotStatus() {
  return Object.freeze({ enabled: false, sourceGo: false, ownerConfigured: false, ledgerConfigured: false } as const);
}
