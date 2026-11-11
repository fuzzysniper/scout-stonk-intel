'use client';
import {usePathname} from 'next/navigation';
import {NavigationLinks} from './site-navigation';
import EcosystemFooter from './ecosystem-footer';
/** Consumer home and focused research views own their chrome; other research routes retain it. */
export function Chrome({pathname,children}:{pathname:string;children:React.ReactNode}) {
 return pathname==='/' || pathname==='/lens' || pathname==='/research/cards' || pathname==='/research/watch' ? children : <><NavigationLinks pathname={pathname}/>{children}<EcosystemFooter/></>;
}
export default function SiteChrome({children}:{children:React.ReactNode}) {
 return <Chrome pathname={usePathname()}>{children}</Chrome>;
}
