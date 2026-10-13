"""Local built-app UI integration QA; normal screenshots use real upstream records.
Requires existing Python Playwright, Chromium and an independently installed axe-core.
Artificial empty response is confined to the explicit test case below, never screenshots.
"""
import argparse
import json
import re
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
                    assert card.locator('time').get_attribute('datetime')==row['latestObservedAt']
                if row['pointChange']['distributedTokens'] is None:
                    assert card.locator('.token-row-reading strong').inner_text() in ['Change withheld','Not enough history']
                assert card.locator('.token-evidence').get_attribute('open') is None
            assert page.locator('.overview-metrics dt').count()==3
            assert page.locator('main#scout-content').count()==1
            assert page.get_by_role('heading',level=1).count()==1
            for target in page.locator('.site-navigation nav a, .terminal-primary, .token-evidence>summary, .radar-toolbar select, .radar-toolbar button').all():
                assert target.bounding_box()['height']>=44
            skip(page)
            no_overflow(page)
            passes=axe(page)
            page.evaluate('document.activeElement.blur();window.scrollTo(0,0)')
            page.screenshot(path=str(root/f'docs/screenshots/ux-v2-after-{name}-{width}.png'),full_page=True)
            captures.append({'width':width,'path':path,'capturedAt':datetime.now(timezone.utc).isoformat(),'report':report})
            record(width,path,f'real-source row/unit/timestamp assertions; 3 metrics; landmarks; skip/focus; 44px controls; no overflow; axe {passes} rules passed')
            if name=='home':
                assert page.locator('.terminal-primary').bounding_box()['y']<500
                assert page.locator('.ecosystem-overview').bounding_box()['y']<550
                page.get_by_role('link',name='Open Radar',exact=True).click()
                page.wait_for_url(base+'/radar')
                page.go_back()
                page.wait_for_url(re.compile(re.escape(base)+r'/(#scout-content)?$'))
                record(width,path,'Radar entry and evidence overview in first 844px screen; click / back')
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
                    page.get_by_role('button',name='Refresh observations',exact=True).click()
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
        record(width,'/?mint=allowlisted','real dossier sources remain accessible; query metadata; disclosure; no overflow')
        assert not errors,errors
        context.close()
    # Client outage and recovery: abort requests; no invented history or source timestamp.
    for width in [320,390,1280]:
        for path in ['/','/radar']:
            context=browser.new_context(viewport={'width':width,'height':844})
            page=context.new_page()
            page.route('**/api/radar*',lambda route:route.abort())
            page.goto(base+path,wait_until='networkidle')
            page.locator('.overview-time').filter(has_text='Unavailable').wait_for()
            assert page.locator('.radar-card').count()==0
            assert page.locator('.overview-metrics dd').all_text_contents()==['—','—','—']
            no_overflow(page);axe(page)
            page.unroute('**/api/radar*')
            page.get_by_role('button',name='Retry observations' if path=='/' else 'Refresh observations',exact=True).click()
            page.locator('.radar-card').first.wait_for()
            record(width,path,'aborted request: unknown metrics, no fake rows; accessible retry / genuine recovery')
            context.close()
        # Deterministic empty API fixture ONLY in this integration test; never saved as a screenshot.
        context=browser.new_context(viewport={'width':width,'height':844})
        page=context.new_page()
        fixture={'status':'available','rows':[],'quotes':[],'sort':'coverage','quoteMint':None,'fetchedAt':'2026-01-01T00:00:00Z','dataset':{'sourceStatus':'available','dataFetchedAt':None,'revision':None,'source':'https://raw.githubusercontent.com/fuzzysniper/scout-stonk-intel/main/data/reward-snapshots.json'}}
        page.route('**/api/radar*',lambda route:route.fulfill(json=fixture))
        page.goto(base+'/radar',wait_until='networkidle')
        page.get_by_text('No tracked tokens match this filter.',exact=True).wait_for()
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
        page.get_by_text('Reading sourced observations…',exact=True).wait_for()
        assert page.locator('.overview-metrics dd').all_text_contents()==['—','—','—']
        assert page.get_by_role('button',name='Checking…',exact=True).is_disabled()
        assert page.locator('.token-list').get_attribute('aria-busy')=='true'
        record(width,'/radar','loading: busy region, unknown counts, disabled refresh')
        for route in pending:route.abort()
        context.close()
    browser.close()
result={'target':'local production build; real records for all normal screenshots','base':base,'finishedAt':datetime.now(timezone.utc).isoformat(),'checks':checks,'captures':captures,'axeVersion':'4.10.3','limitations':'Chromium, not physical iPhone / Safari / VoiceOver or WCAG certification. Text-size simulation, not OS zoom. No production activation.'}
(root/'docs/evidence/ux-v2-browser.json').write_text(json.dumps(result,indent=2)+'\n')
print(f'{len(checks)} browser checks passed; six real-source after screenshots saved')
