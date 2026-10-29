import 'server-only';
/** Installed production entry: deliberately no auth, key, environment or database imports. */
export const PRIVATE_JOURNAL_APPROVAL=Object.freeze({enabled:false,notBeforeMs:null,expiresAtMs:null} as const);
export function privateJournalStorage(){return Object.freeze({status:'disabled',saved:false} as const);}
