/** Browser-safe SCOUT private creation feed. No provider credentials or raw responses. */
export type LiveEvent = Readonly<{
  signature: string;
  slot: number;
  receivedAt: string;
  source: "helius_standard";
  program: "6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P";
  notificationHash: string;
  finality: "provisional" | "rpc_reported_finalized";
  mint: string | null;
  /** Native SOL uses the original protocol sentinel (System Program address), not a verified SPL mint. */
  quoteMint: string | null;
  tokenProgram: string | null;
  transactionHash: string | null;
  verificationHash: string | null;
  checkedAt: string | null;
  blockTime: string | null;
}>;
export type LiveFeed = Readonly<{
  version: "scout-live/1";
  status: "disabled" | "unavailable" | "waiting" | "observing" | "stale" | "stopped";
  observedAt: string;
  events: readonly LiveEvent[] | null;
  counts: { provisional: number; finalized: number } | null;
  health: {
    state: "unapproved" | "idle" | "connected" | "stale" | "stopped";
    heartbeatAt: string | null;
    leaseUntil: string | null;
    sourceState: "connecting" | "open" | "closed";
    lastFrameAt: string | null;
    lastPongAt: string | null;
    lastRpcElapsedMs: number | null;
    gapSince: string | null;
    gapEndedAt: string | null;
    gaps: number;
    errors: number;
    stopped: boolean;
    reason: string | null;
  } | null;
  budget: { connectionsUsed: number; connectionsMax: number; rpcUsed: number; rpcMax: number;
    framesReserved: number; bytesReserved: number; creditsReserved: number; creditsMax: number | null;
    framesReceived: number; bytesReceived: number; expiresAt: string | null } | null;
  retention: { seconds: number; maxRecords: number; expiresOnRead: true } | null;
}>;
export type StopReply = Readonly<{ version: "scout-live/1"; status: "stopped"; observedAt: string }>;

/** Worker-only port. Source/head/session and durable fence must match on every call. */
export type WorkerBase = Readonly<{ v: 1; session: string; scope: string; head: string; worker: string }>;
export type Fenced = WorkerBase & Readonly<{ fence: string }>;
export type WorkerCommand =
  | (WorkerBase & { op: "claim" })
  | (Fenced & { op: "reserve"; resource: "connection" | "rpc" })
  | (Fenced & { op: "append"; event: LiveEvent })
  | (Fenced & { op: "heartbeat"; framesReceived: number; bytesReceived: number; sourceState: "connecting" | "open" | "closed"; lastFrameAt: string | null; lastPongAt: string | null; lastRpcElapsedMs: number | null })
  | (Fenced & { op: "gap"; reason: "disconnect" | "verification_failed" | "invalid_message" | "transport_error" | "startup" | "shutdown"; phase: "begin" | "end" })
  | (Fenced & { op: "release"; connectionClosed: true; terminal: boolean })
  | (Fenced & { op: "stop"; reason: "owner" | "budget" | "storage" | "shutdown" | "uncertain" });
export type WorkerReply = Readonly<{
  v: 1; ok: boolean; reason: string | null; session: string | null; scope: string;
  head: string | null; worker: string | null; fence: string | null;
  stopped: boolean; serverTime: string; leaseUntil: string | null;
  ticket: number | null; framesReceived: number; bytesReceived: number;
}>;
