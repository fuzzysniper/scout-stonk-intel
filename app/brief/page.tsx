import { redirect } from 'next/navigation';
export const dynamic = 'force-dynamic';
export default function BriefIndex() { redirect('/brief/' + new Date().toISOString().slice(0,10)); }
