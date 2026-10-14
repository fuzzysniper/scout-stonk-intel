"""Registry-to-sample production QA. All screenshots use genuine responses.
Error fixtures stay isolated and are never photographed. Requires a fresh local server."""
import argparse,json,re,time
from pathlib import Path
from datetime import datetime,timezone
from urllib.parse import urlparse,parse_qs
from playwright.sync_api import sync_playwright
parser=argparse.ArgumentParser();parser.add_argument('--base',default='http://127.0.0.1:3157');parser.add_argument('--axe',required=True);args=parser.parse_args()
u=urlparse(args.base)
assert u.scheme=='http' and u.hostname in ['localhost','127.0.0.1'] and not u.username and not u.password and u.path in ['', '/'] and not u.query and not u.fragment
root=Path(__file__).resolve().parents[1];checks=[];captures=[];proof=[]
NI='Xsc9qvGR1efVDFGLrVsmkzv3qi45LTBjeUKSPmx9qEh';STONK='6GmAFSYs4gk3FDao5FzzySQpPZaWsa4rUJHacpMpUNgx';DISTINCT='Qirqk4cXB3txQmdqwB7R9o5KVkNzj5ZCT9BHsuLpump'
recorder='''(()=>{const original=window.fetch.bind(window);window.__pairPackets=[];window.fetch=async(...args)=>{const r=await original(...args);const url=typeof args[0]==='string'?args[0]:args[0].url;if(url.includes('/api/'))r.clone().json().then(json=>window.__pairPackets.push({url,status:r.status,json})).catch(()=>{});return r;};})();'''
def check(w,name):checks.append({'width':w,'check':name,'result':'PASS'})
def audit(page):
 page.add_script_tag(path=args.axe)
 r=page.evaluate("async()=>await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}})")
 assert not r['violations'],[(v['id'],[n['target'] for n in v['nodes']]) for v in r['violations']]
 assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
 return len(r['passes'])
def shot(page,name):
 page.evaluate('document.activeElement.blur()');page.mouse.move(1,1);page.mouse.wheel(0,200);page.wait_for_timeout(100);page.evaluate('scrollTo(0,0)');page.wait_for_timeout(150)
 page.screenshot(path=str(root/'docs/screenshots'/name),full_page=False)
def search(page,q):
 with page.expect_response('**/api/pair-quotes?*'):page.locator('#pair-search').fill(q)
 page.locator('.pair-registry-count,.pair-registry-state').first.wait_for()
 page.wait_for_function("document.querySelector('#pair-registry-results').getAttribute('aria-busy')==='false'")
 page.wait_for_timeout(100)
def select(page,mint):
 page.get_by_role('button',name=re.compile('^Select .*'+re.escape(mint)+'$')).click()
 page.wait_for_function('(mint)=>document.querySelector(".pair-selected a")?.textContent===mint',arg=mint)
 page.wait_for_timeout(100)
 page.get_by_role('button',name=re.compile('^(Refresh sample|Retry sample)$')).wait_for()
 page.wait_for_function('(mint)=>window.__pairPackets.some(p=>p.url.includes("/api/pairs?quoteMint="+mint+"&discovery=pair"))',arg=mint)
def latest(page,substring):
 return next(p for p in reversed(page.evaluate('window.__pairPackets')) if substring in p['url'])
def scope(c,mint):
 assert c['status'] in ['available','degraded'] and len(c['groups'])==1 and c['groups'][0]['quoteMint']==mint,(mint,c.get('status'),[g['quoteMint'] for g in c['groups']],c['dataset']['coverage'])
 cov=c['dataset']['coverage'];assert cov['discovery']=={'strategy':'provider_quote_mint','quoteMint':mint,'providerReportedTotalScope':'quote_mint'}
 assert cov['complete'] is False and cov['atomic'] is False and cov['pageLimit']==2 and cov['pageSize']==25 and cov['pagesFetched']<=2 and cov['tokensReturned']<=50
 pages=[s for s in c['dataset']['sources'] if urlparse(s['source']).path=='/api/public/v1/tokens'];assert len(pages)==cov['pagesFetched']
 assert all(parse_qs(urlparse(p['source']).query)['quoteMint']==[mint] for p in pages)
 for g in c['groups']:
  for t in g['tokens']:
   assert t['quoteMint']==mint and t['market']['unit']=='USD' and t['market']['observedAt'] is None
   assert all(t['comparisons'][k] is None for k in ['quoteRelativePriceReturn','quoteAssetBenchmarkReturn','holderAttributedReward'])
 return c
