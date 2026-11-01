import type {PublicTrust,Denied,Verified} from './protocol.mjs';
import type {IssuerPort,ConsumerPort} from './local-ledger.mjs';
export type SimulatedProvider=Readonly<{mode:'synthetic-only';read(fingerprint:string):Promise<string>;complete(fingerprint:string,body:string,stamp:unknown):Promise<string>}>;
export type SimulatedValidatorCredential=Readonly<{mode:'synthetic-only';approve(body:string):Promise<unknown>}>;
export declare function independentValidator(options:Readonly<{context:PublicTrust;provider:SimulatedProvider;credential:SimulatedValidatorCredential;ledger:IssuerPort;clock:()=>number;timeoutMs?:number}>):Readonly<{approve(input:Readonly<{request:string;ownerStamp:unknown;fingerprint:string}>):Promise<Denied|Readonly<{status:'approved_simulation_only';activate:false;sourceCalls:false;envelope:string}>>}>;
export declare function researchConsumer(options:Readonly<{context:PublicTrust;ledger:ConsumerPort;clock:()=>number}>):Readonly<{verify(envelope:string):Denied|Verified;reserve(envelope:string,mint:string,operationId:string):ReturnType<ConsumerPort['reserve']>;stop():ReturnType<ConsumerPort['stop']>}>;
