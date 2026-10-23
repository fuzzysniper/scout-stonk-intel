// B binding to A #172 a860f725, wire v2. Existing one-shot ABI is unchanged.
import type {Creation} from '../../experiments/live-stream/creation';
import type {Health} from '../../experiments/live-stream/ports';
export type Limits={credits:number;bytes:number;frames:number;rpc:number;connections:number;children:number;auditRecords:number};
export type Grant={version:'unfarmd-continuous/1';parent:string;head:string;service:string;
  policyHash:string;sourcePolicyHash:string;startsAt:string;endsAt:string;resetAt:string;
  allowanceCredits:number;otherReserveCredits:number;incidentReserveCredits:number;
  limits:Limits;connectionCredits:number;rpcCredits:number;
  rightsHash:string;accountHash:string;retentionHash:string;notificationHash:string;mobileHash:string;
  sourceGo:boolean;hostingGo:boolean;rightsGo:boolean;spendGo:boolean;retentionGo:boolean;notificationGo:boolean;mobileGo:boolean};
export type Usage={credits:number;bytes:number;frames:number;rpc:number;connections:number;children:number;auditRecords:number;
  framesReceived:number;bytesReceived:number};
export type Assurance={meterAt:string;meterBalance:number;meterAttributed:true;meterMismatch:false;
  hardCapUntil:string;purgeThrough:string;purgeHealthy:true;backupsExcluded:true;
  notificationAt:string;notificationHealthy:true;independentWatchdog:true;legacyRetired:true};
export type Child={id:string;startsAt:string;endsAt:string};
export type Base={v:2;parent:string;head:string;scope:string;grantHash:string;worker:string};
export type Command=Base&({op:'claim'}|{fence:string}&(
  {op:'beginChild';child:string;endsAt:string}|
  {op:'reserve';child:string;resource:'connection'|'rpc'}|
  {op:'append';child:string;record:Creation}|
  {op:'heartbeat';child:string|null;health:Health}|
  {op:'gap';child:string|null;phase:'begin'|'end';reason:string;observedAt:string;lastPersistedAt:string|null}|
  {op:'closeChild';child:string;connectionClosed:true}|
  {op:'connectionClosed';child:string;connectionClosed:true}|
  {op:'stop';reason:string}|
  {op:'notify';reason:string}|
  {op:'release';connectionClosed:true}));
export type Reply={v:2;ok:boolean;reason:string|null;parent:string;head:string;scope:string;grantHash:string;
  worker:string|null;fence:string|null;stopped:boolean;connected:boolean;serverTime:string;leaseUntil:string|null;
  parentEndsAt:string;child:Child|null;usage:Usage;assurance:Assurance;
  ticket?:number;disposition?:'inserted'|'duplicate'|'promoted';firstReceivedAt?:string;firstNotificationHash?:string};
export type Port={version:'unfarmd-continuous/1';transact:(command:Command,options:{signal:AbortSignal})=>Promise<Reply>;close:()=>Promise<void>};
