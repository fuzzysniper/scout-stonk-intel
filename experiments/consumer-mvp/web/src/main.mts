import './style.css';
import {EXAMPLES, type CapturedExample, type ExplanationReply} from './evidence.mjs';
import {explainMint} from './adapter.mjs';
import {shareUrl, sourceDate} from './model.mjs';

function element<K extends keyof HTMLElementTagNameMap>(tag: K, className = '', text?: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag); node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}
function required<T extends HTMLElement>(selector: string): T {
  const node = document.querySelector<T>(selector); if (!node) throw Error('interface_unavailable'); return node;
}
const form = required<HTMLFormElement>('#lookup-form'), input = required<HTMLInputElement>('#mint');
const button = required<HTMLButtonElement>('#explain-button'), answer = required<HTMLElement>('#answer');
const status = required<HTMLElement>('#lookup-status'), discovery = required<HTMLElement>('#discovery');
let requestId = 0;

function action(text: string, className: string, onClick: () => void): HTMLButtonElement {
  const node = element('button', className, text); node.type = 'button'; node.addEventListener('click', onClick); return node;
}
function external(text: string, url: string): HTMLAnchorElement {
  const link = element('a', 'external-link', text); link.href = url; link.target = '_blank'; link.rel = 'noopener noreferrer'; return link;
}
function line(label: string, value: string, mono = false): HTMLElement {
  const row = element('div', 'receipt-line'); row.append(element('dt', '', label), element('dd', mono ? 'mono' : '', value)); return row;
}
function heading(label: string, number: string): HTMLHeadingElement {
  const node = element('h2', 'block-title'); const count = element('span', 'block-number', number); count.setAttribute('aria-hidden','true');
  node.append(count, document.createTextNode(label)); return node;
}
async function copy(value: string): Promise<boolean> {
  try { if (!navigator.clipboard?.writeText) return false; await navigator.clipboard.writeText(value); return true; } catch { return false; }
}
function setUrl(mint: string | null, replace = false) {
  const url = new URL(location.href); url.search = ''; url.hash = '';
  if (mint) url.searchParams.set('mint', mint);
  if (url.href !== location.href) history[replace ? 'replaceState' : 'pushState']({}, '', url);
}

