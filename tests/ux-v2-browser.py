"""Flow-First built-app UI integration QA; normal screenshots use real upstream records.
Requires existing Python Playwright, Chromium and an independently installed axe-core.
Artificial empty response is confined to the explicit test case below, never screenshots.
"""
import argparse
import json
import re
import os
import subprocess
import tempfile
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright

parser = argparse.ArgumentParser()
parser.add_argument('--base', default='http://127.0.0.1:3112')
parser.add_argument('--chromium', default='/usr/bin/chromium')
parser.add_argument('--axe', required=True, help='Local axe-core 4.10.3 axe.min.js')
args = parser.parse_args()
url = urlparse(args.base)
if url.scheme != 'http' or url.hostname not in ('127.0.0.1', 'localhost') or url.username or url.password or url.path not in ('', '/') or url.query or url.fragment:
    raise SystemExit('Only an explicit HTTP loopback preview is accepted')
base = args.base.rstrip('/')
root = Path(__file__).resolve().parents[1]
checks, captures = [], []
edition = '/brief/2026-10-11/editions/d3a23a36ef05a3c3f0ab4fdaf94b000aaed24fe70c945607a97a50da7dde6f63'

def record(width, path, check):
    checks.append({'width':width,'path':path,'check':check,'result':'PASS'})

def axe(page):
    page.add_script_tag(path=args.axe)
    result = page.evaluate("async()=>await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}})")
    assert not result['violations'], [(v['id'], [n['target'] for n in v['nodes']]) for v in result['violations']]
    return len(result['passes'])

def no_overflow(page):
    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')

def skip(page):
    page.keyboard.press('Tab')
    assert page.evaluate('document.activeElement.classList.contains("skip-content")')
    page.keyboard.press('Enter')
    assert page.evaluate('document.activeElement.id') == 'scout-content'
    assert page.evaluate('getComputedStyle(document.activeElement).outlineStyle') != 'none'

