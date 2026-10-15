"""Real local production HTTP/browser QA. No provider data mocks or external reads.

Run with a freshly built server: python3 tests/historical-research-browser.py URL
Screenshots use the genuine retained capture metadata; financial amounts are gated.
"""
import asyncio
import hashlib
import json
import sys
from pathlib import Path
from urllib.parse import urlsplit
from playwright.async_api import async_playwright


async def main():
    base = sys.argv[1].rstrip('/')
    parsed = urlsplit(base)
    assert parsed.hostname in ('localhost', '127.0.0.1') and parsed.scheme == 'http'
    manifest = json.loads(Path('docs/evidence/historical-research-manifest.json').read_text())
    audit = json.loads(Path(manifest['evidencePath']).read_text())
    quantities = [c['lifetime']['distributedTokens'] for r in audit['offlineReport']['reports']
                  for c in r['candidates'] if c['symbol'] in ('SI', 'GP', 'GROK', 'KNOTS')]
    result = {'kind': 'local_production_historical_metadata_browser_qa',
              'sourceDocumentSha256': manifest['evidenceSha256'], 'viewports': [],
              'externalRequests': [], 'browserErrors': [], 'providerRequests': 0}
    async with async_playwright() as p:
        browser = await p.chromium.launch(executable_path='/usr/bin/chromium',
                                         args=['--no-sandbox', '--disable-gpu'])
        for width in (320, 390, 1280):
            page = await browser.new_page(viewport={'width': width, 'height': 844}, device_scale_factor=1)
            page.on('pageerror', lambda e: result['browserErrors'].append(str(e)))
            async def local_only(route):
                if not route.request.url.startswith(base + '/'):
                    result['externalRequests'].append(route.request.url)
                    await route.abort()
                else:
                    await route.continue_()
            await page.route('**/*', local_only)
            response = await page.goto(base + '/research/history', wait_until='networkidle')
            assert response.status == 200
            assert response.headers['content-type'].startswith('text/html')
            assert await page.locator('article').count() == 4
            assert await page.locator('main h1').inner_text() == 'What was recorded.'
            assert await page.locator('main').get_attribute('id') == 'scout-content'
            assert await page.locator('.historical-warning').is_visible()
            assert await page.locator('.historical-lead strong').is_visible()
            assert await page.locator('.historical-warning').evaluate('(e)=>e.getBoundingClientRect().bottom') < 700
            assert await page.locator('article').first.evaluate('(e)=>e.getBoundingClientRect().top') < 700
            for amount in quantities:
                assert amount not in await page.content()  # includes hidden DOM and RSC payload
            assert await page.evaluate('document.documentElement.scrollWidth <= innerWidth')
            await page.screenshot(path=f'docs/screenshots/historical-research-after-{width}.png', full_page=True)
            await page.screenshot(path=f'docs/screenshots/historical-research-first-viewport-{width}.png')
            summary = page.locator('article summary').first
            await summary.focus()
            await page.keyboard.press('Enter')
            assert await page.locator('article details').first.get_attribute('open') is not None
            assert (await page.locator('article details').first.inner_text()).count(manifest['records'][0]['receiptSha256']) == 1
            await page.screenshot(path=f'docs/screenshots/historical-research-sources-{width}.png', full_page=True)
            assert await page.evaluate('document.documentElement.scrollWidth <= innerWidth')
            await summary.focus()
            await page.keyboard.press('Space')
            assert await page.locator('article details').first.get_attribute('open') is None
            # Native link to canonical STONK anchors the exact record.
            await page.goto(base + '/research/history#' + manifest['records'][3]['tokenMint'], wait_until='networkidle')
            assert await page.locator('article').last.is_visible()
            await page.goto(base + '/research', wait_until='networkidle')
            await page.get_by_role('link', name='View historical sources →').click()
            await page.wait_for_url('**/research/history')
            assert await page.locator('article').count() == 4
            result['viewports'].append({'width': width, 'height': 844, 'status': response.status,
                                       'contentType': response.headers['content-type'], 'records': 4,
                                       'overflow': False, 'keyboardDisclosure': 'enter_open_space_close',
                                       'financialQuantitiesInHtmlOrRsc': False,
                                       'guideLinkAndExactAnchor': 'passed'})
            await page.close()
        await browser.close()
    assert not result['externalRequests'], result['externalRequests']
    assert not result['browserErrors'], result['browserErrors']
    for file in Path('docs/screenshots').glob('historical-research-*.png'):
        result.setdefault('screenshots', []).append({'path': str(file), 'sha256': hashlib.sha256(file.read_bytes()).hexdigest()})
    Path('docs/evidence/historical-research-browser-qa.json').write_text(json.dumps(result, indent=2) + '\n')
    print(json.dumps({k:v for k,v in result.items() if k != 'screenshots'}, indent=2))


asyncio.run(main())
