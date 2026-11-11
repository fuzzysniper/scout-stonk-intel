import {addressState, directionFrom, directions, studyPath, type Direction} from './model';
import escapeArt from './art/escape.svg';
import squadArt from './art/squad.svg';
import sheepMark from './art/sheep-mark.svg';
import characterSheet from './art/character-sheet.svg';

const arrow = '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const diagonal = '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 19 19 5M5 5h14v14" stroke="currentColor" stroke-width="2.4" stroke-linecap="square"/></svg>';
const star = '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="m16 0 3.5 11.4L30 6l-6.6 10L32 20l-12 1 1 11-7-9-10 6 5-11L0 13l12-1z" fill="currentColor"/></svg>';
const labels: Record<Direction, string> = {escape:'01 / The escape', squad:'02 / The misfits', quiet:'03 / Black sheep'};
const app = document.querySelector<HTMLDivElement>('#app')!;
let direction: Direction;
let pasteEpoch = 0;

function form() {
  return `<form id="scout-form" class="scout-form" novalidate>
    <div class="form-heading"><label for="mint">Solana token address</label><span>SCOUT / 01</span></div>
    <div class="mint-field"><input id="mint" name="mint" type="text" placeholder="Paste a token address" autocomplete="off" autocapitalize="off" spellcheck="false" inputmode="text" maxlength="120" aria-describedby="source-limit input-error paste-status"/><button type="button" id="paste" aria-label="Paste token address">Paste</button></div>
    <p id="input-error" class="input-error" role="alert"></p>
    <button class="scout-button" type="submit">SCOUT this token ${arrow}</button>
    <p id="paste-status" class="small-status" role="status"></p>
    <p id="source-limit" class="source-limit">Offline study. Address format only; no live token check.</p>
  </form>`;
}
function header() {
  return `<header class="brand-header"><a class="wordmark" href="${studyPath(direction,null)}" aria-label="UNFARMD · restart this design study">UNFARMD<span aria-hidden="true">${diagonal}</span></a><a class="header-note" href="#why">Level the trenches ${arrow}</a></header>`;
}
function tools() {
  return `<section class="tools" aria-label="The product, without the promises">
    <div class="tool-intro"><span class="eyebrow">LESS HYPE. MORE HOMEWORK.</span><h2>Curiosity is<br/>a survival skill.</h2><p>The farm runs on information gaps.<br/>We’re here to close them.</p></div>
    <div class="tool-cards"><article><span class="tool-number">01</span><div><h3>SCOUT</h3><p>Start with the exact mint.<br/> Facts, concerns, unknowns.</p><a href="#mint">Try the address form ${arrow}</a></div></article>
    <article><span class="tool-number">02</span><div><h3>PULSE <span class="future">Future research</span></h3><p>Qualified market observations.<br/> Not live in this study.</p><details><summary>What’s still unproven?</summary><p>Source coverage, freshness, comparable observations and publication rights must pass review before any market signal is shown. No prediction or ranking is offered here.</p></details></div></article>
    <article><span class="tool-number">03</span><div><h3>RECEIPTS</h3><p>See where a claim came from.<br/> And what it doesn’t prove.</p><button class="text-button" id="receipts-open" type="button">What counts as evidence? ${arrow}</button></div></article></div>
  </section>`;
}
function principles() {
  return `<section class="principles" id="why" aria-labelledby="why-title"><p class="eyebrow">NOT FOLLOWING THE HERD.</p><h2 id="why-title">Stop getting farmed.<br/><span>Start scouting.</span></h2><div class="principle-grid"><p><strong>Read the address.</strong>Names get copied. Exact mints identify the token.</p><p><strong>Question the story.</strong>Controls and unknowns deserve the same space as the pitch.</p><p><strong>Ask for receipts.</strong>A source is evidence of a claim. It isn’t a promise of safety.</p></div></section>`;
}
function evidenceGuide() {
  return `<details id="evidence-guide" class="evidence-guide"><summary>RECEIPTS / What counts as evidence?</summary><div><p><strong>No token source is queried in this offline study.</strong> A real observation needs an exact mint, identified source, original checked time, chain context and accepted provenance. A request time is not automatically a market observation time.</p><p>A mint authority is a control, not an accusation. No standard authority is not a safety verdict. Token-2022 extensions can leave additional controls unreviewed; holder concentration, LP control and sellability remain unknown.</p><p>Historical StonkFun evidence remains a separate, stale 14 October 2026 capture. Financial figures stay withheld; source rights remain unverified. PULSE is future research, not live signals or a prediction.</p></div></details>`;
}
function footer() {
  return `<footer><a class="wordmark" href="${studyPath(direction,null)}">UNFARMD<span aria-hidden="true">${diagonal}</span></a><p>Level the trenches.</p><span>Solana research. No wallets. No trades.</span></footer>
    <details class="study-notes"><summary>About this design exploration &amp; original concept art</summary><div><p>Three alternative identities for founder review. UNFARMD is the proposed consumer brand; SCOUT is the token-research instrument. PULSE is future research, not an active signal service. RECEIPTS names source evidence, not guaranteed truth.</p><p>The animals are original SVG composition studies, not final commissioned or cleared production assets. Final art, trademark/domain clearance and a separately approved public rebrand remain open. No external provider, RPC, database, wallet or production client is contacted.</p><p>The current SCOUT homepage, same-origin APIs, dated StonkFun examples, source-rights warnings and research terminal are unchanged. This form checks exact address format locally, never token existence, supply, safety, prices, returns or liquidity.</p><a href="${characterSheet}" target="_blank" rel="noopener">Open the original character sheet (new tab) ↗</a></div></details>`;
}
function escapePage() {
  return `${header()}<main id="main"><section class="hero escape-hero" aria-labelledby="hero-title"><div class="hero-copy"><p class="eyebrow"><span class="tiny-cross" aria-hidden="true">✳</span> FOR THE ONES GETTING OUT.</p><h1 id="hero-title">Stop getting<br/>farmed.<br/><em>Start scouting.</em></h1><p class="hero-description">The trenches have enough blind bets.<br/>Know the token before you buy the story.</p><div class="desktop-form">${form()}</div></div><figure class="hero-art"><img src="${escapeArt}" alt="Original concept illustration: a charcoal sheep with a broken tag and lime scanner steps through a broken farm fence; other animals follow."/><figcaption>ORIGINAL COMPOSITION STUDY / NOT FINAL ART</figcaption><span class="art-note">The herd took<br/>a different exit.</span></figure><div class="hero-bottom"><span>NO HERD MENTALITY REQUIRED.</span><a href="#tools">Meet your instruments ↓</a></div></section><div id="tools">${tools()}</div>${principles()}${resultPanel()}${evidenceGuide()}</main>${footer()}`;
}
function squadPage() {
  return `${header()}<main id="main"><section class="hero squad-hero" aria-labelledby="hero-title"><div class="squad-copy"><p class="eyebrow">THE FARM HAS A RETENTION PROBLEM.</p><h1 id="hero-title">Goodbye,<br/><span class="farm-word">farm.</span><br/><span class="squad-head-last">Hello, <em>facts.</em></span></h1><p class="hero-description">Don’t ape blind. SCOUT first.<br/>Token research for the hard-to-herd.</p></div><figure class="hero-art"><img src="${squadArt}" alt="Original punk editorial concept: a goat, black sheep, pig, cow and chicken form a confident misfit escape crew."/><figcaption>ORIGINAL CAST STUDY / NOT FINAL ART</figcaption><span class="squad-sticker">HERD?<br/>PASS.</span></figure><div class="squad-form-panel"><p class="form-overline">LESS “TRUST ME”. MORE “SHOW ME”.</p>${form()}</div><div class="squad-manifesto"><span aria-hidden="true">${star}</span><p>Stop getting farmed.<br/><strong>Start scouting.</strong></p><span class="edition">MISFITS, NOT EXIT LIQUIDITY.<br/>UNFARMD / DESIGN STUDY 02</span></div></section><section class="cast-line" aria-label="The original crew"><p><span>THE TRENCHERS</span> A working cast. No mascot chosen yet.</p><ul><li>Sheep / the skeptic</li><li>Goat / the route-finder</li><li>Pig / the fine-print reader</li><li>Cow / the steady hand</li><li>Chicken / the first to notice</li></ul></section>${tools()}${principles()}${resultPanel()}${evidenceGuide()}</main>${footer()}`;
}
function quietPage() {
  return `${header()}<main id="main"><section class="hero quiet-hero" aria-labelledby="hero-title"><div class="quiet-topline"><span>SOLANA, WITH YOUR EYES OPEN.</span><span class="quiet-index">INDEPENDENT THINKING / 03</span></div><div class="quiet-copy"><figure class="quiet-mark"><img src="${sheepMark}" alt="Original black-sheep symbol with a broken ear tag. A mascot candidate, not a final identity."/><figcaption>NOT THE HERD.</figcaption></figure><h1 id="hero-title">Stop getting<br/>farmed.<br/><em>Start scouting.</em></h1><p class="hero-description">One token address.<br/>A clearer view of what you don’t know.</p></div><div class="quiet-workbench">${form()}<p class="quiet-aside">A little less instinct.<br/><strong>A little more evidence.</strong></p></div><div class="quiet-signoff"><span>UNFARMD — LEVEL THE TRENCHES.</span><span aria-hidden="true">${diagonal}</span></div></section>${tools()}${principles()}${resultPanel()}${evidenceGuide()}</main>${footer()}`;
}
function resultPanel() {
  return `<section id="result" class="research-result" hidden aria-labelledby="result-title"><p class="eyebrow">SCOUT / OFFLINE DESIGN STUDY</p><h2 id="result-title" tabindex="-1">Address format checked.<br/>Token facts not checked.</h2><p class="result-boundary">This is a 32-byte Solana address format. It does not establish that the address is a token mint, that the token exists, or that it is safe.</p><div class="result-mint"><span>YOUR EXACT ADDRESS</span><code id="exact-mint"></code><div><button type="button" id="copy-mint">Copy address</button><button type="button" id="share">Copy study link</button></div></div><p class="small-status" id="copy-status" role="status"></p><div id="copy-fallback" hidden><label for="manual-copy">Select and copy manually</label><input id="manual-copy" readonly/></div><dl class="result-facts"><div><dt>Onchain facts</dt><dd>Not requested</dd></div><div><dt>Market observations</dt><dd>Not requested</dd></div><div><dt>Token-specific risks</dt><dd>Not assessed</dd></div><div><dt>Source time &amp; slot</dt><dd>Unavailable</dd></div></dl><p>No source check, financial figure, safety score or trading recommendation. These are source-unavailable states, not simulated successful results.</p><details id="receipts"><summary>RECEIPTS / What would the evidence need to show?</summary><div><p><strong>No token receipt exists in this study.</strong> A genuine check would need the exact mint, source identity, checked time, finalized slot and original response provenance, accepted by the existing SCOUT validation boundary.</p><p>Supply and standard authorities don’t establish holder concentration, insider ownership, LP control, sellability, payouts or profitability. Token-2022 can introduce additional unreviewed controls. Market observations need separate identity, clock, coverage and display-rights checks.</p><p>Historical StonkFun examples belong in their separate dated layer: captured 14 October 2026, stale, with financial figures withheld and source rights unverified. They are not current token observations.</p></div></details><button type="button" id="another" class="text-button">Check another address ${arrow}</button></section>`;
}

