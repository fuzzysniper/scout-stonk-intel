import "server-only";
import { Pool, type PoolClient } from "pg";
import type { AtomicMintStore, Command, Reply } from "./distributed";
import { databaseParameters, type DatabaseHandle } from "./production-config";
import { BoundaryError, deadline, demand } from "./rpc";
import type { TLSSocket } from "node:tls";
import { POSTGRES_COMPATIBILITY_SQL, STEP_BODY_SHA256 } from "./postgres-compatibility";

/** Real native SQL adapter. No migration/bootstrap/retry/memory fallback in request handling. */
export function postgresStore(pool: Pool, nativeProof?: Readonly<{ host: string }>): AtomicMintStore {
  return Object.freeze({ async transact(command: Command): Promise<Reply> {
    const json = JSON.stringify(command); demand(json.length <= 40000 && Buffer.byteLength(json) <= 40000);
    demand(pool.waitingCount < 4, "admission_limited");
    // A late connection must be released even if the caller's outer deadline has already expired.
    let client: PoolClient | undefined, committed = false;
    try {
      client = await pool.connect();
      if(nativeProof) {
        // Pinned pg's actual TLS peer; configuration flags alone are insufficient.
        const socket=(client as unknown as {connection?:{stream?:TLSSocket & {servername?:string}}}).connection?.stream;
        demand(socket?.encrypted && socket.authorized && socket.servername===nativeProof.host &&
          ["TLSv1.2","TLSv1.3"].includes(socket.getProtocol()??""),"upstream_unavailable");
      }
      await client.query("BEGIN");
      await client.query("SET LOCAL synchronous_commit=on; SET LOCAL statement_timeout='500ms'; SET LOCAL lock_timeout='100ms'; SET LOCAL search_path=pg_catalog");
      if(nativeProof) {
        const proof=await client.query(POSTGRES_COMPATIBILITY_SQL,[STEP_BODY_SHA256]);
        demand(proof.rowCount===1 && Object.keys(proof.rows[0]??{}).join(',')==='compatible' && proof.rows[0].compatible===true,"upstream_unavailable");
      }
      const value = await client.query<{ reply: Reply }>("SELECT scout_mint.step($1::jsonb) AS reply", [json]);
      demand(value.rowCount === 1 && value.rows[0]?.reply);
      await client.query("COMMIT"); committed = true;
      return value.rows[0].reply;
    } catch { throw new BoundaryError("upstream_unavailable"); }
    finally {
      // Destroy on any uncertain transaction; never release a live/aborted transaction for reuse.
      client?.release(!committed);
    }
  } });
}
export function nativePostgresStore(handle: DatabaseHandle): AtomicMintStore {
  const pool = new Pool(databaseParameters(handle));
  pool.on("error", () => { /* No credential/SQL/error-message logging. Next command still requires DB proof. */ });
  const store = postgresStore(pool,{host:handle.host});
  return Object.freeze({ transact: command => deadline(store.transact(command), 2000, "upstream_unavailable") });
}
