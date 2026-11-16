// Offline owner archive verification only. Never uploads or changes an existing output.
import fs from 'node:fs';import {need,open,restore,verifyOutput,hash,canonical} from './output.mjs';
try{
 const [sealed,receiptFile,destination]=process.argv.slice(2),receipt=JSON.parse(fs.readFileSync(receiptFile)),text=process.env.UNFARMD_NATIVE_BUILD_ARCHIVE_KEY;need(typeof text==='string'&&/^[A-Za-z0-9_-]{43}$/.test(text));const key=Buffer.from(text,'base64url');
 try{need(key.length===32&&key.toString('base64url')===text&&hash(fs.readFileSync(sealed))===receipt.cipherSha256);const body=open(sealed,key);need(hash(canonical(body))===receipt.plainBundleSha256&&canonical(body.source)===canonical(receipt.source));restore(body,destination);const checked=verifyOutput(destination,receipt.source);need(checked.inventory.sha256===receipt.inventorySha256);console.log(JSON.stringify({version:'native-offline-restoration/1',commit:receipt.source.commit,tree:receipt.source.tree,inventorySha256:checked.inventory.sha256,deployed:false,sourceGo:false}));}finally{key.fill(0);}
}catch{console.error('NATIVE_BUILD_HOLD: preserve originals; do not reuse a partial extraction or rebuild.');process.exitCode=1;}
