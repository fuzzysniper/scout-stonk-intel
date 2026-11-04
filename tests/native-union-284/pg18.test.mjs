// B-owned approved native-only disposable context; required C integration cases.
import {requireLocalPg18Approval} from '../native-postgres/pg18-approval.mjs';requireLocalPg18Approval();
await import('../native-postgres/namespace-only.mjs');
const {default:test}=await import('node:test');
const {createNativePgContext}=await import('./pg18-context.mjs');
const {registerNativeUnionPg18}=await import('./pg18-cases.mjs');
let context;
test.before(async()=>{context=await createNativePgContext();});
test.after(async()=>{await context?.close();});
await registerNativeUnionPg18({scenario:overrides=>context.scenario(overrides)});
