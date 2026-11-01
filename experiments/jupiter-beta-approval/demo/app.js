'use strict';
const byId=id=>document.getElementById(id);let state=null,busy=false,expiryTimer=null;
const mintNames={'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v':'USDC','So11111111111111111111111111111111111111112':'SOL'};
function render(s){
 clearTimeout(expiryTimer);
 if(!Object.hasOwn(s,'receivedPerf'))s={...s,receivedPerf:performance.now()};
 state=s;byId('status').textContent=s.last;const p=s.proposal,held=s.ledger.stopped||s.revoked;
 byId('review').hidden=!p;if(p){byId('target').textContent=p.identity.origin+' · '+p.identity.deployment+' · '+p.identity.commit;byId('expires').textContent=new Date(p.expiresAt).toISOString()+' · simulation clock';byId('record-hash').textContent=p.recordHash;byId('record').textContent=s.canonicalRecord;}
 byId('create').disabled=busy||held;byId('scope').disabled=busy||held;
 byId('owner').disabled=busy||held||!p||s.owner;byId('validator').disabled=busy||held||!s.owner||s.validator;
 byId('owner-state').textContent=s.owner?'TEST assertion present':'Pending';byId('validator-state').textContent=s.validator?'TEST coapproval present':'Pending';
 byId('verification').textContent=s.verification==='verified_simulation_only'?'Cryptographically verified TEST grant · local admission only.':'No current usable TEST grant.';
 byId('tamper').disabled=busy||held||!s.owner||s.validator;byId('replay').disabled=busy||!s.validator;
 byId('expire').disabled=busy||!p;byId('revoke').disabled=busy||s.revoked;byId('stop').disabled=busy||s.ledger.stopped;
 const uses=byId('uses');uses.replaceChildren();if(p)for(const mint of p.scope.mints){const b=document.createElement('button');b.textContent='Reserve TEST '+mintNames[mint]+' use';b.disabled=busy||held||s.verification!=='verified_simulation_only';b.addEventListener('click',()=>act('reserve',{mint}));uses.append(b);}
 const g=p?s.ledger.grants.find(g=>g.id===p.grantId):null;byId('budget').textContent=g?'Local uses: '+g.uses+' / '+g.maxUses+' · '+g.state+' · source calls: '+s.testProviderOperations.source:'Local budget: no published grant.';
 byId('audit').textContent=JSON.stringify(s.ledger,null,2);
 if(p&&s.verification==='verified_simulation_only')expiryTimer=setTimeout(()=>render({...state,verification:'denied',last:'TEST permission expired locally. No refresh or provider request.'}),Math.max(0,p.expiresAt-s.clockNow-(performance.now()-s.receivedPerf)));
}
async function act(name,body={}){
 if(busy)return;busy=true;if(state)render(state);
 try{const r=await fetch('/api/lab/'+name,{method:'POST',headers:{'content-type':'application/json','x-prototype-intent':'simulate'},body:JSON.stringify(body),cache:'no-store'});if(!r.ok)throw Error('denied');const s=await r.json();busy=false;render(s);}catch{busy=false;if(state)render(state);byId('status').textContent='Local simulation denied or unavailable. No retry or source call.';}
}
byId('proposal').addEventListener('submit',e=>{e.preventDefault();act('proposal',{scope:byId('scope').value});});
byId('owner').addEventListener('click',()=>act('owner',{recordHash:state.proposal.recordHash}));
byId('validator').addEventListener('click',()=>act('validator',{recordHash:state.proposal.recordHash}));
for(const name of ['tamper','replay','expire','revoke','stop'])byId(name).addEventListener('click',()=>act(name));
fetch('/api/lab/state',{cache:'no-store'}).then(r=>{if(!r.ok)throw Error('denied');return r.json();}).then(render).catch(()=>{byId('status').textContent='Local simulation unavailable. Production remains OFF.';});
