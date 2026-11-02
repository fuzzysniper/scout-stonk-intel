import type {Metadata} from 'next';
import Lens from './ca-view';
import {RESEARCH_BRANCH} from '../../lib/v4-ca-intelligence/jupiter-research-contract';
import {nativeMountHint} from '../../lib/v4-oracle/mount/admission';
import {internalMarketPreview} from '../../lib/v4-ca-intelligence/private-development-gate';
export const dynamic='force-dynamic';
export const revalidate=0;
export const metadata:Metadata={title:'UNFARMD | Alpha Lens',description:'Private CA inspection, source-attributed facts and evidence-grounded readout before your thesis. Sources require separate approval.',openGraph:{title:'UNFARMD | Alpha Lens',description:'Token facts and your thesis. Sources off.'},twitter:{title:'UNFARMD | Alpha Lens',description:'Source-aware facts. No trading signal.'}};
export default function Page(){if(process.env.VERCEL_GIT_COMMIT_REF===RESEARCH_BRANCH)return <Lens researchDraft/>;const native=nativeMountHint();return <Lens previewAvailable={native.available} marketPreviewAvailable={internalMarketPreview()} nativePreview={native}/>;}
