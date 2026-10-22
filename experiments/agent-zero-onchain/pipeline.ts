import { prepareAccounts, finishObservation, type Capture } from './decode';
import { accountsRequest, LIMITS, Stop, need, timeRequest } from './policy';
export type Dependencies = {
  reserve: (attempt: number, requestBody: string) => void;
  read: (requestBody: string) => Promise<Capture>;
  retain: (attempt: number, capture: Capture) => void;
  now: () => string;
};
/** No native transport/default dependencies. Tests inject explicitly invented packets.
 * A caller-supplied capture is never labeled an authentic acquisition here. */
export async function runPipeline(d: Dependencies) {
  let attemptsReserved = 0;
  async function once(request: string) {
    need(attemptsReserved < LIMITS.attempts, 'ATTEMPT_CAP'); const attempt = ++attemptsReserved;
    d.reserve(attempt, request); // Must persist before dispatch; failure consumes reservation.
    const capture = await d.read(request); d.retain(attempt, capture); return capture;
  }
  try {
    const first = await once(accountsRequest()), prepared = prepareAccounts(first);
    const second = await once(timeRequest(prepared.slot));
    return { accepted: true as const, attemptsReserved, observation: finishObservation(prepared, second, d.now()) };
  } catch (error) {
    return { accepted: false as const, attemptsReserved, observation: null, reason: error instanceof Stop ? error.code : 'MALFORMED_OR_TRANSPORT_FAILURE' };
  }
}
