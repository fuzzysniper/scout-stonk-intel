// BOUNDED SYNTHETIC ARCHIVES ONLY. Real resolved tar API, no source/network/SQL.
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import assert from 'node:assert/strict';import {gzipSync} from 'node:zlib';import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),tar=require(path.dirname(process.argv[2])),dir=fs.mkdtempSync(path.join(os.tmpdir(),'SYNTHETIC-tar-security-'));
function header(name,size,type='0'){
 const b=Buffer.alloc(512);b.write(name,0,100);b.write('0000644\0',100);b.write('0000000\0',108);b.write('0000000\0',116);b.write(size.toString(8).padStart(11,'0')+'\0',124);b.write('00000000000\0',136);b.fill(32,148,156);b.write(type,156);b.write('ustar\0',257);b.write('00',263);
 let sum=0;for(const n of b)sum+=n;b.write(sum.toString(8).padStart(6,'0')+'\0 ',148);return b;
}
const padded=b=>Buffer.concat([b,Buffer.alloc((512-b.length%512)%512)]);
try{
 const input=path.join(dir,'input'),output=path.join(dir,'output');fs.mkdirSync(input);fs.mkdirSync(output);fs.writeFileSync(path.join(input,'SYNTHETIC.txt'),'SYNTHETIC bounded compatibility\n');
 const file=path.join(dir,'SYNTHETIC-good.tgz');await tar.c({file,cwd:input,gzip:true},['SYNTHETIC.txt']);await tar.x({file,cwd:output,strict:true});assert.equal(fs.readFileSync(path.join(output,'SYNTHETIC.txt'),'utf8'),'SYNTHETIC bounded compatibility\n');
 // 128KiB total payload; never a disk-filling bomb. Positive control parses the
 // EXACT same valid bytes, then the patched configurable ratio guard rejects.
 const ratio=path.join(dir,'SYNTHETIC-ratio.tgz'),payload=Buffer.alloc(128*1024);
 fs.writeFileSync(ratio,gzipSync(Buffer.concat([header('SYNTHETIC-zero',payload.length),payload,Buffer.alloc(1024)])));
 let entries=0;await tar.t({file:ratio,maxDecompressionRatio:100000,onReadEntry:()=>entries++});assert.equal(entries,1);
 await assert.rejects(()=>tar.t({file:ratio,maxDecompressionRatio:4}),/decompression ratio/i);
 // GNU long-name ~24KiB, well below metadata limits. Original advisory crashed
 // member-selection consumers before maxDepth. No selected entry is extracted.
 const name='SYNTHETIC/'+('a/'.repeat(12000))+'end',long=Buffer.from(name+'\0');
 const deep=path.join(dir,'SYNTHETIC-long-member.tgz');
 fs.writeFileSync(deep,gzipSync(Buffer.concat([header('././@LongLink',long.length,'L'),padded(long),header('SYNTHETIC-short',1),padded(Buffer.from('x')),Buffer.alloc(1024)])));
 let names=[];await tar.t({file:deep,maxDecompressionRatio:100000,onReadEntry:e=>names.push(e.path)});assert.deepEqual(names,[name]);
 names=[];await tar.t({file:deep,maxDecompressionRatio:100000,onReadEntry:e=>names.push(e.path)},['SYNTHETIC-unmatched']);assert.deepEqual(names,[]);
 console.log(JSON.stringify({kind:'CREDENTIAL_FREE_REAL_TAR_SYNTHETIC_ARCHIVES',version:require(process.argv[2]).version,roundTrip:true,boundedRatioControl:true,boundedRatioRejected:true,longPathControl:true,memberSelectionCompleted:true,networkRequests:0,sourceGo:false,activate:false}));
}finally{fs.rmSync(dir,{recursive:true,force:true});}
