import type { Metadata } from 'next';
import StatusClient from './status-client';
export const metadata: Metadata = { title: 'SCOUT — Data Health', description: 'Observation freshness, historical coverage and independently dated collector evidence.' };
export default function StatusPage() { return <StatusClient/>; }
