import type { Metadata } from 'next';
import './globals.css';
import SiteNavigation from './site-navigation';
import EcosystemFooter from './ecosystem-footer';
export const metadata: Metadata = {
 title: 'SCOUT | Stonk Ecosystem Intelligence',
 description: 'Follow the money. Independent token dossiers and reward intelligence for the Stonk ecosystem.',
 metadataBase: new URL('https://scout.storkcoin.xyz'),
 openGraph: { title: 'SCOUT — Follow the Money', description: 'Reward ledgers. Token dossiers. Evidence over hype.', type: 'website' },
 twitter: { card: 'summary_large_image', title: 'SCOUT — Follow the Money', description: 'Independent Stonk ecosystem intelligence.' },
};
export default function RootLayout({children}:{children:React.ReactNode}) { return <html lang="en"><body><SiteNavigation/>{children}<EcosystemFooter/></body></html>; }
