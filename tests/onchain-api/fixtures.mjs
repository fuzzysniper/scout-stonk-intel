// SYNTHETIC OFFLINE FORMAT/CONCURRENCY MODEL. No source capture, real account key or provider requests.
import { createRequire } from "node:module";
import { MINT, OTHER, THIRD, FOURTH, TIME, envelope, token2022, response } from "../../lib/onchain-mint/tests/fixtures.mjs";
export { MINT, OTHER, THIRD, FOURTH, TIME, envelope, token2022, response };
const require = createRequire(import.meta.url);
export const root = process.env.MINT_API_TEST_BUILD;
export const { prepareIsolatedHeliusTarget, privateClientKey, targetUrl } = require(`${root}/lib/onchain-mint/server/helius.js`);
export const { referenceTransaction, initialReferenceState } = require(`${root}/lib/onchain-mint/server/distributed.js`);
export const { createSyntheticMintApi } = require(`${root}/lib/onchain-mint/server/testing.js`);
export const { API_LIMITS: L, POLICY_ID, HELIUS_HOST, PRODUCTION_RPC_ENABLED } = require(`${root}/lib/onchain-mint/server/policy.js`);
export const route = require(`${root}/app/api/mint-facts/route.js`);
export const ORIGIN = "https://scout.storkcoin.xyz";
export const SYNTHETIC_KEY = "SYNTHETIC_OFFLINE_NOT_A_HELIUS_KEY_108";
export const SYNTHETIC_HMAC = "SYNTHETIC_OFFLINE_NOT_AN_HMAC_SECRET_108";

export function system(options = {}) {
  let now = Date.parse(TIME), mono = 0;
  const calls = { rpc: [], store: [], identity: 0 }, state = initialReferenceState(), identities = new WeakMap();
  const store = { async transact(c) { calls.store.push(c); if (options.store) return options.store(c, state, now); return referenceTransaction(state, c, now); } };
  const clock = { now: () => now, monotonic: () => mono };
  const deps = {
    label: "SYNTHETIC_OFFLINE_ONLY", origin: ORIGIN, target: prepareIsolatedHeliusTarget(SYNTHETIC_KEY), hmacKey: SYNTHETIC_HMAC,
    store, trustedIdentity: async request => { calls.identity++; const ip = identities.get(request); return ip ? { ip } : null; },
    transport: async (url, init) => { calls.rpc.push({ url, init });
      if (options.rpc) return options.rpc(url, init);
      const e = envelope(); e.id = JSON.parse(init.body).id; return response(e);
    }, clock, ...options.deps,
  };
  const handler = createSyntheticMintApi(deps);
  const request = (mint = MINT, init = {}, ip = "203.0.113.8") => {
    const r = new Request(`${ORIGIN}/api/mint-facts?mint=${mint}`, { headers: { origin: ORIGIN, "sec-fetch-site": "same-origin" }, ...init });
    if (ip !== null) identities.set(r, ip); return r;
  };
  return { handler, replica: () => createSyntheticMintApi(deps), request, calls, state, deps, identities,
    advance(ms) { now += ms; mono += ms; }, wallJump(ms) { now += ms; }, monoJump(ms) { mono += ms; } };
}
