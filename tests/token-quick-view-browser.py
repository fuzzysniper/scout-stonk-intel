"""Issue #64 regression QA. Genuine journeys first, isolated edge fixtures second.
No screenshots are taken from intercepted responses. Physical iPhone / VoiceOver remains a human check.
"""
import argparse,json,re,copy,hashlib,base64
from pathlib import Path
from datetime import datetime,timezone
from urllib.parse import urlparse,parse_qs
from playwright.sync_api import sync_playwright
p=argparse.ArgumentParser();p.add_argument('--base',required=True);p.add_argument('--axe',required=True);p.add_argument('--prefix',default='token-quick-view');a=p.parse_args();u=urlparse(a.base)
assert u.scheme=='http' and u.hostname in ['localhost','127.0.0.1'] and u.path in ['', '/'] and not u.query and not u.fragment
assert re.fullmatch('[a-z][a-z0-9-]{0,39}',a.prefix)
root=Path(__file__).resolve().parents[1];proof=json.loads((root/f'docs/evidence/{a.prefix}-after.json').read_text());checks=[];og=[]
SI='DEW9dSN6QpWyNthphCpMmAbZP1Q4cEKR9xQXAri98WDP';CHONK='FeAWY9L9hr82TvTuEyi328V9FP7GxVuGLx7xNg6kzWVa';QUOTE='Xsc9qvGR1efVDFGLrVsmkzv3qi45LTBjeUKSPmx9qEh'
def check(w,name,**extras):checks.append({'width':w,'check':name,'result':'PASS',**extras});print(w,name,flush=True)
def audit(page):
 assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),page.evaluate('[innerWidth,document.documentElement.scrollWidth]')
 page.add_script_tag(path=a.axe);r=page.evaluate("async()=>axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}})");assert not r['violations'],[(v['id'],[n['target'] for n in v['nodes']]) for v in r['violations']]
def ready(page):page.wait_for_function("document.querySelector('.pair-featured')?.getAttribute('aria-busy')==='false'",timeout=60000)
def selected(page):page.get_by_role('button',name=re.compile('^Choose NVDAX')).click();page.locator('.pair-sample-refresh:not([disabled])').wait_for(timeout=60000)
def loaded(page):
 page.locator('.token-brief[aria-busy=false]').wait_for(timeout=60000)
 # Next streams metadata separately from client data. Audit the completed page,
 # and fail if the actual title or exact-mint preview metadata never arrives.
 mint=parse_qs(urlparse(page.url).query)['mint'][0]
 page.wait_for_function("mint=>document.title.includes('SCOUT') && document.querySelector('meta[property=\"og:image\"]')?.content.endsWith('/api/og?mint='+mint)",arg=mint,timeout=30000)
