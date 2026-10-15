import type {Metadata} from 'next';
import {historicalResearch} from '../../../lib/historical-research-source';
import './history.css';
export const metadata:Metadata={title:'Historical Research | SCOUT',description:'Dated source records for four inspected StonkFun pairs. Historical, not current. Financial figures gated pending rights approval.'};
import HistoricalResearchView from './view';
export default function HistoricalResearch(){return <HistoricalResearchView report={historicalResearch()}/>;}