with sync_playwright() as p:
    browser = p.chromium.launch(executable_path=args.chromium, args=['--no-sandbox'])
    for width in [320,390,1280]:
        context = browser.new_context(viewport={'width':width,'height':844})
        page = context.new_page()
        errors = []
        page.on('pageerror', lambda error: errors.append(str(error)))
        for path,name in [('/','home'),('/radar','radar')]:
            with page.expect_response(re.compile('/api/radar')) as response:
                page.goto(base+path, wait_until='networkidle')
            report = response.value.json()
            assert report['rows'], 'Real-source screenshot requires actual rows, never a substitute'
            page.locator('.radar-card').first.wait_for()
            count = min(3,len(report['rows'])) if name=='home' else len(report['rows'])
            assert page.locator('.radar-card').count()==count
            for i,row in enumerate(report['rows'][:count]):
                card=page.locator('.radar-card').nth(i)
                assert card.locator('.token-unit strong').inner_text()==row['quoteSymbol']
                if row['latestObservedAt']:
                    assert card.locator('.token-observed time').get_attribute('datetime')==row['latestObservedAt']
                if row['signals']['status'] != 'available' and row['pointChange']['status'] != 'available':
                    assert card.locator('.token-row-reading strong').inner_text() in ['Insufficient comparable history','Stale observations','Source unavailable']
                assert card.locator('.token-evidence').get_attribute('open') is None
            assert page.locator('.overview-metrics').count()==0
            assert page.get_by_role('link',name='Collection reliability').count()==1
            assert page.locator('main#scout-content').count()==1
            assert page.get_by_role('heading',level=1).count()==1
            for target in page.locator('.site-navigation nav a, .research-guide-link, .token-row-heading h2 a, .flow-more, .token-evidence>summary, .radar-toolbar select, .radar-toolbar button').all():
                assert target.bounding_box()['height']>=44
            skip(page)
            no_overflow(page)
            passes=axe(page)
            page.evaluate('document.activeElement.blur();window.scrollTo(0,0)')
            page.screenshot(path=str(root/f'docs/screenshots/flow-first-after-{name}-{width}.png'),full_page=True)
            captures.append({'width':width,'path':path,'capturedAt':datetime.now(timezone.utc).isoformat(),'report':report,'collapsedMainTextWords':len(page.locator('main').inner_text().split()),'firstRowY':page.locator('.radar-card').first.bounding_box()['y'],'rowHeights':[c.bounding_box()['height'] for c in page.locator('.radar-card').all()]})
            record(width,path,f'real-source row/unit/timestamp assertions; compact timestamp / coverage line; no KPI deck; landmarks; skip/focus; 44px controls; no overflow; axe {passes} rules passed')
            if name=='home':
                assert page.locator('.radar-card').nth(2).bounding_box()['y'] < 844
                assert page.locator('.radar-card').first.bounding_box()['y'] < 450
                assert page.locator('.ecosystem-overview').bounding_box()['y']<550
                page.get_by_role('link',name='Full Radar →',exact=True).click()
                page.wait_for_url(base+'/radar')
                page.go_back()
                page.wait_for_url(re.compile(re.escape(base)+r'/(#scout-content)?$'))
                record(width,path,'three token entries in first 844px screen; Full Radar entry; click / back')
            else:
                # Native disclosure: real keyboard, closed metrics not accidentally exposed.
                summary=page.locator('.token-evidence>summary').first
                summary.focus()
                page.keyboard.press('Enter')
                assert page.locator('.token-evidence').first.get_attribute('open') is not None
                nested=page.locator('.signal-evidence>summary').first
                nested.focus();page.keyboard.press('Space')
                assert page.locator('.signal-evidence').first.get_attribute('open') is not None
                assert page.get_by_text('Actual start / end (UTC)',exact=True).first.is_visible()
                no_overflow(page)
                passes=axe(page)
                record(width,path,f'keyboard nested disclosure; all evidence reachable; expanded axe {passes} rules passed')
                summary.focus();page.keyboard.press('Enter')
                # Sorting and exact mint filter exercise the actual API, not fabricated amounts.
                with page.expect_response(re.compile('/api/radar')) as response:
                    page.locator('#radar-sort').select_option('freshness')
                assert response.value.json()['sort']=='freshness'
                quote=report['quotes'][0]
                with page.expect_response(re.compile('/api/radar')) as response:
                    page.locator('#radar-quote').select_option(quote['mint'])
                filtered=response.value.json()
                page.wait_for_function('document.querySelector(".radar-toolbar button").disabled===false')
                assert filtered['quoteMint']==quote['mint']
                assert all(row['quoteMint']==quote['mint'] for row in filtered['rows'])
                assert page.locator('.radar-card').count()==len(filtered['rows'])
                with page.expect_response(re.compile('/api/radar')):
                    page.get_by_role('button',name='Refresh',exact=True).click()
                page.wait_for_function('document.querySelector(".radar-toolbar button").disabled===false')
                assert page.locator('#radar-quote').input_value()==quote['mint']
                record(width,path,'real freshness sort, exact quote-mint filter, manual refresh preserves choice')
            # Enlarged text reflow, distinct from physical-device or browser zoom proof.
            page.add_style_tag(content='.ux-terminal p,.ux-terminal span,.ux-terminal summary,.ux-terminal dt,.ux-terminal select,.ux-terminal button,.site-navigation a{font-size:24px!important}')
            no_overflow(page)
            record(width,path,'200% 12px text simulation reflows without horizontal overflow')
            page.reload(wait_until='networkidle')
        # Public research routes / permanent edition URL retain real responses and primary navigation.
        for path in ['/status','/brief','/research',edition]:
            response=page.goto(base+path,wait_until='networkidle')
            assert response.status==200
            assert page.locator('main#scout-content').count()==1
            assert page.get_by_role('navigation',name='Primary').get_by_role('link').count()==4
            no_overflow(page)
            record(width,path,'real local route 200, preserved navigation / landmark, no overflow')
        # Query dossier uses real read-only feeds; retained evidence and metadata compile/run.
        mint=report['rows'][0]['mint']
        page.goto(base+'/?mint='+mint,wait_until='networkidle')
        assert page.get_by_role('heading',level=1).inner_text()=='Token dossier'
        assert page.locator('.dossier-details').get_attribute('open') is None
        page.locator('.dossier-details>summary').click()
        assert page.get_by_text('LIFETIME REWARD DISTRIBUTIONS · API-REPORTED',exact=True).is_visible()
        assert page.locator('meta[property="og:image"]').get_attribute('content').endswith('/api/og?mint='+mint)
        no_overflow(page)
        context.grant_permissions(['clipboard-read','clipboard-write'])
        page.evaluate('Object.defineProperty(navigator,"share",{value:undefined,configurable:true})')
        page.get_by_role('button',name='SHARE REPORT').click()
        page.get_by_text('Report link copied',exact=True).wait_for()
        assert page.evaluate('navigator.clipboard.readText()')==base+'/?mint='+mint
        record(width,'/?mint=allowlisted','real dossier sources remain accessible; query metadata; disclosure; actual local clipboard dossier sharing; no overflow')
        assert not errors,errors
        context.close()
    # Client outage and recovery: abort requests; no invented history or source timestamp.
    for width in [320,390,1280]:
        for path in ['/','/radar']:
            context=browser.new_context(viewport={'width':width,'height':844})
            page=context.new_page()
            page.route('**/api/radar*',lambda route:route.abort())
            page.goto(base+path,wait_until='networkidle')
            page.locator('.overview-time').filter(has_text='Observation source unavailable').wait_for()
            assert page.locator('.radar-card').count()==0
            assert 'Tracked tokens —' in page.locator('.flow-evidence-line').inner_text()
            assert 'Coverage unknown' in page.locator('.flow-coverage-line').inner_text()
            no_overflow(page);axe(page)
            page.unroute('**/api/radar*')
            page.get_by_role('button',name='Retry observations' if path=='/' else 'Refresh',exact=True).click()
            page.locator('.radar-card').first.wait_for()
            record(width,path,'aborted request: unknown metrics, no fake rows; accessible retry / genuine recovery')
            context.close()
        # Deterministic empty API fixture ONLY in this integration test; never saved as a screenshot.
        context=browser.new_context(viewport={'width':width,'height':844})
        page=context.new_page()
        fixture={'status':'available','rows':[],'quotes':[],'sort':'coverage','quoteMint':None,'fetchedAt':'2026-01-01T00:00:00Z','dataset':{'sourceStatus':'available','dataFetchedAt':None,'revision':None,'source':'https://raw.githubusercontent.com/fuzzysniper/scout-stonk-intel/main/data/reward-snapshots.json'}}
        page.route('**/api/radar*',lambda route:route.fulfill(json=fixture))
        page.goto(base+'/radar',wait_until='networkidle')
        page.get_by_text('No tokens match this filter.',exact=True).wait_for()
        assert page.locator('.radar-card').count()==0
        assert page.locator('time').count()==0
        no_overflow(page);axe(page)
        record(width,'/radar','test-only empty fixture: explicit empty state, no timestamps or reward amounts')
        context.close()
        # Loading response is stalled then aborted; no financial fixture required.
        context=browser.new_context(viewport={'width':width,'height':844})
        page=context.new_page();pending=[]
        page.route('**/api/radar*',lambda route:pending.append(route))
        page.goto(base+'/radar',wait_until='domcontentloaded')
        page.locator('.terminal-status').filter(has_text='Reading observations…').wait_for()
        assert 'Tracked tokens —' in page.locator('.flow-evidence-line').inner_text()
        assert 'Coverage pending' in page.locator('.flow-coverage-line').inner_text()
        assert page.get_by_role('button',name='Checking…',exact=True).is_disabled()
        assert page.locator('.token-list').get_attribute('aria-busy')=='true'
        record(width,'/radar','loading: busy region, unknown counts, disabled refresh')
        for route in pending:route.abort()
        context.close()
    with tempfile.TemporaryDirectory(prefix='scout-flow-ui-test-') as directory:
        subprocess.run([str(root/'node_modules/.bin/tsc'),'lib/radar.ts','--resolveJsonModule','--target','ES2023','--module','commonjs','--strict','--skipLibCheck','--esModuleInterop','--rootDir','.', '--outDir',directory],cwd=root,check=True,capture_output=True)
        fixtures=json.loads(subprocess.check_output(['node',str(root/'tests/flow-first-fixtures.mjs')],env={**os.environ,'HISTORY_TEST_BUILD':directory},cwd=root))
        for width in [320,390,1280]:
            for name,fixture in fixtures.items():
                context=browser.new_context(viewport={'width':width,'height':844})
                page=context.new_page()
                page.route('**/api/radar*',lambda route,request,data=fixture:route.fulfill(status=503 if data['status']=='unavailable' else 200,json=data))
                page.goto(base+'/radar',wait_until='networkidle')
                card=page.locator('.radar-card').first
                if name in ['matched','window','zero']:
                    assert card.locator('.flow-value').count()==1
                    assert card.locator('.flow-value').inner_text().startswith('24 ' if name in ['matched','window'] else '0 ')
                    assert card.locator('.flow-range').is_visible()
                    row=fixture['rows'][0]
                    expected=row['signals']['current'] if name=='matched' else row['windows']['24h'] if name=='window' else row['pointChange']
                    assert card.locator('.flow-range time').first.get_attribute('datetime')==expected['startAt']
                    assert card.locator('.flow-range time').last.get_attribute('datetime')==expected['endAt']
                else:
                    assert card.locator('.flow-value').count()==0
                    assert card.locator('.flow-limited').inner_text()==('Source unavailable' if name=='unavailable' else 'Stale observations' if name=='stale' else 'Insufficient comparable history')
                no_overflow(page);axe(page)
                page.add_style_tag(content='.flow-first p,.flow-first span,.flow-first summary,.flow-first time,.flow-first small,.flow-first strong{font-size:24px!important}')
                no_overflow(page)
                record(width,'/radar','ISOLATED SYNTHETIC '+name+': one guarded readout / state, actual interval, quote units, axe / enlarged reflow; never screenshot')
                context.close()
    browser.close()
result={'target':'local production build; real records for all normal screenshots','base':base,'finishedAt':datetime.now(timezone.utc).isoformat(),'checks':checks,'captures':captures,'axeVersion':'4.10.3','limitations':'Chromium, not physical iPhone / Safari / VoiceOver or WCAG certification. Text-size simulation, not OS zoom. No production activation.'}
(root/'docs/evidence/flow-first-browser.json').write_text(json.dumps(result,indent=2)+'\n')
print(f'{len(checks)} browser checks passed; six real-source after screenshots saved')
