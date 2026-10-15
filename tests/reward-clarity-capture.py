"""Genuine issue #59 captures. Run against local production main (before) or this branch (after).
Public source egress required. No mocked requests or altered screenshots.
"""
import argparse,json,re
from pathlib import Path
from datetime import datetime,timezone
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright
p=argparse.ArgumentParser();p.add_argument('--base',required=True);p.add_argument('--phase',required=True,choices=['before','after']);p.add_argument('--prefix',default='reward-clarity');p.add_argument('--root',default=str(Path(__file__).resolve().parents[1]));a=p.parse_args();root=Path(a.root)
assert re.fullmatch('[a-z][a-z0-9-]{0,39}',a.prefix)
u=urlparse(a.base);assert u.scheme=='http' and u.hostname in ['localhost','127.0.0.1'] and not u.username and not u.password and u.path in ['','/'] and not u.query and not u.fragment
(root/'docs/screenshots').mkdir(exist_ok=True);(root/'docs/evidence').mkdir(exist_ok=True)
proof={'at':datetime.now(timezone.utc).isoformat(),'phase':a.phase,'method':'Unmodified local production app, real upstream API responses. Chromium screenshots; no route interception or image editing. Results scrolled to selected NVDAX heading.','captures':[]}
with sync_playwright() as pw:
 b=pw.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-gpu','--disable-gpu-compositing','--disable-features=PaintHolding'])
 for w in [390,320,1280]:
  c=b.new_context(viewport={'width':w,'height':844},device_scale_factor=1,reduced_motion='reduce');page=c.new_page();page.add_init_script('''(()=>{const f=window.fetch.bind(window);window.__packets=[];window.fetch=async(...args)=>{const r=await f(...args);r.clone().json().then(json=>window.__packets.push({url:String(args[0]),status:r.status,json})).catch(()=>{});return r;};})();''')
  page.goto(a.base,wait_until='domcontentloaded');button=page.get_by_role('button',name=re.compile('^Choose NVDAX'));button.wait_for(state='visible');page.wait_for_function("!document.querySelector('.pair-chips button').disabled",timeout=60000)
  page.screenshot(path=str(root/f'docs/screenshots/{a.prefix}-{a.phase}-home-{w}.png'))
  button.click();page.locator('.pair-token').first.wait_for(timeout=60000);page.wait_for_function("!document.querySelector('.pair-sample-refresh').disabled");page.wait_for_timeout(300)
  assert page.get_by_role('button',name='Sort sample by liquidity, high to low',exact=True).get_attribute('aria-pressed')=='true'
  page.evaluate('document.activeElement.blur()');page.set_viewport_size({'width':w+1,'height':844});page.set_viewport_size({'width':w,'height':844});page.locator('.pair-result-heading').scroll_into_view_if_needed();page.evaluate("scrollTo(0,document.querySelector('.pair-result-heading').getBoundingClientRect().top+scrollY-12)");page.mouse.move(1,1);page.wait_for_timeout(300)
  rows=page.locator('.pair-token');measure=rows.evaluate_all('(rs)=>rs.slice(0,6).map(r=>({text:r.innerText,top:r.getBoundingClientRect().top,bottom:r.getBoundingClientRect().bottom,height:r.getBoundingClientRect().height}))')
  assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
  packets=page.evaluate('window.__packets');sample=next(p['json'] for p in packets if '/api/pairs?' in p['url'])
  cov=sample['dataset']['coverage'];mint='Xsc9qvGR1efVDFGLrVsmkzv3qi45LTBjeUKSPmx9qEh'
  assert len(sample['groups'])==1 and sample['groups'][0]['quoteMint']==mint
  assert all(t['quoteMint']==mint for t in sample['groups'][0]['tokens'])
  assert not cov['complete'] and not cov['atomic'] and cov['discovery']['strategy']=='provider_quote_mint' and cov['tokensReturned']<=50
  if a.phase=='after':assert all(r['top']>=0 and r['bottom']<=844 for r in measure),measure
  page.screenshot(path=str(root/f'docs/screenshots/{a.prefix}-{a.phase}-{w}.png'))
  proof['captures'].append({'width':w,'height':844,'sort':'liquidity descending in both comparisons','rowCount':rows.count(),'firstSix':measure,'sixFullyVisible':all(r['top']>=0 and r['bottom']<=844 for r in measure),'responses':page.evaluate('window.__packets')})
  if a.phase=='after':
   page.get_by_role('button',name='Sort sample by volume, high to low',exact=True).click();page.evaluate('document.activeElement.blur()');page.mouse.move(1,1);page.wait_for_timeout(100);page.screenshot(path=str(root/f'docs/screenshots/{a.prefix}-after-volume-{w}.png'))
  c.close()
 b.close()
(root/f'docs/evidence/{a.prefix}-{a.phase}.json').write_text(json.dumps(proof,separators=(',',':'))+'\n')
print(json.dumps({k:v for k,v in proof.items() if k!='captures'}));print(json.dumps([{k:v for k,v in c.items() if k!='responses'} for c in proof['captures']]))
