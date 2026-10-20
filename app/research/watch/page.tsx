import type {Metadata} from 'next';
import {TokenWatch} from '../../consumer/cards/research';
import '../../consumer/cards/cards.css';
const title='Exact-mint token research | SCOUT',description='Independent read-only Solana market identity research. No inferred pair membership, rewards or recommendations.';
export const metadata:Metadata={title,description,robots:{index:false,follow:false},openGraph:{title,description,type:'website'},twitter:{card:'summary',title,description}};
export default async function WatchPage({searchParams}:{searchParams:Promise<{mint?:string|string[]}>}){
 const {mint}=await searchParams;
 return <TokenWatch initialInput={typeof mint==='string'&&mint.length<=120?mint:''}/>;
}
