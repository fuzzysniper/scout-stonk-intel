import type {PublicTrust,Identity,Held} from './contract.mjs';
export type Reserved=Readonly<{status:'reservation_source_off';stopped:false;activate:false;sourceCalls:false;receipt:Readonly<{seq:string;head:string}>}>;
export declare function researchBoundary(options:Readonly<{publicTrust:PublicTrust;nativeIdentity:()=>Identity;clock:()=>number;authority:(path:'/reserve',body:unknown)=>Promise<Reserved|Held>;consumerAuth:Readonly<{stamp(body:unknown):unknown}>}>):Readonly<{reserve(envelope:string,mint:string):Promise<Reserved|Held>}>;
