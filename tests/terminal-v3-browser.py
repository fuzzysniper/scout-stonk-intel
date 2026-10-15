"""Search-first terminal QA. Real production journeys, then isolated registry fault fixtures.
Never screenshot fixtures; source captures live in terminal-v3-capture.py.
"""
import argparse,copy,json,re,time
from pathlib import Path
from datetime import datetime,timezone
from urllib.parse import urlparse,parse_qs
from playwright.sync_api import sync_playwright
p=argparse.ArgumentParser();p.add_argument('--base',required=True);p.add_argument('--axe',required=True);a=p.parse_args();u=urlparse(a.base)
assert u.scheme=='http' and u.hostname in ['localhost','127.0.0.1'] and u.path in ['', '/'] and not u.query and not u.fragment
root=Path(__file__).resolve().parents[1];proof=json.loads((root/'docs/evidence/terminal-v3-after.json').read_text());packets=proof['captures'][0]['responses'];checks=[];performance=[]
seed=next(p['json'] for p in packets if '/api/pair-quotes?' in p['url'] and 'query=' in p['url'] and p['json']['search']['query']=='');quote=next(p['json'] for p in packets if '/api/pair-quotes?' in p['url'] and 'mint=' in p['url']);mint=quote['quotes'][0]['quoteMint']
recorder='''(()=>{const f=window.fetch.bind(window);window.__requests=[];window.fetch=async(...args)=>{const item={url:String(args[0]),start:performance.now()};window.__requests.push(item);try{const r=await f(...args);item.end=performance.now();item.status=r.status;return r;}catch(e){item.aborted=e.name==='AbortError';throw e;}};})();'''
def check(width,name,**extras):checks.append({'width':width,'check':name,'result':'PASS',**extras});print(width,name,flush=True)
def context(b,w):
 c=b.new_context(viewport={'width':w,'height':844},is_mobile=w<=390,has_touch=w<=390,reduced_motion='reduce');c.add_init_script(recorder);return c
def ready(page):page.wait_for_function("document.querySelector('[data-registry-state]')?.dataset.registryState==='ready'")
def audit(page):
 assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
 page.add_script_tag(path=a.axe);r=page.evaluate("async()=>axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}})");assert not r['violations'],[(v['id'],[n['target'] for n in v['nodes']])for v in r['violations']]
def requests(page):return page.evaluate("window.__requests.filter(r=>r.url.includes('/api/'))")
def settle(page):page.wait_for_function("document.querySelector('[data-registry-state]')?.dataset.registryState!=='loading'")
def fixture(query='',offset=0,total=60):
 # Synthetic valid public identities, never source screenshots or marketed tokens.
 def address(i):
  alphabet='123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';value=int.from_bytes((i+100).to_bytes(32,'big'),'big');text=''
  while value:value,remainder=divmod(value,58);text=alphabet[remainder]+text
  return '1'*(32-len((i+100).to_bytes(32,'big').lstrip(b'\0')))+text
 f=copy.deepcopy(seed);f['search'].update(query=query,mint=None,offset=offset);f['quotes']=[]
 for i in range(offset,min(offset+12,total)):
  q=copy.deepcopy(seed['quotes'][0]);q.update(quoteMint=address(i),quoteSymbol='TEST'+str(i),quoteName='Synthetic registry asset '+str(i),symbolAmbiguous=False,providerSymbolAmbiguous=False,symbolMatchCount=1);f['quotes'].append(q)
 f['dataset']['coverage'].update(registryCount=max(60,total),matchedCount=total,returnedCount=len(f['quotes']),nextOffset=offset+len(f['quotes']) if offset+len(f['quotes'])<total else None,resultTruncated=len(f['quotes'])<total,providerAmbiguousSymbolCount=0)
 return f
