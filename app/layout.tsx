import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title: 'SCOUT | Stonk Ecosystem Intelligence', description: 'Read-only intelligence and transparency for StonkFun reward tokens.' };
export default function RootLayout({children}:{children:React.ReactNode}) { return <html lang="en"><body>{children}</body></html>; }
