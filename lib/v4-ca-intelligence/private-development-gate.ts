/** Private, founder-only Jupiter development gate.
 * Pure deployment metadata check; no source parser, network or credentials.
 * An exact Vercel Authentication-protected Preview is mandatory separately.
 */
const PROJECT='prj_OaA9snVrMUkpXuz6cMSKfSZ6fx5Q';
const BRANCH='feat/250-jupiter-private-market';
export const marketPreviewHost=()=>process.env.VERCEL_URL??'';
export function internalMarketPreview():boolean{
 const host=marketPreviewHost();
 return process.env.VERCEL_ENV==='preview'
  &&process.env.VERCEL_PROJECT_ID===PROJECT
  &&process.env.VERCEL_GIT_COMMIT_REF===BRANCH
  &&/^scout-stonk-intel-[a-z0-9-]+-riskledgerapp\.vercel\.app$/.test(host)
  &&!(process.env.UNFARMD_OWNER_RELEASE||'').trim();
}
