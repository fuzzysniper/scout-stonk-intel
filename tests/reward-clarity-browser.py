"""Issue #59 reward clarity and research/share QA. Real warm-source checks and explicitly isolated fixture checks.
Run after reward-clarity-capture.py --phase after. Fixtures are never screenshot sources.
Requires Playwright, Chromium and axe 4.10.3; no repository dependency changes.
"""
import argparse,copy,json,re,hashlib,base64
from PIL import Image,ImageChops
from pathlib import Path
from datetime import datetime,timezone
from urllib.parse import urlparse,parse_qs
from playwright.sync_api import sync_playwright,Error as PlaywrightError
p=argparse.ArgumentParser();p.add_argument('--base',required=True);p.add_argument('--axe',required=True);p.add_argument('--prefix',default='reward-clarity');p.add_argument('--reward-fixtures');a=p.parse_args();u=urlparse(a.base)
assert re.fullmatch('[a-z][a-z0-9-]{0,39}',a.prefix)
assert u.scheme=='http' and u.hostname in ['localhost','127.0.0.1'] and not u.username and not u.password and u.path in ['','/'] and not u.query and not u.fragment
root=Path(__file__).resolve().parents[1];proof=json.loads((root/f'docs/evidence/{a.prefix}-after.json').read_text());packets=proof['captures'][0]['responses'];checks=[];journey=[];genuine_details=[];preview=None
registry={parse_qs(urlparse(p['url']).query)['mint'][0]:p['json'] for p in packets if '/api/pair-quotes?' in p['url']}
catalog=next(p['json'] for p in packets if '/api/pairs?' in p['url']);radar=next(p['json'] for p in packets if '/api/radar?' in p['url']);mint=catalog['groups'][0]['quoteMint'];assert len(registry)==4
recorder='''(()=>{const f=window.fetch.bind(window);window.__packets=[];window.fetch=async(...args)=>{const r=await f(...args);r.clone().json().then(json=>window.__packets.push({url:String(args[0]),status:r.status,json})).catch(()=>{});return r;};})();'''
def check(w,name,**extra):
 checks.append({'width':w,'check':name,'result':'PASS',**extra});print(w,name,flush=True)
def audit(page):
 assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),page.evaluate('[innerWidth,document.documentElement.scrollWidth]')
 page.add_script_tag(path=a.axe);r=page.evaluate("async()=>axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}})");assert not r['violations'],[(v['id'],[n['target'] for n in v['nodes']]) for v in r['violations']];return len(r['passes'])
