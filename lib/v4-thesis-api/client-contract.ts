import type {JournalReceipt} from '../v4-private-journal/contract';
export type JournalCapability=Readonly<{kind:'off'}>|Readonly<{kind:'verified_owner';expiresAtMs:number;csrfToken:string}>;
export const JOURNAL_OFF:JournalCapability=Object.freeze({kind:'off'});
export type ThesisRevision=Readonly<{sequence:number;kind:string;thesis:string|null;invalidation:string|null;recordedAt:string;hash:string;supersedes:string|null}>;
export type ThesisHistory=Readonly<{journalId:string;mint:string;receipt:JournalReceipt;entries:readonly ThesisRevision[]}>;
