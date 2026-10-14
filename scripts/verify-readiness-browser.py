"""Optional local-only UI QA. Requires an existing Python Playwright/Chromium install.
Run against a built localhost preview; no production probe, telemetry or posting.
"""
import argparse
import json
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright

parser = argparse.ArgumentParser()
parser.add_argument('--base', default='http://127.0.0.1:3137')
parser.add_argument('--chromium', default='/usr/bin/chromium')
args = parser.parse_args()
url = urlparse(args.base)
if url.scheme != 'http' or url.hostname not in ('127.0.0.1', 'localhost') or url.username or url.password or url.path not in ('', '/') or url.query or url.fragment:
    raise SystemExit('Only an explicit HTTP loopback preview is accepted')
base = args.base.rstrip('/')
root = Path(__file__).resolve().parent.parent
shots = root / 'docs/screenshots'
shots.mkdir(exist_ok=True)
checks = []
edition = '/brief/2026-10-11/editions/d3a23a36ef05a3c3f0ab4fdaf94b000aaed24fe70c945607a97a50da7dde6f63'

def banner(page, simulated=False):
    page.evaluate('''simulated => {const a=document.createElement('aside');a.textContent=simulated?'LOCAL PREVIEW · SIMULATED CLIENT API FAILURE · No substitute data':'LOCAL PREVIEW · Real main-backed data · Not production or physical-phone QA';Object.assign(a.style,{padding:'14px',background:'#233e54',color:'#e5f5ff',font:'bold 13px sans-serif',lineHeight:'1.6'});document.body.prepend(a);}''', simulated)

with sync_playwright() as p:
    browser = p.chromium.launch(executable_path=args.chromium, headless=True, args=['--no-sandbox'])
    for width in [320, 390, 1280]:
        context = browser.new_context(viewport={'width':width,'height':900})
        page = context.new_page()
        errors = []
        page.on('pageerror', lambda error: errors.append(str(error)))
        for path, current in [('/', 'Home'), ('/radar','Radar'), ('/brief','Daily Brief'), ('/status','Data Health'), ('/research',None), (edition,'Daily Brief')]:
            page.goto(base+path, wait_until='networkidle')
            nav = page.get_by_role('navigation', name='Primary')
            assert nav.get_by_role('link').count() == 4
            active = nav.locator('[aria-current="page"]')
            assert active.count() == (0 if current is None else 1)
            if current: assert active.inner_text() == current
            else: assert page.locator('.research-guide-link').get_attribute('aria-current') == 'page'
            assert page.locator('main#scout-content').count() == 1
            assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
            for link in nav.get_by_role('link').all():
                box = link.bounding_box()
                assert box['height'] >= 44 and box['width'] >= 44
            # Real keyboard skip, focused landmark and visible outline.
            page.keyboard.press('Tab')
            assert page.evaluate('document.activeElement.classList.contains("skip-content")')
            assert page.locator('.skip-content').bounding_box()['y'] >= 0
            page.keyboard.press('Enter')
            assert page.evaluate('document.activeElement.id') == 'scout-content'
            assert page.evaluate('getComputedStyle(document.activeElement).outlineStyle') != 'none'
            if width == 390 and path in ['/', '/research'] or width == 1280 and path == '/':
                page.evaluate('document.activeElement.blur()')
                banner(page)
                page.screenshot(path=str(shots/('readiness-'+('home' if path=='/' else 'guide')+'-'+str(width)+'.png')), full_page=True)
            checks.append({'width':width,'path':path,'check':'navigation, active state, landmark, skip/focus, 44px targets, no overflow','result':'PASS'})
        # Navigate by actual clicks and preserve history/deep links.
        page.get_by_role('navigation',name='Primary').get_by_role('link',name='Home',exact=True).click()
        page.wait_for_url(base+'/')
        page.get_by_role('link', name='Full Radar →',exact=True).click()
        page.wait_for_url(base+'/radar')
        page.get_by_role('navigation',name='Primary').get_by_role('link',name='Daily Brief',exact=True).click()
        page.wait_for_url('**/brief/*')
        page.go_back()
        page.wait_for_url(base+'/radar')
        checks.append({'width':width,'check':'Home Radar entry, primary navigation, browser back','result':'PASS'})
        # Enlarged text checks for added guide and navigation only (not OS/device zoom).
        page.goto(base+'/research')
        page.add_style_tag(content='.research-shell{font-size:32px}.research-shell p,.research-shell li{font-size:32px}.site-navigation a{font-size:24px}')
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
        checks.append({'width':width,'check':'200% 16px text baseline simulation: guide/nav reflow','result':'PASS'})
        assert not errors, errors
        context.close()
    # Simulated aborted browser requests only; no invented API payload/production outage.
    context = browser.new_context(viewport={'width':390,'height':844})
    page = context.new_page()
    page.route('**/api/radar*', lambda route: route.abort())
    page.goto(base+'/radar')
    page.get_by_text('Source unavailable. Refresh to retry.',exact=True).wait_for()
    assert page.locator('.radar-card').count() == 0
    banner(page, True)
    page.screenshot(path=str(shots/'readiness-radar-failure-390.png'), full_page=True)
    page.get_by_role('link', name='Research guide · evidence & limitations').click()
    page.wait_for_url(base+'/research')
    assert page.get_by_role('heading',name='What SCOUT does not prove').is_visible()
    checks.append({'check':'guide reachable after simulated Radar API failure; no substituted observations','result':'PASS'})
    context.close()
    browser.close()
report = {'target':'local-preview','base':base,'finishedAt':datetime.now(timezone.utc).isoformat(),'checks':checks,'scope':'Chromium only; no WCAG certification, VoiceOver, physical phone, production HTTP or native-share proof'}
(root/'docs/evidence/readiness-browser.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps(report,indent=2))
