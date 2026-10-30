/** Type only; the actual source-pinned native client owns its unforgeable proof WeakSet. */
export function strictBindingEstablished(client:unknown):boolean;
import type {ClientConfig,Client} from 'pg';
export class StrictJournalClient extends Client{constructor(config?:ClientConfig);}
export function pinnedNeonConfiguration(dsn:string,ca:string):ClientConfig;
