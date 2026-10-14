"""Supplemental genuine error capture after the main browser run.
No fixtures. Requires its four scoped readers still warm (or a cold admission window).
A resize refreshes headless Chromium's raster without editing page data or images.
"""
import argparse,json,re
from pathlib import Path
from datetime import datetime,timezone
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright
p=argparse.ArgumentParser();p.add_argument('--base',required=True);a=p.parse_args();u=urlparse(a.base)
assert u.scheme=='http' and u.hostname in ['localhost','127.0.0.1'] and not u.username and not u.password and u.path in ['','/'] and not u.query and not u.fragment
root=Path(__file__).resolve().parents[1]
with sync_playwright() as pw:
 b=pw.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-gpu','--disable-gpu-compositing','--disable-features=PaintHolding']);c=b.new_context(viewport={'width':390,'height':844},device_scale_factor=2,reduced_motion='reduce');page=c.new_page()
 page.add_init_script('''(()=>{const original=window.fetch.bind(window);window.__pairPackets=[];window.fetch=async(...args)=>{const r=await original(...args);r.clone().json().then(json=>window.__pairPackets.push({url:String(args[0]),status:r.status,json})).catch(()=>{});return r;};})();''')
 page.goto(a.base,wait_until='domcontentloaded');page.wait_for_function("document.querySelector('.pair-featured')?.getAttribute('aria-busy')==='false'")
 page.locator('#pair-search').fill('STONK');page.locator('.pair-registry-list button').first.wait_for();page.wait_for_function("window.__pairPackets.some(p=>p.url.includes('query=STONK'))")
 r=next(p['json'] for p in reversed(page.evaluate('window.__pairPackets')) if 'query=STONK' in p['url']);same=[q for q in r['quotes'] if q['quoteSymbol'].lower()=='stonk'];assert len(same)>=3
 def capture(name):
  page.evaluate('document.activeElement.blur()');page.set_viewport_size({'width':391,'height':844});page.set_viewport_size({'width':390,'height':844});page.mouse.move(1,1);page.evaluate('scrollTo(0,0)');page.wait_for_timeout(500)
  assert page.evaluate('innerWidth===390 && document.documentElement.scrollWidth<=innerWidth')
  page.screenshot(path=str(root/'docs/screenshots'/name),full_page=False)
 q=next(q for q in same if q['quoteMint']!='6GmAFSYs4gk3FDao5FzzySQpPZaWsa4rUJHacpMpUNgx');page.get_by_role('button',name=re.compile('^Select .*'+q['quoteMint']+'$')).click()
 page.wait_for_function("window.__pairPackets.some(p=>p.url.includes('/api/pairs?'))");page.locator('.pair-result-heading>button:not([disabled])').wait_for()
 sample=next(p for p in page.evaluate('window.__pairPackets') if '/api/pairs?' in p['url']);assert sample['status']==503,sample['status'];assert page.locator('.pair-token').count()==0
 capture('pair-simple-after-unavailable-390.png')
 (root/'docs/evidence/pair-simple-supplement.json').write_text(json.dumps({'capturedAt':datetime.now(timezone.utc).isoformat(),'width':390,'height':844,'deviceScaleFactor':2,'method':'Native viewport resize 390→391→390 refreshes raster; browser screenshots, no image/data editing','checks':['three distinct same-ticker registry identities','genuine scoped503 with zero old token rows','390px layout/no overflow'],'responses':page.evaluate('window.__pairPackets')},separators=(',',':'))+'\n');b.close()
print('PASS 3 genuine supplemental capture checks')
