"""Issue #55 screener QA. Real warm-source checks and explicitly isolated fixture checks.
Run after pair-screener-capture.py --phase after. Fixtures are never screenshot sources.
Requires Playwright, Chromium and axe 4.10.3; no repository dependency changes.
"""
import argparse,copy,json,re,hashlib
from pathlib import Path
from datetime import datetime,timezone
from urllib.parse import urlparse,parse_qs
from playwright.sync_api import sync_playwright
p=argparse.ArgumentParser();p.add_argument('--base',required=True);p.add_argument('--axe',required=True);a=p.parse_args();u=urlparse(a.base)
assert u.scheme=='http' and u.hostname in ['localhost','127.0.0.1'] and not u.username and not u.password and u.path in ['','/'] and not u.query and not u.fragment
root=Path(__file__).resolve().parents[1];proof=json.loads((root/'docs/evidence/pair-screener-after.json').read_text());packets=proof['captures'][0]['responses'];checks=[]
registry={parse_qs(urlparse(p['url']).query)['mint'][0]:p['json'] for p in packets if '/api/pair-quotes?' in p['url']}
catalog=next(p['json'] for p in packets if '/api/pairs?' in p['url']);radar=next(p['json'] for p in packets if '/api/radar?' in p['url']);mint=catalog['groups'][0]['quoteMint'];assert len(registry)==4
recorder='''(()=>{const f=window.fetch.bind(window);window.__packets=[];window.fetch=async(...args)=>{const r=await f(...args);r.clone().json().then(json=>window.__packets.push({url:String(args[0]),status:r.status,json})).catch(()=>{});return r;};})();'''
def check(w,name,**extra):
 checks.append({'width':w,'check':name,'result':'PASS',**extra});print(w,name,flush=True)
def audit(page):
 assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),page.evaluate('[innerWidth,document.documentElement.scrollWidth]')
 page.add_script_tag(path=a.axe);r=page.evaluate("async()=>axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}})");assert not r['violations'],[(v['id'],[n['target'] for n in v['nodes']]) for v in r['violations']];return len(r['passes'])
def context(b,w):
 c=b.new_context(viewport={'width':w,'height':844},reduced_motion='reduce',has_touch=w<=390,is_mobile=w<=390);c.add_init_script(recorder);return c
def ready(page):page.wait_for_function("document.querySelector('.pair-featured')?.getAttribute('aria-busy')==='false'")
def select(page):
 page.get_by_role('button',name=re.compile('^Choose NVDAX')).click();page.locator('.pair-sample-refresh:not([disabled])').wait_for();page.wait_for_timeout(100)
def ids(page):return page.locator('.pair-token').evaluate_all("rs=>rs.map(r=>r.getAttribute('aria-labelledby').replace('pair-token-',''))")
def sorting(page,data):
 rows=data['groups'][0]['tokens'];original=set(t['mint'] for t in rows);before=len(page.evaluate('window.__packets'));assert set(ids(page))==original
 for sort,key in [('liquidity','liquidityUsd'),('volume','volume24hUsd'),('name',None)]:
  page.get_by_role('button',name='Sort sample by '+sort+', '+('A to Z' if sort=='name' else 'high to low'),exact=True).click();order=ids(page);assert set(order)==original and len(order)==len(rows)
  ordered=[next(t for t in rows if t['mint']==m) for m in order]
  if key:
   values=[t['market'][key] if t['market']['status']=='reported_snapshot' else None for t in ordered];known=[v for v in values if v is not None];assert known==sorted(known,reverse=True);assert values==known+[None]*(len(values)-len(known))
  else:assert page.evaluate('(names)=>names.every((n,i)=>!i || names[i-1].localeCompare(n,"en")<=0)',[t['name'] for t in ordered])
 assert len(page.evaluate('window.__packets'))==before,'sorting must not fetch'
