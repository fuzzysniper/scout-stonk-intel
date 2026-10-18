import "server-only";
import { request as httpsRequest, type RequestOptions } from "node:https";
import type { ClientRequest, IncomingMessage } from "node:http";
import { Readable } from "node:stream";
import { isExactPublicKey, strictJson } from "../validation";
import { HELIUS_HOST, API_LIMITS } from "./policy";
import { BoundaryError, demand, type Transport } from "./rpc";

type Wire = (options: RequestOptions, callback: (response: IncomingMessage) => void) => ClientRequest;
/** Internal wire seam for real LOCAL TLS tests. The deployed export always uses native node:https.
 * Avoid Next's global Fetch wrapper, which records full URL queries in spans/metrics.
 * External HTTP/APM instrumentation still requires operator redaction review.
 */
export function isolatedHttpsTransport(wire: Wire = (options, cb) => httpsRequest(options, cb)): Transport {
  return async (url, init) => {
    try {
      const target = new URL(url), key = target.searchParams.get("api-key");
      demand(target.protocol === "https:" && target.hostname === HELIUS_HOST && !target.port && target.pathname === "/" && !target.username && !target.password && !target.hash);
      demand(key && /^[A-Za-z0-9_-]{16,128}$/.test(key) && target.search === "?api-key="+key);
      demand(init.method === "POST" && init.redirect === "error" && init.credentials === "omit" && init.cache === "no-store" && init.signal && !init.signal.aborted, "access_denied");
      demand(typeof init.body === "string" && Buffer.byteLength(init.body) <= 512);
      const body = strictJson(init.body) as Record<string, unknown>;
      demand(body && Object.keys(body).sort().join(",") === "id,jsonrpc,method,params" && body.jsonrpc === "2.0" && body.method === "getAccountInfo" && Number.isSafeInteger(body.id) && (body.id as number)>0);
      const params = body.params;
      demand(Array.isArray(params) && params.length===2 && isExactPublicKey(params[0]) && params[1] && Object.keys(params[1]).sort().join(",")==="commitment,encoding" && params[1].encoding==="jsonParsed" && params[1].commitment==="finalized");
      const payload = init.body;
      return await new Promise<Response>((resolve, reject) => {
        const fail = () => reject(new BoundaryError("network_unavailable"));
        try {
          const req = wire({ protocol: "https:", hostname: HELIUS_HOST, port: 443, servername: HELIUS_HOST,
            path: target.pathname+target.search, method: "POST", agent: false, rejectUnauthorized: true, minVersion: "TLSv1.2",
            maxHeaderSize: 16384, insecureHTTPParser: false, signal: init.signal!, timeout: API_LIMITS.timeoutMs,
            headers: { accept: "application/json", "content-type": "application/json", "accept-encoding": "identity", "content-length": Buffer.byteLength(payload) },
          }, message => {
            try {
              const headers = new Headers();
              for (let i=0;i<message.rawHeaders.length;i+=2) headers.append(message.rawHeaders[i],message.rawHeaders[i+1]);
              demand(!headers.has("content-encoding") || headers.get("content-encoding")==="identity");
              const stream = Readable.toWeb(message, { strategy: { highWaterMark: 16384, size: (chunk: Uint8Array) => chunk.byteLength } });
              resolve(new Response(stream as ReadableStream<Uint8Array>, { status: message.statusCode ?? 502, headers }));
            } catch { message.destroy(); fail(); }
          });
          req.once("error", fail); req.once("timeout", () => req.destroy()); req.end(payload);
        } catch { fail(); }
      });
    } catch (error) { throw new BoundaryError(error instanceof BoundaryError ? error.reason : "invalid_response"); }
  };
}
export const nativeHeliusTransport = isolatedHttpsTransport();
