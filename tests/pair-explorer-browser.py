"""Combined production QA; only genuine responses produce screenshots.
Isolated error fixtures never produce screenshots. Target is restricted to localhost."""
import argparse,json,re,time
from pathlib import Path
from datetime import datetime,timezone
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright
parser=argparse.ArgumentParser()
parser.add_argument('--base',default='http://127.0.0.1:3155')
parser.add_argument('--axe',required=True)
args=parser.parse_args()
u=urlparse(args.base)
assert u.scheme=='http' and u.hostname in ['localhost','127.0.0.1'] and not u.username and not u.password and u.path in ['', '/'] and not u.query and not u.fragment
root=Path(__file__).resolve().parents[1];checks=[];captures=[];proof=[]
NI='Xsc9qvGR1efVDFGLrVsmkzv3qi45LTBjeUKSPmx9qEh'
ZEC='A7bdiYdS5GjqGFtxf17ppRHtDKPkkRqbKtR27dxvQXaS'
STONK='6GmAFSYs4gk3FDao5FzzySQpPZaWsa4rUJHacpMpUNgx'
DISTINCT='Qirqk4cXB3txQmdqwB7R9o5KVkNzj5ZCT9BHsuLpump'
def check(width,name):checks.append({'width':width,'check':name,'result':'PASS'})
def audit(page):
 page.add_script_tag(path=args.axe)
 result=page.evaluate("async()=>await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}})")
 assert not result['violations'],[(v['id'],[n['target'] for n in v['nodes']]) for v in result['violations']]
 assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
 return len(result['passes'])
def ready(page):
 page.get_by_role('button',name='Refresh',exact=True).wait_for()
 page.locator('.pair-token-list[aria-busy=false], .pair-empty').wait_for()
 page.wait_for_timeout(150)
def choose(page,symbol,mint=None):
 page.locator('#pair-search').fill(symbol)
 button=page.locator('.pair-chips button').filter(has_text=re.compile('^'+re.escape(symbol)))
 if mint:button=button.filter(has_text=mint)
 button.first.click();ready(page)
def scope(c,mint):
 assert c['status'] in ['available','degraded'] and len(c['groups'])==1 and c['groups'][0]['quoteMint']==mint
 cov=c['dataset']['coverage']
 assert cov['discovery']=={'strategy':'provider_quote_mint','quoteMint':mint,'providerReportedTotalScope':'quote_mint'}
 assert cov['complete'] is False and cov['atomic'] is False and cov['pageLimit']==2 and cov['pageSize']==25 and cov['pagesFetched']<=2
 assert cov['tokensReturned']==len(c['groups'][0]['tokens'])<=50 and cov['modeChecks']<=12
 from urllib.parse import parse_qs
 pages=[s for s in c['dataset']['sources'] if urlparse(s['source']).path=='/api/public/v1/tokens']
 assert len(pages)==cov['pagesFetched'] and all(parse_qs(urlparse(s['source']).query)['quoteMint']==[mint] for s in pages)
 for t in c['groups'][0]['tokens']:
  assert t['quoteMint']==mint and t['market']['unit']=='USD' and t['market']['observedAt'] is None
  assert all(t['comparisons'][key] is None for key in ['quoteRelativePriceReturn','quoteAssetBenchmarkReturn','holderAttributedReward'])
  assert t['rewardModeVerified']==(t['modeVerification']=='verified_reward')
 return c
def read(context,path,status=200):
 r=context.request.get(args.base+path,timeout=20000)
 c=r.json();proof.append({'request':path,'capturedAt':datetime.now(timezone.utc).isoformat(),'httpStatus':r.status,'cacheControl':r.headers.get('cache-control'),'body':c})
 assert r.status==status,(path,r.status,c.get('status'))
 assert r.headers.get('cache-control')=='no-store'
 return c
