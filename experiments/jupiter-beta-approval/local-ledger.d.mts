import type {PrototypeRecord,Denied,Verified} from './protocol.mjs';
export type OffResult<S extends string>=Readonly<{status:S;activate:false;sourceCalls:false}>;
export type IssuerPort=Readonly<{
 prepare(record:PrototypeRecord,requestHash:string,now:number):Denied|OffResult<'prepared_simulation_only'>;
 publish(id:string,envelopeHash:string,now:number):Denied|OffResult<'published_simulation_only'>;
 uncertain(id:string):OffResult<'uncertain'>;
}>;
export type ConsumerPort=Readonly<{
 check(value:Verified|Denied,now:number):Denied|OffResult<'current_simulation_only'>;
 reserve(value:Verified|Denied,mint:string,operationId:string,now:number):Denied|Readonly<{status:'reserved_simulation_only';activate:false;sourceCalls:false;uses:number}>;
 stop():OffResult<'stopped'>;
}>;
export declare function localLedger():Readonly<{issuer:IssuerPort;consumer:ConsumerPort;admin:Readonly<{revoke(id:string):Denied|OffResult<'revoked'>;revokeKey(keyId:string,epoch:number):OffResult<'revoked'>}>;inspect():Readonly<{mode:'synthetic-only';durable:false;stopped:boolean;history:readonly Readonly<{seq:number;kind:string;id:string}>[];grants:readonly Readonly<{id:string;state:string;uses:number;maxUses:number;perMint:Readonly<Record<string,number>>}>[]}>}>;
