import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
const load = async file => (await import(pathToFileURL(path.join(process.env.HISTORY_TEST_BUILD, file + '.js')).href)).default;
const { NavigationLinks } = await load('app/site-navigation');
const { default: FirstSteps } = await load('app/first-steps');
const { default: Guide } = await load('app/research/page');

test('navigation identifies exactly one destination on nested immutable and provisional brief URLs', () => {
 for (const pathname of ['/', '/radar', '/brief', '/brief/2026-10-11', '/brief/2026-10-11/editions/'+'a'.repeat(64), '/status', '/research']) {
  const html = renderToStaticMarkup(React.createElement(NavigationLinks, { pathname }));
  assert.equal((html.match(/aria-current="page"/g) || []).length, 1);
  assert.match(html, /aria-label="Primary"/);
  for (const href of (pathname==='/'?['/','/research','#scout-content']:['/', '/radar', '/brief', '/status', '/research', '#scout-content'])) assert.ok(html.includes('href="'+href+'"'));
  if (pathname.startsWith('/brief')) assert.match(html, /<a(?=[^>]*href="\/brief")(?=[^>]*aria-current="page")[^>]*>/);
 }
 // Prefix siblings must not impersonate a real destination.
 const html = renderToStaticMarkup(React.createElement(NavigationLinks, { pathname:'/briefly' }));
 assert.ok(!html.includes('aria-current'));
});
test('first-use starting path works without a mint and preserves missing-data and profit limitations', () => {
 const html = renderToStaticMarkup(React.createElement(FirstSteps));
 for (const href of ['/radar', '/brief', '/status', '/research']) assert.ok(html.includes('href="'+href+'"'));
 assert.match(html, /No wallet or token address is needed/);
 assert.match(html, /Missing data is not zero rewards/);
 assert.match(html, /do not prove individual profit or future yield/);
 assert.ok(!/<(?:form|input)/.test(html));
});
test('guide renders source-independent evidence and limitations with no collection form', () => {
 // Server rendering has no dataset, cookies, provider response or browser storage.
 const html = renderToStaticMarkup(React.createElement(Guide));
 assert.match(html, /id="scout-content" tabindex="-1"/);
 for (const method of ['HISTORY','RADAR','SIGNALS','BRIEFS','ARCHIVES','DATA_HEALTH']) assert.ok(html.includes('/'+method+'.md'));
 for (const text of ['Missing is not zero','retrieval','coverage','provisional','permanent ID URL','not independently reconciled','no feedback form or analytics collection']) assert.ok(html.toLowerCase().includes(text.toLowerCase()));
 assert.ok(!/<(?:form|input|iframe)/.test(html));
 assert.match(html, /FIRST_USER_READINESS.md/);
});
test('home navigation keeps one brand and guide; secondary routes stay off the primary search task',()=>{
 const html=renderToStaticMarkup(React.createElement(NavigationLinks,{pathname:'/'}));
 assert.ok(html.includes('home-navigation'));assert.ok(html.includes('SCOUT'));assert.ok(html.includes('Guide'));
 assert.equal((html.match(/<nav/g)||[]).length,1);assert.ok(!html.includes('<details'));
 for(const clutter of ['More','Daily Brief','Radar','Status'])assert.ok(!html.includes(clutter));
});