function render() {
  pasteEpoch++;
  const params = new URL(location.href).searchParams;
  direction = directionFrom(params.get('direction'));
  document.body.dataset.direction = direction;
  document.title = `UNFARMD · ${labels[direction].slice(5)} · Offline design study`;
  app.innerHTML = `<a class="skip-link" href="#main">Skip to main content</a><aside class="study-bar" aria-label="Design exploration"><span>PRIVATE DESIGN STUDY <span class="study-no-live">/ NO LIVE CHECKS</span></span><nav aria-label="Compare directions">${directions.map(d=>`<a href="${studyPath(d,params.getAll('mint').length===1?params.get('mint'):null)}" ${direction===d?'aria-current="page"':''}>${labels[d]}</a>`).join('')}</nav></aside><div class="page-shell">${direction==='escape'?escapePage():direction==='squad'?squadPage():quietPage()}</div>`;
  const input = document.querySelector<HTMLInputElement>('#mint')!;
  const values = params.getAll('mint');
  input.value = values.length===1 ? values[0] : '';
  bind(input);
  const state = addressState(values.length===1?values[0]:null,values.length>1);
  if (state === 'address_only') showResult(input.value,false);
  else if (state !== 'idle') showError(state);
}
function showError(state: string) {
  const error = document.querySelector<HTMLElement>('#input-error')!;
  error.textContent = state==='empty'?'Paste a Solana token address first.':'Use the full, exact Solana address. Names, links, extra spaces and recovery phrases are not accepted.';
  document.querySelector('#mint')!.setAttribute('aria-invalid','true');
}
function showResult(mint: string, focus: boolean) {
  document.querySelector<HTMLElement>('#result')!.hidden = false;
  document.querySelector('#exact-mint')!.textContent = mint;
  document.querySelector('#input-error')!.textContent = '';
  document.querySelector('#mint')!.removeAttribute('aria-invalid');
  document.querySelector('#copy-status')!.textContent='';
  document.querySelector<HTMLElement>('#copy-fallback')!.hidden=true;
  updateDirectionLinks(mint);
  if (focus) {
    const title = document.querySelector<HTMLElement>('#result-title')!;
    title.focus({preventScroll:true});
    title.scrollIntoView({block:'start',behavior:'instant'});
  }
}
function updateDirectionLinks(mint: string | null) {
  document.querySelectorAll<HTMLAnchorElement>('.study-bar nav a').forEach((link,i)=>{
    link.href=studyPath(directions[i],mint);
  });
}
function bind(input: HTMLInputElement) {
  const pasteStatus = document.querySelector<HTMLElement>('#paste-status')!;
  input.addEventListener('input',()=>{
    pasteEpoch++;
    document.querySelector<HTMLButtonElement>('#paste')!.disabled=false;
    pasteStatus.textContent='';
    document.querySelector('#input-error')!.textContent='';
    input.removeAttribute('aria-invalid');
    document.querySelector<HTMLElement>('#result')!.hidden=true;
    updateDirectionLinks(null);
  });
  document.querySelector('#scout-form')!.addEventListener('submit',event=>{
    event.preventDefault();
    pasteEpoch++;
    document.querySelector<HTMLButtonElement>('#paste')!.disabled=false;
    pasteStatus.textContent='';
    const state=addressState(input.value);
    if(state!=='address_only'){
      document.querySelector<HTMLElement>('#result')!.hidden=true;
      updateDirectionLinks(null);showError(state);input.focus();return;
    }
    history.pushState(null,'',studyPath(direction,input.value));
    showResult(input.value,true);
  });
  document.querySelector('#paste')!.addEventListener('click',async()=>{
    const epoch=++pasteEpoch;
    const button=document.querySelector<HTMLButtonElement>('#paste')!;
    button.disabled=true;
    pasteStatus.textContent='';
    try{
      if(!navigator.clipboard?.readText)throw Error('native_paste');
      const value=await navigator.clipboard.readText();
      if(epoch!==pasteEpoch)return;
      if(!value||value.length>120){pasteStatus.textContent=value?'Too much text. Paste only a token address.':'Clipboard is empty. Copy a token address first.';return;}
      // No trimming, address extraction, automatic submission or external request.
      input.value=value;
      input.removeAttribute('aria-invalid');
      document.querySelector('#input-error')!.textContent='';
      document.querySelector<HTMLElement>('#result')!.hidden=true;
      updateDirectionLinks(null);
      pasteStatus.textContent='Pasted. Choose SCOUT this token to check the address format.';
    }catch{
      if(epoch!==pasteEpoch)return;
      pasteStatus.textContent='Touch and hold the address field, then choose Paste. You can also type it.';
      input.focus();
    }finally{if(epoch===pasteEpoch)button.disabled=false;}
  });
  async function copy(value: string, message: string) {
    const epoch=pasteEpoch;
    const status=document.querySelector<HTMLElement>('#copy-status')!;
    try{
      await navigator.clipboard.writeText(value);
      if(epoch===pasteEpoch)status.textContent=message;
    }catch{
      if(epoch!==pasteEpoch)return;
      status.textContent='Clipboard access unavailable. Select and copy below.';
      document.querySelector<HTMLElement>('#copy-fallback')!.hidden=false;
      const field=document.querySelector<HTMLInputElement>('#manual-copy')!;
      field.value=value;field.focus();field.select();
    }
  }
  const resultMint=()=>document.querySelector('#exact-mint')!.textContent!;
  document.querySelector('#copy-mint')!.addEventListener('click',()=>void copy(resultMint(),'Exact address copied.'));
  document.querySelector('#share')!.addEventListener('click',()=>void copy(new URL(studyPath(direction,resultMint()),location.origin).href,'Study link copied. It contains no token facts.'));
  document.querySelector('#another')!.addEventListener('click',()=>{
    pasteEpoch++;
    document.querySelector<HTMLElement>('#result')!.hidden=true;
    input.value='';
    history.pushState(null,'',studyPath(direction,null));
    updateDirectionLinks(null);
    input.focus();
  });
  document.querySelector('#receipts-open')!.addEventListener('click',()=>{
    const notes=document.querySelector<HTMLDetailsElement>('#evidence-guide')!;
    notes.open=true;notes.querySelector('summary')!.focus();
    notes.scrollIntoView({block:'start'});
  });
  document.querySelectorAll('details').forEach(details=>details.addEventListener('keydown',event=>{
    if(event.key==='Escape'){details.open=false;details.querySelector('summary')?.focus();event.stopPropagation();}
  }));
}
addEventListener('popstate',render);
render();
