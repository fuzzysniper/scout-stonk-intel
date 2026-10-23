import {mkdirSync} from 'node:fs';
export const UNFARMD_SCREENSHOTS='docs/unfarmd-consumer-v1/screenshots';
export async function capture(page,name,info,fullPage=false){
 if(process.env.CONSUMER_CAPTURE==='0')return;
 mkdirSync(UNFARMD_SCREENSHOTS,{recursive:true});
 await page.evaluate(()=>scrollTo(0,0));
 await page.screenshot({path:`${UNFARMD_SCREENSHOTS}/${name}-${info.project.name}.png`,fullPage});
}
/** Test-only browser label, after hydration; never a production fixture switch. */
export async function labelOfflineReplay(page){
 await page.evaluate(()=>{
  if(document.getElementById('unfarmd-offline-test'))return;
  const notice=document.createElement('div');notice.id='unfarmd-offline-test';
  notice.textContent='SYNTHETIC OFFLINE QA · INVENTED ONCHAIN TEST DATA · NO RPC';
  notice.style.cssText='background:#f5c8b4;color:#2c231e;padding:7px 16px;font:700 10px/1.5 Arial;';
  document.body.prepend(notice);
 });
}
