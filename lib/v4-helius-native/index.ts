import 'server-only';
import type { NativeProducer, NativeResult } from './contract';
export type { NativeObservation, NativeResult, NativeProducer } from './contract';
export const NATIVE_SOURCE = Object.freeze({ enabled: false, sourceGo: false, attempts: 0, retries: 0 } as const);
/** No options/env/key/ledger/auth/transport selection. Not bound to any route or deployed source factory. */
export function createHeliusNative(): NativeProducer {
  return async (): Promise<NativeResult> => Object.freeze({ version: 'unfarmd-helius-native/1', sourceGo: false,
    state: 'disabled', reason: 'disabled', observation: null });
}
