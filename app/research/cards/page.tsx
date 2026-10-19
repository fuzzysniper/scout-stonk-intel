import type {Metadata} from 'next';
import CardsResearch from '../../consumer/cards/research';
import '../../consumer/cards/cards.css';
const title='CARDS pair research | SCOUT',description='Explore exact CARDS pair identities, source evidence and honest performance-coverage limits. Read-only research, not recommendations.';
export const metadata:Metadata={title,description,robots:{index:false,follow:false},openGraph:{title,description,type:'website'},twitter:{card:'summary',title,description}};
export default async function CardsPage({searchParams}:{searchParams:Promise<{watch?:string|string[]}>}){
 const {watch}=await searchParams;
 return <CardsResearch initialWatch={typeof watch==='string'&&watch.length<=120?watch:''}/>;
}