def no_keyboard(page):assert page.evaluate('!document.activeElement.matches("input,textarea,[contenteditable=true]")')
def context(b,w):return b.new_context(viewport={'width':w,'height':844},is_mobile=w<=390,has_touch=w<=390,reduced_motion='reduce',permissions=['clipboard-read','clipboard-write'])
with sync_playwright() as pw:
 b=pw.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-gpu','--disable-gpu-compositing','--disable-features=PaintHolding'])
 for w in [320,390,1280]:
  c=context(b,w);page=c.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.goto(a.base);ready(page);selected(page)
  for token in [SI,CHONK]:
   row=page.locator('[aria-labelledby="pair-token-'+token+'"]');toggle=row.locator('.pair-detail-toggle');toggle.click();row.evaluate('r=>scrollTo(0,r.getBoundingClientRect().top+scrollY-12)');view=row.locator('.pair-evidence-body');technical=view.locator('details.quick-technical')
   no_keyboard(page);assert technical.get_attribute('open') is None;assert not view.locator('time:visible').count();assert token not in view.inner_text();assert QUOTE not in view.inner_text()
   assert len(view.locator('.quick-market dt').all_text_contents())==2;assert view.locator('.quick-conclusion strong').count()==1
   for locator in [view.get_by_role('link',name='Open dossier',exact=False),view.get_by_role('button',name=re.compile('^Copy research')),technical.locator('summary')]:
    box=locator.bounding_box();assert box['height']>=44 and box['y']>=0 and box['y']+box['height']<=844,box
   view.get_by_role('button',name=re.compile('^Copy research')).click();assert page.evaluate('navigator.clipboard.readText()')==a.base+'/?mint='+token;no_keyboard(page)
   technical.locator('summary').click();assert token in technical.inner_text() and QUOTE in technical.inner_text();audit(page)
   view.get_by_role('button',name=re.compile('^Close quick view')).click();assert toggle.get_attribute('aria-expanded')=='false';assert toggle.evaluate('e=>e===document.activeElement')
   toggle.click();assert technical.get_attribute('open') is None;technical.locator('summary').click();page.keyboard.press('Escape');assert toggle.get_attribute('aria-expanded')=='false';assert toggle.evaluate('e=>e===document.activeElement')
   # Explicit open from an editable focus, dispatched without native focus transfer,
   # exercises the Safari-style case. It does not emulate an iOS system keyboard.
   page.locator('#pair-search').focus();assert page.locator('#pair-search').evaluate('e=>e===document.activeElement');toggle.dispatch_event('click');no_keyboard(page)
   assert technical.get_attribute('open') is None;view.get_by_role('link',name='Open dossier',exact=False).click();loaded(page);no_keyboard(page)
   assert page.url==a.base+'/?mint='+token;assert page.locator('.lookup-disclosure').get_attribute('open') is None;assert not page.locator('#mint').is_visible();assert not page.locator('.brief-evidence').is_visible()
   visible=page.locator('main').inner_text();assert token not in visible and QUOTE not in visible and 'PAYOUT COUNT' not in visible and 'Unavailable' not in visible
   assert 'DexScreener' in visible and 'holder returns' in visible.lower()
   for locator in [page.locator('.brief-official'),page.locator('.dossier-details>summary')]:
    box=locator.bounding_box();assert box['height']>=44 and box['y']+box['height']<=844,box
   page.locator('.brief-sharing>summary').click();page.locator('.brief-actions').get_by_role('button',name=re.compile('^Copy research')).click();assert page.evaluate('navigator.clipboard.readText()')==page.url;no_keyboard(page);audit(page)
   assert page.locator('meta[property="og:image"]').get_attribute('content').endswith('/api/og?mint='+token);assert page.locator('meta[name="twitter:card"]').get_attribute('content')=='summary_large_image'
   page.locator('.dossier-details>summary').click();technical=page.locator('.brief-evidence');assert token in technical.inner_text();assert technical.get_by_role('link',name='Reward JSON',exact=True).get_attribute('href')=='/api/rewards?mint='+token
   assert technical.locator('time').count()>0;audit(page);page.evaluate("document.documentElement.style.zoom='2'");audit(page);page.evaluate("document.documentElement.style.zoom='1'")
   check(w,'genuine '+('SI/NVDAX' if token==SI else 'CHONK unverified pair row')+': three-fact view; evidence folds/reset; close/Escape focus; no editable focus; real clipboard/deep link; dossier above fold; source identities; zoom/axe')
   if w==390:
    page.evaluate('scrollTo(0,0)');page.locator('.dossier-details>summary').click();page.locator('.brief-sharing>summary').click()
    # Unverified-token screenshots are genuine and are separate from fixture tests.
    if token==CHONK:
     page.screenshot(path=str(root/f'docs/screenshots/{a.prefix}-after-unverified-dossier-390.png'))
    image=page.request.get(a.base+'/api/og?mint='+token,timeout=20000);assert image.status==200 and image.headers.get('content-type','').startswith('image/png');body=image.body();assert body.startswith(b'\x89PNG\r\n\x1a\n')
    dimensions=page.evaluate('async data=>{const i=new Image();i.src="data:image/png;base64,"+data;await i.decode();return [i.naturalWidth,i.naturalHeight]}',base64.b64encode(body).decode());assert dimensions==[1200,630]
    name='si' if token==SI else 'chonk';(root/f'docs/evidence/{a.prefix}-og-{name}.png').write_bytes(body);og.append({'mint':token,'url':a.base+'/api/og?mint='+token,'status':image.status,'dimensions':dimensions,'bytes':len(body),'sha256':hashlib.sha256(body).hexdigest()})
   page.goto(a.base);ready(page);selected(page)
  assert not errors,errors;check(w,'no browser exceptions; genuine source-backed SI and unverified-token journeys');c.close()
 # A real submitted mint must navigate, dismiss the input and refresh OG identity.
 c=context(b,390);page=c.new_page();page.goto(a.base+'/?mint='+SI);loaded(page);page.locator('.lookup-disclosure>summary').click();field=page.locator('#mint');field.fill(CHONK);field.press('Enter');loaded(page);assert page.url==a.base+'/?mint='+CHONK;no_keyboard(page);assert not field.is_visible();assert page.locator('meta[property="og:image"]').get_attribute('content').endswith(CHONK);check(390,'explicit mint submit closes input and navigates with correct new deep-link/OG identity');c.close()
 # Synthetic edge responses below are isolated; never used for screenshots.
 packets=proof['captures'][0]['dossierResponses'];market=next(p['json'] for p in packets if p['url']=='/api/token?mint='+SI);reward=next(p['json'] for p in packets if p['url']=='/api/rewards?mint='+SI);history=next(p['json'] for p in packets if p['url']=='/api/history?mint='+SI);pair=copy.deepcopy(next(p['json'] for p in packets if '/api/pairs?' in p['url']))
 for group in pair['groups']:
  for token in group['tokens']:token.pop('rewardEvidence',None)
 for w in [320,390,1280]:
  for case in ['zero','unknown','tiny','quote-selected','stale','invalid','degraded','history-failed','reward-failed','copy-missing','copy-denied']:
   c=context(b,w);m=copy.deepcopy(market);r=copy.deepcopy(reward);h=copy.deepcopy(history)
   if case=='zero':m.update(liquidityUsd=0,volume24h=0);r.update(status='available',distributedTokens=0,payoutCount=0,holderCount=0,lastPayoutAt=None)
   if case=='unknown':m.update(liquidityUsd=None,volume24h=None);r.update(status='available',distributedTokens=None,payoutCount=None,holderCount=None,lastPayoutAt=None)
   if case=='tiny':m.update(liquidityUsd=1e-12,volume24h=1e-12);r.update(status='available',distributedTokens=1e-12)
   if case=='quote-selected':m['quote']={'address':SI,'symbol':'SELECTED'};m['base']['address']=CHONK;m['base']['symbol']='OTHER'
   if case=='stale':h['freshness']['status']='stale'
   if case=='invalid':h['status']='invalid_data';h['issues']=['counter_decrease']
   if case=='degraded':h['dataset']['sourceStatus']='degraded'
   c.route('**/api/pairs?*',lambda route:route.fulfill(json=pair));c.route('**/api/token?*',lambda route:route.fulfill(json=m));c.route('**/api/rewards?*',lambda route:route.fulfill(status=502,json={'status':'unavailable'}) if case=='reward-failed' else route.fulfill(json=r));c.route('**/api/history?*',lambda route:route.fulfill(status=503,json={'error':'synthetic private error'}) if case=='history-failed' else route.fulfill(json=h))
   page=c.new_page();page.goto(a.base+'/?mint='+SI);loaded(page);page.wait_for_timeout(100);no_keyboard(page);assert page.locator('.dossier-details').get_attribute('open') is None;visible=page.locator('main').inner_text()
   if case=='zero':assert page.locator('.brief-market dd').all_text_contents()==['$0','$0'];assert 'Recent reward activity not verified' in visible;assert 'Lifetime reported' not in visible
   if case=='unknown':assert page.locator('.brief-market dd').all_text_contents()==['Unknown','Unknown'];assert 'Recent reward activity not verified' in visible and 'Lifetime reported' not in visible
   if case=='tiny':assert all(t!='$0' for t in page.locator('.brief-market dd').all_text_contents());assert 'reports 0 NVDAX' not in visible
   if case=='quote-selected':assert 'SELECTED' in page.locator('.brief-identity h2').inner_text() and 'OTHER' not in page.locator('.brief-identity').inner_text()
   if case=='stale':assert 'stale' in page.locator('.brief-qualifier').inner_text()
   if case in ['invalid','degraded','history-failed','reward-failed']:
    page.locator('.brief-warning').first.wait_for();assert page.locator('.brief-warning').first.is_visible();assert 'synthetic private error' not in visible
   if case in ['copy-missing','copy-denied']:
    page.evaluate('Object.defineProperty(navigator,"clipboard",{value:undefined,configurable:true})' if case=='copy-missing' else 'Object.defineProperty(navigator,"clipboard",{value:{writeText:async()=>{throw new DOMException("Denied","NotAllowedError")}},configurable:true})')
    page.locator('.brief-sharing>summary').click();page.locator('.brief-actions').get_by_role('button',name=re.compile('^Copy research')).click();fallback=page.get_by_role('region',name=re.compile('^Research link for '));fallback.wait_for();no_keyboard(page);fallback.focus();assert page.evaluate('getSelection().toString()')==a.base+'/?mint='+SI;assert not fallback.locator('input,textarea,[contenteditable]').count();no_keyboard(page);assert 'copied' not in page.locator('.research-feedback').inner_text().lower()
   audit(page);page.locator('.dossier-details>summary').click();audit(page)
   if case=='tiny':assert page.locator('.brief-evidence').inner_text().count('1e-12')>=3
   check(w,'isolated dossier '+case+': semantics/warnings/focus/identity, folded audit retained; no fixture screenshots');c.close()
 b.close()
(root/f'docs/evidence/{a.prefix}-browser.json').write_text(json.dumps({'at':datetime.now(timezone.utc).isoformat(),'engine':'Chromium / axe-core 4.10.3','limits':'No physical iPhone, Safari system keyboard or VoiceOver access. Editable-focus checks and touch viewport emulation are automated evidence only. Fixtures isolated and never captured.','checks':checks,'og':og},separators=(',',':'))+'\n')
print('PASS',len(checks),'quick-view/dossier checks; two genuine OG PNGs',flush=True)
