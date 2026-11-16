// Sole live-inspection entry. Only two existing approved bindings; no archive or CLI.
// Do not invoke without a distinct owner-authorized manual workflow and environment review.
import {inspectionContext,readManifest} from './inspection-context.mjs';
import {runReadOnlyInspection} from './inspect-only.mjs';
import {reportFailure} from './diagnostics.mjs';
try{
 const ctx=inspectionContext(process.env),manifest=readManifest(ctx,process.env.INSPECTION_MANIFEST,Date.now());
 const result=await runReadOnlyInspection(ctx,manifest,process.env.NATIVE_ADMISSION_READ_TOKEN,process.env.VERCEL_TOKEN);
 console.log('```json\n'+JSON.stringify(result,null,2)+'\n```');
 if(!result.checksPassed)process.exitCode=1;
}catch(e){console.log('```json\n'+JSON.stringify({version:'native-preview-inspection-result/3',decision:'HOLD_NO_DEPLOYMENT_AUTHORITY',checksPassed:false,cliState:'not_started',failure:reportFailure(e,'not_started'),sourceGo:false,activate:false})+'\n```');process.exitCode=1;}
