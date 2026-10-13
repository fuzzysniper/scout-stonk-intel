import type { Metadata } from 'next';
import { readArchived } from '../../../lib/archive-source';
import { notFound, redirect } from 'next/navigation';
import { validBriefDate } from '../../../lib/brief';
import BriefClient from '../brief-client';
export const dynamic = 'force-dynamic';
type Props = { params: Promise<{ date: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };
export async function generateMetadata({ params }: Props): Promise<Metadata> {
 const { date } = await params;
 if (!validBriefDate(date)) return { title: 'SCOUT — Brief unavailable', robots: { index: false } };
 const title = `SCOUT Research Brief — ${date} UTC`;
 const description = 'Provisional daily research from recorded reward observations, with explicit coverage limitations and evidence links.';
 return { title, description, alternates: { canonical: '/brief/' + date }, openGraph: { title, description, url: '/brief/' + date, type: 'article' }, twitter: { title, description, card: 'summary_large_image' } };
}
export default async function BriefPage({ params, searchParams }: Props) {
 const { date } = await params, query = await searchParams;
 if (!validBriefDate(date)) notFound();
 const archived=await readArchived(date);
 if(query.v===undefined&&archived.report)redirect(archived.report.sharePath!);
 const invalid = Object.keys(query).some(key => key !== 'v') || (query.v !== undefined && (typeof query.v !== 'string' || !/^[a-f0-9]{64}$/.test(query.v)));
 return <BriefClient date={date} version={typeof query.v === 'string' ? query.v : undefined} invalidQuery={invalid}/>;
}
