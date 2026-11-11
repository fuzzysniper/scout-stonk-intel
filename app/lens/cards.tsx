import styles from './lens.module.css';
/** Presentation vocabulary only, not an admission policy or financial classifier.
 * Future A/B integration must authenticate identity, provenance and freshness first.
 */
export type Fact={id:string;label:string;tone:'green'|'yellow'|'red'|'grey';value:string;source:string;observedAt:string|null;reason:string};
const words={green:'CHECK PASSED',yellow:'CAUTION',red:'MATERIAL RISK',grey:'UNAVAILABLE'};
const symbols={green:'✓',yellow:'!',red:'×',grey:'—'};
export function FactCard({fact}:{fact:Fact}){return <article className={`${styles.fact} ${styles[fact.tone]}`} aria-label={fact.label}><p className={styles.status}><span aria-hidden="true">{symbols[fact.tone]}</span> {words[fact.tone]}</p><h3>{fact.label}</h3><p>{fact.value}</p><details><summary>Source &amp; limitations</summary><p>Source: {fact.source}</p><p>Observed: {fact.observedAt??'Unavailable'}</p><p>{fact.reason}</p></details></article>;}
export const unavailable:readonly Fact[]=[
 {id:'mint',label:'Mint & freeze permissions',tone:'grey',value:'Not assessed',source:'Helius Solana RPC · not connected',observedAt:null,reason:'Provider OFF. No mint account or authority was read. An absent authority would only be a narrow technical observation, never proof of safety.'},
 {id:'market',label:'Pool & market context',tone:'grey',value:'No market observation',source:'DEX Screener · not connected',observedAt:null,reason:'Provider OFF. No pool, liquidity, price or volume was fetched. A pool would not establish whole-token liquidity or issuer legitimacy.'},
 {id:'ownership',label:'Ownership & exit risks',tone:'grey',value:'Unknown',source:'No admitted source',observedAt:null,reason:'Holder concentration, insider ownership and exit availability are not assessed. No safety verdict or buy/sell signal is available.'},
];
