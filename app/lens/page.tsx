import type {Metadata} from 'next';
import Lens from './view';
export const metadata:Metadata={title:'UNFARMD | Alpha Lens',description:'Source-aware token facts and your own thesis. Sources off; session only.',openGraph:{title:'UNFARMD | Alpha Lens',description:'Token facts and your thesis. Sources off.'},twitter:{title:'UNFARMD | Alpha Lens',description:'Source-aware facts. No trading signal.'}};
export default function Page(){return <Lens/>;}
