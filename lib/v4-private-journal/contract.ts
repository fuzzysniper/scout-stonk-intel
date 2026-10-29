import type {ThesisChange,ThesisEvent} from '../unfarmd-intelligence/thesis';
export type AppendCommand=Readonly<{journalId:string;mint:string;requestId:string;expectedHead:string|null;change:ThesisChange}>;
export type JournalReceipt=Readonly<{journalId:string;revision:number;storageHead:string;eventHash:string;recordedAt:string}>;
export type JournalRead=Readonly<{version:'unfarmd-private-journal/1';events:readonly ThesisEvent[];receipt:JournalReceipt;
  authentication:'verified_owner_session';integrity:'database_chain_not_independent_backup_attestation';factReferences:'references_only_not_verified_evidence'}>;
export type AppendResult=Readonly<{state:'appended'|'access_revoked_erasure_queued';replayed:boolean;receipt:JournalReceipt}>;
export type ErrorCode='unauthenticated'|'invalid_request'|'not_available'|'conflict'|'limit'|'integrity'|'unavailable';
export class JournalError extends Error{constructor(readonly code:ErrorCode){super('private_journal_'+code);this.name='JournalError';}}
export const JOURNAL_LIMITS=Object.freeze({maxJournalsPerOwner:32,maxLifetimeEventsPerOwner:2048,maxEvents:64,
  maxPayloadBytes:32768,maxStoredBytes:524288,retentionDays:30,erasureDelayHours:24,maxReadRows:64,maxList:20} as const);
