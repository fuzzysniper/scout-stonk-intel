/* OWNER-OPERATED auxiliary console, not consumer UI or an automatically loaded script.
 * Paste only reviewed bytes into the protected founder browser after separate GO.
 * No request, cookie/token access or polling on installation. Token stays in closure.
 */
(()=>{
 'use strict';
 const exact=/^https:\/\/scout-stonk-intel-[a-z0-9-]+\.vercel\.app$/;
 if(location.origin!=='https://unfarmd.com'&&!exact.test(location.origin))throw Error('Wrong protected origin');
 if(document.getElementById('unfarmd-parent-console'))throw Error('Console already installed');
 const root=document.createElement('dialog');root.id='unfarmd-parent-console';root.setAttribute('aria-labelledby','unfarmd-parent-title');root.style.cssText='box-sizing:border-box;max-width:calc(100vw - 24px);width:390px;padding:18px;overflow-wrap:anywhere';
 const title=document.createElement('h2');title.id='unfarmd-parent-title';title.textContent='Continuous parent control';
 const label=document.createElement('label');label.textContent='Private owner capability';const input=document.createElement('input');input.type='password';input.autocomplete='off';input.spellcheck=false;input.style.cssText='box-sizing:border-box;width:100%;font-size:16px';label.append(input);
 const status=document.createElement('p');status.setAttribute('role','status');status.textContent='No request made. Read parent to inspect its exact identity.';
 const buttons=document.createElement('div');buttons.style.cssText='display:flex;flex-wrap:wrap;gap:10px';
 const button=text=>{const b=document.createElement('button');b.type='button';b.textContent=text;b.style.cssText='min-height:44px;max-width:100%';buttons.append(b);return b;};
 const read=button('Read parent'),stop=button('Permanently STOP parent'),close=button('Close');stop.disabled=true;
 const confirmLabel=document.createElement('label'),confirm=document.createElement('input');confirm.type='checkbox';confirmLabel.append(confirm,document.createTextNode(' Stop the exact parent shown above. This cannot be undone.'));
 let token='',parent=null,busy=false,uncertain=false;
 const sha=v=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v)&&!/^0+$/.test(v),uuid=v=>typeof v==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(v);
 const validParent=p=>p&&uuid(p.id)&&sha(p.grantHash)&&/^[a-f0-9]{40}$/.test(p.head)&&typeof p.stopped==='boolean'&&Number.isSafeInteger(p.usage?.credits)&&p.usage.credits>=0;
 async function request(kind){
  if(busy||uncertain)return;token=input.value||token;input.value='';input.blur();
  if(!/^[A-Za-z0-9_-]{43,128}$/.test(token)){status.textContent='Enter the separate owner capability.';return;}
  if(kind==='stop'&&(!parent||!confirm.checked))return;
  busy=true;read.disabled=true;stop.disabled=true;confirm.disabled=true;close.disabled=true;
  const abort=new AbortController(),timer=setTimeout(()=>abort.abort(),8000);let reader;
  try{
   const res=await fetch('/api/live-events/continuous'+(kind==='stop'?'/stop':''),{method:kind==='stop'?'POST':'GET',credentials:'same-origin',redirect:'error',mode:'same-origin',cache:'no-store',referrerPolicy:'no-referrer',signal:abort.signal,headers:{accept:'application/json',authorization:'Bearer '+token,...(kind==='stop'?{'X-Scout-Live-Intent':'STOP_SCOUT_CONTINUOUS','X-Scout-Continuous-Parent':parent.id,'X-Scout-Continuous-Grant':parent.grantHash}:{})}});
   if(!res.ok||!res.headers.get('content-type')?.startsWith('application/json'))throw 0;
   reader=res.body.getReader();let text='',size=0;const decoder=new TextDecoder('utf-8',{fatal:true});while(true){const r=await reader.read();if(r.done)break;size+=r.value.length;if(size>98304)throw 0;text+=decoder.decode(r.value,{stream:true});}text+=decoder.decode();const data=JSON.parse(text);
   if(kind==='read'){
    if(data.version!=='unfarmd-continuous-feed/1'||!validParent(data.parent)||data.feed?.version!=='scout-live/1')throw 0;
    parent=data.parent;status.textContent=`Parent ${parent.id}\nGrant ${parent.grantHash}\nHead ${parent.head}\nCredits reserved ${parent.usage.credits}. ${parent.stopped?'Already permanently stopped.':'Not stopped.'}`;
   }else{
    if(data.version!=='unfarmd-continuous-stop/1'||data.parent!==parent.id||data.grantHash!==parent.grantHash||data.status!=='stopped'||typeof data.closureAcknowledged!=='boolean')throw 0;
    parent={...parent,stopped:true};status.textContent=data.closureAcknowledged?'Permanent STOP committed; worker acknowledged closure. Verify Render independently.':'Permanent STOP committed. Native closure is NOT yet confirmed; check or suspend the same Render worker.';
   }
  }catch{if(kind==='stop'){uncertain=true;status.textContent='STOP outcome uncertain. Do not retry. Use the approved Render suspension procedure and investigate.';}else{parent=null;status.textContent='Read unavailable or denied. Check protected login and origin. No source action taken.';}}
  finally{clearTimeout(timer);abort.abort();void reader?.cancel().catch(()=>{});busy=false;read.disabled=uncertain;close.disabled=false;confirm.checked=false;confirm.disabled=uncertain;stop.disabled=true;if(uncertain)token='';status.tabIndex=-1;status.focus();}
 }
 confirm.addEventListener('change',()=>{stop.disabled=busy||uncertain||!parent||parent.stopped||!confirm.checked;});
 read.addEventListener('click',()=>request('read'));stop.addEventListener('click',()=>request('stop'));
 close.addEventListener('click',()=>{token='';input.value='';parent=null;root.close();root.remove();});
 root.addEventListener('cancel',event=>{event.preventDefault();if(!busy)close.click();});
 root.append(title,label,status,confirmLabel,buttons);document.body.append(root);root.showModal();read.focus();
})();
