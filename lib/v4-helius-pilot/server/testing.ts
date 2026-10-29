import "server-only";
import { injectedMockPilot } from "./engine";
import { createHeliusPilot } from "./index";
import { BOUNDS } from "./policy";
import type { MockPilotPorts } from "./contract";
/** Mandatory injected ports, test runtime only. No native transport/store/auth fallback. */
export function createMockPilot(profile: unknown, ports: MockPilotPorts, deadlineMs: number = BOUNDS.timeoutMs) {
  if (process.env.NODE_ENV !== "test") return createHeliusPilot();
  return injectedMockPilot(profile, ports, deadlineMs);
}
export { prepareProfile } from "./profile";
export { targetUrl as inspectSyntheticTarget } from "./transport";
