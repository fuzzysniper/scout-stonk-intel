import type {Metadata} from 'next';
import Lens from './ca-view';
import {installedOwnerPreview} from '../../lib/v4-owner-preview/installed';
export const dynamic='force-dynamic';
export const revalidate=0;
export const metadata:Metadata={title:'UNFARMD | Alpha Lens',description:'Private CA inspection, source-attributed facts and evidence-grounded readout before your thesis. Sources require separate approval.',openGraph:{title:'UNFARMD | Alpha Lens',description:'Token facts and your thesis. Sources off.'},twitter:{title:'UNFARMD | Alpha Lens',description:'Source-aware facts. No trading signal.'}};
export default function Page(){return <Lens previewAvailable={!!installedOwnerPreview()}/>;}
