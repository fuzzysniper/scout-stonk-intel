// Offline file inspection only. No network, source discovery, persistence or rights override.
import {lstatSync,readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import path from 'node:path';
try {
 const file=process.argv[2];
 if(!file||process.argv.length!==3||!process.env.CARDS_RESEARCH_BUILD)throw Error('invalid_input');
 const stat=lstatSync(file);if(!stat.isFile()||stat.size>12*1024*1024)throw Error('invalid_input');
 const input=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(readFileSync(file)));
 const {runPipeline,publicPipelineReport}=createRequire(import.meta.url)(path.join(process.env.CARDS_RESEARCH_BUILD,'app/consumer/cards/pipeline.js'));
 process.stdout.write(JSON.stringify(publicPipelineReport(runPipeline(input)),null,2)+'\n');
} catch {
 process.stderr.write('CARDS research inspection failed: invalid, oversized or unsupported local evidence. No raw data emitted.\n');
 process.exitCode=1;
}
