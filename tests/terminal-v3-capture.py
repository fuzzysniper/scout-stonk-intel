"""Unedited, genuine local production captures for Issue #72. Never route/mock source data."""
import argparse,json,re
from pathlib import Path
from datetime import datetime,timezone
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright
p=argparse.ArgumentParser();p.add_argument('--base',required=True);p.add_argument('--phase',choices=['before','after'],required=True);a=p.parse_args();u=urlparse(a.base)
assert u.scheme=='http' and u.hostname in ['localhost','127.0.0.1'] and u.path in ['', '/'] and not u.query and not u.fragment
root=Path(__file__).resolve().parents[1];prefix='terminal-v3';mint='Xsc9qvGR1efVDFGLrVsmkzv3qi45LTBjeUKSPmx9qEh';si='DEW9dSN6QpWyNthphCpMmAbZP1Q4cEKR9xQXAri98WDP'
recorder='''(()=>{const f=window.fetch.bind(window);window.__packets=[];window.__requests=[];window.fetch=async(...args)=>{const item={url:String(args[0]),start:performance.now()};window.__requests.push(item);const r=await f(...args);item.end=performance.now();item.status=r.status;r.clone().json().then(json=>window.__packets.push({url:String(args[0]),status:r.status,json})).catch(()=>{});return r;};})();'''
proof={'at':datetime.now(timezone.utc).isoformat(),'phase':a.phase,'productionBuildId':(root/'.next/BUILD_ID').read_text().strip(),'method':'Real local production app/upstream responses. Unedited Chromium screenshots, no route interception or fixtures. Mobile touch emulation, not physical Safari/system keyboard proof.','captures':[]}
with sync_playwright() as pw:
 b=pw.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-gpu','--disable-gpu-compositing','--disable-features=PaintHolding'])
 for w in [390,320,1280]:
  c=b.new_context(viewport={'width':w,'height':844},is_mobile=w<=390,has_touch=w<=390,device_scale_factor=1,reduced_motion='reduce');c.add_init_script(recorder);page=c.new_page();page.goto(a.base)
  page.wait_for_function("document.querySelector('.pair-featured')?.getAttribute('aria-busy')==='false'" if a.phase=='before' else "document.querySelector('[data-registry-state]')?.dataset.registryState==='ready'",timeout=60000)
  initial=page.evaluate('window.__requests');page.mouse.move(1,1);page.screenshot(path=str(root/f'docs/screenshots/{prefix}-{a.phase}-home-{w}.png'))
  search=page.locator('#pair-search');search.fill('NVDAX');page.get_by_role('button',name=re.compile('^Select NVDAX')).first.wait_for() if a.phase=='before' else page.get_by_role('option',name=re.compile('^NVDAX')).first.wait_for();page.wait_for_timeout(100)
  page.screenshot(path=str(root/f'docs/screenshots/{prefix}-{a.phase}-search-{w}.png'))
  # Exact-mint query records an independently testable registry packet as well.
  search.fill(mint)
  if a.phase=='before':page.get_by_role('button',name=re.compile('^Select NVDAX')).click()
  else:page.get_by_role('option',name=re.compile('^NVDAX')).wait_for();page.keyboard.press('ArrowDown');page.keyboard.press('Enter')
  page.locator('.pair-token').first.wait_for(timeout=60000);page.locator('.pair-sample-refresh:not([disabled])').wait_for();page.wait_for_timeout(200);page.evaluate('scrollTo(0,0)');page.mouse.move(1,1)
  page.screenshot(path=str(root/f'docs/screenshots/{prefix}-{a.phase}-selected-{w}.png'))
  selection_focus=page.evaluate('({tag:document.activeElement.tagName,id:document.activeElement.id,editable:document.activeElement.matches("input,textarea,[contenteditable=true]")})')
  above=page.locator('.pair-token').evaluate_all('(rs)=>rs.slice(0,6).map(r=>({top:r.getBoundingClientRect().top,bottom:r.getBoundingClientRect().bottom,height:r.getBoundingClientRect().height,text:r.innerText}))')
  page.evaluate("scrollTo(0,document.querySelector('.pair-result-heading').getBoundingClientRect().top+scrollY-12)");page.screenshot(path=str(root/f'docs/screenshots/{prefix}-{a.phase}-list-{w}.png'))
  measure=page.locator('.pair-token').evaluate_all('(rs)=>rs.slice(0,6).map(r=>({top:r.getBoundingClientRect().top,bottom:r.getBoundingClientRect().bottom,height:r.getBoundingClientRect().height,text:r.innerText}))')
  assert all(r['height']==65 for r in measure);assert all(r['bottom']<=844 for r in measure)
  row=page.locator('[aria-labelledby="pair-token-'+si+'"]');row.locator('.pair-detail-toggle').click();row.evaluate('r=>scrollTo(0,r.getBoundingClientRect().top+scrollY-12)');page.screenshot(path=str(root/f'docs/screenshots/{prefix}-{a.phase}-quick-{w}.png'))
  packets=page.evaluate('window.__packets');sample=next(p['json'] for p in packets if '/api/pairs?' in p['url']);assert sample['groups'][0]['quoteMint']==mint
  entry={'width':w,'height':844,'initialRequests':initial,'requests':page.evaluate('window.__requests'),'rowCount':page.locator('.pair-token').count(),'selectedAboveFold':above,'firstSix':measure,'responses':packets,'selectionFocus':selection_focus}
  row.locator('.pair-token-name').click();page.locator('.token-brief[aria-busy=false]').wait_for(timeout=60000);page.evaluate('scrollTo(0,0)');page.screenshot(path=str(root/f'docs/screenshots/{prefix}-{a.phase}-dossier-{w}.png'));page.wait_for_timeout(200);entry['dossierResponses']=page.evaluate('window.__packets');assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
  proof['captures'].append(entry);c.close();print(a.phase,w,'captured',flush=True)
 b.close()
(root/f'docs/evidence/{prefix}-{a.phase}.json').write_text(json.dumps(proof,separators=(',',':'))+'\n')
