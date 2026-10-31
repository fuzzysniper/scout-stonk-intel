#!/usr/bin/env bash
# Preserve frozen264 QA; current harness adds explicit fixture roots, diagnostic copy and settled-focus readiness.
set -euo pipefail
cd "$(dirname "$0")/../.."
node --test tests/oracle-regression-265/scope.test.mjs
regression265_backup=$(mktemp /tmp/oracle265-browser-original-XXXXXX)
cp tests/oracle-v5/browser.spec.mjs "$regression265_backup"
regression265_runner_backup=$(mktemp /tmp/oracle265-runner-original-XXXXXX)
cp tests/oracle-v5/run.sh "$regression265_runner_backup"
cleanup265_browser(){
 cat "$regression265_backup" > tests/oracle-v5/browser.spec.mjs
 cat "$regression265_runner_backup" > tests/oracle-v5/run.sh
 rm -f "$regression265_backup" "$regression265_runner_backup"
 git restore -- docs/oracle-v5/screenshots
}
trap cleanup265_browser EXIT
node --input-type=module <<'JS'
import fs from 'node:fs';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
const file='tests/oracle-v5/browser.spec.mjs',text=fs.readFileSync(file,'utf8');
assert.equal(createHash('sha256').update(text).digest('hex'),'9e5ba5e5149d44ca6f1f1253a757fee079f3576f0353a8f6d6d2fe3db15b4bf5');
const before="await expect(page.getByRole('alert')).toContainText('No facts are substituted');";
const after="await expect(page.getByRole('alert')).toContainText(mode==='malformed'?'INVALID_RESPONSE':'HTTP 502');await expect(page.getByRole('alert')).toContainText(/No (?:live )?facts (?:displayed|were (?:returned|substituted))/);";
assert.equal(text.split(before).length,2,'exactly one obsolete diagnostic-copy assertion');
const focusBefore="await expect(p.getByRole('heading',{name:'UNFARMD ORACLE',exact:true})).toBeVisible();}";
const focusAfter="await expect(p.getByRole('heading',{name:'UNFARMD ORACLE',exact:true})).toBeVisible();await expect(p.getByRole('heading',{name:'UNFARMD ORACLE',exact:true})).toBeFocused();}";
assert.equal(text.split(focusBefore).length,2,'one helper readiness check for existing scheduled result focus');
const focusRegression=`
test('inspect readiness waits for scheduled result focus before keyboard evidence interaction',async({page})=>{
 await page.addInitScript(()=>{const raf=window.requestAnimationFrame.bind(window);window.requestAnimationFrame=fn=>{if(fn.toString().includes('lens-intelligence-title')){window.__queuedResultFocus=fn;return 987654321;}return raf(fn);};});
 await page.goto('/lens');let ready=false;const pending=inspect(page).then(()=>{ready=true;});
 await page.waitForFunction(()=>typeof window.__queuedResultFocus==='function');
 await expect(page.getByRole('heading',{name:'UNFARMD ORACLE',exact:true})).toBeVisible();
 // Deliberately hold the app's focus frame: a visible heading alone must not complete inspect().
 await page.waitForTimeout(100);expect(ready).toBe(false);
 await page.evaluate(()=>window.__queuedResultFocus(performance.now()));await pending;
 const q=card(page,'onchain-lp-custody');await q.locator('summary').focus();await page.keyboard.press('Enter');await expect(q).toHaveAttribute('open','');
});
`;
fs.writeFileSync(file,text.replace(before,after).replace(focusBefore,focusAfter)+focusRegression);
const runnerFile='tests/oracle-v5/run.sh',runner=fs.readFileSync(runnerFile,'utf8');
assert.equal(createHash('sha256').update(runner).digest('hex'),'a7d1edf77d8bb483ca480268a3c596d998f9901fc8812237926c08e47794371b');
const root='./node_modules/.bin/tsc next-env.d.ts app/lens/ca-view.tsx';
assert.equal(runner.split(root).length,2,'one compiler-root insertion for existing fixture');
fs.writeFileSync(runnerFile,runner.replace(root,'./node_modules/.bin/tsc next-env.d.ts app/api/v4/ca-intelligence/compose-oracle.ts app/lens/ca-view.tsx'));
console.log('Current UI QA: hash-checked diagnostic expectation, explicit fixture compiler root and settled-focus readiness with delayed-frame regression; all existing assertions retained.');
JS
if [[ "${1:-browser}" == artifact ]];then
 bash tests/oracle-v5/run.sh artifact
else
 bash tests/oracle-v5/run.sh browser
fi
if [[ "${1:-browser}" != artifact ]];then
 mkdir -p /tmp/oracle265-mobile-current
 cp docs/oracle-v5/screenshots/{first,overview,details,red}-{320,390,1280}.png /tmp/oracle265-mobile-current/
fi
cleanup265_browser
trap - EXIT
node --test tests/oracle-regression-265/scope.test.mjs
