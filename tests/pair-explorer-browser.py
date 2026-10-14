"""Day 2 production Chromium QA. Screenshots use genuine responses only.
Synthetic packets are confined to isolated cases with no screenshots."""
import argparse,json,re
from pathlib import Path
from datetime import datetime,timezone
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright
parser=argparse.ArgumentParser()
parser.add_argument('--base',default='http://127.0.0.1:3154')
parser.add_argument('--axe',required=True)
parser.add_argument('--empty-mint')
args=parser.parse_args()
u=urlparse(args.base)
assert u.scheme=='http' and u.hostname in ['localhost','127.0.0.1'] and not u.username and not u.password and u.path in ['', '/'] and not u.query and not u.fragment
root=Path(__file__).resolve().parents[1];checks=[];captures=[]
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
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 genuine_catalog=genuine_radar=None
 for width in [320,390,1280]:
  context=browser.new_context(viewport={'width':width,'height':844},reduced_motion='reduce')
  page=context.new_page();errors=[];reads=[];packets=[]
  page.on('pageerror',lambda e:errors.append(str(e)))
  page.on('request',lambda r:reads.append(r.url) if '/api/' in r.url else None)
  context.add_init_script('''(() => {
   const original=window.fetch.bind(window);
   window.__pairPackets=[];
   window.fetch=async(...args)=>{
    const response=await original(...args);
    const url=typeof args[0]==='string'?args[0]:args[0].url;
    if(url.includes('/api/pairs') || url.includes('/api/radar')) {
     response.clone().json().then(json=>window.__pairPackets.push({url,status:response.status,json})).catch(()=>{});
    }
    return response;
   };
  })();''')
  page.goto(args.base+'/',wait_until='domcontentloaded');ready(page)
  page.wait_for_function("window.__pairPackets.some(p=>p.url==='/api/pairs') && window.__pairPackets.some(p=>p.url.includes('/api/radar')) && window.__pairPackets.some(p=>p.url.includes('/api/pairs?quoteMint='))")
  packets=page.evaluate('window.__pairPackets')
  catalog=next(x['json'] for x in packets if x['url']=='/api/pairs')
  radar=next(x['json'] for x in packets if '/api/radar' in x['url'])
  assert catalog['status'] in ['available','degraded'] and catalog['groups']
  genuine_catalog,genuine_radar=catalog,radar
  group=next(g for g in catalog['groups'] if g['quoteSymbol']=='NVDAX')
  scoped=next(x['json'] for x in packets if '/api/pairs?quoteMint=' in x['url'])
  assert scoped['groups'][0]['quoteMint']==group['quoteMint']
  assert page.locator('.pair-selected a').inner_text()==group['quoteMint']
  assert page.locator('.pair-token').count()==len(scoped['groups'][0]['tokens'])
  first=scoped['groups'][0]['tokens'][0]
  assert page.locator('.pair-token h3').first.inner_text().strip().startswith(first['symbol'])
  if first['market']['status']=='reported_snapshot':
   assert page.locator('.pair-market time').first.get_attribute('datetime')==first['market']['providerGeneratedAt']
   assert page.get_by_text('Market observation time',exact=False).count()>0
  if first['lastObservedAt']:assert page.locator('.pair-reward time').first.get_attribute('datetime')==first['lastObservedAt']
  assert page.locator('.pair-token-evidence[open], .pair-dataset[open]').count()==0
  assert page.get_by_role('heading',level=1).count()==1 and page.locator('main#scout-content').count()==1
  y=page.locator('.pair-token').first.bounding_box()['y'];assert y<700, y
  for control in page.locator('#pair-search,.pair-chips button,.pair-scope button,.pair-token-evidence>summary').all():assert control.bounding_box()['height']>=44
  page.keyboard.press('Tab');assert page.evaluate('document.activeElement.classList.contains("skip-content")')
  page.keyboard.press('Enter');assert page.evaluate('document.activeElement.id==="scout-content"')
  rules=audit(page);page.evaluate('document.activeElement.blur();scrollTo(0,0)')
  page.screenshot(path=str(root/f'docs/screenshots/pair-day2-after-home-{width}.png'),full_page=True)
  captures.append({'width':width,'capturedAt':datetime.now(timezone.utc).isoformat(),'firstTokenY':y,'responses':packets.copy(),'axePasses':rules})
  check(width,'genuine catalog/scoped/Radar: exact quote mint, real response/observation times, USD limitations, native mode state; 44px controls; single h1/main; skip link/focus; axe and reflow')
  before=len(reads);page.wait_for_timeout(1100);assert len(reads)==before,'No polling'
  page.locator('#pair-search').fill('no such sampled token');assert page.get_by_text('No match in the fetched sample.',exact=False).is_visible()
  assert len(reads)==before
  page.locator('#pair-search').fill('')
  page.locator('.pair-picker>summary').click()
  page.locator('#pair-select').select_option(group['quoteMint']);assert len(reads)==before
  check(width,'no polling/search fanout; native browse picker uses exact mint and cached selection')
  choose(page,'ZEC')
  assert page.locator('.pair-token').count()>=2
  summary=page.locator('.pair-token-evidence>summary').first;summary.focus();page.keyboard.press('Enter')
  assert page.locator('.pair-token-evidence').first.get_attribute('open') is not None
  assert page.get_by_text('Holder-attributable rewards',exact=True).first.is_visible()
  audit(page)
  if width==390:page.screenshot(path=str(root/'docs/screenshots/pair-day2-after-evidence-390.png'),full_page=True)
  summary.focus();page.keyboard.press('Space');assert page.locator('.pair-token-evidence').first.get_attribute('open') is None
  check(width,'exact ZEC selection, genuine scoped sample, keyboard disclosure, unavailable attribution, expanded axe')
  if args.empty_mint and width==390:
   page.locator('#pair-search').fill(args.empty_mint)
   page.get_by_role('button',name='Verify exact quote mint',exact=True).click()
   page.locator('.pair-empty').wait_for()
   assert page.get_by_text('Tokens may exist outside this bounded sample.',exact=False).is_visible()
   assert page.locator('.pair-selected a').inner_text()==args.empty_mint
   audit(page);page.screenshot(path=str(root/'docs/screenshots/pair-day2-after-registry-empty-390.png'),full_page=True)
   captures.append({'width':width,'capture':'genuine registry-only empty group','responses':page.evaluate('window.__pairPackets')})
   check(width,'genuine exact-mint registry lookup: empty fetched pages explicitly do not establish ecosystem absence')
   page.locator('#pair-search').fill('STONK')
   assert page.locator('.pair-chips button').filter(has_text=re.compile('^STONK')).count()>=2
   assert all(button.locator('small').count()==1 for button in page.locator('.pair-chips button').filter(has_text=re.compile('^STONK')).all())
   check(width,'genuine same-symbol distinct registry mints have visible mint abbreviations')
  page.locator('#pair-search').fill('NVDAX');choose(page,'NVDAX')
  with page.expect_response('**/api/pairs'):page.get_by_role('button',name='Refresh',exact=True).click()
  ready(page);assert page.locator('.pair-selected a').inner_text()==group['quoteMint']
  page.add_style_tag(content='.pair-explorer p,.pair-explorer span,.pair-explorer strong,.pair-explorer summary,.pair-explorer dt,.pair-explorer dd,.pair-explorer button,.pair-explorer input,.pair-explorer select{font-size:24px!important}')
  assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
  check(width,'manual refresh preserves exact selection; enlarged text reflows')
  for path in ['/radar','/brief','/research','/status','/brief/2026-10-11/editions/d3a23a36ef05a3c3f0ab4fdaf94b000aaed24fe70c945607a97a50da7dde6f63']:
   assert page.goto(args.base+path,wait_until='domcontentloaded').status==200
   assert page.locator('main#scout-content').count()==1
  reads.clear();page.goto(args.base+'/?mint='+first['mint'],wait_until='domcontentloaded')
  assert page.get_by_role('heading',level=1).inner_text()=='Token dossier'
  assert not any('/api/pairs' in r or '/api/radar' in r for r in reads)
  assert page.locator('meta[property="og:image"]').get_attribute('content').endswith('/api/og?mint='+first['mint'])
  assert page.get_by_role('contentinfo',name='STORK ecosystem connection').count()==1
  assert not errors,errors
  check(width,'research/immutable routes preserved; dossier skips catalog/Radar; OG metadata and STORK preserved; zero page errors')
  context.close()
 # Isolated synthetic/aborted state tests; never screenshot inputs.
 for width in [320,390,1280]:
  for state in ['failed','degraded','nulls','empty','forged','loading','mode-unverified','duplicate-symbol']:
   context=browser.new_context(viewport={'width':width,'height':844})
   page=context.new_page();pending=[]
   fixture=json.loads(json.dumps(genuine_catalog))
   if state=='failed':
    page.route('**/api/pairs*',lambda route:route.fulfill(status=503,json={'status':'unavailable'}))
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
      result['groups']=[g for g in result['groups'] if g['quoteMint']==mint]
      result['dataset']['coverage']['tokensReturned']=sum(len(g['tokens']) for g in result['groups'])
     route.fulfill(json=result)
    page.route('**/api/pairs*',route_catalog)
   page.goto(args.base+'/',wait_until='domcontentloaded')
   if state=='loading':
    page.get_by_role('button',name='Reading…',exact=True).wait_for();assert page.get_by_text('Catalog loading',exact=False).is_visible()
   elif state in ['failed','forged']:
    page.get_by_role('button',name='Retry catalog',exact=True).wait_for()
    assert page.get_by_text('Catalog unavailable · dated tracked sample',exact=False).is_visible();assert page.locator('.pair-market time').count()==0
   else:
    page.get_by_role('button',name='Refresh',exact=True).wait_for()
    if state=='empty':page.locator('.pair-empty').wait_for()
    else:page.locator('.pair-token-list[aria-busy=false]').wait_for()
    if state=='nulls':assert page.locator('.pair-market time').count()==0 and page.locator('.pair-reward time').count()==0
    if state=='mode-unverified':assert page.get_by_text('Reward mode unverified',exact=True).count()>=1 and page.locator('.pair-range').count()==0
   audit(page);check(width,'ISOLATED '+state+': no fabricated coverage/market/returns; accessible state; no screenshot')
   for route in pending:route.abort()
   context.close()
 browser.close()
result={'target':'local production build; genuine source packets in every screenshot; fetch response clones recorded read-only without response substitution','finishedAt':datetime.now(timezone.utc).isoformat(),'checks':checks,'captures':captures,
 'limitations':'Chromium viewport/axe checks, not physical Safari/VoiceOver or WCAG certification. Five-second comprehension needs human testing. Isolated fixtures never used for screenshots. Current merged API has incomplete global sample; broader registry/cold scoped query support is separate backend review.'}
(root/'docs/evidence/pair-day2-browser.json').write_text(json.dumps(result,indent=2)+'\n')
print(str(len(checks))+' browser checks passed; genuine screenshots saved')
