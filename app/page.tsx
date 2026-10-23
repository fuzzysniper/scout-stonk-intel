import type {Metadata} from 'next';
import LiveHome from './consumer/live-home';
import './consumer/consumer.css';
import './consumer/unfarmd.css';
import './consumer/live.css';
export const metadata:Metadata={title:{absolute:'UNFARMD · Private creation observations'},description:'Private, bounded Pump creation observations. Source authorization required. Provisional and same-provider RPC-reported-finalized evidence; no safety or trading claims.',robots:{index:false,follow:false},openGraph:{title:'UNFARMD · Private creation observations',description:'Source authorization required. Partial observations, explicit gaps and limits.',images:[{url:'https://scout.storkcoin.xyz/opengraph-image',width:1200,height:630}]},twitter:{card:'summary_large_image',title:'UNFARMD · Private creation observations',description:'Source authorization required. No public feed or trading signals.'}};
export default function Page(){return <LiveHome/>;}
