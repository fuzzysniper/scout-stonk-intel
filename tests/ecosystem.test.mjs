import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
const load = async file => (await import(pathToFileURL(path.join(process.env.HISTORY_TEST_BUILD, file + '.js')).href)).default.default;
const Footer = await load('app/ecosystem-footer');
const Guide = await load('app/research/page');

test('ecosystem connection renders without user, ownership or data inputs', () => {
 const html = renderToStaticMarkup(React.createElement(Footer));
 assert.match(html, /<footer[^>]*aria-label="STORK ecosystem connection"/);
 assert.match(html, /Independent, read-only research/);
 assert.match(html, /No STORK ownership is required/);
 assert.match(html, /href="https:\/\/storkcoin.xyz" rel="external noreferrer"/);
 assert.match(html, /\(external site\)/);
 assert.match(html, /href="\/research#stork-relationship"/);
 assert.doesNotMatch(html, /<(?:form|input|button|iframe|script)\b|target="_blank"/);
});

test('relationship explains independence, open access and financial limitations', () => {
 const html = renderToStaticMarkup(React.createElement(Guide));
 assert.match(html, /aria-labelledby="stork-relationship"/);
 assert.match(html, /id="stork-relationship"/);
 for (const text of ['independent, read-only research tool', 'No STORK ownership is required', 'no wallet connection, ownership check or token-gated research', 'does not affect tracked-token selection, evidence requirements or reward calculations', 'not an investment recommendation or a promise of STORK token profit', 'accessible without visiting the external site']) {
  assert.ok(html.includes(text), text);
 }
 assert.doesNotMatch(html, /<(?:form|input|iframe|script)\b/);
});
