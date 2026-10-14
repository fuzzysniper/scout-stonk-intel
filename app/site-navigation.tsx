'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const destinations = [
 { href: '/', label: 'Home' },
 { href: '/radar', label: 'Radar' },
 { href: '/brief', label: 'Daily Brief' },
 { href: '/status', label: 'Data Health' },
];
export function NavigationLinks({ pathname }: { pathname: string }) {
 if(pathname==='/')return <div className="site-navigation home-navigation">
  <a className="skip-content" href="#scout-content">Skip to content</a>
  <nav aria-label="Primary">
   <Link href="/" className="home-brand" aria-current="page" aria-label="SCOUT home">SCOUT<span>.</span></Link>
   <Link href="/research">Research</Link><Link href="/status">Status</Link>
   <details className="home-more"><summary>More</summary><div><Link href="/radar">Radar</Link><Link href="/brief">Daily Brief &amp; public archive</Link></div></details>
  </nav>
 </div>;
 return <div className="site-navigation">
  <a className="skip-content" href="#scout-content">Skip to content</a>
  <nav aria-label="Primary"><ul>{destinations.map(({href,label}) => {
   const active = href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(href + '/');
   return <li key={href}><Link href={href} aria-current={active ? 'page' : undefined}>{label}</Link></li>;
  })}</ul></nav>
  <Link className="research-guide-link" href="/research" aria-label="Research guide · evidence & limitations" aria-current={pathname === '/research' ? 'page' : undefined}>Guide</Link>
 </div>;
}
export default function SiteNavigation() { return <NavigationLinks pathname={usePathname()}/>; }
