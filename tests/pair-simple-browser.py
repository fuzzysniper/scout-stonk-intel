"""Issue #48: genuine production captures; isolated fixtures are never photographed.
Needs a fresh local production process, public-source egress, Playwright and axe 4.10.3.
"""
import argparse,copy,json,re,time
from pathlib import Path
from datetime import datetime,timezone
from urllib.parse import urlparse,parse_qs
from playwright.sync_api import sync_playwright
p=argparse.ArgumentParser();p.add_argument('--base',required=True);p.add_argument('--axe',required=True);p.add_argument('--isolated-only',action='store_true',help='Recheck isolated fixtures against saved genuine proof; never recapture screenshots');a=p.parse_args()
u=urlparse(a.base);assert u.scheme=='http' and u.hostname in ['localhost','127.0.0.1'] and not u.username and not u.password and u.path in ['','/'] and not u.query and not u.fragment
root=Path(__file__).resolve().parents[1];checks=[];proof=[];captures=[];started=datetime.now(timezone.utc).isoformat();isolated_recheck=None
MINTS={'NVDAX':'Xsc9qvGR1efVDFGLrVsmkzv3qi45LTBjeUKSPmx9qEh','GLDX':'Xsv9hRk1z5ystj9MhnA7Lq4vjSsLwzL2nxrwmwtD3re','STONK':'6GmAFSYs4gk3FDao5FzzySQpPZaWsa4rUJHacpMpUNgx','SPCXX':'Xs3oZwbHvqis4NYcf4YKWmEia2eC84wSiVrcYcTqpH8'}
recorder='''(()=>{const original=window.fetch.bind(window);window.__pairPackets=[];window.fetch=async(...args)=>{const r=await original(...args);const url=typeof args[0]==='string'?args[0]:args[0].url;if(url.includes('/api/'))r.clone().json().then(json=>window.__pairPackets.push({url,status:r.status,json})).catch(()=>{});return r;};})();'''
def check(w,name):
 checks.append({'width':w,'check':name,'result':'PASS'});print(w,name,flush=True)
def save():
 (root/'docs/evidence/pair-simple-browser.json').write_text(json.dumps({'startedAt':started,'isolatedRecheckStartedAt':isolated_recheck,'finishedAt':datetime.now(timezone.utc).isoformat(),'checks':checks,'captures':captures,'proof':proof},separators=(',',':'))+'\n')
def packet(page,part):return next(p for p in reversed(page.evaluate('window.__pairPackets')) if part in p['url'])
def ready(page):page.wait_for_function("document.querySelector('.pair-featured')?.getAttribute('aria-busy')==='false'")
def snap(page,name):
 page.evaluate('document.activeElement.blur()');viewport=page.viewport_size;page.set_viewport_size({**viewport,'width':viewport['width']+1});page.set_viewport_size(viewport);page.mouse.move(1,1);page.mouse.wheel(0,200);page.wait_for_timeout(100);page.evaluate('scrollTo(0,0)');page.wait_for_timeout(200);page.screenshot(path=str(root/'docs/screenshots'/name),full_page=False)
def audit(page):
 assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
 page.add_script_tag(path=a.axe);r=page.evaluate("async()=>await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}})")
 assert not r['violations'],[(v['id'],[n['target'] for n in v['nodes']]) for v in r['violations']]
 return len(r['passes'])
def select(page,symbol):
 mint=MINTS[symbol];before=len([p for p in page.evaluate('window.__pairPackets') if '/api/pairs?' in p['url']])
 page.get_by_role('button',name=re.compile('^Choose '+symbol)).click()
 page.wait_for_function('(n)=>window.__pairPackets.filter(p=>p.url.includes("/api/pairs?")).length>n',arg=before)
 page.locator('.pair-result-heading>button:not([disabled])').wait_for();page.wait_for_timeout(80)
 return packet(page,'/api/pairs?quoteMint='+mint)
