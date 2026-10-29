import "server-only";
import { response } from "./result";
export { PILOT_GATE, BOUNDS } from "./policy";
export type { PilotProfile, OwnerIdentityPort, GlobalLedgerPort, RpcTransportPort, PilotResult } from "./contract";
/** Permanently OFF: no option, env read, identity/store/key/transport binding or native client. Unwired to API/UI. */
export function createHeliusPilot() {
  return async function disabledPilot(): Promise<Response> { return response("disabled", 503, null, false); };
}
