import type {Metadata} from 'next';
import {historicalResearch} from '../../../lib/historical-research-source';
import './history.css';
const title='Historical Research | SCOUT';
const description='Dated source records for four inspected StonkFun pairs. Historical, not current. Financial figures gated pending rights approval.';
export const metadata:Metadata={title,description,robots:{index:false,follow:false},alternates:{canonical:'/research/history'},
 openGraph:{title,description,type:'website',url:'/research/history'},twitter:{card:'summary_large_image',title,description}};
import HistoricalResearchView from './view';
export default function HistoricalResearch(){return <HistoricalResearchView report={historicalResearch()}/>;}