function renderExample(example: CapturedExample): HTMLElement {
  const article = element('article', 'answer-card');
  const top = element('div', 'answer-top');
  const identity = element('div'); identity.append(element('p', 'eyebrow', '01 / WHAT IT IS'));
  const title = element('h1', 'token-title', example.name); title.tabIndex = -1; title.id = 'answer-title';
  title.append(element('span', 'ticker', example.symbol)); identity.append(title);
  const shareStatus = element('p', 'copy-status'); shareStatus.setAttribute('role','status');
  const fallback = element('div', 'share-fallback'); fallback.hidden = true;
  const shareLabel = element('label', '', 'Copy this exact-mint link'); shareLabel.htmlFor = 'share-link';
  const shareInput = element('input', 'mono'); shareInput.id = 'share-link'; shareInput.readOnly = true;
  const share = action('Copy link', 'secondary share-button', () => {
    void (async () => {
      const url = shareUrl(location.href, example.mint);
      if (await copy(url)) { shareStatus.textContent = 'Link copied. It opens this captured example.'; }
      else { shareInput.value = url; fallback.hidden = false; shareInput.focus(); shareInput.select(); shareStatus.textContent = 'Select and copy the link below. Clipboard access is unavailable.'; }
    })();
  });
  top.append(identity, share); fallback.append(shareLabel, shareInput);
  const pair = element('p', 'pair-label', 'Paired with '); pair.append(element('strong', '', example.quote.symbol), document.createTextNode(' · Solana'));
  const summary = element('div', 'plain-english');
  for (const sentence of example.explanation) summary.append(element('p', '', sentence));
  article.append(top, pair, summary, shareStatus, fallback);

  const evidence = element('details', 'evidence'); evidence.id = 'evidence';
  const evidenceSummary = element('summary'); evidenceSummary.append(element('span', '', 'Evidence & exact mints'), element('span', 'details-hint', '3 receipts'));
  evidence.append(evidenceSummary);
  const evidenceBody = element('div', 'evidence-body');
  evidenceBody.append(element('p', 'evidence-warning', 'Retained captured evidence. No live source check. These receipts verify a dated provider statement, not a payment or a legal entitlement.'));
  const identities = element('dl', 'identity-list'); identities.append(line('Token mint · '+example.symbol, example.mint, true), line('Quote mint · '+example.quote.symbol, example.quote.mint, true));
  evidenceBody.append(identities);
  const notes = element('section', 'full-notes'); notes.append(element('h3', '', 'Mechanism, ownership & limitations')); for (const note of example.fullNotes) notes.append(element('p', '', note)); evidenceBody.append(notes);
  for (const source of example.sources) {
    const receipt = element('section', 'receipt'); receipt.id = 'source-'+source.id; receipt.tabIndex = -1;
    receipt.append(element('h3', '', source.label));
    const fields = element('dl'); fields.append(line('Captured · UTC', source.capturedAt), line('Provider generated · UTC', source.sourceGeneratedAt ?? 'Not supplied'), line('Receipt SHA-256', source.receiptSha256, true), line('Original document SHA-256', source.documentSha256, true));
    receipt.append(fields, external('Retained original capture ↗', source.retainedAt), external('Source endpoint · may have changed ↗', source.endpoint));
    evidenceBody.append(receipt);
  }
  evidenceBody.append(element('p', 'small-note', 'Three selected examples. Incomplete catalog coverage. Source retention and commercial publication rights remain unverified; financial quantities are withheld. A hash identifies retained bytes, not a provider signature.'));
  evidence.append(evidenceBody);

  const verified = element('section', 'verified-block'); verified.append(heading('What’s verified', '02'), element('p', 'section-context', 'At capture · '+sourceDate(example.sources[0])));
  for (const fact of example.facts) {
    const row = element('div', 'fact-row');
    const content = element('div'); content.append(element('h3', '', fact.label), element('p', '', fact.detail));
    const view = action('Evidence ↗', 'source-ref', () => { evidence.open = true; const target = required<HTMLElement>('#source-'+fact.sourceIds[0]); target.focus(); target.scrollIntoView({block:'start',behavior:'instant'}); });
    view.setAttribute('aria-label','Evidence for '+fact.label); row.append(element('span', 'fact-marker', '✓'), content, view); row.firstElementChild?.setAttribute('aria-hidden','true'); verified.append(row);
  }
  const risks = element('section', 'risks-block'); risks.append(heading('What’s not known', '03'));
  const riskList = element('ul'); for (const risk of example.risks) riskList.append(element('li', '', risk)); risks.append(riskList);
  article.append(verified, risks, evidence);
  return article;
}

const messages = {
  empty: ['Start with a mint', 'Paste a full Solana token mint, or choose one of the captured examples below.'],
  needs_mint: ['A ticker isn’t an identity', 'Different tokens can share a name or ticker. Paste the exact mint, or select a captured example below.'],
  invalid: ['That doesn’t look like a mint', 'Use a full, case-sensitive Solana mint address. Links and wallet recovery phrases are not accepted.'],
  unsupported: ['Not in these examples', 'This address may exist, but this prototype cannot explain it. Only three captured token mints are supported; nothing was queried onchain.'],
  unavailable: ['Evidence couldn’t load', 'Nothing is verified for this request. The retained evidence could not be safely evaluated. Check your device clock and try again. No live provider was queried.'],
} as const;

