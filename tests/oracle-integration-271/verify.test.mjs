import {test} from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';

const C='e40f0b74384c27cb7770ec2d52d937c22804e35f';
const B='ace0e291ae9fd3f61b28ceebbd48fdfd6b73e43b';
const A='8ed3e9f71209cd1f075fee1afa745efc56d02bf3';
const branch='integration/271-oracle-native-source-reviewed';
const git=(...args)=>execFileSync('git',args,{encoding:'utf8'}).trim();
const from=(ref,path)=>execFileSync('git',['show',ref+':'+path],{encoding:'utf8'});
const bpaths=[
 '.github/workflows/oracle-source-install-266.yml',
 'docs/v4/source-install-266.md',
 'lib/v4-owner-preview/sql-pins.ts',
 'ops/v4-owner-auth/source-admission.sql',
 'tests/oracle-source-install-266/fixture.mjs',
 'tests/oracle-source-install-266/install.test.mjs',
 'tests/oracle-source-install-266/replay.sh',
 'tests/oracle-source-install-266/run.sh',
 'tests/oracle-source-install-266/scope.test.mjs',
];
const rights='docs/v4/helius-session-266.md',sourceGate='lib/v4-ca-intelligence/private-development-gate.ts',nativeGate='lib/v4-oracle/mount/admission.ts';
test('integration preserves all three exact original merge parents and bounded full-tree delta',()=>{
 const parents=git('show','-s','--format=%P', 'e2bdd08fd9e4b1b8606498f0f7d7969ef22c84d4').split(' ');
 assert.deepEqual(parents,[C,B,A]);
 const actual=git('diff','--name-only',C,'HEAD').split('\n').sort();
 const expected=[...bpaths,rights,sourceGate,nativeGate,'tests/oracle-integration-271/verify.test.mjs','.github/workflows/oracle-integration-271.yml'].sort();
 assert.deepEqual(actual,expected);
});
test('B SQL + body hash + tests and A provider rights are byte-identical to original signed reviews',()=>{
 for(const path of bpaths)assert.equal(readFileSync(path,'utf8'),from(B,path),path);
 assert.equal(readFileSync(rights,'utf8'),from(A,rights));
});
test('both exact Preview source admission gates change ONLY their pinned branch',()=>{
 const beforeSource=from(C,sourceGate),afterSource=readFileSync(sourceGate,'utf8');
 assert.equal(afterSource,beforeSource.replace("const BRANCH='feat/266-native-oracle-mount';","const BRANCH='"+branch+"';"));
 const beforeNative=from(C,nativeGate),afterNative=readFileSync(nativeGate,'utf8');
 assert.equal(afterNative,beforeNative.replace("export const NATIVE_BRANCH='feat/266-native-oracle-mount';","export const NATIVE_BRANCH='"+branch+"';"));
 for(const proof of ["process.env.VERCEL_ENV==='preview'","process.env.VERCEL_PROJECT_ID===PROJECT","process.env.VERCEL_GIT_COMMIT_REF===BRANCH","!(process.env.UNFARMD_OWNER_RELEASE||'').trim()"])assert.ok(afterSource.includes(proof));
 assert.ok(afterNative.includes('OwnerReleaseAuthority')&&afterNative.includes('SourcePolicyAuthority'));
});
