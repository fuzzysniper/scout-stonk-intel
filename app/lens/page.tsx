import type {Metadata} from 'next';
import NativeLens from './native-lens';
import {NATIVE_LENS_BRANCH,NATIVE_LENS_CORRECTION_BRANCH,NATIVE_RUNTIME_BRANCH} from '../../lib/native-lens/policy';
import {NATIVE_SETUP_RUNTIME_ENABLED} from '../../lib/native-pilot/admission/gates';
export const dynamic='force-dynamic';
export const revalidate=0;
export const metadata:Metadata={title:'UNFARMD | Alpha Lens',description:'Private CA inspection, source-attributed facts and evidence-grounded readout before your thesis. Sources require separate approval.',openGraph:{title:'UNFARMD | Alpha Lens',description:'Token facts and your thesis. Sources off.'},twitter:{title:'UNFARMD | Alpha Lens',description:'Source-aware facts. No trading signal.'}};
export default async function Page(){
 if(process.env.VERCEL_GIT_COMMIT_REF===NATIVE_LENS_BRANCH||process.env.VERCEL_GIT_COMMIT_REF===NATIVE_LENS_CORRECTION_BRANCH)return <NativeLens/>;
 if(process.env.VERCEL_GIT_COMMIT_REF===NATIVE_RUNTIME_BRANCH)return <NativeLens ownerAccess={NATIVE_SETUP_RUNTIME_ENABLED}/>;
 // Existing legacy lanes remain separate; no Jupiter/native issuer import is a
 // prerequisite for the native-first render above. Fixed code paths only.
 const [{default:Lens},{RESEARCH_BRANCH},{nativeMountHint},{internalMarketPreview}]=await Promise.all([
  import('./ca-view'),import('../../lib/v4-ca-intelligence/jupiter-research-contract'),
  import('../../lib/v4-oracle/mount/admission'),import('../../lib/v4-ca-intelligence/private-development-gate')
 ]);
 if(process.env.VERCEL_GIT_COMMIT_REF===RESEARCH_BRANCH)return <Lens researchDraft/>;
 const native=nativeMountHint();return <Lens previewAvailable={native.available} marketPreviewAvailable={internalMarketPreview()} nativePreview={native}/>;
}
