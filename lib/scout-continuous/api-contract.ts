import type {LiveFeed} from '../live-ledger/contract';
import type {Child,Limits,Usage} from './contract';
/** Original external evidence clocks. False/null never becomes an assurance of readiness. */
export type ObservedAssurance=Readonly<{
 meterAt:string|null;meterBalance:number|null;meterAttributed:boolean;meterMismatch:boolean;
 hardCapUntil:string|null;purgeThrough:string|null;purgeHealthy:boolean;backupsExcluded:boolean;
 notificationAt:string|null;notificationHealthy:boolean;independentWatchdog:boolean;legacyRetired:boolean;
}>;
export type ContinuousFeed=Readonly<{
 version:'unfarmd-continuous-feed/1';status:'disabled'|'unavailable'|LiveFeed['status'];observedAt:string;
 parent:null|{
  id:string;grantHash:string;head:string;endsAt:string;stopped:boolean;reason:string|null;
  /** Durable connection reservation; not independent proof that a native socket is open. */
  connected:boolean;leaseUntil:string|null;child:Child|null;usage:Usage;limits:Limits;
  assurance:ObservedAssurance;gate:string|null;
  maintenance:{deleteThrough:string|null;physicalThrough:string|null;watchdogAt:string|null;noticeAttempts:number;pending:number;uncertain:number};
  retention:{normalizedSeconds:3600;normalizedMax:200;firstSeenUntil:string;physicalDeletionProvenBySQL:false};
 };feed:LiveFeed|null;
}>;
export type ParentStop=Readonly<{
 version:'unfarmd-continuous-stop/1';parent:string;grantHash:string;status:'stopped';observedAt:string;
 /** Exact fenced worker acknowledged close/release. Verify actual suspension independently. */
 closureAcknowledged:boolean;
}>;
