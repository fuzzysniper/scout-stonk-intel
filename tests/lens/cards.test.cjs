const assert=require('node:assert/strict');
require.extensions['.css']=m=>{m.exports={default:new Proxy({},{get:(_,k)=>String(k)})};};
const {FactCard,unavailable}=require(process.env.LENS_TEST_BUILD+'/app/lens/cards.js');
const React=require('react'),{renderToStaticMarkup}=require('react-dom/server');
for(const [tone,label] of Object.entries({green:'CHECK PASSED',yellow:'CAUTION',red:'MATERIAL RISK',grey:'UNAVAILABLE'})){
 const html=renderToStaticMarkup(React.createElement(FactCard,{fact:{id:'sample',label:'SAMPLE ONLY',tone,value:'<script>not a fact</script>',source:'SAMPLE synthetic test',observedAt:null,reason:'SAMPLE not live'}}));
 assert.ok(html.includes(label));assert.ok(html.includes('SAMPLE synthetic test'));assert.ok(html.includes('Observed:'));assert.ok(!html.includes('<script>'));
}
assert.ok(unavailable.every(f=>f.tone==='grey'&&f.observedAt===null));
console.log('PASS: four color words/symbols, provenance, unknown times and escaping; runtime all grey.');
