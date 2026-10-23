import {main,shutdownRequested} from './entry.mjs';
const idle=()=>{if(process.env.RENDER==='true'&&!shutdownRequested)setInterval(()=>{},60000);};
main().then(result=>{console.log(JSON.stringify(result));idle();}).catch(()=>{
  console.log(JSON.stringify({state:'BLOCKED',sourceConnected:null,reason:'CONTINUOUS_PREREQUISITE_OR_RUNTIME_FAILURE'}));process.exitCode=1;idle();
});
