"""Production Chromium QA. Normal captures use genuine existing API records only.
Synthetic/aborted cases are isolated tests and are never screenshot inputs.
Run both production previews with NODE_USE_ENV_PROXY=1 in the managed runtime.
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
parser.add_argument('--before', default='http://127.0.0.1:3113')
parser.add_argument('--axe', required=True)
args = parser.parse_args()
for target in [args.base, args.before]:
    url = urlparse(target)
    assert url.scheme == 'http' and url.hostname in ['127.0.0.1', 'localhost'] and not url.username and not url.password and not url.query and not url.fragment and url.path in ['', '/']
root = Path(__file__).resolve().parents[1]
checks, captures = [], []

def check(width, name):
    checks.append({'width': width, 'check': name, 'result': 'PASS'})

def audit(page):
    page.add_script_tag(path=args.axe)
    result = page.evaluate("async()=>await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}})")
    assert not result['violations'], [(v['id'], [n['target'] for n in v['nodes']]) for v in result['violations']]
    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
    return len(result['passes'])

def chip(page, symbol):
    return page.locator('.pair-chips button').filter(has_text=re.compile('^'+symbol))

with sync_playwright() as p:
    browser = p.chromium.launch(executable_path='/usr/bin/chromium', args=['--no-sandbox'])
    genuine_report = None
    for width in [320, 390, 1280]:
        context = browser.new_context(viewport={'width': width, 'height': 844}, reduced_motion='reduce')
        page = context.new_page()
        errors, reads = [], []
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.on('request', lambda request: reads.append(request.url) if '/api/' in request.url else None)
        with page.expect_response('**/api/radar*') as response:
            page.goto(args.before+'/', wait_until='networkidle')
        baseline = response.value.json()
        assert baseline['status'] == 'available' and baseline['rows']
        page.screenshot(path=str(root/f'docs/screenshots/pair-day1-before-home-{width}.png'), full_page=True)
        before_words = len(page.locator('main').inner_text().split())
        before_y = page.locator('.radar-card').first.bounding_box()['y']
        with page.expect_response('**/api/radar*') as response:
            page.goto(args.base+'/', wait_until='networkidle')
        report = response.value.json()
        assert report['status'] == 'available' and report['rows']
        genuine_report = report
        page.get_by_role('button', name='Refresh', exact=True).wait_for()
        assert page.locator('.pair-chips button').count() == 6
        assert chip(page, 'NVDAX').get_attribute('aria-pressed') == 'true'
        assert page.locator('.pair-token').count() == 1
        selected = next(row for row in report['rows'] if row['quoteSymbol'] == 'NVDAX')
        assert page.locator('.pair-selected a').inner_text() == selected['quoteMint']
        assert page.locator('.pair-reward time').get_attribute('datetime') == selected['latestObservedAt']
        assert page.locator('.pair-token-evidence').get_attribute('open') is None
        assert page.locator('.pair-dataset').get_attribute('open') is None
        assert page.locator('main#scout-content').count() == 1
        assert page.get_by_role('heading', level=1).count() == 1
        assert page.locator('.pair-token').first.bounding_box()['y'] < 760
        for control in page.locator('.pair-chips button, #pair-search, .pair-scope button, .pair-token-evidence>summary').all():
            assert control.bounding_box()['height'] >= 44
        page.keyboard.press('Tab')
        assert page.evaluate('document.activeElement.classList.contains("skip-content")')
        page.keyboard.press('Enter')
        assert page.evaluate('document.activeElement.id') == 'scout-content'
        assert page.evaluate('getComputedStyle(document.activeElement).outlineStyle') != 'none'
        rules = audit(page)
        page.evaluate('document.activeElement.blur();scrollTo(0,0)')
        page.screenshot(path=str(root/f'docs/screenshots/pair-day1-after-home-{width}.png'), full_page=True)
        captures.append({'width': width, 'capturedAt': datetime.now(timezone.utc).isoformat(), 'beforeReport': baseline, 'afterReport': report,
                         'firstRowY': {'before': before_y, 'after': page.locator('.pair-token').first.bounding_box()['y']},
                         'mainWordsIncludingScreenReaderLabels': {'before': before_words, 'after': len(page.locator('main').inner_text().split())}})
        check(width, f'genuine production before/after; exact NVDAX quote mint, real observed date; single h1/landmark; skip/focus; 44px controls; no overflow; axe {rules} passes')
        reads.clear()
        chip(page, 'ZEC').focus(); page.keyboard.press('Space')
        assert chip(page, 'ZEC').get_attribute('aria-pressed') == 'true'
        assert page.locator('.pair-token').count() == 2
        assert [a.inner_text().split('token dossier')[0].strip() for a in page.locator('.pair-token h3 a').all()] == ['MASK', 'ZCAT']
        assert not reads, reads
        if width in [390, 1280]:
            page.screenshot(path=str(root/f'docs/screenshots/pair-day1-after-zec-{width}.png'), full_page=True)
        summary = page.locator('.pair-token-evidence>summary').first
        summary.focus(); page.keyboard.press('Enter')
        assert page.locator('.pair-token-evidence').first.get_attribute('open') is not None
        assert page.get_by_text('Holder-attributable rewards', exact=True).first.is_visible()
        audit(page)
        if width == 390:
            page.screenshot(path=str(root/'docs/screenshots/pair-day1-after-evidence-390.png'), full_page=True)
        summary.focus(); page.keyboard.press('Space')
        page.locator('#pair-search').fill('super inu')
        assert page.locator('.pair-chips button').count() == 1
        assert page.get_by_text('Choose a matching pair above.', exact=True).is_visible()
        chip(page, 'NVDAX').click()
        assert page.locator('.pair-token').count() == 1
        page.locator('#pair-search').fill(selected['quoteMint'])
        assert page.locator('.pair-chips button').count() == 1
        page.locator('#pair-search').fill('no-such-pair-test-only')
        assert page.locator('.pair-token').count() == 0
        page.get_by_role('button', name='Clear search').click()
        assert page.locator('.pair-chips button').count() == 6
        assert not reads, reads
        page.locator('.pair-dataset>summary').click()
        assert page.get_by_text(re.compile('A ticker does not imply ownership')).is_visible()
        audit(page)
        with page.expect_response('**/api/radar*'):
            page.get_by_role('button', name='Refresh', exact=True).click()
        page.get_by_role('button', name='Refresh', exact=True).wait_for()
        assert chip(page, 'NVDAX').get_attribute('aria-pressed') == 'true'
        check(width, 'keyboard pair switch / disclosure; two same-mint ZEC rows; local search incl. mint/name/empty; zero requests for selection/search; scope; refresh keeps choice; expanded axe')
        page.add_style_tag(content='.pair-explorer p,.pair-explorer span,.pair-explorer strong,.pair-explorer summary,.pair-explorer dt,.pair-explorer dd,.pair-explorer button,.pair-explorer input{font-size:24px!important}')
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
        check(width, 'enlarged text simulation reflows without horizontal overflow')
        for path in ['/brief', '/radar', '/research', '/status', '/brief/2026-10-11/editions/d3a23a36ef05a3c3f0ab4fdaf94b000aaed24fe70c945607a97a50da7dde6f63']:
            assert page.goto(args.base+path, wait_until='networkidle').status == 200
            assert page.locator('main#scout-content').count() == 1
            assert page.get_by_role('navigation', name='Primary').get_by_role('link').count() == 4
            assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
        reads.clear()
        page.goto(args.base+'/?mint='+selected['mint'], wait_until='networkidle')
        assert page.get_by_role('heading', level=1).inner_text() == 'Token dossier'
        assert page.locator('.pair-explorer').count() == 0
        assert not any('/api/radar' in request or '/api/status' in request for request in reads), reads
        assert page.locator('meta[property="og:image"]').get_attribute('content').endswith('/api/og?mint='+selected['mint'])
        page.locator('.dossier-details>summary').click()
        assert page.get_by_text('LIFETIME REWARD DISTRIBUTIONS · API-REPORTED', exact=True).is_visible()
        assert page.get_by_role('contentinfo', name='STORK ecosystem connection').count() == 1
        page.get_by_role('navigation', name='Primary').get_by_role('link', name='Home', exact=True).click()
        page.locator('.pair-explorer').wait_for()
        check(width, 'all research routes and immutable edition 200; dossier deep link / OG metadata; no explorer fetch on dossier; STORK footer retained')
        assert not errors, errors
        context.close()
    # Only isolated test cases use response interception; no screenshots here.
    for width in [320, 390, 1280]:
        for state in ['loading', 'failed', 'degraded', 'stale', 'empty', 'forged', 'slow-health']:
            context = browser.new_context(viewport={'width': width, 'height': 844})
            page = context.new_page(); pending = []
            if state == 'loading':
                page.route('**/api/radar*', lambda route: pending.append(route))
            elif state == 'failed':
                page.route('**/api/radar*', lambda route: route.abort())
            elif state != 'slow-health':
                # Explicit synthetic transformation for failure/edge semantics only.
                fixture = json.loads(json.dumps(genuine_report))
                if state == 'empty': fixture['rows'] = []
                if state == 'degraded': fixture['status'] = 'degraded'; fixture['dataset']['sourceStatus'] = 'degraded'
                for row in fixture['rows']:
                    if state == 'stale': row['freshness'] = 'stale'; row['pointChange']['status'] = 'stale_data'
                    if state == 'forged': row['quoteMint'] = 'FORGED'
                page.route('**/api/radar*', lambda route, request, data=fixture: route.fulfill(json=data))
            if state == 'slow-health': page.route('**/api/status', lambda route: pending.append(route))
            page.goto(args.base+'/', wait_until='domcontentloaded')
            if state == 'loading':
                page.get_by_role('button', name='Reading…', exact=True).wait_for()
                assert page.locator('.pair-token-list').get_attribute('aria-busy') == 'true'
            else:
                page.get_by_role('button', name='Retry observations' if state == 'failed' else 'Refresh', exact=True).wait_for()
            assert page.locator('.pair-token').count() == 1
            assert page.locator('.pair-selected a').inner_text() == selected['quoteMint']
            if state in ['loading', 'failed', 'empty', 'forged']:
                assert page.get_by_text('Observations unavailable', exact=True).is_visible()
                assert page.locator('.pair-reward time').count() == 0
            elif state == 'stale': assert page.get_by_text('Stale observations', exact=True).is_visible()
            elif state == 'degraded': assert page.get_by_text('Source unavailable', exact=True).is_visible()
            audit(page)
            if state == 'failed':
                page.unroute('**/api/radar*')
                page.get_by_role('button', name='Retry observations').click()
                page.locator('.pair-reward time').wait_for()
            check(width, f'ISOLATED TEST ONLY {state}: verified identity retained; metrics withheld / busy / recoverable; no overflow; axe; no screenshots')
            for route in pending: route.abort()
            context.close()
    browser.close()
result = {'target': 'local production builds; genuine API records in all screenshots', 'finishedAt': datetime.now(timezone.utc).isoformat(), 'axeVersion': '4.10.3', 'checks': checks, 'captures': captures,
          'limitations': 'Chromium viewport simulation, not physical devices/Safari/VoiceOver/WCAG certification. Enlarged text simulation, not OS zoom. Five-second review is a self-review, not a timed user study. No deployment.'}
(root/'docs/evidence/pair-day1-browser.json').write_text(json.dumps(result, indent=2)+'\n')
print(f'{len(checks)} responsive browser checks passed; genuine production screenshots saved')
