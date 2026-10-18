// Benign, generated images/maps only; no provider requests or exploit payloads.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
const require=createRequire(import.meta.url);
const nextRequire=createRequire(require.resolve('next/package.json'));
const cssRequire=createRequire(require.resolve('next/dist/build/webpack/config/blocks/css/index.js'));
const sharp=nextRequire('sharp'),postcss=cssRequire('postcss');
const {isAvifDecodeSafe,canDecodeAvif,optimizeImage}=nextRequire('./dist/server/image-optimizer.js');

test('Next loads the patched, supported sharp and PostCSS through its real runtime paths',()=>{
 assert.equal(sharp.versions.sharp,'0.35.5');
 assert.equal(postcss().version,'8.5.23');
 assert.equal(nextRequire.resolve('sharp'),require.resolve('sharp'));
 assert.equal(nextRequire('next/package.json').optionalDependencies.sharp,'^0.34.3 || ^0.35.5');
 // These are the native libraries actually loaded, not optional lockfile entries.
 assert.ok(isAvifDecodeSafe(sharp.versions.heif));
 const [major,minor,patch]=sharp.versions.rsvg.split('.').map(Number);
 assert.ok(major>2||major===2&&(minor>63||minor===63&&patch>=2));
});
test('Next refuses unsafe/unknown libheif versions, including the former runtime',()=>{
 for(const v of [null,'','unknown','1.20.2','1.23.1'])assert.equal(isAvifDecodeSafe(v),false,String(v));
 assert.equal(isAvifDecodeSafe('1.23.2'),true);
 assert.equal(canDecodeAvif(1),true);
});
test('a small benign AVIF decodes through the real Next optimizer and patched libheif',async()=>{
 const buffer=await sharp({create:{width:8,height:8,channels:3,background:'#346789'}}).avif().toBuffer();
 const result=await optimizeImage({buffer,contentType:'image/webp',quality:75,width:4,concurrency:1,timeoutInSeconds:2,limitInputPixels:64});
 const m=await sharp(result).metadata();
 assert.equal(m.format,'webp');assert.equal(m.width,4);assert.equal(m.height,4);
});
test('the loaded patched librsvg rasterizes a benign SVG without external resources',async()=>{
 const buffer=Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="8" height="8"><rect width="8" height="8" fill="#346789"/></svg>');
 const m=await sharp(await sharp(buffer).png().toBuffer()).metadata();
 assert.equal(m.format,'png');assert.equal(m.width,8);
});

function maps(run){
 const dir=mkdtempSync(join(tmpdir(),'scout114-map-'));
 try{
  mkdirSync(join(dir,'css'));
  const marker='SYNTHETIC_NON_SECRET_MAP_SENTINEL_114';
  const map=JSON.stringify({version:3,file:'input.css',sources:['original.css'],sourcesContent:[marker],names:[],mappings:'AAAA'});
  writeFileSync(join(dir,'outside.map'),map);writeFileSync(join(dir,'css','adjacent.map'),map);
  run({dir,marker});
 }finally{rmSync(dir,{recursive:true,force:true});}
}
function processed(annotation,from){
 const result=postcss([]).process('a { color: red }\n/*# sourceMappingURL='+annotation+' */',{
  ...(from?{from}:{}),map:{inline:false,annotation:false},
 });
 return JSON.stringify(result.map.toJSON());
}
test('PostCSS refuses an untrusted external .map with no from (follow-up advisory)',()=>maps(({dir,marker})=>{
 assert.ok(!processed(join(dir,'outside.map')).includes(marker));
}));
test('PostCSS refuses a relative source map escaping the CSS directory',()=>maps(({dir,marker})=>{
 assert.ok(!processed('../outside.map',join(dir,'css','input.css')).includes(marker));
}));
test('PostCSS still consumes legitimate adjacent source maps with a known CSS file',()=>maps(({dir,marker})=>{
 assert.ok(processed('adjacent.map',join(dir,'css','input.css')).includes(marker));
}));
