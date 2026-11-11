import {test} from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {execFileSync} from 'node:child_process';
import {assertV4} from '../v4-integration/assertions.mjs';
const base='5c6e36fef0fc15acb07c954566a3975cb77fc102';
test('all existing files except exact lens-only chrome conditional unchanged',()=>{assertV4();const old=execFileSync('git',['show',base+':app/site-chrome.tsx'],{encoding:'utf8'});assert.equal(readFileSync('app/site-chrome.tsx','utf8'),old.replace("pathname==='/' ||","pathname==='/' || pathname==='/lens' ||"));});
test('client has no network, persistence, credential, telemetry or runtime sample switch',()=>{for(const p of ['app/lens/view.tsx','app/lens/cards.tsx'])assert.doesNotMatch(readFileSync(p,'utf8'),/\b(fetch|WebSocket|XMLHttpRequest|localStorage|sessionStorage|indexedDB|process|SAMPLE|sample|fixture)\b|document\.cookie|dangerouslySetInnerHTML/);});
