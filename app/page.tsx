import type {Metadata} from 'next';
import ConsumerHome from './consumer/home';
import {evaluateInput,consumerMetadata} from './consumer/model';
import './consumer/consumer.css';
type Props={searchParams:Promise<{mint?:string|string[]}>};
export async function generateMetadata({searchParams}:Props):Promise<Metadata> {
 return consumerMetadata((await searchParams).mint);
}
export default async function Page({searchParams}:Props) {
 const {mint}=await searchParams;
 return <ConsumerHome initialInput={typeof mint==='string'?mint:''} initialState={evaluateInput(mint)}/>;
}