function show(reply: ExplanationReply) {
  answer.replaceChildren(); answer.hidden = false;
  if (reply.state === 'supported') {
    discovery.hidden = true; answer.append(renderExample(reply.example));
    document.title = reply.example.symbol+' explained — PROJECT CLEAR';
    status.textContent = 'Captured '+reply.example.symbol+' example opened. Not live data.'; status.classList.add('sr-only');
  } else {
    discovery.hidden = false;
    const card = element('div', 'error-card'); const title = element('h1', '', messages[reply.state][0]); title.id = 'answer-title'; title.tabIndex = -1;
    card.append(title, element('p', '', messages[reply.state][1]));
    if (reply.state === 'unavailable') card.append(action('Try again', 'secondary', () => { void lookup(input.value); }));
    answer.append(card); status.textContent = messages[reply.state][0];
    document.title = 'PROJECT CLEAR — understand a Solana token';
  }
  required<HTMLElement>('#answer-title').focus({preventScroll:true}); window.scrollTo({top:0,behavior:'instant'});
}

async function lookup(raw: string, fromHistory = false) {
  const current = ++requestId;
  input.value = raw; input.removeAttribute('aria-invalid');
  required<HTMLElement>('#welcome').hidden = true; form.classList.add('compact');
  answer.hidden = true; discovery.hidden = true; form.setAttribute('aria-busy','true'); button.disabled = true;
  status.classList.remove('sr-only'); status.textContent = 'Opening captured evidence…';
  const reply = await explainMint(raw);
  if (current !== requestId) return;
  form.removeAttribute('aria-busy'); button.disabled = false;
  if (reply.state === 'empty' || reply.state === 'invalid' || reply.state === 'needs_mint') input.setAttribute('aria-invalid','true');
  if (!fromHistory) setUrl(reply.state === 'supported' ? reply.example.mint : null);
  else if (reply.state !== 'supported') setUrl(null, true);
  show(reply);
}

const examples = required<HTMLElement>('#example-list');
for (const item of EXAMPLES) {
  const choice = action('', 'example-button', () => { void lookup(item.mint); });
  choice.setAttribute('aria-label','Explain '+item.name+' ('+item.symbol+'), captured '+item.quote+' pair');
  choice.append(element('span', 'example-icon', item.symbol.slice(0,2)), element('span', 'example-name', item.symbol), element('span', 'example-quote', 'with '+item.quote), element('span', 'example-arrow', '→'));
  choice.lastElementChild?.setAttribute('aria-hidden','true'); examples.append(choice);
}
form.addEventListener('submit', event => { event.preventDefault(); void lookup(input.value); });
button.disabled = false;

function fromUrl() {
  const values = new URL(location.href).searchParams.getAll('mint');
  if (values.length === 1) void lookup(values[0], true);
  else if (values.length > 1) { setUrl(null, true); void lookup('', true); }
  else {
    ++requestId; answer.hidden = true; discovery.hidden = false; form.classList.remove('compact');
    form.removeAttribute('aria-busy'); button.disabled = false; input.value = ''; input.removeAttribute('aria-invalid');
    status.textContent = ''; required<HTMLElement>('#welcome').hidden = false; document.title = 'PROJECT CLEAR — understand a Solana token';
  }
}
window.addEventListener('popstate', fromUrl); fromUrl();

required<HTMLButtonElement>('#copy-feedback').addEventListener('click', () => {
  void (async () => {
    const note = required<HTMLTextAreaElement>('#feedback-note'), feedbackStatus = required<HTMLElement>('#feedback-status');
    if (!note.value.trim()) { feedbackStatus.textContent = 'Write a note first. Nothing is sent.'; note.focus(); return; }
    if (await copy('PROJECT CLEAR tester note\n'+note.value.trim())) feedbackStatus.textContent = 'Note copied. Share it yourself; nothing was sent or saved.';
    else { feedbackStatus.textContent = 'Select and copy your note. Clipboard access is unavailable; nothing was sent.'; note.focus(); note.select(); }
  })();
});
