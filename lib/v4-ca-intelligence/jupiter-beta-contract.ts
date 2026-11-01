/** Public metadata only. Shape checks are NOT signature, rights or owner authentication. */
export const JUPITER_BETA_BRANCH='beta/276-jupiter-founder-only';
export const JUPITER_BETA_HEADER='x-unfarmd-jupiter-admission';
export const JUPITER_BETA_MINT='EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
export const JUPITER_BETA_MAX_BYTES=8192;
export type JupiterBetaRecord=Readonly<{
 version:'unfarmd-jupiter-beta/1';
 identity:Readonly<{project:string;repository:'fuzzysniper/scout-stonk-intel';branch:typeof JUPITER_BETA_BRANCH;commit:string;deployment:string;origin:string}>;
 source:Readonly<{provider:'jupiter_tokens_v2';host:'api.jup.ag';path:'/tokens/v2/search';access:'keyless';mint:typeof JUPITER_BETA_MINT;audience:'founder_only_internal_testing';automaticRequests:false;native:false;holders:false;save:false;publicDisplay:false}>;
 rights:Readonly<{decision:'approved_internal_testing_private_interpretive_display';agreementSha256:string;customerBasisSha256:string;interpretationSha256:string;attributionSha256:string;receiptPolicySha256:string;reviewedAt:number}>;
 edge:Readonly<{authentication:'vercel_authentication';founderOnly:true;anonymousDenied:true;forgedCookieDenied:true;unapprovedDenied:true;exceptionsReviewed:true;controlPlaneSha256:string;negativeEvidenceSha256:string;ownerAccessSha256:string;reviewedAt:number}>;
 issuedAt:number;startsAt:number;expiresAt:number;
}>;
export type JupiterBetaEnvelope=Readonly<{payload:string;signature:string}>;
const data=(v:unknown,keys:readonly string[]):v is Record<string,unknown>=>{
 if(!v||typeof v!=='object'||Array.isArray(v)||Object.getOwnPropertySymbols(v).length)return false;
 const names=Object.getOwnPropertyNames(v);return names.length===keys.length&&keys.every(k=>Object.hasOwn(v,k)&&'value'in Object.getOwnPropertyDescriptor(v,k)!);
};
const hash=(v:unknown)=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v)&&v!=='0'.repeat(64);
const time=(v:unknown):v is number=>Number.isSafeInteger(v)&&Number(v)>=0;
/** Closed canonical record: no secret fields, trust keys, URLs, auth cookies or providers. */
export function isJupiterBetaRecord(v:unknown):v is JupiterBetaRecord{
 if(!data(v,['version','identity','source','rights','edge','issuedAt','startsAt','expiresAt'])||v.version!=='unfarmd-jupiter-beta/1'
 ||!data(v.identity,['project','repository','branch','commit','deployment','origin'])
 ||!data(v.source,['provider','host','path','access','mint','audience','automaticRequests','native','holders','save','publicDisplay'])
 ||!data(v.rights,['decision','agreementSha256','customerBasisSha256','interpretationSha256','attributionSha256','receiptPolicySha256','reviewedAt'])
 ||!data(v.edge,['authentication','founderOnly','anonymousDenied','forgedCookieDenied','unapprovedDenied','exceptionsReviewed','controlPlaneSha256','negativeEvidenceSha256','ownerAccessSha256','reviewedAt']))return false;
 const i=v.identity,s=v.source,r=v.rights,e=v.edge;
 if(i.project!=='prj_OaA9snVrMUkpXuz6cMSKfSZ6fx5Q'||i.repository!=='fuzzysniper/scout-stonk-intel'||i.branch!==JUPITER_BETA_BRANCH
 ||typeof i.commit!=='string'||!/^[a-f0-9]{40}$/.test(i.commit)||i.commit==='0'.repeat(40)
 ||typeof i.deployment!=='string'||!/^dpl_[A-Za-z0-9]{8,100}$/.test(i.deployment)||typeof i.origin!=='string')return false;
 try{const u=new URL(i.origin);if(u.protocol!=='https:'||u.origin!==i.origin||u.username||u.password||u.port||!/^scout-stonk-intel-[a-z0-9-]+-riskledgerapp\.vercel\.app$/.test(u.hostname)||u.hostname.startsWith('scout-stonk-intel-git-'))return false;}catch{return false;}
 if(s.provider!=='jupiter_tokens_v2'||s.host!=='api.jup.ag'||s.path!=='/tokens/v2/search'||s.access!=='keyless'||s.mint!==JUPITER_BETA_MINT||s.audience!=='founder_only_internal_testing'
 ||s.automaticRequests!==false||s.native!==false||s.holders!==false||s.save!==false||s.publicDisplay!==false)return false;
 if(r.decision!=='approved_internal_testing_private_interpretive_display'||!['agreementSha256','customerBasisSha256','interpretationSha256','attributionSha256','receiptPolicySha256'].every(k=>hash(r[k]))
 ||e.authentication!=='vercel_authentication'||!['founderOnly','anonymousDenied','forgedCookieDenied','unapprovedDenied','exceptionsReviewed'].every(k=>e[k]===true)
 ||!['controlPlaneSha256','negativeEvidenceSha256','ownerAccessSha256'].every(k=>hash(e[k])))return false;
 return time(v.issuedAt)&&time(v.startsAt)&&time(v.expiresAt)&&time(r.reviewedAt)&&time(e.reviewedAt)
  &&r.reviewedAt<=v.issuedAt&&e.reviewedAt<=v.issuedAt&&v.issuedAt>=v.startsAt-600000
  &&v.issuedAt<=v.startsAt&&v.startsAt<v.expiresAt&&v.expiresAt-v.issuedAt<=600000
  &&v.issuedAt-r.reviewedAt<=86400000&&v.issuedAt-e.reviewedAt<=600000;
}
export function isJupiterBetaEnvelope(v:unknown):v is JupiterBetaEnvelope{
 return data(v,['payload','signature'])&&typeof v.payload==='string'&&new TextEncoder().encode(v.payload).length<=6144
  &&typeof v.signature==='string'&&/^[A-Za-z0-9_-]{86}$/.test(v.signature);
}
