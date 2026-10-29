import type { SolanaFactProjectionV1 } from "../../v4-solana-facts/contract";

/** Proposed future owner-approved envelope. This draft supplies NO active profile. */
export type PilotProfile = Readonly<{
  id: string; origin: string; ownerSubject: string; identityIssuer: string;
  startsAt: number; expiresAt: number; mints: readonly [string, string, string];
  creditsPerAttempt: number; maxCredits: number;
}>;
export type OwnerIdentity = Readonly<{
  subject: string; issuer: string; audience: string; sessionId: string; pilotId: string;
  authenticatedAt: number; expiresAt: number;
}>;
/** Future trusted server auth adapter, NOT Vercel protection or caller identity headers. */
export type OwnerIdentityPort = Readonly<{ authenticate(request: Request): Promise<OwnerIdentity | null> }>;
export type Permit = Readonly<{ policyHash: string; id: string; ownerSubject: string; mint: string; admittedAt: number }>;
export type Lease = Readonly<{
  policyHash: string; permitId: string; id: number; mint: string; issuedAt: number; expiresAt: number;
  attemptsReserved: number; creditsReserved: number;
}>;
export type Report = Readonly<{ responseSha256: string; contextSlot: string; receivedAt: number }>;
export type LedgerCommand =
  | Readonly<{ kind: "admit"; policyHash: string; ownerSubject: string; mint: string; now: number }>
  | Readonly<{ kind: "reserve"; permit: Permit; now: number }>
  | Readonly<{ kind: "finish"; permit: Permit; lease: Lease | null; report: Report; now: number }>
  | Readonly<{ kind: "stop"; policyHash: string; ownerSubject: string; reason: "owner_stop" | "uncertain"; now: number }>;
export type LedgerReply =
  | Readonly<{ kind: "permit"; permit: Permit }>
  | Readonly<{ kind: "lease"; lease: Lease }>
  | Readonly<{ kind: "published"; policyHash: string; permitId: string; leaseId: number | null; report: Report; committedAt: number }>
  | Readonly<{ kind: "stopped"; policyHash: string }>
  | Readonly<{ kind: "denied"; reason: "stopped" | "busy" | "exhausted" | "read_limited" | "expired" | "invalid_clock" }>;
/** Mandatory future implementation: globally linearizable + durable before ACK.
 * No reset/init/reclaim operation. This draft has NO real ledger adapter or fallback. */
export type GlobalLedgerPort = Readonly<{
  scope: "global_atomic_durable";
  transact(command: LedgerCommand): Promise<LedgerReply>;
}>;
/** Opaque server-only credential target, deliberately empty on JSON serialization. */
export type RpcTarget = Readonly<{ host: "mainnet.helius-rpc.com" }>;
export type FixedRpcRead = Readonly<{
  target: RpcTarget; method: "getAccountInfo"; encoding: "jsonParsed"; commitment: "finalized"; mint: string; id: number;
}>;
/** No native implementation is supplied or selected by default. */
export type RpcTransportPort = (read: FixedRpcRead, signal: AbortSignal) => Promise<Response>;
export type MockPilotPorts = Readonly<{
  identity?: OwnerIdentityPort; ledger?: GlobalLedgerPort;
  readProviderKey?: () => unknown; transport?: RpcTransportPort;
  now: () => number; monotonic: () => number;
}>;
export type PilotReason = "disabled" | "invalid_profile" | "invalid_request" | "unauthenticated" | "ledger_unavailable" | "missing_key"
  | "stopped" | "busy" | "exhausted" | "read_limited" | "expired" | "invalid_clock" | "uncertain"
  | "stale_source" | "timeout" | "rate_limited" | "access_denied" | "invalid_response" | "response_too_large" | "upstream_unavailable";
export type PilotResult = Readonly<{
  version: "unfarmd-helius-pilot/1"; sourceGo: false; mockOnly: boolean;
  reason: PilotReason | null; observation: SolanaFactProjectionV1 | null;
}>;
