import type { Metadata } from 'next';
import RadarClient from './radar-client';
export const metadata: Metadata = {
 title: 'SCOUT — Intelligence Radar',
 description: 'Verified StonkFun reward tokens, actual recorded changes and evidence coverage. Read-only research.',
};
export default function RadarPage() { return <RadarClient/>; }
