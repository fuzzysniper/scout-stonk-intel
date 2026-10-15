"""Read-only OG production QA; requires a running local production server.

No financial fixtures: uses the tracked SI mint and actual API responses. Run:
python3 tests/og-browser.py --base-url http://127.0.0.1:3191
"""
import argparse
import hashlib
import io
import json
from datetime import datetime, timezone
from pathlib import Path
from urllib.error import HTTPError
from urllib.parse import urlparse, parse_qs
from urllib.request import build_opener, ProxyHandler
from PIL import Image
from playwright.sync_api import sync_playwright

MINT = 'DEW9dSN6QpWyNthphCpMmAbZP1Q4cEKR9xQXAri98WDP'
parser = argparse.ArgumentParser()
parser.add_argument('--base-url', required=True)
parser.add_argument('--evidence', default='docs/evidence/token-og-after.json')
args = parser.parse_args()
base = args.base_url.rstrip('/')
assert urlparse(base).hostname in ('localhost', '127.0.0.1'), 'Local production QA only'
opener = build_opener(ProxyHandler({}))  # Loopback only; do not bypass provider proxy.
proof = {'phase': 'after', 'capturedAt': datetime.now(timezone.utc).isoformat(), 'mint': MINT,
         'baseCommit': 'c50569bbddd43a21638a7bec2113c340dbba7a48',
         'routeSha256': hashlib.sha256(Path('app/api/og/route.tsx').read_bytes()).hexdigest(),
         'limitations': ['Local production runtime, not a deployment or physical social-app fetch.', 'API source captures and image generation are separate real requests; live market values can differ.', 'fetchedAt is an API retrieval time, not a market observation or verified payout coverage interval.'],
         'mode': 'local production build, real provider responses', 'http': [], 'sources': {}, 'browser': []}
for endpoint in ('token', 'rewards'):
    with opener.open(base + '/api/' + endpoint + '?mint=' + MINT, timeout=20) as response:
        source = json.load(response)
        proof['sources'][endpoint] = source
        assert source.get('mint') == MINT
market = proof['sources']['token']
assert market['found'] and MINT in (market['base']['address'], market['quote']['address'])
for query, expected in [('?mint=' + MINT, 200), ('?mint=invalid', 400), ('?mint=' + MINT + '&mint=' + MINT, 400)]:
    started = datetime.now(timezone.utc).isoformat()
    try:
        response = opener.open(base + '/api/og' + query, timeout=25)
    except HTTPError as error:
        response = error
    with response:
        data = response.read()
        item = {'path': '/api/og' + query, 'startedAt': started, 'status': response.status,
                'contentType': response.headers.get('content-type'), 'cacheControl': response.headers.get('cache-control'),
                'bytes': len(data), 'bodySha256': hashlib.sha256(data).hexdigest(), 'isPng': data.startswith(b'\x89PNG\r\n\x1a\n'),
                'completedAt': datetime.now(timezone.utc).isoformat()}
        assert response.status == expected
        if expected == 200:
            assert item['contentType'] == 'image/png' and item['isPng']
            assert item['cacheControl'] == 'public, max-age=60, s-maxage=60'
            image = Image.open(io.BytesIO(data))
            image.load()  # Decode all pixels, not just a signature check.
            assert image.size == (1200, 630) and image.format == 'PNG'
            item['decodedDimensions'] = list(image.size)
            Path('docs/screenshots/token-og-after.png').write_bytes(data)
        else:
            assert not item['isPng'] and item['cacheControl'] == 'no-store'
        proof['http'].append(item)
with sync_playwright() as p:
    browser = p.chromium.launch(executable_path='/usr/bin/chromium', args=['--no-sandbox', '--disable-gpu'])
    for width in (320, 390, 1280):
        page = browser.new_page(viewport={'width': width, 'height': 800}, device_scale_factor=1)
        errors = []
        page.on('pageerror', lambda error: errors.append(str(error)))
        response = page.goto(base + '/api/og?mint=' + MINT, wait_until='load', timeout=30000)
        assert response.status == 200
        image = page.locator('img')
        dimensions = image.evaluate('(img) => [img.complete, img.naturalWidth, img.naturalHeight]')
        assert dimensions == [True, 1200, 630]
        screenshot = 'docs/screenshots/token-og-after-browser-' + str(width) + '.png'
        page.screenshot(path=screenshot)
        response = page.goto(base + '/?mint=' + MINT, wait_until='domcontentloaded', timeout=30000)
        assert response.status == 200
        page.wait_for_selector('input#mint')
        assert page.locator('input#mint').input_value() == MINT
        images = {name: page.locator('meta[' + ('property' if name.startswith('og:') else 'name') + '="' + name + '"]').get_attribute('content') for name in ('og:image', 'twitter:image')}
        for url in images.values():
            parsed = urlparse(url)
            assert parsed.path == '/api/og' and parse_qs(parsed.query) == {'mint': [MINT]}
        assert page.locator('meta[name="twitter:card"]').get_attribute('content') == 'summary_large_image'
        page.context.grant_permissions(['clipboard-read', 'clipboard-write'], origin=base)
        assert page.evaluate('typeof navigator.share') == 'undefined'  # Exercise the actual desktop fallback.
        page.get_by_role('button', name='SHARE REPORT').click()
        page.get_by_role('status').filter(has_text='Report link copied').wait_for()
        copied = page.evaluate('navigator.clipboard.readText()')
        assert copied == base + '/?mint=' + MINT
        assert not errors, errors
        proof['browser'].append({'width': width, 'imageStatus': 200, 'decoded': dimensions, 'screenshot': screenshot,
                                 'dossierStatus': response.status, 'dossierMint': MINT, 'metadataImages': images,
                                 'copiedDossierUrl': copied, 'pageErrors': errors, 'capturedAt': datetime.now(timezone.utc).isoformat()})
        page.close()
    browser.close()
Path(args.evidence).write_text(json.dumps(proof, indent=2) + '\n')
print(json.dumps({'http': proof['http'], 'browser': proof['browser']}, indent=2))