def scope(packet,mint):
 assert packet['status']==200,packet
 c=packet['json'];assert c['status'] in ['available','degraded'];assert len(c['groups'])==1 and c['groups'][0]['quoteMint']==mint
 cov=c['dataset']['coverage'];assert cov['discovery']=={'strategy':'provider_quote_mint','quoteMint':mint,'providerReportedTotalScope':'quote_mint'}
 assert cov['complete'] is False and cov['atomic'] is False and cov['tokensReturned']<=50 and cov['pagesFetched']<=2
 sources=[s for s in c['dataset']['sources'] if urlparse(s['source']).path=='/api/public/v1/tokens'];assert len(sources)==cov['pagesFetched'];assert all(parse_qs(urlparse(s['source']).query)['quoteMint']==[mint] for s in sources)
 for t in c['groups'][0]['tokens']:
  assert t['quoteMint']==mint and t['market']['unit']=='USD' and t['market']['observedAt'] is None
  assert all(t['comparisons'][k] is None for k in ['quoteRelativePriceReturn','quoteAssetBenchmarkReturn','holderAttributedReward'])
 return c
def search(page,q):
 page.locator('#pair-search').fill(q);page.wait_for_function("document.querySelector('#pair-registry-results')?.getAttribute('aria-busy')==='false' && !!document.querySelector('.pair-registry-count')")
def pause(page):
 print('Respecting cold-query budget: 61 seconds',flush=True)
 until=time.monotonic()+61
 while time.monotonic()<until:page.wait_for_timeout(1000)
def context(b,w):
 c=b.new_context(viewport={'width':w,'height':844},reduced_motion='reduce');c.add_init_script(recorder);return c
