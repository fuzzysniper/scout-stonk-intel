import 'server-only';
import { createCaLookup } from './index';
import { prepareLookup,type Ports } from './engine';
import { localBinding,type Wire } from './wire';
/** Fixture harness only; source is always disconnected in any other runtime. */
export function createLocalCaLookup(policy:unknown,ports:Ports,wire:Wire,deadlineMs?:number){
 if(process.env.NODE_ENV!=='test')return createCaLookup();
 const lookup=prepareLookup(policy,ports,localBinding(wire),deadlineMs);
 return {lookup:(request:Request,mint:unknown)=>process.env.NODE_ENV==='test'?lookup.lookup(request,mint):createCaLookup().lookup(request,mint)};
}