def wait_budget(page):
 print('Respecting one cold scoped query/minute; waiting 61 seconds, no retries',flush=True)
 until=time.monotonic()+61
 while time.monotonic()<until:page.wait_for_timeout(1000)
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-gpu'])
 # One server/process, four distinct cold scopes only. No production writes or upstream quota-pressure tests.
 primer=browser.new_context(viewport={'width':390,'height':844});page=primer.new_page()
 primer.add_init_script('''(() => {
   const original=window.fetch.bind(window);window.__pairPackets=[];
   window.fetch=async(...args)=>{const response=await original(...args);const url=typeof args[0]==='string'?args[0]:args[0].url;
    if(url.includes('/api/pairs') || url.includes('/api/radar')) response.clone().json().then(json=>window.__pairPackets.push({url,status:response.status,json})).catch(()=>{});
    return response;};})();''')
 page.goto(args.base+'/',wait_until='domcontentloaded');ready(page)
 genuine_catalog=read(primer,'/api/pairs');genuine_scoped=scope(read(primer,'/api/pairs?quoteMint='+NI+'&discovery=pair'),NI)
 genuine_radar=read(primer,'/api/radar?sort=name')
 assert genuine_catalog['dataset']['coverage']['discovery']=={'strategy':'global_sample','quoteMint':None,'providerReportedTotalScope':'catalog'}
 legacy=read(primer,'/api/pairs?quoteMint='+DISTINCT)
 assert legacy['groups'][0]['availability']=='no_tokens_in_bounded_sample' and legacy['groups'][0]['tokens']==[]
 assert legacy['dataset']['coverage']['discovery']['strategy']=='global_sample'
 check('API','real global/local-filter/scoped identity, two-page false complete/atomic, null returns, correct source URLs and total scope; genuine legacy empty is not ecosystem absence')
 with page.expect_response('**/api/pairs?quoteMint='+ZEC+'&discovery=pair') as denied:choose(page,'ZEC')
 assert denied.value.status==503
 assert page.get_by_text('Selected-pair source unavailable.',exact=False).is_visible()
 assert page.locator('.pair-market time,.pair-range').count()==0
 audit(page);page.locator('#pair-search').fill('');page.screenshot(path=str(root/'docs/screenshots/pair-day2-after-admission-390.png'),full_page=False)
 check(390,'genuine immediate cold switch503 withholds figures; no retry/polling or successful-scope claim')
 page.wait_for_function("window.__pairPackets.some(p=>p.status===503 && p.url.includes('discovery=pair'))")
 captures.append({'width':390,'capture':'genuine scoped admission503','responses':page.evaluate('window.__pairPackets')})
 wait_budget(page)
 zec=scope(read(primer,'/api/pairs?quoteMint='+ZEC+'&discovery=pair'),ZEC)
 wait_budget(page)
 stonk=scope(read(primer,'/api/pairs?quoteMint='+STONK+'&discovery=pair'),STONK)
 wait_budget(page)
 distinct=scope(read(primer,'/api/pairs?quoteMint='+DISTINCT+'&discovery=pair'),DISTINCT)
 assert stonk['groups'][0]['quoteSymbol']==distinct['groups'][0]['quoteSymbol']=='STONK'
 assert not ({t['mint'] for t in stonk['groups'][0]['tokens']} & {t['mint'] for t in distinct['groups'][0]['tokens']})
 check('API','real distinct same-symbol scoped mints produce disjoint results; no symbol alias; scoped totals differ from global')
 primer.close()
 for width in [320,390,1280]:
  print('Real production browser width',width,flush=True)
  context=browser.new_context(viewport={'width':width,'height':844},reduced_motion='reduce')
  page=context.new_page();errors=[];reads=[]
  page.on('pageerror',lambda e:errors.append(str(e)))
  page.on('request',lambda r:reads.append(r.url) if '/api/' in r.url else None)
  context.add_init_script('''(() => {
   const original=window.fetch.bind(window);window.__pairPackets=[];
   window.fetch=async(...args)=>{const response=await original(...args);const url=typeof args[0]==='string'?args[0]:args[0].url;
    if(url.includes('/api/pairs') || url.includes('/api/radar')) response.clone().json().then(json=>window.__pairPackets.push({url,status:response.status,json})).catch(()=>{});
    return response;};})();''')
  page.goto(args.base+'/',wait_until='domcontentloaded');ready(page)
  page.wait_for_function("window.__pairPackets.some(p=>p.url==='/api/pairs') && window.__pairPackets.some(p=>p.url.includes('/api/radar')) && window.__pairPackets.some(p=>p.url.includes('discovery=pair'))")
  packets=page.evaluate('window.__pairPackets')
  catalog=next(x['json'] for x in packets if x['url']=='/api/pairs')
  scoped=scope(next(x['json'] for x in packets if 'discovery=pair' in x['url']),NI)
  group=scoped['groups'][0];first=group['tokens'][0]
  assert page.locator('.pair-selected a').inner_text()==NI
  assert page.locator('.pair-token').count()==len(group['tokens'])
  chip=page.locator('.pair-chips button').filter(has_text=re.compile('^NVDAX'));assert str(len(group['tokens'])) in chip.inner_text()
  assert page.locator('.pair-token h3').first.inner_text().strip().startswith(first['symbol'])
  if first['market']['status']=='reported_snapshot':assert page.locator('.pair-market time').first.get_attribute('datetime')==first['market']['providerGeneratedAt']
  assert page.get_by_text('Market observation time',exact=False).count()>0
  assert page.locator('.pair-token-evidence[open], .pair-dataset[open]').count()==0
  assert page.get_by_role('heading',level=1).count()==1 and page.locator('main#scout-content').count()==1
  y=page.locator('.pair-token').first.bounding_box()['y'];assert y<700,y
  for control in page.locator('#pair-search,.pair-chips button,.pair-scope button,.pair-token-evidence>summary').all():assert control.bounding_box()['height']>=44
  page.keyboard.press('Tab');assert page.evaluate('document.activeElement.classList.contains("skip-content")')
  page.keyboard.press('Enter');assert page.evaluate('document.activeElement.id==="scout-content"')
  rules=audit(page);page.evaluate('document.activeElement.blur();scrollTo(0,0)')
  page.screenshot(path=str(root/f'docs/screenshots/pair-day2-after-home-{width}.png'),full_page=False)
  captures.append({'width':width,'capturedAt':datetime.now(timezone.utc).isoformat(),'firstTokenY':y,'responses':packets,'axePasses':rules})
  check(width,'genuine opt-in scoped rows/chip count, exact mint, timestamp and USD limits; false coverage; accessible single h1/main,44px controls,skip focus,axe and reflow')
  global_mints={t['mint'] for g in catalog['groups'] for t in g['tokens']}
  extra=next(t for t in group['tokens'] if t['mint'] not in global_mints)
  before=len(reads);page.locator('#pair-search').fill(extra['mint'])
  assert page.locator('.pair-token').count()==1 and page.locator('.pair-token h3').first.inner_text().startswith(extra['symbol'])
  page.locator('#pair-search').fill('no such sampled token');assert page.get_by_text('No match in the fetched sample.',exact=False).is_visible()
  page.wait_for_timeout(1100);assert len(reads)==before
  page.locator('#pair-search').fill('');page.locator('.pair-picker>summary').click();page.locator('#pair-select').select_option(NI);assert len(reads)==before
  check(width,'new scoped-only token is searchable; no polling/search fanout; exact native picker uses cached scope')
  choose(page,'ZEC');assert page.locator('.pair-selected a').inner_text()==ZEC
  summary=page.locator('.pair-token-evidence>summary').first;summary.focus();page.keyboard.press('Enter')
  assert page.locator('.pair-token-evidence').first.get_attribute('open') is not None
  assert page.get_by_text('Holder-attributable rewards',exact=True).first.is_visible();audit(page)
  if width==390:
   summary.scroll_into_view_if_needed();page.screenshot(path=str(root/'docs/screenshots/pair-day2-after-evidence-390.png'),full_page=False)
  summary.focus();page.keyboard.press('Space');assert page.locator('.pair-token-evidence').first.get_attribute('open') is None
  check(width,'manual selection recovers genuine previously denied scope; keyboard evidence, no attribution/returns, expanded axe')
  choose(page,'STONK',STONK)
  page.locator('#pair-search').fill(DISTINCT);page.get_by_role('button',name='Verify exact quote mint',exact=True).click();ready(page)
  assert page.locator('.pair-selected a').inner_text()==DISTINCT
  page.locator('#pair-search').fill('STONK')
  buttons=page.locator('.pair-chips button').filter(has_text=re.compile('^STONK'))
  assert buttons.count()>=2 and all(b.locator('small').count()==1 for b in buttons.all())
  assert page.locator('.pair-token').count()==len(distinct['groups'][0]['tokens'])
  if width==390:
   page.evaluate('document.activeElement.blur()');page.mouse.wheel(0,300);page.wait_for_timeout(150);page.evaluate('scrollTo(0,0)');page.wait_for_timeout(150);audit(page);page.screenshot(path=str(root/'docs/screenshots/pair-day2-after-distinct-stonk-390.png'),full_page=False)
  choose(page,'NVDAX');page.locator('#pair-search').fill('STONK');assert buttons.count()>=2
  page.locator('#pair-search').fill('');choose(page,'NVDAX')
  check(width,'same-symbol scopes stay separate, mint-disambiguated and searchable after switching away; exact-mint opt-in yields actual wider records')
  with page.expect_response('**/api/pairs'):page.get_by_role('button',name='Refresh',exact=True).click()
  ready(page);assert page.locator('.pair-selected a').inner_text()==NI
  page.add_style_tag(content='.pair-explorer p,.pair-explorer span,.pair-explorer strong,.pair-explorer summary,.pair-explorer dt,.pair-explorer dd,.pair-explorer button,.pair-explorer input,.pair-explorer select{font-size:24px!important}')
  assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
  check(width,'manual refresh preserves exact selection; enlarged text reflows')
  for path in ['/radar','/brief','/research','/status','/brief/2026-10-11/editions/d3a23a36ef05a3c3f0ab4fdaf94b000aaed24fe70c945607a97a50da7dde6f63']:
   assert page.goto(args.base+path,wait_until='domcontentloaded').status==200
   assert page.locator('main#scout-content').count()==1
  reads.clear();page.goto(args.base+'/?mint='+first['mint'],wait_until='domcontentloaded')
  page.get_by_role('heading',level=1).wait_for();assert page.get_by_role('heading',level=1).inner_text()=='Token dossier'
  assert not any('/api/pairs' in r or '/api/radar' in r for r in reads)
  assert page.locator('meta[property="og:image"]').get_attribute('content').endswith('/api/og?mint='+first['mint'])
  assert page.get_by_role('contentinfo',name='STORK ecosystem connection').count()==1
  assert not errors,errors
  check(width,'research/immutable routes and dossier bypass/OG/STORK preserved; zero page errors')
  captures.append({'width':width,'capture':'completed selections','responses':page.evaluate('window.__pairPackets')})
  context.close()
 # Isolated synthetic/aborted state tests; never screenshot inputs.
 for width in [320,390,1280]:
  for state in ['failed','429','scope-503','scope-proof','degraded','nulls','empty','forged','loading','mode-unverified','duplicate-symbol']:
   context=browser.new_context(viewport={'width':width,'height':844})
   page=context.new_page();pending=[]
   fixture=json.loads(json.dumps(genuine_catalog))
   if state in ['failed','429']:
    page.route('**/api/pairs*',lambda route:route.fulfill(status=429 if state=='429' else 503,json={'status':'unavailable'}))
   elif state=='loading':page.route('**/api/pairs*',lambda route:pending.append(route))
   else:
    if state=='degraded':fixture['status']='degraded';fixture['dataset']['sourceStatus']='degraded'
    if state=='empty':
     fixture['groups']=[next(g for g in fixture['groups'] if g['quoteSymbol']=='NVDAX')]
     fixture['groups'][0]['tokens']=[];fixture['groups'][0]['availability']='no_tokens_in_bounded_sample';fixture['groups'][0]['verification']='official_registry_only';fixture['dataset']['coverage']['tokensReturned']=0
    if state=='duplicate-symbol':
     ni=next(g for g in fixture['groups'] if g['quoteSymbol']=='NVDAX')
     other=next(g for g in fixture['groups'] if g['quoteMint']!=ni['quoteMint'])
     other['quoteSymbol']='NVDAX';other['symbolAmbiguous']=True
     for token in other['tokens']:token['quoteSymbol']='NVDAX';token['rewardModeVerified']=False;token['modeVerification']='catalog_only';token['rewardSource']=None
    for group in fixture['groups']:
     for token in group['tokens']:
      if state=='forged':token['quoteMint']='FORGED'
      if state=='nulls':
       token['market'].update(status='unavailable',priceUsd=None,liquidityUsd=None,volume24hUsd=None);token['observationCount']=None;token['lastObservedAt']=None;token['historyStatus']='not_tracked';token['historyFreshness']='unavailable'
      if state=='mode-unverified':token['rewardModeVerified']=False;token['modeVerification']='source_unavailable';token['rewardSource']=None
    def route_catalog(route,request,data=fixture):
     # Synthetic exact response filtering only; all fixtures remain test-only.
     from urllib.parse import parse_qs,urlparse
     mint=parse_qs(urlparse(request.url).query).get('quoteMint',[None])[0]
     result=json.loads(json.dumps(data))
     if mint:
      if state=='scope-503':return route.fulfill(status=503,json={'status':'unavailable'})
      result['groups']=[g for g in result['groups'] if g['quoteMint']==mint]
      result['dataset']['coverage']['tokensReturned']=sum(len(g['tokens']) for g in result['groups'])
      result['dataset']['coverage']['discovery']={'strategy':'provider_quote_mint','quoteMint':mint,'providerReportedTotalScope':'quote_mint'}
      for source in result['dataset']['sources']:
       if urlparse(source['source']).path=='/api/public/v1/tokens':source['source']+='&quoteMint='+mint
      for group in result['groups']:
       for token in group['tokens']:
        token['source']+='&quoteMint='+mint;token['provenance']['source']=token['source']
      if state=='scope-proof':result['dataset']['coverage']['discovery']['providerReportedTotalScope']='catalog'
     route.fulfill(json=result)
    page.route('**/api/pairs*',route_catalog)
   page.goto(args.base+'/',wait_until='domcontentloaded')
   if state=='loading':
    page.get_by_role('button',name='Reading…',exact=True).wait_for();assert page.get_by_text('Catalog loading',exact=False).is_visible()
   elif state in ['failed','429','forged']:
    page.get_by_role('button',name='Retry catalog',exact=True).wait_for()
    assert page.get_by_text('Catalog unavailable · dated tracked sample',exact=False).is_visible();assert page.locator('.pair-market time').count()==0
   else:
    page.get_by_role('button',name='Refresh',exact=True).wait_for()
    if state=='empty':page.locator('.pair-empty').wait_for()
    else:page.locator('.pair-token-list[aria-busy=false]').wait_for()
    if state in ['scope-503','scope-proof']:
     assert page.get_by_text('Selected-pair source unavailable.',exact=False).is_visible() and page.locator('.pair-market time,.pair-range').count()==0
    if state=='nulls':assert page.locator('.pair-market time').count()==0 and page.locator('.pair-reward time').count()==0
    if state=='mode-unverified':assert page.get_by_text('Reward mode unverified',exact=True).count()>=1 and page.locator('.pair-range').count()==0
   audit(page);check(width,'ISOLATED '+state+': no fabricated coverage/market/returns; accessible state; no screenshot')
   for route in pending:route.abort()
   context.close()
 browser.close()
result={'target':'local production build; genuine source packets in every screenshot; fetch response clones recorded read-only without response substitution','finishedAt':datetime.now(timezone.utc).isoformat(),'checks':checks,'captures':captures,'apiProof':proof,
 'limitations':'Chromium viewport/axe checks, not physical Safari/VoiceOver or WCAG certification. Five-second comprehension needs human testing. Isolated fixtures never used for screenshots. Merged #44 scoped discovery verified, still nonexhaustive. Full registry symbol/name search remains unsupported. Real admission503 verified; no upstream429 induced;429 fixtures are isolated and never photographed. Legacy local empty is genuine; opt-in zero-result state is isolated.'}
(root/'docs/evidence/pair-day2-browser.json').write_text(json.dumps(result,indent=2)+'\n')
print(str(len(checks))+' browser checks passed; genuine screenshots saved')
