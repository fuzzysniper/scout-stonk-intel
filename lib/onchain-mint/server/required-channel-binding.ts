import "server-only";
import { Client, type ClientConfig } from "pg";
import { version } from "pg/package.json";
import type { TLSSocket } from "node:tls";
import { BoundaryError, demand } from "./rpc";

// Deliberately narrow adapter for the LOCKED JS driver, not a new SCRAM implementation.
// pg 8.23.1's enableChannelBinding only prefers PLUS. Its auth handlers are internal:
// any driver upgrade requires re-review and the real TLS/PostgreSQL regression suite.
type Session = { mechanism: string; message: string };
type Internals = {
  saslSession?: Session | null;
  _connectionError: boolean;
  _handleAuthSASL(message: { mechanisms: string[] }): void;
  _handleAuthSASLContinue(message: { data: string }): Promise<void>;
  _handleAuthSASLFinal(message: { data: string }): void;
  _handleReadyForQuery(message: { status: string }): void;
  _handleErrorEvent(error: Error): void;
  _handleErrorMessage(error: Error): void;
};
const driver = Client.prototype as unknown as Internals;
type Peer = TLSSocket & { servername?: string };
const verified = new WeakMap<object, Readonly<{ socket: Peer; host: string }>>();
function peer(client: Client): Peer {
  return (client.connection as unknown as { stream: Peer }).stream;
}
function validPeer(socket: Peer, host: string): boolean {
  return socket.encrypted === true && socket.authorized === true && !socket.destroyed &&
    socket.servername === host && ["TLSv1.2", "TLSv1.3"].includes(socket.getProtocol() ?? "") &&
    Buffer.isBuffer(socket.getPeerCertificate().raw) && socket.getPeerCertificate().raw.length > 0;
}
/** Unforgeable process-local attestation, checked before SQL on every pool checkout. */
export function hasVerifiedChannelBinding(client: Client, host: string): boolean {
  const proof = verified.get(client);
  return !!proof && proof.host === host && proof.socket === peer(client) && validPeer(proof.socket, host);
}

export class RequiredChannelBindingClient extends Client {
  #phase: "new" | "started" | "continuing" | "proof_sent" | "verified" | "authenticated" | "failed" = "new";
  #host: string;
  constructor(config: ClientConfig = {}) {
    // Explicit credentials/TLS only. Never accept a connection string that can override SSL,
    // a supplied connection/stream, pipeline, custom identity verifier or pgpass fallback.
    demand(version === "8.23.1" && config.enableChannelBinding === true &&
      typeof config.password === "string" && config.password.length > 0 &&
      typeof config.user === "string" && typeof config.database === "string" && typeof config.host === "string" &&
      typeof config.ssl === "object" && config.ssl !== null && config.ssl.rejectUnauthorized === true &&
      config.ssl.minVersion === "TLSv1.2" && typeof config.ssl.servername === "string" && config.ssl.servername.length > 0 &&
      config.ssl.checkServerIdentity === undefined && config.connectionString === undefined &&
      config.stream === undefined && !("connection" in config) && config.pipeline !== true &&
      ["_handleAuthSASL", "_handleAuthSASLContinue", "_handleAuthSASLFinal", "_handleReadyForQuery", "_handleErrorEvent", "_handleErrorMessage"]
        .every(key => typeof driver[key as keyof Internals] === "function"), "upstream_unavailable");
    super(config);
    this.#host = config.ssl.servername;
    this.connection.on("authenticationOk", () => {
      if (this.#phase !== "verified") return this.#reject();
      this.#phase = "authenticated";
    });
    this.once("end", () => { verified.delete(this); });
  }
  #reject(): void {
    if (this.#phase === "failed") return;
    this.#phase = "failed";
    verified.delete(this);
    peer(this).destroy();
    driver._handleErrorEvent.call(this, new BoundaryError("upstream_unavailable"));
  }
  _handleErrorEvent(): void { this.#reject(); }
  _handleErrorMessage(error: Error): void {
    if (this.#phase !== "authenticated") return this.#reject();
    driver._handleErrorMessage.call(this, error);
  }
  _handleAuthCleartextPassword(): void { this.#reject(); }
  _handleAuthMD5Password(): void { this.#reject(); }
  _handleAuthSASL(message: { mechanisms: string[] }): void {
    if (this.#phase !== "new" || !validPeer(peer(this), this.#host) ||
      !message.mechanisms.includes("SCRAM-SHA-256-PLUS")) return this.#reject();
    this.#phase = "started";
    // The explicit string password makes pg's _getPassword callback synchronous.
    driver._handleAuthSASL.call(this, message);
    const session = (this as unknown as Internals).saslSession;
    if (session?.mechanism !== "SCRAM-SHA-256-PLUS" || session.message !== "SASLInitialResponse") this.#reject();
  }
  async _handleAuthSASLContinue(message: { data: string }): Promise<void> {
    if (this.#phase !== "started") return this.#reject();
    this.#phase = "continuing";
    await driver._handleAuthSASLContinue.call(this, message);
    const session = (this as unknown as Internals).saslSession;
    if (this.#phase as string !== "continuing" || session?.mechanism !== "SCRAM-SHA-256-PLUS" || session.message !== "SASLResponse") return this.#reject();
    this.#phase = "proof_sent";
  }
  _handleAuthSASLFinal(message: { data: string }): void {
    const internal = this as unknown as Internals;
    if (this.#phase !== "proof_sent" || internal.saslSession?.mechanism !== "SCRAM-SHA-256-PLUS" ||
      internal.saslSession.message !== "SASLResponse" || !validPeer(peer(this), this.#host)) return this.#reject();
    // pg verifies the actual server signature and clears the session ONLY on success.
    // Its error handler above permanently fails this client, even if a hostile peer sends Ready next.
    driver._handleAuthSASLFinal.call(this, message);
    if (this.#phase as string !== "proof_sent" || internal._connectionError || internal.saslSession !== null) return this.#reject();
    this.#phase = "verified";
  }
  _handleReadyForQuery(message: { status: string }): void {
    if (this.#phase !== "authenticated" || !validPeer(peer(this), this.#host)) return this.#reject();
    peer(this).disableRenegotiation();
    verified.set(this, { socket: peer(this), host: this.#host });
    driver._handleReadyForQuery.call(this, message);
  }
}