with sync_playwright() as pw:
 b=pw.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-gpu'])
 if a.isolated_only:
  evidence=json.loads((root/'docs/evidence/pair-simple-browser.json').read_text());assert len(evidence['checks'])>=20
  checks=evidence['checks'][:20];proof=evidence['proof'];captures=evidence['captures'];started=evidence['startedAt'];isolated_recheck=datetime.now(timezone.utc).isoformat()
  registry={symbol:next(p['json'] for p in proof if '/api/pair-quotes?' in p['url'] and 'mint='+mint in p['url']) for symbol,mint in MINTS.items()}
  catalog=scope(next(p for p in proof if '/api/pairs?quoteMint='+MINTS['NVDAX'] in p['url'] and p['status']==200),MINTS['NVDAX'])
  radar=next(p['json'] for p in proof if '/api/radar?' in p['url'])
 else:
  c=context(b,390);page=c.new_page();page.goto(a.base,wait_until='domcontentloaded');ready(page)
  registry={symbol:packet(page,'mint='+mint)['json'] for symbol,mint in MINTS.items()}
  assert all(r['quotes'][0]['quoteMint']==MINTS[s] and r['quotes'][0]['quoteSymbol']==s for s,r in registry.items())
  first=select(page,'NVDAX');catalog=scope(first,MINTS['NVDAX']);assert catalog['groups'][0]['tokens'];radar=packet(page,'/api/radar')['json']
  search(page,'STONK');stonks=packet(page,'/api/pair-quotes?')['json'];same=[q for q in stonks['quotes'] if q['quoteSymbol'].casefold()=='stonk'];assert len(same)>=3 and len({q['quoteMint'] for q in same})==len(same)
  check(390,'real exact registry identities for all four presets and distinct STONK identities')
  proof.extend(page.evaluate('window.__pairPackets'));save();c.close()
  for w in [320,390,1280]:
   c=context(b,w);page=c.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)));start=time.monotonic();page.goto(a.base,wait_until='domcontentloaded');ready(page);elapsed=round(time.monotonic()-start,3)
   assert page.get_by_role('heading',level=1).count()==1 and page.locator('main#scout-content').count()==1
   buttons=page.locator('.pair-chips button');assert buttons.count()==4 and buttons.evaluate_all('(bs)=>bs.every(b=>!b.disabled && b.getBoundingClientRect().bottom<=innerHeight && b.getBoundingClientRect().height>=44)')
   assert page.locator('#pair-search').bounding_box()['y']+page.locator('#pair-search').bounding_box()['height']<844
   assert len([p for p in page.evaluate('window.__pairPackets') if '/api/pairs?' in p['url'] or '/api/radar' in p['url']])==0
   assert 'quote mint' not in page.locator('body').inner_text().lower();page.keyboard.press('Tab');assert page.evaluate('document.activeElement.classList.contains("skip-content")');page.keyboard.press('Enter');assert page.evaluate('document.activeElement.id==="scout-content"')
   rules=audit(page);snap(page,f'pair-simple-after-home-{w}.png');captures.append({'width':w,'state':'landing','firstActionReadySeconds':elapsed,'chips':buttons.evaluate_all('(bs)=>bs.map(b=>({top:b.getBoundingClientRect().top,bottom:b.getBoundingClientRect().bottom,height:b.getBoundingClientRect().height}))'),'heading':page.locator('h1').bounding_box(),'search':page.locator('#pair-search').bounding_box(),'axePassedRules':rules})
   check(w,'four verified choices and one search in first viewport; no token fanout; landmarks,skip link,axe,reflow')
   result=select(page,'NVDAX');data=scope(result,MINTS['NVDAX']);assert page.locator('.pair-token').count()==len(data['groups'][0]['tokens'])
   assert 'Incomplete sample' in page.locator('.pair-load-state').inner_text();assert 'not live quotes' in page.locator('.pair-snapshot-note').inner_text()
   assert page.locator('.pair-token time:visible,.pair-selected a:visible').count()==0
   rows=page.locator('.pair-token');first_row=rows.first;mint=first_row.get_attribute('aria-labelledby').removeprefix('pair-token-');token=next(t for t in data['groups'][0]['tokens'] if t['mint']==mint)
   for displayed,value in zip(first_row.locator('.pair-market dd').all_inner_texts(),[token['market']['liquidityUsd'],token['market']['volume24hUsd']]):
    if value is None:assert displayed=='Unavailable'
    elif value==0:assert displayed=='US$0'
    else:
     assert displayed.startswith('US$');amount=displayed[3:].replace(',','');scale={'K':1e3,'M':1e6,'B':1e9,'T':1e12}.get(amount[-1],1)
     if scale!=1:amount=amount[:-1]
     # Compare to source numerically, allowing only presentation rounding.
     assert abs(float(amount)*scale-value)<=abs(value)*0.00051,(displayed,value)
   assert first_row.bounding_box()['y']<760
   snap(page,f'pair-simple-after-selected-{w}.png');captures.append({'width':w,'state':'NVDAX selected','firstToken':first_row.bounding_box(),'sampleSize':rows.count(),'firstTokenMint':mint,'sourceMarket':token['market'],'axePassedRules':audit(page)})
   check(w,'genuine scoped rows,exact identity,real nullable USD liquidity/volume,visible coverage and reward warnings,no visible technical timestamps')
   summary=first_row.locator('summary');summary.focus();page.keyboard.press('Enter');assert first_row.locator('details').get_attribute('open') is not None
   assert token['market']['providerGeneratedAt'] in first_row.locator('time').evaluate_all('(ts)=>ts.map(t=>t.dateTime)')
   assert mint in first_row.locator('.pair-evidence-body').inner_text() and MINTS['NVDAX'] in first_row.locator('.pair-evidence-body').inner_text()
   for label in ['Historical quote-relative return','Quote-asset benchmark return','Holder-attributable rewards']:
    assert first_row.locator('dl>div').filter(has=page.get_by_text(label,exact=True)).locator('dd').inner_text()=='Unavailable' 
   if w==390:snap(page,'pair-simple-after-evidence-390.png')
   audit(page);summary.focus();page.keyboard.press('Space');assert first_row.locator('details').get_attribute('open') is None
   check(w,'native Evidence keyboard disclosure preserves mints,actual timestamps,provenance,unavailable returns and research link')
   search(page,'STONK');list_buttons=page.locator('.pair-registry-list button');names=list_buttons.evaluate_all('(bs)=>bs.map(b=>b.getAttribute("aria-label"))');assert all(any(q['quoteMint'] in n for n in names) for q in same)
   exact=[q for q in same if q['quoteMint']!=MINTS['STONK']][0];before=len(page.evaluate('window.__pairPackets'));page.get_by_role('button',name=re.compile('^Select .*'+exact['quoteMint']+'$')).click();page.wait_for_function('(n)=>window.__pairPackets.length>n',arg=before);page.locator('.pair-result-heading>button:not([disabled])').wait_for();assert page.locator('.pair-token').count()==0
   assert packet(page,'/api/pairs?quoteMint='+exact['quoteMint'])['status']==503
   assert 'temporarily unavailable' in page.locator('.pair-load-state').inner_text();assert '503' not in page.locator('body').inner_text();before=len(page.evaluate('window.__pairPackets'));page.wait_for_timeout(700);assert len(page.evaluate('window.__pairPackets'))==before
   if w==390:snap(page,'pair-simple-after-unavailable-390.png')
   check(w,'same-ticker choices remain separate;genuine503 clears old figures and offers manual recovery without retries')
   search(page,'scout-no-such-asset-9z');assert 'No matching identity' in page.locator('#pair-registry-results').inner_text();assert 'absence elsewhere' in page.locator('#pair-registry-results').inner_text()
   search(page,MINTS['NVDAX']);assert packet(page,'/api/pair-quotes?')['json']['search']['mint']==MINTS['NVDAX'];assert packet(page,'/api/pair-quotes?')['json']['search']['query']==''
   page.get_by_role('button',name=re.compile('^Select NVDAX')).click();page.locator('.pair-token').first.wait_for()
   page.locator('.home-more summary').focus();page.keyboard.press('Enter');assert page.get_by_role('link',name='Daily Brief & public archive').is_visible();page.keyboard.press('Space')
   page.add_style_tag(content='html{font-size:150%} .pair-simple p,.pair-simple button,.pair-simple input,.pair-simple label,.pair-simple dt,.pair-simple dd{font-size:24px!important}')
   assert page.evaluate('document.documentElement.scrollWidth<=innerWidth');assert not errors,errors
   check(w,'honest empty search,case-preserved mint search,cached reselection,archive keyboard access,enlarged text reflow,no runtime errors')
   proof.extend(page.evaluate('window.__pairPackets'));save();c.close()
  # Verify every featured selection uses its exact mint, respecting unchanged provider admission.
  c=context(b,390);page=c.new_page();page.goto(a.base,wait_until='domcontentloaded');ready(page)
  for symbol in ['GLDX','STONK','SPCXX']:
   pause(page);r=select(page,symbol);data=scope(r,MINTS[symbol]);assert page.locator('.pair-token').count()==len(data['groups'][0]['tokens'])
   check(390,'genuine '+symbol+' featured exact-mint scoped response; bounded nonexhaustive coverage')
  proof.extend(page.evaluate('window.__pairPackets'));save();c.close()
  # Preserved read-only research, immutable archive and dossier entry paths.
  c=context(b,390);page=c.new_page()
  index=json.loads((root/'data/brief-archive/index.json').read_text());date=next(iter(index['dates']));edition=index['dates'][date]['original'];immutable='/brief/'+date+'/editions/'+edition
  for path in ['/research','/radar','/status','/brief',immutable]:
   r=c.request.get(a.base+path);assert r.status==200,(path,r.status);assert 'scout-content' in r.text()
  r=c.request.get(a.base+'/api/archive?date='+date+'&id='+edition);assert r.status==200;archived=r.json();assert archived['report']['publication']['id']==edition
  proof.append({'url':'/api/archive?date='+date+'&id='+edition,'status':r.status,'capturedAt':datetime.now(timezone.utc).isoformat(),'editionId':edition})
  mint=catalog['groups'][0]['tokens'][0]['mint'];page.goto(a.base+'/?mint='+mint,wait_until='domcontentloaded');page.get_by_role('heading',name='Token dossier',exact=True).wait_for();page.wait_for_timeout(400)
  assert not any('/api/pairs?' in q['url'] or '/api/pair-quotes?' in q['url'] or '/api/radar?' in q['url'] for q in page.evaluate('window.__pairPackets'))
  assert mint in page.locator('meta[property="og:image"]').get_attribute('content')
  check(390,'research/Radar/Status/Brief/immutable archive routes and actual archived edition preserved;dossier bypasses explorer and keeps mint metadata');c.close();save()
 # Synthetic failures below are isolated, never screenshot sources, never provider requests.
 for w in [320,390,1280]:
  for state in ['preset503','preset429','presetpartial','presetforged','preset404','sample503','sample429','sampleempty','samplenulls','sampleunverified','sampleidentity','samplescope']:
   c=context(b,w);reads=[]
   def quote_route(route,request,state=state):
    reads.append(request.url);qs=parse_qs(urlparse(request.url).query);mint=qs.get('mint',[''])[0];symbol=next((s for s,m in MINTS.items() if m==mint),'NVDAX');data=copy.deepcopy(registry[symbol]);status=200
    if state in ['preset503','preset429']:data={'status':'unavailable'};status=int(state[-3:])
    elif state=='presetpartial' and symbol=='GLDX':data={'status':'unavailable'};status=503
    elif state=='presetforged':data=copy.deepcopy(registry['NVDAX' if symbol=='STONK' else 'STONK'])
    elif state=='preset404':data['status']='not_found';data['quotes']=[];data['dataset']['coverage'].update(matchedCount=0,returnedCount=0,resultTruncated=False);status=404
    route.fulfill(status=status,json=data)
   def sample_route(route,request,state=state):
    reads.append(request.url);data=copy.deepcopy(catalog);status=200;cov=data['dataset']['coverage'];g=data['groups'][0]
    if state in ['sample503','sample429']:data={'error':'synthetic-private-detail'};status=int(state[-3:])
    elif state=='sampleempty':
     g.update(tokens=[],verification='official_registry_only',availability='no_tokens_in_bounded_sample');cov.update(pagesFetched=1,recordsReceived=0,tokensReturned=0,rejectedRecords=0,modeChecks=0,providerReportedTotal=0);data['dataset']['sources']=[s for s in data['dataset']['sources'] if s['source'].endswith('/pairs') or ('/v1/tokens?' in s['source'] and parse_qs(urlparse(s['source']).query)['page']==['1'])]
    elif state=='samplenulls':
     for t in g['tokens']:t['market'].update(status='unavailable',priceUsd=None,liquidityUsd=None,volume24hUsd=None)
    elif state=='sampleunverified':
     for t in g['tokens']:t.update(rewardModeVerified=False,modeVerification='source_unavailable',rewardSource=None)
    elif state=='sampleidentity':g['quoteName']='Synthetic other identity'
    elif state=='samplescope':cov['discovery']['quoteMint']=MINTS['STONK']
    route.fulfill(status=status,json=data)
   c.route('**/api/pair-quotes?*',quote_route);c.route('**/api/pairs?*',sample_route);c.route('**/api/radar?*',lambda route:route.fulfill(json=radar));page=c.new_page();page.goto(a.base,wait_until='domcontentloaded');ready(page)
   enabled=page.locator('.pair-chips button:not([disabled])').count()
   if state.startswith('preset') and state!='presetpartial':assert enabled==0 and page.locator('.pair-token').count()==0
   else:
    assert enabled==(3 if state=='presetpartial' else 4);r=select(page,'NVDAX')
    if state in ['sample503','sample429','sampleidentity','samplescope']:
     assert page.locator('.pair-token').count()==0
     assert ('Identity changed' if state=='sampleidentity' else 'temporarily unavailable') in page.locator('.pair-load-state').inner_text()
    elif state=='sampleempty':assert page.locator('.pair-token').count()==0 and 'outside these fetched pages' in page.locator('.pair-empty').inner_text()
    else:
     assert page.locator('.pair-token').count()==len(catalog['groups'][0]['tokens'])
     if state=='samplenulls':assert all(v=='Unavailable' for v in page.locator('.pair-market dd').all_inner_texts())
     if state=='sampleunverified':assert all('unverified' in v for v in page.locator('.pair-reward').all_inner_texts())
   assert 'synthetic-private-detail' not in page.locator('body').inner_text();before=len(reads);page.wait_for_timeout(350);assert len(reads)==before;audit(page);check(w,'isolated '+state+':fail-closed/no automatic retries/accessible');c.close()
 # A failed preset registry read recovers only through an explicit retry.
 c=context(b,390);counts={'n':0}
 def recover(route,request):
  counts['n']+=1;mint=parse_qs(urlparse(request.url).query)['mint'][0];symbol=next(s for s,m in MINTS.items() if m==mint)
  route.fulfill(status=503,json={'status':'unavailable'}) if counts['n']<=4 else route.fulfill(json=registry[symbol])
 c.route('**/api/pair-quotes?*',recover);page=c.new_page();page.goto(a.base,wait_until='domcontentloaded');ready(page);assert counts['n']==4;page.wait_for_timeout(500);assert counts['n']==4;page.get_by_role('button',name='Retry choices',exact=True).click();ready(page);assert counts['n']==8 and page.locator('.pair-chips button:not([disabled])').count()==4;check(390,'explicit preset retry recovers four verified choices; no timers/polling or token fanout');c.close()
 b.close();save()
print('PASS',len(checks),'checks; genuine captures separate from isolated fixtures',flush=True)
