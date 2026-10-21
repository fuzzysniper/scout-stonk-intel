import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
const read=(path)=>readFileSync(path,'utf8');
const path=(read('app/consumer/brand/outlier-mark.tsx').match(/OUTLIER_PATH = '([^']+)'/)||[])[1];
test('the exact refined Outlier geometry powers both navigation and favicon',()=>{
 assert.ok(path?.startsWith('M17 21C16 16'));
 const svg=read('app/icon.svg');assert.ok(svg.includes(path));
 assert.match(svg,/<rect[^>]*fill="#191e18"/);
 assert.match(svg,/<path[^>]*fill="#e8e0cd"/);
 const home=read('app/consumer/home.tsx');assert.match(home,/<OutlierMark\s*\/>/);
 assert.match(home,/aria-label="UNFARMD · Start over"/);
 assert.match(home,/UNFARMD<BrandArrow\s*\/>/);
 assert.match(read('app/consumer/brand/outlier-mark.tsx'),/aria-hidden="true"/);
});
test('iOS icon is a Next native PNG icon without external media or providers',()=>{
 const ios=read('app/apple-icon.tsx');assert.match(ios,/ImageResponse/);
 assert.match(ios,/OUTLIER_PATH/);assert.match(ios,/width:180,height:180/);
 assert.match(ios,/image\/png/);assert.doesNotMatch(ios,/fetch\(|https?:\/\//);
});
test('the old conflicting favicon is retired; original art and source gates stay untouched',()=>{
 assert.equal(existsSync('app/favicon.ico'),false);
 assert.ok(existsSync('public/consumer/unfarmd/escape-desktop.webp'));
 assert.ok(existsSync('app/consumer/control-receipt.tsx'));
});
