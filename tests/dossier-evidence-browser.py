"""Issue #69 dossier evidence QA. Genuine production journeys, then isolated synthetic edge cases.
Never take screenshots in fixture contexts. Physical iPhone/Safari/VoiceOver needs human acceptance.
"""
import argparse,copy,json,re
from pathlib import Path
from datetime import datetime,timezone
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright
p=argparse.ArgumentParser();p.add_argument('--base',required=True);p.add_argument('--axe',required=True);p.add_argument('--fixtures',required=True);p.add_argument('--prefix',default='dossier-evidence');a=p.parse_args();u=urlparse(a.base)
assert u.scheme=='http' and u.hostname in ['localhost','127.0.0.1'] and u.path in ['', '/'] and not u.query and not u.fragment
assert re.fullmatch('[a-z][a-z0-9-]{0,39}',a.prefix)
root=Path(__file__).resolve().parents[1];proof=json.loads((root/f'docs/evidence/{a.prefix}-after.json').read_text());offline=json.loads(Path(a.fixtures).read_text());assert offline['kind']=='synthetic_frontend_test_cases_never_screenshots'
checks=[];genuine=[];SI='DEW9dSN6QpWyNthphCpMmAbZP1Q4cEKR9xQXAri98WDP';CHONK='FeAWY9L9hr82TvTuEyi328V9FP7GxVuGLx7xNg6kzWVa';QUOTE='Xsc9qvGR1efVDFGLrVsmkzv3qi45LTBjeUKSPmx9qEh'
packets=proof['captures'][0]['dossierResponses'];market=next(p['json'] for p in packets if p['url']=='/api/token?mint='+SI);legacy=next(p['json'] for p in packets if p['url']=='/api/rewards?mint='+SI);history=next(p['json'] for p in packets if p['url']=='/api/history?mint='+SI)
recorder='''(()=>{const f=window.fetch.bind(window);window.__packets=[];window.fetch=async(...args)=>{const r=await f(...args);r.clone().json().then(json=>window.__packets.push({url:String(args[0]),status:r.status,json})).catch(()=>{});return r;};})();'''
def check(w,name,**extra):checks.append({'width':w,'check':name,'result':'PASS',**extra});print(w,name,flush=True)
def context(b,w):
 c=b.new_context(viewport={'width':w,'height':844},is_mobile=w<=390,has_touch=w<=390,reduced_motion='reduce',permissions=['clipboard-read','clipboard-write']);c.add_init_script(recorder);return c
def loaded(page):
 page.locator('.token-brief[aria-busy=false]').wait_for(timeout=60000)
 page.wait_for_function("document.title.includes('SCOUT') && !!document.querySelector('meta[property=\"og:image\"]')")
def audit(page):
 assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
 page.add_script_tag(path=a.axe);r=page.evaluate("async()=>axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}})");assert not r['violations'],[(v['id'],[n['target'] for n in v['nodes']]) for v in r['violations']]
def folded(page):
 assert page.locator('.brief-conclusion h3').count()==1 and page.locator('.brief-qualifier').count()==1
 assert page.locator('.dossier-details').get_attribute('open') is None and not page.locator('.brief-evidence').is_visible()
 assert page.locator('.brief-sharing').get_attribute('open') is None and not page.locator('.brief-actions button').first.is_visible()
 assert page.locator('.lookup-disclosure').get_attribute('open') is None
 assert page.evaluate('!document.activeElement.matches("input,textarea,[contenteditable=true]")')