def checkpoint(page):
 Path('/tmp/scout-45-registry-checkpoint.json').write_text(json.dumps(page.evaluate('window.__pairPackets'),indent=2))
def wait_budget(page):
 checkpoint(page)
 print('Pacing cold scoped queries:61 seconds, no retry loop',flush=True)
 until=time.monotonic()+61
 while time.monotonic()<until:page.wait_for_timeout(1000)
def api(context,path):
 r=context.request.get(args.base+path,timeout=20000);c=r.json();assert r.status==200 and r.headers.get('cache-control')=='no-store'
 proof.append({'url':path,'status':r.status,'capturedAt':datetime.now(timezone.utc).isoformat(),'json':c});return c
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-gpu'])
 primer=browser.new_context(viewport={'width':390,'height':844},reduced_motion='reduce');primer.add_init_script(recorder);page=primer.new_page()
 page.goto(args.base+'/',wait_until='domcontentloaded');page.get_by_role('heading',level=1).wait_for();page.wait_for_timeout(400)
 assert page.evaluate('window.__pairPackets.length')==0
 # One genuine registry source serves Unicode/name/ticker/mint and windows, independently of the catalog.
 search(page,'NVIDIA');name_result=latest(page,'/api/pair-quotes')['json'];assert any(q['quoteMint']==NI for q in name_result['quotes'])
 search(page,'NVDAX');genuine_registry=latest(page,'/api/pair-quotes')['json'];select(page,NI)
 genuine_scoped=scope(latest(page,'discovery=pair')['json'],NI);assert page.locator('.pair-token').count()==len(genuine_scoped['groups'][0]['tokens'])
 genuine_radar=latest(page,'/api/radar')['json']
 global_catalog=api(primer,'/api/pairs');global_quotes={g['quoteMint'] for g in global_catalog['groups']}
 search(page,'STONK');stonks=latest(page,'/api/pair-quotes')['json'];same=[q for q in stonks['quotes'] if q['quoteSymbol'].lower()=='stonk']
 assert len(same)>=3 and len({q['quoteMint'] for q in same})==len(same)
 assert all(q['symbolAmbiguous'] and q['symbolMatchCount']>=3 for q in same)
 assert DISTINCT not in global_quotes and any(q['quoteMint']==DISTINCT for q in same)
 select(page,DISTINCT);assert latest(page,'discovery=pair')['status']==503
 assert page.get_by_text('Sample unavailable or cooling down.',exact=False).is_visible() and page.locator('.pair-token,.pair-market time').count()==0
 shot(page,'pair-registry-cooldown-390.png');before=len(page.evaluate('window.__pairPackets'));page.wait_for_timeout(1200);assert len(page.evaluate('window.__pairPackets'))==before
 captures.append({'width':390,'capture':'genuine503 admission','responses':page.evaluate('window.__pairPackets')});check(390,'registry-only quote outside global pages,three same-ticker identities,genuine scoped503,no figures,no automatic retries')
 wait_budget(page);page.get_by_role('button',name='Retry sample',exact=True).click();page.get_by_role('button',name='Refresh sample',exact=True).wait_for()
 distinct=scope(latest(page,'discovery=pair')['json'],DISTINCT);assert distinct['groups'][0]['tokens'];check(390,'genuine manual recovery after admission window; identity selected by exact mint')
 wait_budget(page);search(page,'STONK');select(page,STONK);canonical=scope(latest(page,'discovery=pair')['json'],STONK)
 assert not ({t['mint'] for t in canonical['groups'][0]['tokens']} & {t['mint'] for t in distinct['groups'][0]['tokens']})
 check(390,'genuine disjoint same-symbol scopes;one-page result remains nonexhaustive and non-atomic')
 search(page,'熊猫');unicode_registry=latest(page,'/api/pair-quotes')['json'];assert unicode_registry['quotes']
 candidate=unicode_registry['quotes'][0];wait_budget(page);select(page,candidate['quoteMint']);candidate_packet=latest(page,'discovery=pair')
 if candidate_packet['status']==200:
  rare=scope(candidate_packet['json'],candidate['quoteMint'])
  if not rare['groups'][0]['tokens']:
   assert page.get_by_text('No matching memecoins within this bounded sample.',exact=False).is_visible();shot(page,'pair-registry-empty-sample-390.png')
 check(390,'genuine Unicode registry identity;bounded optional rare-quote result recorded without asserting invented emptiness')
 checkpoint(page);proof.extend(page.evaluate('window.__pairPackets'));primer.close()
 for width in [320,390,1280]:
  print('Real registry browser width',width,flush=True)
  c=browser.new_context(viewport={'width':width,'height':844},reduced_motion='reduce');c.add_init_script(recorder);page=c.new_page();errors=[];reads=[]
  page.on('pageerror',lambda e:errors.append(str(e)));page.on('request',lambda r:reads.append(r.url) if '/api/' in r.url else None)
  page.goto(args.base+'/',wait_until='domcontentloaded');page.locator('#pair-search').wait_for();page.wait_for_timeout(500)
  assert reads==[] and page.locator('.pair-token,.pair-market time').count()==0
  assert page.get_by_role('heading',level=1).count()==1 and page.locator('main#scout-content').count()==1
  page.keyboard.press('Tab');assert page.evaluate('document.activeElement.classList.contains("skip-content")');page.keyboard.press('Enter');assert page.evaluate('document.activeElement.id==="scout-content"')
  rules=audit(page);shot(page,f'pair-registry-home-{width}.png');check(width,'simple initial search-select-explore,zero explorer API reads/token queries,single h1/main,skip focus,axe/reflow')
  for q in ['N','NV','NVD','NVDA','NVDAX']:page.locator('#pair-search').fill(q)
  page.get_by_role('button',name=re.compile('^Select NVDAX .*'+NI+'$')).wait_for()
  assert len([r for r in reads if '/api/pair-quotes' in r])==1
  for b in page.locator('.pair-registry-list button').all():assert b.bounding_box()['height']>=44
  select(page,NI);ni=scope(latest(page,'discovery=pair')['json'],NI);tokens=ni['groups'][0]['tokens'];assert page.locator('.pair-token').count()==len(tokens)
  assert page.locator('.pair-selected a').inner_text()==NI
  if tokens[0]['market']['status']=='reported_snapshot':assert page.locator('.pair-market time').first.get_attribute('datetime')==tokens[0]['market']['providerGeneratedAt']
  y=page.locator('.pair-token').first.bounding_box()['y'];assert y<650,y
  audit(page);shot(page,f'pair-registry-selected-{width}.png')
  captures.append({'width':width,'capture':'real NVDAX selected','capturedAt':datetime.now(timezone.utc).isoformat(),'firstTokenY':y,'responses':page.evaluate('window.__pairPackets'),'axePasses':rules})
  check(width,'300ms debounced server registry search,44px choices,exact selection invokes opt-in only,real scoped count/units/timestamps/false coverage/null returns')
  search(page,'STONK');buttons=page.locator('.pair-registry-list button');assert buttons.count()==len(stonks['quotes'])
  assert all(b.locator('small').count()==1 for b in buttons.all())
  audit(page)
  if width==390:shot(page,'pair-registry-stonk-search-390.png')
  select(page,DISTINCT);scope(latest(page,'discovery=pair')['json'],DISTINCT)
  summary=page.locator('.pair-token-evidence>summary').first;summary.focus();page.keyboard.press('Enter');assert page.locator('.pair-token-evidence').first.get_attribute('open') is not None
  assert page.get_by_text('Holder-attributable rewards',exact=True).first.is_visible();audit(page)
  if width==390:summary.scroll_into_view_if_needed();page.screenshot(path=str(root/'docs/screenshots/pair-registry-evidence-390.png'),full_page=False)
  summary.focus();page.keyboard.press('Space');assert page.locator('.pair-token-evidence').first.get_attribute('open') is None
  check(width,'same-ticker visible mint disambiguation;exact distinct selection;keyboard evidence;unavailable attribution/returns;axe')
  before=len([r for r in reads if '/api/pairs?' in r]);search(page,'scout-no-such-verified-quote-42')
  assert page.get_by_text('No matching identity in the verified registry response.',exact=False).is_visible();assert len([r for r in reads if '/api/pairs?' in r])==before
  search(page,DISTINCT);assert latest(page,'/api/pair-quotes')['json']['search']['mint']==DISTINCT
  select(page,DISTINCT);assert len([r for r in reads if '/api/pairs?' in r])==before
  check(width,'genuine empty registry text is distinct from unavailable;exact original-case mint lookup;selection client cache;no token fanout')
  page.locator('#pair-search').fill('');page.get_by_role('button',name='Browse quote assets',exact=True).click();page.locator('.pair-registry-list button').first.wait_for()
  for n in [24,36,48]:
   page.get_by_role('button',name='Show more assets',exact=True).click();page.wait_for_function('(n)=>document.querySelectorAll(".pair-registry-list button").length===n',arg=n)
  assert page.get_by_text('Refine your search to see more matches.',exact=True).is_visible()
  assert len([r for r in reads if '/api/pairs?' in r])==before
  browse_pages=[r['json'] for r in page.evaluate('window.__pairPackets') if '/api/pair-quotes' in r['url'] and r['json'].get('search',{}).get('query')=='' and r['json'].get('search',{}).get('mint') is None]
  captures.append({'width':width,'capture':'genuine registry windows','responses':browse_pages})
  check(width,'bounded registry pagination48max,source revision consistent,no memecoin request from browsing')
  page.get_by_role('button',name='Close asset list',exact=True).click();page.locator('.pair-registry-list').wait_for(state='hidden')
  page.get_by_role('button',name='Refresh sample',exact=True).click();page.get_by_role('button',name='Refresh sample',exact=True).wait_for();assert page.locator('.pair-selected a').inner_text()==DISTINCT
  page.add_style_tag(content='.pair-explorer p,.pair-explorer span,.pair-explorer strong,.pair-explorer summary,.pair-explorer dt,.pair-explorer dd,.pair-explorer button,.pair-explorer input{font-size:24px!important}')
  assert page.evaluate('document.documentElement.scrollWidth<=innerWidth');check(width,'manual sample refresh preserves mint;enlarged text reflows')
  for path in ['/radar','/brief','/research','/status','/brief/2026-10-11/editions/d3a23a36ef05a3c3f0ab4fdaf94b000aaed24fe70c945607a97a50da7dde6f63']:
   assert page.goto(args.base+path,wait_until='domcontentloaded').status==200
  reads.clear();page.goto(args.base+'/?mint='+tokens[0]['mint'],wait_until='domcontentloaded');page.get_by_role('heading',name='Token dossier',exact=True).wait_for()
  assert not any('/api/pairs' in r or '/api/pair-quotes' in r or '/api/radar' in r for r in reads)
  assert page.locator('meta[property="og:image"]').get_attribute('content').endswith('/api/og?mint='+tokens[0]['mint'])
  assert page.get_by_role('contentinfo',name='STORK ecosystem connection').count()==1 and not errors,errors
  check(width,'research/immutable routes,dossier bypass/OG and STORK preserved;zero page errors');c.close()
 # Synthetic/aborted states are isolated here. They never produce screenshots.
 for width in [320,390,1280]:
  for state in ['registry503','registry429','registry-forged','registry-empty','registry-loading','sample503','sample429','sample-empty','sample-nulls','sample-mode','sample-identity','sample-proof','sample-loading']:
   c=browser.new_context(viewport={'width':width,'height':844});page=c.new_page();pending=[];reads=[]
   page.on('request',lambda r:reads.append(r.url) if '/api/' in r.url else None)
   reg=json.loads(json.dumps(genuine_registry));cat=json.loads(json.dumps(genuine_scoped))
   if state=='registry-forged':reg['dataset']['provenance']['source']='https://evil.invalid'
   if state=='registry-empty':reg['quotes']=[];reg['dataset']['coverage'].update(matchedCount=0,returnedCount=0,nextOffset=None,resultTruncated=False)
   def registry_route(route,request,data=reg,kind=state):
    if kind=='registry-loading':pending.append(route);return
    if kind in ['registry503','registry429']:return route.fulfill(status=503 if kind=='registry503' else 429,json={'status':'unavailable'})
    route.fulfill(json=data)
   c.route('**/api/pair-quotes?*',registry_route)
   if state=='sample-empty':
    cat['groups'][0].update(tokens=[],availability='no_tokens_in_bounded_sample',verification='official_registry_only');cat['dataset']['coverage'].update(tokensReturned=0,providerReportedTotal=0,recordsReceived=0,rejectedRecords=0,modeChecks=0,pagesFetched=1)
    cat['dataset']['sources']=[s for s in cat['dataset']['sources'] if urlparse(s['source']).path=='/api/public/v1/pairs' or urlparse(s['source']).path=='/api/public/v1/tokens' and parse_qs(urlparse(s['source']).query).get('page')==['1']]
   for t in cat['groups'][0]['tokens']:
    if state=='sample-nulls':t['market'].update(status='unavailable',priceUsd=None,liquidityUsd=None,volume24hUsd=None);t.update(observationCount=None,lastObservedAt=None,historyStatus='not_tracked',historyFreshness='unavailable')
    if state=='sample-mode':t.update(rewardModeVerified=False,modeVerification='source_unavailable',rewardSource=None)
   if state=='sample-identity':cat['groups'][0]['quoteName']='Synthetic mismatched registry name'
   if state=='sample-proof':cat['dataset']['coverage']['discovery']['providerReportedTotalScope']='catalog'
   def sample_route(route,request,data=cat,kind=state):
    if kind=='sample-loading':pending.append(route);return
    if kind in ['sample503','sample429']:return route.fulfill(status=503 if kind=='sample503' else 429,json={'status':'unavailable'})
    route.fulfill(json=data)
   c.route('**/api/pairs?*',sample_route);c.route('**/api/radar?*',lambda route:route.fulfill(json=genuine_radar))
   page.goto(args.base+'/',wait_until='domcontentloaded');page.locator('#pair-search').fill('NVDAX')
   if state=='registry-loading':page.get_by_text('Searching verified registry…',exact=True).wait_for()
   elif state in ['registry503','registry429','registry-forged']:
    page.get_by_role('button',name='Retry registry',exact=True).wait_for();assert page.get_by_text('Counts are unknown.',exact=False).is_visible();assert page.locator('.pair-registry-count,.pair-token').count()==0
   elif state=='registry-empty':page.get_by_text('No matching identity in the verified registry response.',exact=False).wait_for();assert not any('/api/pairs?' in r for r in reads)
   else:
    page.get_by_role('button',name=re.compile('^Select NVDAX .*'+NI+'$')).wait_for();page.get_by_role('button',name=re.compile('^Select NVDAX .*'+NI+'$')).click()
    if state=='sample-loading':page.get_by_role('button',name='Reading…',exact=True).wait_for()
    elif state in ['sample503','sample429','sample-identity','sample-proof']:
     page.get_by_role('button',name='Retry sample',exact=True).wait_for();assert page.locator('.pair-token,.pair-market time').count()==0
    else:
     page.get_by_role('button',name='Refresh sample',exact=True).wait_for()
     if state=='sample-empty':page.locator('.pair-empty').wait_for()
     if state=='sample-nulls':assert page.locator('.pair-market time,.pair-reward time').count()==0
     if state=='sample-mode':assert page.get_by_text('Reward mode unverified',exact=True).count()>0 and page.locator('.pair-range').count()==0
   audit(page);check(width,'ISOLATED '+state+':honest source/count/identity/market/return state,axe/reflow,no screenshot')
   for route in pending:route.abort()
   c.close()
 # Targeted async source/pagination checks, also isolated and never photographed.
 for state in ['revision','race','invalid-input','registry-recovery']:
  c=browser.new_context(viewport={'width':390,'height':844});page=c.new_page();pending=[];calls=[]
  def route_registry(route,request,kind=state):
   params=parse_qs(urlparse(request.url).query,keep_blank_values=True);calls.append(request.url)
   if kind=='revision':
    index=0 if params.get('offset',['0'])[0]=='0' else 1;data=json.loads(json.dumps(browse_pages[index]))
    if index:data['dataset']['provenance']['revision']='sha256:'+'d'*64
    return route.fulfill(json=data)
   if kind=='race':
    if params.get('query',[''])[0].lower()=='nvdax':pending.append(route);return
    return route.fulfill(json=stonks)
   if kind=='registry-recovery' and len(calls)==1:return route.fulfill(status=503,json={'status':'unavailable'})
   route.fulfill(json=genuine_registry)
  c.route('**/api/pair-quotes?*',route_registry)
  page.goto(args.base+'/',wait_until='domcontentloaded')
  if state=='revision':
   page.get_by_role('button',name='Browse quote assets',exact=True).click();page.locator('.pair-registry-list button').first.wait_for()
   page.get_by_role('button',name='Show more assets',exact=True).click();page.get_by_text('Registry refreshed. Restart this search.',exact=True).wait_for()
   assert page.locator('.pair-registry-list button,.pair-registry-count').count()==0
  elif state=='race':
   page.locator('#pair-search').fill('NVDAX');page.wait_for_timeout(450);assert pending
   search(page,'STONK')
   for route in pending:
    try:route.fulfill(json=genuine_registry)
    except Exception:pass # The old fetch may already have been cancelled by AbortController.
   pending=[];page.wait_for_timeout(200)
   assert page.locator('.pair-registry-list button').count()==len(stonks['quotes']) and page.locator('#pair-search').input_value()=='STONK'
  elif state=='invalid-input':
   page.locator('#pair-search').fill('a'*65);page.get_by_text('Use up to 64 characters without control characters.',exact=True).wait_for();assert calls==[]
  else:
   page.locator('#pair-search').fill('NVDAX');page.get_by_role('button',name='Retry registry',exact=True).wait_for();page.wait_for_timeout(600);assert len(calls)==1
   page.get_by_role('button',name='Retry registry',exact=True).click();page.get_by_role('button',name=re.compile('^Select NVDAX .*'+NI+'$')).wait_for();assert len(calls)==2
  audit(page);check(390,'ISOLATED '+state+':cancelled search/revision/input/retry guard,no screenshot');c.close()
 browser.close()
result={'target':'local production build on merged #47; all screenshots genuine; read-only fetch-clone recorder, no financial response substitution','finishedAt':datetime.now(timezone.utc).isoformat(),'checks':checks,'captures':captures,'apiProof':proof,
 'limitations':'Chromium/axe is not physical Safari/VoiceOver or WCAG certification. No timed user study. Provider registry response is not independent universal completeness. Token discovery remains2pages/50records with process-local cooldown. Real429 was not induced; isolated fixtures never produce screenshots. The rare Unicode scope response is recorded as observed, without promising an empty result.'}
(root/'docs/evidence/pair-registry-browser.json').write_text(json.dumps(result,separators=(',',':'))+'\n')
print(str(len(checks))+' registry/browser checks passed; genuine screenshots saved',flush=True)