with sync_playwright() as pw:
 b=pw.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-gpu','--disable-gpu-compositing','--disable-features=PaintHolding'])
 for w in [320,390,1280]:
  c=context(b,w);page=c.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.goto(a.base);ready(page)
  # The untouched landing view should also be pixel-identical to baseline at each viewport.
  before=root/f'docs/screenshots/pair-screener-before-home-{w}.png';after=root/f'docs/screenshots/pair-screener-after-home-{w}.png'
  same=hashlib.sha256(before.read_bytes()).digest()==hashlib.sha256(after.read_bytes()).digest();assert same
  assert page.locator('.pair-chips button:not([disabled])').count()==4
  assert not any('/api/pairs?' in p['url'] or '/api/radar?' in p['url'] for p in page.evaluate('window.__packets'))
  page.keyboard.press('Tab');assert page.evaluate('document.activeElement.classList.contains("skip-content")');page.keyboard.press('Enter');assert page.evaluate('document.activeElement.id==="scout-content"')
  check(w,'landing pixel-identical to main; four verified choices; skip link; no token fanout')
  select(page);data=next(p['json'] for p in page.evaluate('window.__packets') if '/api/pairs?' in p['url']);assert data['groups'][0]['quoteMint']==mint
  assert page.get_by_role('button',name='Sort sample by liquidity, high to low',exact=True).get_attribute('aria-pressed')=='true';sorting(page,data);rules=audit(page)
  assert page.locator('.pair-column-head .pair-liquidity').is_visible()
  assert page.locator('.pair-column-head .pair-volume').is_visible()==(w>=760)
  assert page.locator('.pair-results-sort [aria-pressed=true]').count()==1
  assert page.locator('.pair-token-name').evaluate_all('ls=>ls.every(a=>a.getBoundingClientRect().height>=44)')
  check(w,'real exact-mint rows; local name/liquidity/volume order; stable membership; zero additional requests',axePassedRules=rules)
  page.get_by_role('button',name='Sort sample by liquidity, high to low',exact=True).click();page.evaluate("scrollTo(0,document.querySelector('.pair-result-heading').getBoundingClientRect().top+scrollY-12)")
  assert page.locator('.pair-token').evaluate_all('rs=>rs.slice(0,6).every(r=>r.getBoundingClientRect().bottom<=innerHeight)')
  first=page.locator('.pair-token').first;token=next(t for t in data['groups'][0]['tokens'] if t['mint']==ids(page)[0]);summary=first.locator('.pair-detail-toggle');assert summary.bounding_box()['height']>=44
  assert first.locator('.pair-row-state').count()==1;assert first.locator('.pair-row-main').bounding_box()['height']<=66;assert not first.locator('time:visible').count()
  summary.focus();page.keyboard.press('Enter');assert summary.get_attribute('aria-expanded')=='true' and first.locator('.pair-evidence-body').is_visible()
  detail=first.locator('.pair-evidence-body');assert token['mint'] in detail.inner_text() and mint in detail.inner_text();assert detail.get_by_role('link',name='Official token catalog',exact=False).get_attribute('href')==token['source']
  for label in ['Historical quote-relative return','Quote-asset benchmark return','Holder-attributable rewards']:assert label in detail.inner_text()
  for key,selector in [('liquidityUsd','.pair-liquidity'),('volume24hUsd','.pair-volume')]:
   dd=first.locator('.pair-market '+selector+' dd');value=token['market'][key]
   if value is None:assert dd.text_content()=='—Unavailable'
   elif value==0:assert dd.text_content()=='$0'
   else:
    text=dd.text_content().removeprefix('$').replace(',','');scale={'K':1e3,'M':1e6,'B':1e9,'T':1e12}.get(text[-1],1);number=float(text[:-1] if scale!=1 else text)*scale
    assert abs(number-value)<=max(0.005,0.05*scale),[number,value]
  assert first.locator('time').count()>0;assert detail.get_by_role('link',name='Token dossier',exact=False).get_attribute('href')=='/?mint='+token['mint']
  assert detail.locator('a').evaluate_all('ls=>ls.every(a=>a.getBoundingClientRect().height>=44)')
  # Source/dossier links are next in keyboard order after the disclosure, with a native focus indicator.
  page.keyboard.press('Tab');assert page.evaluate('document.activeElement.tagName==="A"')
  audit(page)
  if w==390:
   page.evaluate("document.activeElement.blur();scrollTo(0,document.querySelector('.pair-result-heading').getBoundingClientRect().top+scrollY-12)");page.screenshot(path=str(root/'docs/screenshots/pair-screener-after-details-390.png'))
  detail.locator('a').first.focus();page.keyboard.press('Escape');assert page.evaluate('document.activeElement.classList.contains("pair-detail-toggle")');assert summary.get_attribute('aria-expanded')=='false' and not first.locator('.pair-evidence-body').is_visible()
  summary.focus();page.keyboard.press('Space');assert summary.get_attribute('aria-expanded')=='true';page.keyboard.press('Space');assert summary.get_attribute('aria-expanded')=='false'
  if w<=390:
   summary.tap();assert summary.get_attribute('aria-expanded')=='true';summary.tap();assert summary.get_attribute('aria-expanded')=='false'
  pair_evidence=page.locator('.pair-dataset');pair_summary=pair_evidence.locator('summary');pair_summary.focus();page.keyboard.press('Enter')
  assert pair_evidence.get_attribute('open') is not None and mint in pair_evidence.inner_text()
  assert pair_evidence.get_by_role('link',name='Sample JSON',exact=True).get_attribute('href')=='/api/pairs?quoteMint='+mint+'&discovery=pair'
  audit(page);page.keyboard.press('Space');assert pair_evidence.get_attribute('open') is None
  check(w,'first six visible; 44px Details disclosure and evidence/dossier links; Enter/Space/Tab/Escape; provenance and financial gates')
  # Browser zoom changes available layout space; exercise long evidence at 200%, not just a screenshot scale.
  page.evaluate("document.documentElement.style.zoom='2'");summary.focus();page.keyboard.press('Enter');audit(page);assert not errors
  assert detail.bounding_box()['y']>=first.locator('.pair-row-main').bounding_box()['y']+first.locator('.pair-row-main').bounding_box()['height'],'evidence must follow the enlarged scan row without overlap'
  check(w,'200% zoom reflow including open evidence; no horizontal overflow; axe A/AA; no browser exceptions');c.close()
 # Isolated fixtures are derivatives of the saved real contract, explicitly synthetic.
 for w in [320,390,1280]:
  for state in ['zero-null','reward-states','stale','invalid','degraded','long-name','503','429','empty','identity','scope']:
   c=context(b,w);data=copy.deepcopy(catalog);g=data['groups'][0];status=200
   if state=='zero-null':
    g['tokens'][0]['market'].update(status='reported_snapshot',priceUsd=0,liquidityUsd=0,volume24hUsd=0)
    g['tokens'][1]['market'].update(status='unavailable',priceUsd=None,liquidityUsd=None,volume24hUsd=None)
   if state in ['reward-states','stale','invalid']:
    t=g['tokens'][0];source={**t['provenance'],'source':'https://www.stonkfun.xyz/api/v2/tokens/'+t['mint']+'/rewards'}
    t.update(mode='reward',rewardModeVerified=True,modeVerification='verified_reward',rewardSource=source,historyStatus='not_tracked',historyFreshness='unavailable')
    if state=='stale':t.update(historyFreshness='stale',historyStatus='recorded')
    if state=='invalid':t.update(historyStatus='invalid_data')
    if state=='reward-states':
     g['tokens'][1].update(mode='reward',rewardModeVerified=False,modeVerification='source_unavailable',rewardSource=None)
     t=g['tokens'][2];t.update(mode='standard',rewardModeVerified=False,modeVerification='verified_standard',rewardSource={**t['provenance'],'source':'https://www.stonkfun.xyz/api/v2/tokens/'+t['mint']+'/rewards'})
   if state=='long-name':g['tokens'][0].update(symbol='長い名前🐋'*4,name='Synthetic long name モモ太 '*6)
   if state=='degraded':data.update(status='degraded');data['dataset']['sourceStatus']='degraded'
   if state in ['503','429']:data={'error':'synthetic-private-error'};status=int(state)
   if state=='empty':
    g.update(tokens=[],verification='official_registry_only',availability='no_tokens_in_bounded_sample');data['dataset']['coverage'].update(tokensReturned=0)
   if state=='identity':g['quoteName']='Synthetic wrong quote identity'
   if state=='scope':data['dataset']['coverage']['discovery']['quoteMint']=next(m for m in registry if m!=mint)
   c.route('**/api/pair-quotes?*',lambda route:route.fulfill(json=registry[parse_qs(urlparse(route.request.url).query)['mint'][0]]))
   c.route('**/api/pairs?*',lambda route:route.fulfill(status=status,json=data));c.route('**/api/radar?*',lambda route:route.fulfill(json=radar));page=c.new_page();page.goto(a.base);ready(page);select(page)
   if state in ['503','429','identity','scope']:
    assert page.locator('.pair-token').count()==0;assert 'synthetic-private-error' not in page.locator('body').inner_text();assert 'Identity changed' in page.locator('.pair-load-state').inner_text() if state=='identity' else 'temporarily unavailable' in page.locator('.pair-load-state').inner_text()
   elif state=='empty':assert page.locator('.pair-token').count()==0 and 'outside these fetched pages' in page.locator('.pair-empty').inner_text()
   else:
    assert len(ids(page))==len(g['tokens']);sorting(page,data)
    if state=='zero-null':
     row=page.locator('[aria-labelledby="pair-token-'+g['tokens'][0]['mint']+'"]');assert row.locator('.pair-market dd').evaluate_all('ds=>ds.every(d=>d.textContent==="$0")')
     row=page.locator('[aria-labelledby="pair-token-'+g['tokens'][1]['mint']+'"]');assert row.locator('.pair-market dd').evaluate_all('ds=>ds.every(d=>d.textContent==="—Unavailable")')
    if state=='reward-states':
     for token,text in zip(g['tokens'][:3],['Mode checked','Check failed','Standard mode']):assert text in page.locator('[aria-labelledby="pair-token-'+token['mint']+'"] .pair-row-state').inner_text()
    if state in ['stale','invalid']:assert state.capitalize()+' history' in page.locator('[aria-labelledby="pair-token-'+g['tokens'][0]['mint']+'"] .pair-row-state').inner_text()
    if state=='degraded':assert 'Source gaps in this sample' in page.locator('.pair-load-state').inner_text()
   before=len(page.evaluate('window.__packets'));page.wait_for_timeout(350);assert before==len(page.evaluate('window.__packets'));audit(page);check(w,'isolated '+state+': truthful states, no retries, accessible');c.close()
 b.close()
(root/'docs/evidence/pair-screener-qa.json').write_text(json.dumps({'at':datetime.now(timezone.utc).isoformat(),'engine':'Chromium / axe-core 4.10.3','limits':'Automated browser, keyboard and semantic checks; not physical-device or VoiceOver testing. No fixture screenshots.','checks':checks},separators=(',',':'))+'\n')
print('PASS',len(checks),'checks')
