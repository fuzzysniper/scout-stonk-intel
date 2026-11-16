// Credential-free test input only. Never imported by any operational code.
import fs from 'node:fs';import path from 'node:path';import {execFileSync} from 'node:child_process';import {createHash} from 'node:crypto';import {fileURLToPath} from 'node:url';import {BASE} from './inputs.mjs';
const digest='d7fb93de8f1b3a8bf77980fc68d775e2dfbbe82be3c50264bff078b643a06a5d';
const bytes=p=>execFileSync('git',['show',BASE+':ops/native-beta-output/toolchain/'+p]);
export function historicalTools(){const root=path.resolve('node_modules/.cache/UNION_HISTORICAL_C4');for(const p of ['package.json','package-lock.json'])if(!fs.readFileSync(root+'/'+p).equals(bytes(p)))throw Error('HISTORICAL_GRAPH_HOLD');if(fs.readFileSync(root+'/INSTALL_FINISHED','utf8')!==digest)throw Error('HISTORICAL_GRAPH_HOLD');return root+'/node_modules';}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 for(const p of ['VERCEL_TOKEN','NATIVE_ADMISSION_READ_TOKEN','UNFARMD_NATIVE_BUILD_ARCHIVE_KEY','UNFARMD_NATIVE_PREVIEW_DEPLOY_TOKEN','DATABASE_URL'])if(process.env[p])throw Error('NO_OPERATIONAL_CREDENTIALS');
 if(createHash('sha256').update(bytes('package-lock.json')).digest('hex')!==digest)throw Error('HISTORICAL_GRAPH_HOLD');
 const root=path.resolve('node_modules/.cache/UNION_HISTORICAL_C4');fs.mkdirSync(root,{recursive:true});for(const p of ['package.json','package-lock.json']){if(fs.existsSync(root+'/'+p)){if(!fs.readFileSync(root+'/'+p).equals(bytes(p)))throw Error('HISTORICAL_GRAPH_HOLD');}else fs.writeFileSync(root+'/'+p,bytes(p),{flag:'wx'});}
 if(!fs.existsSync(root+'/INSTALL_FINISHED')){execFileSync('npm',['ci','--prefix',root,'--ignore-scripts','--no-audit','--no-fund'],{stdio:'inherit'});fs.writeFileSync(root+'/INSTALL_FINISHED',digest,{flag:'wx'});}historicalTools();console.log('HISTORICAL_C4_TEST_ONLY_GRAPH_READY');
}