with sync_playwright() as pw:
 b=pw.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-gpu','--disable-gpu-compositing','--disable-features=PaintHolding'])
 for w in [320,390,1280]:
  for mint in [SI,CHONK]:
   c=context(b,w);page=c.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.goto(a.base+'/?mint='+mint);loaded(page);folded(page);audit(page)
   visible=page.locator('main').inner_text();assert mint not in visible and QUOTE not in visible
   for part in ['.brief-conclusion','.brief-qualifier','.brief-official','.dossier-details>summary']:
    box=page.locator(part).bounding_box();assert box['y']>=0 and box['y']+box['height']<=844,box
   link=page.get_by_role('link',name='View official evidence',exact=False);href=link.get_attribute('href');assert href in ['https://www.stonkfun.xyz/api/v2/tokens/'+mint+'/rewards','https://www.stonkfun.xyz/api/public/v1/tokens/'+mint+'/rewards']
   assert link.get_attribute('target')=='_blank' and link.get_attribute('rel')=='noopener noreferrer' and link.bounding_box()['height']>=44
   captured=page.evaluate('window.__packets');raw=next(x['json'] for x in captured if '/api/pairs?' in x['url']);token=next((t for g in raw['groups'] for t in g['tokens'] if t['mint']==mint),None);e=token.get('rewardEvidence') if token else None
   if e and e['interval']['state']=='covered':expected='No reward counter increase recorded' if e['interval']['value']['current']['distributed']['atomic']=='0' else 'Reward counter increase recorded'
   elif e and e['mechanism']['state']=='verified_standard':expected='Provider reports no holder reward mode'
   elif e and e['mechanism']['state']=='verified_reward' and e['lifetime']['state']!='reported':expected='Reward settings confirmed by provider'
   else:expected='Recent reward activity not verified'
   assert page.locator('.brief-conclusion h3').inner_text()==expected
   assert len([x for x in captured if '/api/pairs?' in x['url']])==1
   h=next(x['json'] for x in captured if '/api/history?' in x['url'])
   if h['status']=='recorded' and h['latestObservedAt']:
    stamp=datetime.fromisoformat(h['latestObservedAt'].replace('Z','+00:00')).strftime('%d %b %Y, %H:%M UTC');assert stamp in page.locator('.brief-qualifier').inner_text()
   genuine.append({'width':w,'mint':mint,'finding':page.locator('.brief-conclusion').inner_text(),'official':href,'responses':captured})
   if mint==CHONK:
    page.screenshot(path=str(root/f'docs/screenshots/{a.prefix}-unverified-{w}.png'))
   # Same-tab reading must not be hijacked; keyboard activates a genuine new-tab link.
   link.focus();assert page.evaluate('document.activeElement.classList.contains("brief-official")')
   page.keyboard.press('Tab');assert page.evaluate('document.activeElement===document.querySelector(".brief-sharing>summary")')
   page.keyboard.press('Enter');page.get_by_role('button',name=re.compile('^Copy research')).click();assert page.evaluate('navigator.clipboard.readText()')==a.base+'/?mint='+mint
   page.keyboard.press('Escape');assert page.locator('.brief-sharing').get_attribute('open') is None and page.locator('.brief-sharing>summary').evaluate('s=>s===document.activeElement')
   summary=page.locator('.dossier-details>summary');summary.focus();page.keyboard.press('Enter');audit(page);assert mint in page.locator('.brief-evidence').inner_text();assert page.get_by_role('link',name='Reward JSON',exact=True).get_attribute('href')=='/api/rewards?mint='+mint
   page.keyboard.press('Escape');assert page.locator('.dossier-details').get_attribute('open') is None and summary.evaluate('s=>s===document.activeElement')
   page.evaluate("document.documentElement.style.zoom='2'");audit(page);page.evaluate("document.documentElement.style.zoom='1'");assert not errors
   check(w,'genuine '+('SI' if mint==SI else 'CHONK')+': one finding/dated qualifier/direct exact-mint source above fold; only one bounded read; copy/share disclosure and Escape/focus; zoom/axe; no editable focus');c.close()
 # Only isolated fixtures below; no screenshot calls.
 cases=copy.deepcopy(offline['cases'])
 for name in ['forged-return','forged-source','forged-quote','forged-amount','unknown-contract']:
  data=copy.deepcopy(offline['cases']['covered']);e=data['catalog']['groups'][0]['tokens'][0]['rewardEvidence']
  if name=='forged-return':e['holderReturn']['value']=9
  if name=='forged-source':e['mechanism']['source']['source']='https://untrusted.invalid/rewards'
  if name=='forged-quote':e['unit']['mint']=SI
  if name=='forged-amount':e['lifetime']['value']['distributedTokens']='999'
  if name=='unknown-contract':data['catalog']['groups'][0]['tokens'][0]['rewardEvidence']=None
  cases[name]=data
 identity=copy.deepcopy(offline['cases']['rate-limited']);t=identity['catalog']['groups'][0]['tokens'][0];t['modeVerification']='identity_mismatch';t['rewardEvidence']['mechanism']['reason']='invalid_source';cases['identity-warning']=identity
 for w in [320,390,1280]:
  for name,data in cases.items():
   c=context(b,w);catalog=copy.deepcopy(data['catalog']);r=copy.deepcopy(legacy);h=copy.deepcopy(history)
   c.route('**/api/token?*',lambda route:route.fulfill(json=market));c.route('**/api/rewards?*',lambda route:route.fulfill(json=r));c.route('**/api/history?*',lambda route:route.fulfill(json=h));c.route('**/api/pairs?*',lambda route:route.fulfill(json=catalog))
   page=c.new_page();page.goto(a.base+'/?mint='+SI);loaded(page);folded(page)
   expected='Reward counter increase recorded' if name=='covered' else 'No reward counter increase recorded' if name=='covered-zero' else 'Reward settings confirmed by provider' if name in ['settings','stale-lifetime'] else 'Provider reports no holder reward mode' if name=='standard' else 'Recent reward activity not verified'
   assert page.locator('.brief-conclusion h3').inner_text()==expected
   text=page.locator('.brief-conclusion').inner_text();assert 'holder returns' in text.lower()
   if name in ['lifetime','zero','precise-lifetime']:assert 'lifetime total does not verify recent distributions' in text and '100.00000000' not in text
   if name=='covered':assert '24.00000000 NVDAX' in text and 'covered' in page.locator('.brief-qualifier').inner_text() and 'Payments not independently verified' in text
   if name=='covered-zero':assert '0.00000000 NVDAX' in text
   if name.startswith('forged') or name=='unknown-contract':assert page.locator('.brief-warning').inner_text().find('validation failed')>=0
   if name=='identity-warning':assert 'identity' in page.locator('.brief-warning').inner_text();assert not page.locator('.brief-official').count()
   audit(page);page.locator('.dossier-details>summary').click();audit(page);page.evaluate("document.documentElement.style.zoom='2'");audit(page)
   if name=='precise-lifetime':assert '119954640.83712182' in page.locator('.brief-evidence').inner_text()
   requests=page.evaluate('window.__packets');assert len([x for x in requests if '/api/pairs?' in x['url']])==1
   check(w,'isolated strict dossier '+name+': setup/lifetime/covered period/holder returns remain distinct, invalid facts withheld, source/clock preserved, reflow/axe; no fixture image');c.close()
 for w in [320,390,1280]:
  for name in ['no-record','wrong-source','wrong-mint','source-failed','catalog-failed','not-in-sample','quote-mismatch','wrong-market','fresh-retrieval-old-observation']:
   c=context(b,w);r=copy.deepcopy(legacy);m=copy.deepcopy(market);h=copy.deepcopy(history);catalog=copy.deepcopy(offline['cases']['lifetime']['catalog'])
   if name=='no-record':r.update(status='not_found')
   if name=='wrong-source':r['source']='https://untrusted.invalid/token'
   if name=='wrong-mint':r['mint']=CHONK
   if name=='wrong-market':m['mint']=CHONK
   if name=='quote-mismatch':catalog['dataset']['coverage']['discovery']['quoteMint']=SI
   if name=='not-in-sample':catalog['groups'][0].update(tokens=[],availability='no_tokens_in_bounded_sample',verification='official_registry_only');catalog['dataset']['coverage']['tokensReturned']=0
   if name=='fresh-retrieval-old-observation':h.update(fetchedAt=datetime.now(timezone.utc).isoformat(timespec='milliseconds').replace('+00:00','Z'));h['freshness']['status']='stale'
   c.route('**/api/token?*',lambda route:route.fulfill(json=m));c.route('**/api/rewards?*',lambda route:route.fulfill(status=502,json={'status':'unavailable'}) if name=='source-failed' else route.fulfill(json=r));c.route('**/api/history?*',lambda route:route.fulfill(json=h));c.route('**/api/pairs?*',lambda route:route.fulfill(status=503,json={'error':'private fixture error'}) if name=='catalog-failed' else route.fulfill(json=catalog))
   page=c.new_page();page.goto(a.base+'/?mint='+SI);loaded(page);folded(page);assert page.locator('.brief-conclusion h3').inner_text()=='Recent reward activity not verified'
   if name in ['no-record','wrong-source','wrong-mint','source-failed']:assert not page.locator('.brief-official').count();assert page.locator('.brief-official-unavailable').is_visible();assert not any('/api/pairs?' in x['url'] for x in page.evaluate('window.__packets'))
   if name=='not-in-sample':assert 'limited sample' in page.locator('.brief-conclusion').inner_text();assert 'no rewards' not in page.locator('.brief-conclusion').inner_text().lower()
   if name=='wrong-market':assert page.locator('.brief-market dd').all_text_contents()==['Unknown','Unknown'];assert 'Market identity' in page.locator('.brief-warning').first.inner_text()
   if name=='fresh-retrieval-old-observation':assert 'stale' in page.locator('.brief-qualifier').inner_text();assert datetime.fromisoformat(h['latestObservedAt'].replace('Z','+00:00')).strftime('%d %b %Y, %H:%M UTC') in page.locator('.brief-qualifier').inner_text()
   assert 'private fixture error' not in page.locator('main').inner_text();audit(page);check(w,'isolated '+name+': no false source action, freshness reset, market identity or absence claim; axe');c.close()
 b.close()
(root/f'docs/evidence/{a.prefix}-semantic-browser.json').write_text(json.dumps({'at':datetime.now(timezone.utc).isoformat(),'engine':'Chromium / axe-core 4.10.3','limits':'Touch viewport/keyboard automation, not physical iPhone/Safari system keyboard or VoiceOver acceptance. Fixtures isolated and never screenshot sources.','checks':checks,'genuine':genuine},separators=(',',':'))+'\n')
print('PASS',len(checks),'dossier evidence browser checks',flush=True)
