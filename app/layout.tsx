import type { Metadata } from 'next';
import './globals.css';
import SiteChrome from './site-chrome';
export const metadata: Metadata = {
 title: 'SCOUT | Find reward-asset memecoins',
 description: 'Find memecoins that reward holders in the assets you follow. Explore verified pair identities and honest reward evidence.',
 metadataBase: new URL('https://scout.storkcoin.xyz'),
 openGraph: { title: 'SCOUT — Find reward-asset memecoins', description: 'Choose a reward asset. Explore its memecoins and reward evidence.', type: 'website' },
 twitter: { card: 'summary_large_image', title: 'SCOUT — Find reward-asset memecoins', description: 'Verified pair identities. Honest reward evidence.' },
};
export default function RootLayout({children}:{children:React.ReactNode}) { return <html lang="en"><body><SiteChrome>{children}</SiteChrome></body></html>; }
