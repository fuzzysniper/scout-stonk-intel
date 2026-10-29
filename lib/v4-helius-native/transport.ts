import 'server-only';
import type { RequestOptions } from 'node:https';
import type { ClientRequest, IncomingMessage } from 'node:http';
import { nativeHeliusTransport, isolatedHttpsTransport } from '../onchain-mint/server/native-transport';
import { BoundaryError } from '../onchain-mint/server/rpc';
import type { Transport } from '../onchain-mint/server/rpc';
import { NATIVE_SOURCE } from './index';

declare const binding: unique symbol;
export type TransportBinding = Readonly<{ [binding]: true }>;
type Bound = Readonly<{ acquisition: 'production_rpc' | 'synthetic_fixture'; transport: Transport }>;
const bindings = new WeakMap<TransportBinding, Bound>();
function bind(value: Bound): TransportBinding {
  const cap = Object.freeze({}) as TransportBinding;
  bindings.set(cap, Object.freeze(value)); return cap;
}
/** Actual reviewed native Node HTTPS implementation, never selected/enabled by this PR.
 * Fixed Helius host/SNI/TLS, one POST/getAccountInfo/jsonParsed/finalized, no redirect or retry.
 * OFF is a code constant, not an env flag or caller argument. Even a direct import cannot connect.
 */
export const unselectedNativeBinding = bind({ acquisition: 'production_rpc', transport: async (url, init) => {
  if (!NATIVE_SOURCE.enabled) throw new BoundaryError('disabled');
  return nativeHeliusTransport(url, init);
} });
export function inspectBinding(cap: TransportBinding): Bound | null { return bindings.get(cap) ?? null; }
/** Test-only wire routes the immutable native request to disposable LOCAL TLS. Its label cannot be promoted. */
export function localFixtureBinding(wire: (options: RequestOptions, cb: (response: IncomingMessage) => void) => ClientRequest): TransportBinding {
  if (process.env.NODE_ENV !== 'test') throw new BoundaryError('disabled');
  const transport = isolatedHttpsTransport(wire);
  return bind({ acquisition: 'synthetic_fixture', transport: (url, init) => {
    if (process.env.NODE_ENV !== 'test') throw new BoundaryError('disabled');
    return transport(url, init);
  } });
}
