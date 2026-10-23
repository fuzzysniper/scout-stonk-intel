import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
const root='docs/unfarmd-consumer-v1/artwork/';
const manifest=JSON.parse(readFileSync(root+'asset-manifest.json'));
test('founder originals and every supplied derivative retain exact bytes, hashes and dimensions',async()=>{
 for(const [name,r] of Object.entries({...manifest.originals,...manifest.derivatives})){
  const path=name.endsWith('.jpeg')?root+'originals/'+name:existsSync('public/consumer/unfarmd/'+name)?'public/consumer/unfarmd/'+name:root+'unused-derivatives/'+name;
  const bytes=readFileSync(path);assert.equal(bytes.length,r.bytes,name);assert.equal(createHash('sha256').update(bytes).digest('hex'),r.sha256,name);
  const m=await sharp(bytes).metadata();assert.deepEqual([m.width,m.height],r.dimensions,name);
 }
 assert.equal(manifest.provenance.commercial_rights_verified,false);assert.equal(manifest.provenance.trademark_cleared,false);
});
test('art seam selects only approved four roles and never the optional mobile candidate or cleared licensing',()=>{
 const seam=readFileSync('app/consumer/brand/art.ts','utf8');
 for(const name of Object.values(manifest.recommended))assert.ok(seam.includes(name),name);
 assert.ok(!seam.includes('scout-mobile-focus-CANDIDATE.webp'));assert.match(seam,/owner_selected_rights_pending/);
 for(const name of ['escape-desktop.svg','escape-mobile.svg','sheep-avatar.svg','crew.svg'])assert.ok(existsSync('public/consumer/unfarmd/'+name));
});
