// Narrow successor allowance; original #286 guard/review stays byte-identical and replays separately.
import fs from 'node:fs';import path from 'node:path';import {createHash} from 'node:crypto';import {execFileSync} from 'node:child_process';import assert from 'node:assert/strict';
export const INPUT='55a15a939d31ea9f7b79a289f930d9e2d8026d30';
export const sha=b=>createHash('sha256').update(b).digest('hex');
export function review(root=process.cwd()){
 const raw=(...a)=>execFileSync('git',a,{cwd:root,maxBuffer:64*1024*1024}),git=(...a)=>raw(...a).toString().trim();
 const m=JSON.parse(fs.readFileSync(path.join(root,'tests/native-postgres/validation.json')));assert.equal(m.input,INPUT);assert.equal(git('rev-parse',INPUT+'^{tree}'),'218f5c1f7e9243176fccafe137bd7c6369e5c251');git('merge-base','--is-ancestor',INPUT,'HEAD');
 const delta=git('diff','--name-only','--no-renames',INPUT).split('\n').filter(Boolean),extra=git('ls-files','--others','--exclude-standard').split('\n').filter(Boolean);assert.deepEqual([...new Set([...delta,...extra])].sort(),Object.keys(m.files).sort());
 const base=new Map(git('ls-tree','-r',INPUT).split('\n').map(line=>{const[meta,f]=line.split('\t');return[f,meta.split(' ')];}));
 for(const[f,[mode,,id]]of base){const file=path.join(root,f),s=fs.lstatSync(file);assert.ok(s.isFile()&&!s.isSymbolicLink(),f);assert.equal(s.mode&0o111?'100755':'100644',mode,f);if(!m.files[f]){const b=fs.readFileSync(file);assert.equal(createHash('sha1').update('blob '+b.length+'\0').update(b).digest('hex'),id,f+' immutable286');}}
 for(const[f,pin]of Object.entries(m.files)){const file=path.join(root,f),s=fs.lstatSync(file);assert.ok(s.isFile()&&!s.isSymbolicLink(),f);assert.equal(s.mode&0o111?'100755':'100644',pin.mode,f);if(pin.sha256)assert.equal(sha(fs.readFileSync(file)),pin.sha256,f);}
 assert.deepEqual(Object.entries(m.files).filter(([,v])=>!v.sha256).map(([f])=>f).sort(),['tests/native-postgres/validation-review.mjs','tests/native-postgres/validation.json','tests/native-postgres/validation.test.mjs']);
 const schema='lib/native-pilot/postgres/schema.sql',oldSchema=raw('show',INPUT+':'+schema).toString();
 assert.equal(fs.readFileSync(path.join(root,schema),'utf8'),oldSchema.replace('GRANT unfarmd_native_owner TO CURRENT_USER WITH ADMIN TRUE, INHERIT FALSE, SET TRUE;','GRANT unfarmd_native_owner TO CURRENT_USER WITH INHERIT FALSE, SET TRUE;'),'ONLY reproduced ADMIN self-grant correction');
 const oldPins=JSON.parse(raw('show',INPUT+':lib/native-pilot/postgres/pins.json'));const newPins=JSON.parse(fs.readFileSync(path.join(root,'lib/native-pilot/postgres/pins.json')));assert.deepEqual(newPins.functions,oldPins.functions,'all source bodies remain exact');
 const old=JSON.parse(raw('show',INPUT+':vercel.json'));old.git.deploymentEnabled['feat/286-pg18-validation']=false;assert.deepEqual(JSON.parse(fs.readFileSync(path.join(root,'vercel.json'))),old);
 if(git('rev-parse','HEAD')!==INPUT){assert.equal(git('show','-s','--format=%P','HEAD'),INPUT,'single dependent validation commit');for(const line of git('ls-tree','-r','HEAD').split('\n')){const[meta,f]=line.split('\t'),[mode,,id]=meta.split(' '),b=fs.readFileSync(path.join(root,f));assert.equal(createHash('sha1').update('blob '+b.length+'\0').update(b).digest('hex'),id,f+' committed bytes');assert.equal(fs.statSync(path.join(root,f)).mode&0o111?'100755':'100644',mode,f);}}
 return m;
}
