// Server-only worker entry: only the isolated worker DSN; never reads mint-proof credentials.
import { nativeStore, LedgerError } from '../live-ledger/database.mjs';
export function createWorkerStore() {
  const env=process.env;
  if(env.SCOUT_LIVE_STORE_ENABLED!=='true')throw new LedgerError('store_disabled');
  if(env.RENDER!=='true'||!/^srv-[a-z0-9]+$/.test(env.SCOUT_LIVE_RENDER_SERVICE_ID??'')||env.RENDER_SERVICE_ID!==env.SCOUT_LIVE_RENDER_SERVICE_ID||!/^[a-f0-9]{40}$/.test(env.RENDER_GIT_COMMIT??''))throw new LedgerError('invalid_runtime');
  const store=nativeStore('worker',env);
  return Object.freeze({
    transact(command,options){if(command?.head!==env.RENDER_GIT_COMMIT)throw new LedgerError('invalid_runtime');return store.transact(command,options);},
    close:()=>store.close(),
  });
}
