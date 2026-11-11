import type {Metadata} from 'next';
import DecisionDesk from './decision-desk';
export const metadata: Metadata = {
 title: 'UNFARMD · Decision Desk prototype',
 description: 'Manual, session-only decision drafting. No live sources or connected risk evaluation.',
 robots: {index: false, follow: false},
};
export default function DeskPage() { return <DecisionDesk/>; }
