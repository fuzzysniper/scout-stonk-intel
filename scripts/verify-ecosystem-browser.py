"""Local Chromium QA for the informational ecosystem connection; no external probe."""
import argparse
import json
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright

parser = argparse.ArgumentParser()
parser.add_argument('--base', default='http://127.0.0.1:3137')
args = parser.parse_args()
url = urlparse(args.base)
if url.scheme != 'http' or url.hostname not in ('127.0.0.1', 'localhost') or url.username or url.password or url.path not in ('', '/') or url.query or url.fragment:
    raise SystemExit('Only an explicit HTTP loopback preview is accepted')
base = args.base.rstrip('/')
root = Path(__file__).resolve().parent.parent
checks = []
paths = ['/', '/radar', '/brief/2026-10-11', '/status', '/research', '/brief/2026-10-11/editions/d3a23a36ef05a3c3f0ab4fdaf94b000aaed24fe70c945607a97a50da7dde6f63']

with sync_playwright() as p:
    browser = p.chromium.launch(executable_path='/usr/bin/chromium', headless=True, args=['--no-sandbox'])
    for width in [320, 390, 1280]:
        context = browser.new_context(viewport={'width': width, 'height': 844})
        # Deliberate client API failures establish that the connection needs no data.
        context.route('**/api/**', lambda route: route.abort())
        page = context.new_page()
        errors = []
        page.on('pageerror', lambda error: errors.append(str(error)))
        for route_path in paths:
            page.goto(base + route_path, wait_until='networkidle')
            footer = page.get_by_role('contentinfo', name='STORK ecosystem connection')
            assert footer.count() == 1
            assert 'No STORK ownership is required' in footer.inner_text()
            external = footer.get_by_role('link', name='Visit STORK ecosystem')
            assert external.get_attribute('href') == 'https://storkcoin.xyz'
            assert external.get_attribute('rel') == 'external noreferrer'
            assert external.get_attribute('target') is None
            assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
            for link in footer.get_by_role('link').all():
                box = link.bounding_box()
                assert box['height'] >= 44 and box['width'] >= 44
            external.focus()
            assert page.evaluate('getComputedStyle(document.activeElement).outlineStyle') != 'none'
            page.keyboard.press('Tab')
            assert page.evaluate('document.activeElement.getAttribute("href")') == '/research#stork-relationship'
            if route_path == '/' and width in [320, 390]:
                page.evaluate('document.activeElement.blur()')
                footer.scroll_into_view_if_needed()
                page.evaluate('''() => {const label=document.createElement('div');label.textContent='LOCAL CHROMIUM PREVIEW · Simulated client API failures';Object.assign(label.style,{position:'fixed',top:'0',left:'0',right:'0',zIndex:'99',padding:'10px',background:'#233e54',color:'#e5f5ff',font:'12px sans-serif'});document.body.append(label);}''')
                page.screenshot(path=str(root / f'docs/screenshots/ecosystem-home-{width}.png'))
            checks.append({'width': width, 'path': route_path, 'result': 'PASS', 'checks': 'footer without data; external destination; 44px targets; keyboard focus; no horizontal overflow'})
        page.goto(base + '/')
        page.get_by_role('link', name='About the relationship', exact=True).click()
        page.wait_for_url(base + '/research#stork-relationship')
        heading = page.locator('main').get_by_role('heading', name='SCOUT & the STORK ecosystem', exact=True)
        assert heading.is_visible()
        if width == 390:
            page.screenshot(path=str(root / 'docs/screenshots/ecosystem-relationship-390.png'))
        page.go_back()
        page.wait_for_url(base + '/')
        page.goto(base + '/research')
        page.add_style_tag(content='.ecosystem-footer h2{font-size:30px}.ecosystem-footer p,.ecosystem-footer a{font-size:26px}.research-shell p{font-size:32px}')
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
        assert not errors, errors
        checks.append({'width': width, 'result': 'PASS', 'checks': 'relationship click; fragment; browser Back; enlarged-text reflow; no page errors'})
        context.close()
    browser.close()
report = {'target': 'local-built-preview', 'base': base, 'finishedAt': datetime.now(timezone.utc).isoformat(), 'checks': checks, 'limitations': 'Chromium only; simulated aborted client API requests; no substitute observations; no physical phone, production or external STORK site verification'}
(root / 'docs/evidence/ecosystem-browser.json').write_text(json.dumps(report, indent=2) + '\n')
print(json.dumps(report, indent=2))
