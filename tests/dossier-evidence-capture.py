"""Issue #69: unmodified production browser captures using real local API responses.
No interception, fixtures, image editing or clipboard/native-share stubs in this capture.
"""
import argparse,json,re
from pathlib import Path
from datetime import datetime,timezone
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright
p=argparse.ArgumentParser();p.add_argument('--base',required=True);p.add_argument('--phase',choices=['before','after'],required=True);a=p.parse_args()
u=urlparse(a.base);assert u.scheme=='http' and u.hostname in ['localhost','127.0.0.1'] and not u.query and not u.fragment and u.path in ['', '/']
root=Path(__file__).resolve().parents[1];prefix='dossier-evidence';si='DEW9dSN6QpWyNthphCpMmAbZP1Q4cEKR9xQXAri98WDP';quote='Xsc9qvGR1efVDFGLrVsmkzv3qi45LTBjeUKSPmx9qEh'
recorder='''(()=>{const f=window.fetch.bind(window);window.__packets=[];window.fetch=async(...args)=>{const r=await f(...args);r.clone().json().then(json=>window.__packets.push({url:String(args[0]),status:r.status,json})).catch(()=>{});return r;};})();'''
proof={'at':datetime.now(timezone.utc).isoformat(),'phase':a.phase,'productionBuildId':(root/'.next/BUILD_ID').read_text().strip(),'method':'Real local production app and upstream responses; unedited Chromium screenshots. No route interception or fixtures. Viewport 844px high; mobile touch contexts. Not physical iPhone evidence.','captures':[]}
with sync_playwright() as pw:
 b=pw.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-gpu','--disable-gpu-compositing','--disable-features=PaintHolding'])
 for w in [390,320,1280]:
  c=b.new_context(viewport={'width':w,'height':844},is_mobile=w<=390,has_touch=w<=390,device_scale_factor=1,reduced_motion='reduce');c.add_init_script(recorder);page=c.new_page();page.goto(a.base)
  page.wait_for_function("document.querySelector('.pair-featured')?.getAttribute('aria-busy')==='false'",timeout=60000)
  page.screenshot(path=str(root/f'docs/screenshots/{prefix}-{a.phase}-home-{w}.png'))
  page.get_by_role('button',name=re.compile('^Choose NVDAX')).click();page.locator('.pair-token').first.wait_for(timeout=60000);page.locator('.pair-sample-refresh:not([disabled])').wait_for();page.wait_for_timeout(250)
  page.evaluate("scrollTo(0,document.querySelector('.pair-result-heading').getBoundingClientRect().top+scrollY-12)")
  rows=page.locator('.pair-token');measure=rows.evaluate_all('(rs)=>rs.slice(0,6).map(r=>({text:r.innerText,top:r.getBoundingClientRect().top,bottom:r.getBoundingClientRect().bottom,height:r.getBoundingClientRect().height}))')
  page.mouse.move(1,1);page.screenshot(path=str(root/f'docs/screenshots/{prefix}-{a.phase}-list-{w}.png'))
  row=page.locator('[aria-labelledby="pair-token-'+si+'"]');row.locator('.pair-detail-toggle').click();row.evaluate('r=>scrollTo(0,r.getBoundingClientRect().top+scrollY-12)');page.wait_for_timeout(100)
  focus=page.evaluate('({tag:document.activeElement.tagName,id:document.activeElement.id,editable:document.activeElement.matches("input,textarea,[contenteditable=true]"),visualHeight:visualViewport.height})')
  page.screenshot(path=str(root/f'docs/screenshots/{prefix}-{a.phase}-quick-{w}.png'))
  quick_text=row.inner_text()
  technical=row.locator('details.quick-technical')
  if technical.count():technical.locator('summary').click()
  page.screenshot(path=str(root/f'docs/screenshots/{prefix}-{a.phase}-technical-{w}.png'))
  sample=next(p['json'] for p in page.evaluate('window.__packets') if '/api/pairs?' in p['url']);assert sample['groups'][0]['quoteMint']==quote
  entry={'width':w,'firstSix':measure,'rowCount':rows.count(),'quickFocus':focus,'quickVisibleText':quick_text,'responses':page.evaluate('window.__packets')}
  # Real token-name navigation; no direct URL substitution.
  row.locator('.pair-token-name').click();page.get_by_role('heading',name='Token dossier',exact=True).wait_for();page.wait_for_function("document.querySelector('.dossier')?.getAttribute('aria-busy')==='false' || document.querySelector('.reportstate')?.textContent==='● READ ONLY'",timeout=60000);page.wait_for_timeout(300);page.evaluate('scrollTo(0,0)')
  page.screenshot(path=str(root/f'docs/screenshots/{prefix}-{a.phase}-dossier-{w}.png'))
  entry['dossierAboveFold']=page.locator('main').inner_text();entry['dossierFocus']=page.evaluate('({tag:document.activeElement.tagName,editable:document.activeElement.matches("input,textarea,[contenteditable=true]"),visualHeight:visualViewport.height})')
  details=page.locator('details.dossier-details');details.locator('summary').first.click();page.wait_for_timeout(300);page.evaluate('scrollTo(0,0)');page.screenshot(path=str(root/f'docs/screenshots/{prefix}-{a.phase}-dossier-evidence-{w}.png'))
  page.wait_for_timeout(500);entry['dossierResponses']=page.evaluate('window.__packets');assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
  proof['captures'].append(entry);c.close();print(a.phase,w,'captured',flush=True)
 b.close()
(root/f'docs/evidence/{prefix}-{a.phase}.json').write_text(json.dumps(proof,separators=(',',':'))+'\n')