with sync_playwright() as pw:
 b=pw.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-gpu','--disable-gpu-compositing','--disable-features=PaintHolding'])
 for w in [320,390,1280]:
  c=context(b,w);page=c.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.goto(a.base);ready(page)
  search=page.get_by_role('combobox',name='Search quote assets');assert search.count()==1 and search.get_attribute('aria-expanded')=='false';assert not search.evaluate('e=>e===document.activeElement');assert page.locator('.pair-featured,.pair-chips,.home-more').count()==0
  initial=requests(page);assert len(initial)==1 and '/api/pair-quotes?' in initial[0]['url'];assert len(page.locator('.quote-suggestions button').all())<=3;audit(page);check(w,'one registry read; no token fanout, preset universe, navigation submenu or automatic keyboard; landing axe')
  page.keyboard.press('Control+k');assert search.evaluate('e=>e===document.activeElement');assert search.get_attribute('aria-expanded')=='true';page.keyboard.press('ArrowDown');assert search.get_attribute('aria-activedescendant')=='quote-option-0';assert page.get_by_role('option').first.get_attribute('aria-selected')=='true';page.keyboard.press('ArrowUp');assert search.get_attribute('aria-activedescendant')=='quote-option-11'
  assert page.locator('[role=option]').evaluate_all('os=>os.every(o=>!o.hasAttribute("tabindex"))');audit(page);page.keyboard.press('Escape');assert search.get_attribute('aria-expanded')=='false';page.get_by_role('link',name='Guide',exact=True).click(trial=True)
  # Name query and a ticker outside the old four. No token discovery is needed to verify the result.
  search.fill('dogwifhat');page.get_by_role('option',name=re.compile('^\\$WIF')).wait_for();assert search.get_attribute('aria-activedescendant') is None
  search.fill('AAVE');page.get_by_role('option',name=re.compile('^AAVE')).first.wait_for();assert not any('/api/pairs?' in r['url'] for r in requests(page));check(w,'keyboard active descendant/wrap/Escape; real non-preset name and ticker search; no token fanout')
  if w==390:
   aave=page.get_by_role('option',name=re.compile('^AAVE')).first.get_attribute('aria-label').split('quote mint ')[1].split(' · ')[0];page.keyboard.press('ArrowDown');page.keyboard.press('Enter');page.wait_for_function("document.querySelector('.pair-result-heading strong')?.textContent==='AAVE'");page.locator('.pair-sample-refresh:not([disabled])').wait_for(timeout=60000);assert any('/api/pairs?quoteMint='+aave+'&discovery=pair' in r['url'] for r in requests(page));check(w,'real AAVE selection outside the old four uses the same exact-mint bounded discovery contract')
  # Rapid typing is one settled search, not a provider request per character.
  search.fill('');settle(page);before=len(requests(page));start=time.monotonic();search.press_sequentially('NVDAX',delay=40);page.get_by_role('option',name=re.compile('^NVDAX')).wait_for();elapsed=round((time.monotonic()-start)*1000);after=requests(page)[before:]
  assert len(after)==1 and 'query=NVDAX' in after[0]['url'],after;performance.append({'width':w,'typing':'NVDAX, 40ms/key','settledRegistryRequests':len(after),'tokenRequests':0,'resultVisibleMs':elapsed});audit(page)
  clear=page.get_by_role('button',name='Clear asset search');assert clear.bounding_box()['height']>=44;clear.click();assert search.input_value()=='' and search.evaluate('e=>e===document.activeElement');settle(page)
  search.fill(mint);page.get_by_role('option',name=re.compile('^NVDAX')).wait_for()
  if w==320:page.get_by_role('option',name=re.compile('^NVDAX')).tap()
  else:page.keyboard.press('ArrowDown');page.keyboard.press('Enter')
  page.locator('.pair-token').first.wait_for(timeout=60000);page.locator('.pair-sample-refresh:not([disabled])').wait_for();assert search.get_attribute('aria-expanded')=='false';assert page.locator('h2').first.evaluate('e=>e===document.activeElement');assert not page.evaluate('document.activeElement.matches("input,textarea,[contenteditable]")');page.evaluate('scrollTo(0,0)')
  rows=page.locator('.pair-token').evaluate_all('rs=>rs.slice(0,6).map(r=>({height:r.getBoundingClientRect().height,bottom:r.getBoundingClientRect().bottom}))');assert len(rows)==6 and all(r['height']==65 and r['bottom']<=844 for r in rows),rows
  assert page.locator('.pair-reward-key details').get_attribute('open') is None;assert not page.locator('#pair-reward-key').is_visible();assert page.locator('.pair-snapshot-note').count()==1;audit(page);check(w,'rapid typing debounces to one request; clear retains input; exact mint selection dismisses editable focus; six 65px rows above fold; one sampling note and folded key')
  search.focus();page.keyboard.press('Escape');page.get_by_role('link',name='Guide',exact=True).focus();assert search.get_attribute('aria-expanded')=='false';page.evaluate("document.documentElement.style.zoom='2'");search.focus();audit(page);page.keyboard.press('Escape');audit(page);assert not errors,errors;check(w,'popup/selected 200% zoom; Tab/outside focus closes; no horizontal overflow or browser exceptions');c.close()
 # Duplicate tickers are separate official identities; visible name and short mint distinguish them.
 c=context(b,390);page=c.new_page();page.goto(a.base);ready(page);search=page.locator('#pair-search');search.focus();options=page.get_by_role('option');duplicates=[q for q in seed['quotes'] if q['quoteSymbol']=='1'];assert len(duplicates)>=2
 for q in duplicates:assert page.get_by_role('option',name='1 · '+q['quoteName']+' · quote mint '+q['quoteMint']+' · shared ticker',exact=True).count()==1
 check(390,'genuine duplicate ticker 1: separate names, exact mint labels, short mint and shared-ticker cue');c.close()
 # Isolated fixtures cover failure, empty, malformed, revision changes, bounded pagination and cancellation.
 for case in ['503','429','malformed','empty','invalid-query','revision','pagination','cancel','late-response','timeout','recover']:
  c=context(b,390);calls=[]
  def respond(route):
   params=parse_qs(urlparse(route.request.url).query);query=params.get('query',[''])[0];offset=int(params.get('offset',['0'])[0]);calls.append({'query':query,'offset':offset})
   if case in ['503','429'] or case=='recover' and len(calls)==1:return route.fulfill(status=503 if case=='recover' else int(case),json={'error':'private synthetic details'})
   if case=='malformed':return route.fulfill(json={'quotes':seed['quotes']})
   if case=='empty':
    f=copy.deepcopy(seed);f['quotes']=[];f['dataset']['coverage'].update(matchedCount=0,returnedCount=0,nextOffset=None,resultTruncated=False);return route.fulfill(json=f)
   if case=='revision':
    f=fixture(offset=offset);f['dataset']['provenance']['revision']='sha256:'+('b' if offset else 'a')*64;return route.fulfill(json=f)
   if case=='pagination':return route.fulfill(json=fixture(offset=offset))
   return route.fulfill(json=seed if not query else fixture(query=query,total=0))
  c.route('**/api/pair-quotes?*',respond);page=c.new_page();page.goto(a.base);settle(page);search=page.locator('#pair-search');search.focus()
  if case in ['503','429','malformed','recover']:
   assert 'Registry search unavailable' in page.locator('.quote-popover').inner_text();assert page.get_by_role('option').count()==0;assert 'private synthetic' not in page.locator('body').inner_text();page.wait_for_timeout(500);assert len(calls)==1
   if case=='recover':page.get_by_role('button',name='Retry registry').click();ready(page);assert page.get_by_role('option').count()==12
  elif case=='empty':assert 'does not establish absence elsewhere' in page.locator('.quote-popover').inner_text() and page.get_by_role('option').count()==0
  elif case=='invalid-query':search.fill('x'*65);settle(page);assert 'up to 64 characters' in page.locator('.quote-popover').inner_text();assert len(calls)==1 and page.get_by_role('option').count()==0
  elif case=='revision':page.get_by_role('button',name='Show more assets').click();ready(page);assert 'Registry changed' in page.locator('.quote-popover').inner_text() and page.get_by_role('option').count()==0;page.get_by_role('button',name='Retry registry').click();ready(page);assert page.get_by_role('option').count()==12
  elif case=='pagination':
   for n in [24,36,48]:page.get_by_role('button',name='Show more assets').click();ready(page);assert page.get_by_role('option').count()==n
   assert page.get_by_role('button',name='Show more assets').count()==0 and 'Refine your search' in page.locator('.quote-popover').inner_text();assert len(calls)==4;assert search.evaluate('e=>e===document.activeElement');page.locator('.quote-popover').focus();page.keyboard.press('Escape');assert search.evaluate('e=>e===document.activeElement') and search.get_attribute('aria-expanded')=='false';search.focus();page.keyboard.press('ArrowDown')
  elif case=='timeout':
   page.evaluate("""()=>{const timeout=window.setTimeout,fetch=window.fetch;window.setTimeout=(f,ms,...args)=>timeout(f,ms===15000?30:ms,...args);window.fetch=(url,init)=>String(url).includes('query=timeout')?new Promise((resolve,reject)=>{init.signal.addEventListener('abort',()=>{window.__deadlineAborted=true;reject(new DOMException('Aborted','AbortError'));});}):fetch(url,init);}""")
   search.fill('timeout');page.wait_for_function('window.__deadlineAborted');settle(page);assert 'Registry search unavailable' in page.locator('.quote-popover').inner_text() and page.get_by_role('option').count()==0;page.wait_for_timeout(400);assert len(calls)==1
  elif case in ['cancel','late-response']:
   slow=fixture(query='slow',total=12)
   for q in slow['quotes']:q['quoteName']='slow '+q['quoteName']
   page.evaluate("""({late,data})=>{const fetch=window.fetch;window.fetch=(url,init)=>String(url).includes('query=slow')?new Promise((resolve,reject)=>{window.__slowStarted=true;init.signal.addEventListener('abort',()=>{window.__slowAborted=true;if(!late)reject(new DOMException('Aborted','AbortError'));});setTimeout(()=>resolve(Response.json(data)),800);}):fetch(url,init);}""",{'late':case=='late-response','data':slow})
   search.fill('slow');page.wait_for_function('window.__slowStarted');search.fill('new');settle(page);page.wait_for_timeout(900);assert search.input_value()=='new' and page.get_by_role('option').count()==0;assert page.evaluate('window.__slowAborted')
  assert not any('/api/pairs?' in r['url'] or '/api/radar?' in r['url'] for r in requests(page));audit(page);check(390,'isolated registry '+case+': fails safely or stays bounded; no token fanout, fake identities or fixture screenshots');c.close()
 b.close()
(root/'docs/evidence/terminal-v3-search-qa.json').write_text(json.dumps({'at':datetime.now(timezone.utc).isoformat(),'engine':'Local production Chromium + axe-core 4.10.3','limits':'Mobile emulation, not physical iPhone/Safari/VoiceOver. Isolated fault fixtures are never screenshot sources. Timing is one local observed run, not a speed guarantee.','checks':checks,'performance':performance},separators=(',',':'))+'\n');print('PASS',len(checks),'search/terminal checks',flush=True)
