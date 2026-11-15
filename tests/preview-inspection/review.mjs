// Finite descendant of the recovered correction. No application/security guard exceptions.
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import {execFileSync} from 'node:child_process';import {createHash} from 'node:crypto';
export const BASE='653f3dd4a636a2781b50d3c2891d71a84a7289e7';
export const PARENT='27bf59b6ace8f24bf113564b5aa0eb0558110fc4';
export const COMMIT_PARENT='987af49c1ba266b2e1515cce65b3175fd757bb60';
export const hash=b=>createHash('sha256').update(b).digest('hex');
const blob=b=>createHash('sha1').update('blob '+b.length+'\0').update(b).digest('hex');
const prerequisites=`      - name: Pinned replay prerequisites; no credentials or install scripts
        run: |
          npm install --global npm@11.9.0 --ignore-scripts --no-audit --no-fund
          test "$(npm --version)" = '11.9.0'
          npm ci --prefix ops/native-beta-output/toolchain --ignore-scripts --no-audit --no-fund
          node --input-type=module -e "import {tools} from './ops/native-beta-output/build.mjs'; tools('ops/native-beta-output/toolchain');"
`;
const npmCheck=`          test "$(npm --version)" = '11.9.0'\n`;
const toolsCheck=`          node --input-type=module -e "import {tools} from './ops/native-beta-output/build.mjs'; tools('ops/native-beta-output/toolchain');"\n`;
export function review(root=process.cwd(),committed=true){
 const raw=(...a)=>execFileSync('git',a,{cwd:root,maxBuffer:64*1024*1024}),git=(...a)=>raw(...a).toString().trim(),read=p=>fs.readFileSync(path.join(root,p));
 assert.equal(git('rev-parse',BASE+'^{tree}'),'669e56967320d47822f1ae20aaabe3305496ecfb');
 const manifest=JSON.parse(read('tests/preview-inspection/review.json'));assert.equal(manifest.base,BASE);
 for(const line of git('ls-tree','-r',BASE).split('\n')){
  const [a,p]=line.split('\t'),[mode,,id]=a.split(' '),s=fs.lstatSync(path.join(root,p));assert.ok(s.isFile()&&!s.isSymbolicLink(),p);assert.equal(s.mode&0o111?'100755':'100644',mode,p);
  if(!Object.hasOwn(manifest.modified,p))assert.equal(blob(read(p)),id,p+' unchanged original/correction');
 }
 for(const [p,x]of Object.entries({...manifest.modified,...manifest.added})){
  const s=fs.lstatSync(path.join(root,p));assert.ok(s.isFile()&&!s.isSymbolicLink(),p);assert.equal(s.mode&0o111?'100755':'100644',x.mode,p);if(x.sha256)assert.equal(hash(read(p)),x.sha256,p);
 }
 const changed=[...new Set([...git('diff','--name-only','--no-renames',BASE).split('\n'),...git('ls-files','--others','--exclude-standard').split('\n')].filter(Boolean))].sort();assert.deepEqual(changed,[...Object.keys(manifest.modified),...Object.keys(manifest.added)].sort());
 assert.deepEqual(Object.entries(manifest.added).filter(([,x])=>x.sha256===null).map(([p])=>p).sort(),['tests/preview-inspection/review.json','tests/preview-inspection/review.mjs','tests/preview-inspection/scope.test.mjs']);
 // Only this topic gets an additional false flag; all existing deployment settings stay exact.
 const before=JSON.parse(raw('show',BASE+':vercel.json')),after=JSON.parse(read('vercel.json'));assert.equal(after.git.deploymentEnabled['fix/294-release-ci-prerequisites'],false);delete after.git.deploymentEnabled['fix/294-release-ci-prerequisites'];assert.equal(after.git.deploymentEnabled['ops/293-get-only-inspection'],false);delete after.git.deploymentEnabled['ops/293-get-only-inspection'];assert.deepEqual(after,before);
 // Legacy four jobs/steps remain identical except isolating the new mode from publisher jobs.
 const oldWorkflow=raw('show',BASE+':.github/workflows/native-pilot-admission.yml').toString();
 const now=read('.github/workflows/native-pilot-admission.yml').toString().split('\n  inspection-context:')[0].replaceAll(", preview-inspect]","]").replaceAll(" && inputs.mode != 'preview-inspect'",'');assert.equal(now,oldWorkflow);
 const release=read('.github/workflows/native-beta-release.yml').toString();assert.equal(release.split(prerequisites).length-1,7);assert.equal(release.split(" || github.head_ref == 'fix/294-release-ci-prerequisites'").length-1,7);
 const ci=release.replace('          bash tests/native-union-284/pg18-isolated.sh clock-diagnose\n','').replace('            node_modules/.cache/native-union-pg18-results/\n            node_modules/.cache/native-clock-diagnosis/\n','').replaceAll(prerequisites,'').replaceAll(" || github.head_ref == 'fix/294-release-ci-prerequisites'",'').replaceAll('tests/preview-inspection/scope.test.mjs','tests/preview-preflight-diagnostics/scope.test.mjs');assert.equal(ci,raw('show',BASE+':.github/workflows/native-beta-release.yml').toString());
 const oldIf="if: github.head_ref == 'ops/293-get-only-inspection' && github.event.pull_request.head.repo.full_name == github.repository",newIf="if: (github.head_ref == 'ops/293-get-only-inspection' || github.head_ref == 'fix/294-release-ci-prerequisites' || github.head_ref == 'native-pilot/private-beta-rc') && github.event.pull_request.head.repo.full_name == github.repository";
 const focused=read('.github/workflows/preview-preflight-diagnostics.yml').toString().replace(newIf,oldIf).replace(npmCheck,'').replace(toolsCheck,'').replace('npm ci --prefix ops/native-beta-output/toolchain --ignore-scripts --no-audit --no-fund','npm ci --prefix ops/native-beta-output/toolchain --ignore-scripts');assert.equal(focused,raw('show',PARENT+':.github/workflows/preview-preflight-diagnostics.yml').toString());
 for(const p of ['verify.mjs','preflight.mjs'])assert.equal(read('ops/native-beta-output/'+p).toString().replace("from './identity.mjs'","from './output.mjs'"),raw('show',BASE+':ops/native-beta-output/'+p).toString());
 const output=read('ops/native-beta-output/output.mjs').toString(),oldOutput=raw('show',BASE+':ops/native-beta-output/output.mjs').toString();assert.equal(output.slice(output.indexOf('export function safeName')),oldOutput.slice(oldOutput.indexOf('export function safeName')),'all archive implementation unchanged');
 assert.equal(hash(read('ops/native-beta-output/review/correction.patch')),'daa68a7e448f2cc43a28f40053fb3655ca734b926b53fdb58311b6592d400c2b');
 if(committed){assert.equal(git('show','-s','--format=%P','HEAD'),COMMIT_PARENT);assert.equal(git('status','--porcelain','--untracked-files=normal'),'');}
 return manifest;
}
