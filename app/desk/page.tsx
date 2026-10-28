import type {Metadata} from 'next';
import ManualDesk from './integration/manual-desk';
export const metadata: Metadata = {
 title: 'UNFARMD · Manual Decision Desk',
 description: 'Owner-entered decision research and deterministic risk planning. No live sources, execution or saved journal.',
 robots: {index: false, follow: false},
};
export default function DeskPage() { return <ManualDesk/>; }