def context(b,w):
 c=b.new_context(viewport={'width':w,'height':844},reduced_motion='reduce',has_touch=w<=390,is_mobile=w<=390,permissions=['clipboard-read','clipboard-write']);c.add_init_script(recorder);return c
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
  # Allow only tiny one-channel rasterization differences at rounded edges, never layout/text changes.
  before=root/f'docs/screenshots/{a.prefix}-before-home-{w}.png';after=root/f'docs/screenshots/{a.prefix}-after-home-{w}.png'
  same=hashlib.sha256(before.read_bytes()).digest()==hashlib.sha256(after.read_bytes()).digest()
  difference=ImageChops.difference(Image.open(before).convert('RGB'),Image.open(after).convert('RGB'))
  changed=sum(pixel!=(0,0,0) for pixel in difference.getdata());largest=max(high for low,high in difference.getextrema())
  assert largest<=1 and changed<=w*844*0.0001,{'changedPixels':changed,'largestChannelDifference':largest}
  assert page.locator('.pair-chips button:not([disabled])').count()==4
  assert not any('/api/pairs?' in p['url'] or '/api/radar?' in p['url'] for p in page.evaluate('window.__packets'))
  page.keyboard.press('Tab');assert page.evaluate('document.activeElement.classList.contains("skip-content")');page.keyboard.press('Enter');assert page.evaluate('document.activeElement.id==="scout-content"')
  check(w,'landing unchanged within one-channel rasterization tolerance; four verified choices; skip link; no token fanout',identicalPngHash=same,changedPixels=changed,largestChannelDifference=largest)
  select(page);data=next(p['json'] for p in page.evaluate('window.__packets') if '/api/pairs?' in p['url']);assert data['groups'][0]['quoteMint']==mint
  expected_labels={'observed_interval':'Interval covered','reported_lifetime':'Lifetime reported','mechanism_verified':'Settings verified','standard_mode':'No reward mode','unverified':'Unverified'}
  for token in data['groups'][0]['tokens']:
   if 'rewardEvidence' in token:
    actual=page.locator('[aria-labelledby="pair-token-'+token['mint']+'"] .pair-row-state').evaluate('s=>s.childNodes[0].textContent')
    assert actual==expected_labels[token['rewardEvidence']['summary']],[token['mint'],actual,token['rewardEvidence']['summary']]
  assert page.get_by_role('button',name='Sort sample by liquidity, high to low',exact=True).get_attribute('aria-pressed')=='true';sorting(page,data);rules=audit(page)
  assert page.locator('.pair-column-head .pair-liquidity').is_visible()
  assert page.locator('.pair-column-head .pair-volume').is_visible()==(w>=760)
  assert page.locator('.pair-results-sort [aria-pressed=true]').count()==1
  assert page.locator('#pair-reward-key').count()==1 and 'none verifies paid holders or profit' in page.locator('#pair-reward-key').inner_text()
  assert page.locator('.pair-token-name').evaluate_all('ls=>ls.every(a=>a.getBoundingClientRect().height>=44)')
  assert page.locator('.pair-token-mark[data-identity-mark=generated]').count()==len(data['groups'][0]['tokens'])
  assert page.locator('.pair-token-mark').evaluate_all('ms=>ms.every(m=>m.getAttribute("aria-hidden")==="true" && !m.querySelector("image"))')
  check(w,'real exact-mint rows; local name/liquidity/volume order; stable membership; zero additional requests',axePassedRules=rules)
  page.get_by_role('button',name='Sort sample by liquidity, high to low',exact=True).click();page.evaluate("scrollTo(0,document.querySelector('.pair-result-heading').getBoundingClientRect().top+scrollY-12)")
  assert page.locator('.pair-token').evaluate_all('rs=>rs.slice(0,6).every(r=>r.getBoundingClientRect().bottom<=innerHeight)')
  first=page.locator('.pair-token').first;token=next(t for t in data['groups'][0]['tokens'] if t['mint']==ids(page)[0]);summary=first.locator('.pair-detail-toggle');assert summary.bounding_box()['height']>=44
  assert first.locator('.pair-row-state').count()==1;assert first.locator('.pair-row-main').bounding_box()['height']<=66;assert not first.locator('time:visible').count()
  summary.focus();page.keyboard.press('Enter');assert summary.get_attribute('aria-expanded')=='true' and first.locator('.pair-evidence-body').is_visible()
  detail=first.locator('.pair-evidence-body');technical=detail.locator('details.quick-technical');assert technical.get_attribute('open') is None;assert not detail.locator('time:visible').count();technical.locator('summary').click();assert token['mint'] in detail.inner_text() and mint in detail.inner_text();assert detail.get_by_role('link',name='Official token catalog',exact=False).get_attribute('href')==token['source']
  evidence=token.get('rewardEvidence')
  if evidence:
   assert 'Holder returns' in detail.inner_text() and 'Holder entitlement, costs and cashflows are missing' in detail.inner_text()
   if evidence['lifetime']['state']=='reported':assert evidence['lifetime']['value']['distributedTokens']+' '+token['quoteSymbol'] in detail.inner_text()
   for metric in ['mechanism','lifetime']:
    source=evidence[metric]['source']
    if source:assert detail.locator('time[datetime="'+source['providerGeneratedAt']+'"]').count()>0 and detail.locator('time[datetime="'+source['fetchedAt']+'"]').count()>0
  genuine_details.append({'width':w,'tokenMint':token['mint'],'quoteMint':mint,'catalogEvaluatedAt':data['dataset']['fetchedAt'],'tokenSource':token['provenance'],'rewardEvidence':evidence,'renderedLabel':first.locator('.pair-row-state').evaluate('s=>s.childNodes[0].textContent')})
  for label in ['Historical quote-relative return','Quote-asset benchmark return','Holder-attributable rewards']:assert label in detail.inner_text()
  for key,selector in [('liquidityUsd','.pair-liquidity'),('volume24hUsd','.pair-volume')]:
   dd=first.locator('.pair-market '+selector+' dd');value=token['market'][key]
   if value is None:assert dd.text_content()=='—Unavailable'
   elif value==0:assert dd.text_content()=='$0'
   else:
    text=dd.text_content().removeprefix('$').replace(',','');scale={'K':1e3,'M':1e6,'B':1e9,'T':1e12}.get(text[-1],1);number=float(text[:-1] if scale!=1 else text)*scale
    assert abs(number-value)<=max(0.005,0.05*scale),[number,value]
  assert first.locator('time').count()>0;assert detail.get_by_role('link',name='Open dossier',exact=False).get_attribute('href')=='/?mint='+token['mint']
  assert detail.get_by_role('button',name=re.compile('^Copy research link for ')).bounding_box()['height']>=44
  detail.get_by_role('button',name=re.compile('^Copy research link for ')).click();page.wait_for_function('(url)=>navigator.clipboard.readText().then(t=>t===url)',arg=a.base+'/?mint='+token['mint'])
  assert 'Research link copied' in detail.get_by_role('status').inner_text()
  assert detail.locator('a:visible').evaluate_all('ls=>ls.every(a=>a.getBoundingClientRect().height>=44)')
  # Source/dossier links are next in keyboard order after the disclosure, with a native focus indicator.
  summary.focus();page.keyboard.press('Tab');assert page.evaluate('document.activeElement.classList.contains("quick-close")');page.keyboard.press('Tab');assert page.evaluate('document.activeElement.tagName==="A"')
  audit(page)
  if w==390:
   page.evaluate("document.activeElement.blur();scrollTo(0,document.querySelector('.pair-result-heading').getBoundingClientRect().top+scrollY-12)");page.screenshot(path=str(root/f'docs/screenshots/{a.prefix}-after-details-390.png'))
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
  check(w,'200% zoom reflow including open evidence; no horizontal overflow; axe A/AA; no browser exceptions')
  page.evaluate("document.documentElement.style.zoom='1'");summary.click();page.locator('.pair-reward-key summary').focus();page.keyboard.press('Enter');assert page.locator('.pair-reward-key details').get_attribute('open') is not None;audit(page)
  if w==390:
   page.evaluate("document.activeElement.blur();scrollTo(0,document.querySelector('.pair-reward-key').getBoundingClientRect().top+scrollY-12)");page.screenshot(path=str(root/f'docs/screenshots/{a.prefix}-after-key-390.png'))
  check(w,'single persistent reward key; expanded plain-language definitions and real clipboard research URL')
  c.close()
 # Two real, source-backed research candidates. These are not an earnings shortlist.
 c=context(b,390);page=c.new_page();page.goto(a.base);ready(page);select(page)
 current=next(p['json'] for p in page.evaluate('window.__packets') if '/api/pairs?' in p['url']);candidates=ids(page)[:2];assert len(set(candidates))==2
 for token_mint in candidates:
  token=next(t for t in current['groups'][0]['tokens'] if t['mint']==token_mint);assert token['quoteMint']==mint
  row=page.locator('[aria-labelledby="pair-token-'+token_mint+'"]');row.locator('.pair-detail-toggle').click()
  row.get_by_role('button',name=re.compile('^Copy research link for ')).click();expected=a.base+'/?mint='+token_mint
  page.wait_for_function('(url)=>navigator.clipboard.readText().then(text=>text===url)',arg=expected)
  assert row.locator('.pair-token-name').get_attribute('href')=='/?mint='+token_mint
  dossier=c.new_page();dossier.goto(expected,wait_until='domcontentloaded');dossier.get_by_role('heading',name='Token dossier',exact=True).wait_for()
  assert dossier.locator('#pair-search').count()==0 and parse_qs(urlparse(dossier.url).query)=={'mint':[token_mint]}
  assert dossier.locator('meta[property="og:image"]').get_attribute('content').endswith('/api/og?mint='+token_mint)
  assert dossier.locator('meta[name="twitter:card"]').get_attribute('content')=='summary_large_image'
  # Real clipboard fallback on the existing dossier; no recipient or posting UI is used.
  dossier.evaluate('Object.defineProperty(navigator,"share",{value:undefined,configurable:true})')
  dossier.get_by_role('button',name=re.compile('Share report')).click();dossier.get_by_text('Report link copied',exact=True).wait_for()
  assert dossier.evaluate('navigator.clipboard.readText()')==expected
  # Intercept only the native picker API to validate payload and cancellation safely.
  dossier.evaluate('Object.defineProperty(navigator,"share",{value:async payload=>{window.__sharePayload=payload},configurable:true})')
  dossier.get_by_role('button',name=re.compile('Share report')).click();dossier.get_by_text('Shared',exact=True).wait_for()
  payload=dossier.evaluate('window.__sharePayload');assert payload['url']==expected and payload['title']=='SCOUT Token Dossier'
  dossier.reload(wait_until='domcontentloaded');dossier.get_by_role('heading',name='Token dossier',exact=True).wait_for()
  dossier.evaluate('Object.defineProperty(navigator,"share",{value:async()=>{throw new DOMException("Cancelled","AbortError")},configurable:true})')
  dossier.get_by_role('button',name=re.compile('Share report')).click();dossier.wait_for_timeout(150)
  assert dossier.locator('.research-feedback').count()==0 and dossier.url==expected
  dossier.evaluate('Object.defineProperty(navigator,"share",{value:async()=>{throw new DOMException("Denied","NotAllowedError")},configurable:true})')
  dossier.get_by_role('button',name=re.compile('Share report')).click();dossier.get_by_text('Could not share; use Copy research link.',exact=True).wait_for()
  if not journey:
   image_url=a.base+'/api/og?mint='+token_mint
   try:
    image=dossier.request.get(image_url,timeout=15000)
    passed=image.status==200 and image.headers.get('content-type','').startswith('image/png') and image.body().startswith(b'\x89PNG\r\n\x1a\n')
    preview={'url':image_url,'result':'PASS' if passed else 'FAIL','status':image.status,'contentType':image.headers.get('content-type'),'cacheControl':image.headers.get('cache-control')}
    if passed:
     body=image.body();dimensions=dossier.evaluate('async data=>{const image=new Image();image.src="data:image/png;base64,"+data;await image.decode();return [image.naturalWidth,image.naturalHeight];}',base64.b64encode(body).decode())
     assert dimensions==[1200,630],dimensions
     (root/f'docs/evidence/{a.prefix}-og-image.png').write_bytes(body)
     preview.update(decodedDimensions=dimensions,sha256=hashlib.sha256(body).hexdigest(),bytes=len(body),exactTokenMint=token_mint)
   except PlaywrightError as error:
    preview={'url':image_url,'result':'FAIL','transportError':str(error)}
   print('Existing social preview:',preview['result'],flush=True)
  journey.append({'tokenMint':token_mint,'quoteMint':mint,'symbol':token['symbol'],'url':expected,'modeVerification':token['modeVerification'],'rewardEvidence':token.get('rewardEvidence'),'reportedMarket':token['market'],'source':token['source'],'provenance':token['provenance'],'shareScope':'Current token dossier, not frozen pair sample or comparison'})
  dossier.close();row.locator('.pair-detail-toggle').click();check(390,'real research candidate '+token['symbol']+': clipboard/reopen exact mint, dossier metadata, native picker payload/cancel/denial; no external share sent; image delivery reported separately')
 c.close()
 # Clipboard failures: capability fixtures only, with genuine saved source packets.
 for capability in ['missing','denied']:
  c=context(b,390);c.route('**/api/pair-quotes?*',lambda r:r.fulfill(json=registry[parse_qs(urlparse(r.request.url).query)['mint'][0]]));c.route('**/api/pairs?*',lambda r:r.fulfill(json=catalog));c.route('**/api/radar?*',lambda r:r.fulfill(json=radar))
  page=c.new_page();page.goto(a.base);ready(page);select(page);row=page.locator('.pair-token').first;token_mint=ids(page)[0];row.locator('.pair-detail-toggle').click()
  page.evaluate('Object.defineProperty(navigator,"clipboard",{value:undefined,configurable:true})' if capability=='missing' else 'Object.defineProperty(navigator,"clipboard",{value:{writeText:async()=>{throw new DOMException("Denied","NotAllowedError")}},configurable:true})')
  row.get_by_role('button',name=re.compile('^Copy research link for ')).click();field=row.get_by_role('region',name=re.compile('^Research link for '));field.wait_for()
  assert field.inner_text()==a.base+'/?mint='+token_mint and field.locator('input,textarea,[contenteditable]').count()==0
  assert 'Copy unavailable' in row.get_by_role('status').inner_text() and 'copied' not in row.get_by_role('status').inner_text().lower()
  field.focus();assert field.evaluate('i=>getSelection().toString()===i.textContent');audit(page);check(390,'isolated clipboard '+capability+': selectable exact URL fallback, no false copy success');c.close()
 # Isolated legacy fixtures derive from saved packets with optional evidence removed.
 for w in [320,390,1280]:
  for state in ['zero-null','reward-states','stale','invalid','degraded','long-name','503','429','empty','identity','scope','missing-mode-source']:
   c=context(b,w);data=copy.deepcopy(catalog);g=data['groups'][0];status=200
   for token in g['tokens']:token.pop('rewardEvidence',None)
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
   if state=='missing-mode-source':g['tokens'][0].update(mode='reward',rewardModeVerified=True,modeVerification='verified_reward',rewardSource=None)
   c.route('**/api/pair-quotes?*',lambda route:route.fulfill(json=registry[parse_qs(urlparse(route.request.url).query)['mint'][0]]))
   c.route('**/api/pairs?*',lambda route:route.fulfill(status=status,json=data));c.route('**/api/radar?*',lambda route:route.fulfill(json=radar));page=c.new_page();page.goto(a.base);ready(page);select(page)
   if state in ['503','429','identity','scope','missing-mode-source']:
    assert page.locator('.pair-token').count()==0;assert 'synthetic-private-error' not in page.locator('body').inner_text();assert 'Identity changed' in page.locator('.pair-load-state').inner_text() if state=='identity' else 'temporarily unavailable' in page.locator('.pair-load-state').inner_text()
   elif state=='empty':assert page.locator('.pair-token').count()==0 and 'outside these fetched pages' in page.locator('.pair-empty').inner_text()
   else:
    assert len(ids(page))==len(g['tokens']);sorting(page,data)
    if state=='zero-null':
     row=page.locator('[aria-labelledby="pair-token-'+g['tokens'][0]['mint']+'"]');assert row.locator('.pair-market dd').evaluate_all('ds=>ds.every(d=>d.textContent==="$0")')
     row=page.locator('[aria-labelledby="pair-token-'+g['tokens'][1]['mint']+'"]');assert row.locator('.pair-market dd').evaluate_all('ds=>ds.every(d=>d.textContent==="—Unavailable")')
    if state=='reward-states':
     for token,text in zip(g['tokens'][:3],['Settings verified','Unverified','No reward mode']):assert text in page.locator('[aria-labelledby="pair-token-'+token['mint']+'"] .pair-row-state').inner_text()
    if state in ['stale','invalid']:assert state.capitalize()+' history' in page.locator('[aria-labelledby="pair-token-'+g['tokens'][0]['mint']+'"] .pair-row-state').inner_text();assert 'Settings verified' in page.locator('[aria-labelledby="pair-token-'+g['tokens'][0]['mint']+'"] .pair-row-state').inner_text()
    if state=='degraded':assert 'Source gaps in this sample' in page.locator('.pair-load-state').inner_text()
   before=len(page.evaluate('window.__packets'));page.wait_for_timeout(350);assert before==len(page.evaluate('window.__packets'));audit(page);check(w,'isolated '+state+': truthful states, no retries, accessible');c.close()
 # New optional contract scenarios are generated through the merged backend with an OFFLINE synthetic fetcher.
 if a.reward_fixtures:
  fixtures=json.loads(Path(a.reward_fixtures).read_text());assert fixtures['kind']=='synthetic_frontend_test_cases_never_screenshots'
  typed_cases=copy.deepcopy(fixtures['cases'])
  for name in ['forged-quote','forged-source','forged-return','forged-amount','unknown-null']:
   data=copy.deepcopy(fixtures['cases']['covered']);e=data['catalog']['groups'][0]['tokens'][0]['rewardEvidence']
   if name=='forged-quote':e['unit']['mint']=next(m for m in registry if m!=mint)
   if name=='forged-source':e['mechanism']['source']['source']='https://evil.invalid/rewards'
   if name=='forged-return':e['holderReturn']['value']=50
   if name=='forged-amount':e['lifetime']['value']['distributedTokens']='100'
   if name=='unknown-null':data['catalog']['groups'][0]['tokens'][0]['rewardEvidence']=None
   typed_cases[name]=data
  labels={'covered':'Interval covered','covered-zero':'Interval covered','lifetime':'Lifetime reported','zero':'Lifetime reported','settings':'Settings verified','standard':'No reward mode','stale-lifetime':'Settings verified','precise-lifetime':'Lifetime reported'}
  for w in [320,390,1280]:
   for name,data in typed_cases.items():
    c=context(b,w)
    c.route('**/api/pair-quotes?*',lambda r:r.fulfill(json=data['registry'] if parse_qs(urlparse(r.request.url).query)['mint'][0]==mint else registry[parse_qs(urlparse(r.request.url).query)['mint'][0]]))
    c.route('**/api/pairs?*',lambda r:r.fulfill(json=data['catalog']));c.route('**/api/radar?*',lambda r:r.fulfill(json=radar))
    page=c.new_page();page.goto(a.base);ready(page);select(page);row=page.locator('.pair-token');assert row.count()==1
    state=row.locator('.pair-row-state');assert state.evaluate('s=>s.childNodes[0].textContent')==labels.get(name,'Unverified')
    assert row.locator('.pair-row-main').bounding_box()['height']<=66
    if 'stale' in name or name.startswith('forged') or name in ['unknown-null','rate-limited']:assert row.locator('.pair-evidence-warning').is_visible()
    row.locator('.pair-detail-toggle').click();technical=row.locator('details.quick-technical');assert technical.get_attribute('open') is None;assert not row.locator('.pair-reward-facts').is_visible();technical.locator('summary').click();facts=row.locator('.pair-reward-facts')
    if name.startswith('forged') or name=='unknown-null':assert facts.count()==0 and 'values withheld after validation' in row.inner_text()
    else:
     text=facts.inner_text();assert 'Reported lifetime distribution' in text and 'Covered interval flow' in text and 'Holder returns' in text and 'Unavailable. Holder entitlement' in text
     if name=='covered':assert '24.00000000 NVDAX' in text and '25 points' in text and 'Provider boundaries' in text
     if name=='covered-zero':assert 'Current: 0.00000000 NVDAX' in text and 'Previous: 0.00000000 NVDAX' in text
     if name=='zero':assert '0.00000000 NVDAX' in text and 'Last reported payout: Not reported' in text
     if name=='precise-lifetime':assert '119954640.83712182 NVDAX' in text
     if name in ['lifetime','zero','precise-lifetime']:assert 'Lifetime start and reconciliation cutoff unknown' in text and 'Current: 24' not in text
     if name=='rate-limited':assert 'lookup only, not read evidence' in text
     if name=='stale-evaluation':assert data['catalog']['groups'][0]['tokens'][0]['rewardModeVerified'] and 'Reward settings verified' not in text
    sorting(page,data['catalog']);audit(page);page.evaluate("document.documentElement.style.zoom='2'");audit(page)
    check(w,'isolated optional reward evidence '+name+': exact states/units, no invented return or time period, 65px row, zoom/a11y; no fixture screenshot');c.close()
 b.close()
at=datetime.now(timezone.utc).isoformat()
(root/f'docs/evidence/{a.prefix}-og.json').write_text(json.dumps({'at':at,'issue':62,'scope':'Separate existing token social preview; no API edits in this frontend branch','probe':preview},separators=(',',':'))+'\n')
(root/f'docs/evidence/{a.prefix}-qa.json').write_text(json.dumps({'at':at,'engine':'Chromium / axe-core 4.10.3','limits':'Automated browser, keyboard, touch, real clipboard and semantic checks; not physical-device or VoiceOver testing. Native picker intercepted to prevent external sending; no fixture screenshots.','checks':checks,'genuineExpandedDetails':genuine_details,'researchJourney':journey,'existingSocialPreview':preview,'socialPreviewEvidenceFile':a.prefix+'-og.json'},separators=(',',':'))+'\n')
print('PASS',len(checks),'frontend checks; existing social preview:',preview['result'])
if preview['result']!='PASS':raise SystemExit(1)
