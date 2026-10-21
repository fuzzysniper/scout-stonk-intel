/** Actual deliberate browser gestures for acquisition tests. A URL is never
 * permission to fetch. The separate offline port harness uses no HTTP source.
 */
export async function scout(page){
 await page.getByRole('button',{name:'SCOUT IT',exact:true}).click();
}
export async function openResearch(page,url){
 await page.goto(url);
 const u=new URL(page.url());
 if(u.port!=='4181'&&u.searchParams.getAll('mint').length===1)await scout(page);
}
export async function checkMarket(page){
 await page.getByRole('button',{name:'Check market source',exact:true}).click();
}
export async function reloadResearch(page,{market=false}={}){
 await page.reload();await scout(page);if(market)await checkMarket(page);
}
