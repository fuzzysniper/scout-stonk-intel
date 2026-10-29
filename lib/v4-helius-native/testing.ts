import 'server-only';
import type { RequestOptions } from 'node:https';
import type { ClientRequest, IncomingMessage } from 'node:http';
import { createHeliusNative } from './index';
import { prepareProducer, type ProducerPorts } from './producer';
import { localFixtureBinding } from './transport';
/** Explicit test runtime, injected LOCAL TLS wire only. Cannot label a fixture as production. */
export function createLocalFixtureProducer(profile: unknown, ports: ProducerPorts,
  wire: (options: RequestOptions, cb: (response: IncomingMessage) => void) => ClientRequest, deadlineMs?: number) {
  if (process.env.NODE_ENV !== 'test') return createHeliusNative();
  const run = prepareProducer(profile, ports, localFixtureBinding(wire), deadlineMs);
  return (request: Request) => process.env.NODE_ENV === 'test' ? run(request) : createHeliusNative()(request);
}
