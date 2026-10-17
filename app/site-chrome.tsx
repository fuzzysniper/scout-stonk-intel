'use client';
import {usePathname} from 'next/navigation';
import {NavigationLinks} from './site-navigation';
import EcosystemFooter from './ecosystem-footer';
/** Consumer home is brand-free; technical routes retain their existing chrome. */
export function Chrome({pathname,children}:{pathname:string;children:React.ReactNode}) {
 return pathname==='/' ? children : <><NavigationLinks pathname={pathname}/>{children}<EcosystemFooter/></>;
}
export default function SiteChrome({children}:{children:React.ReactNode}) {
 return <Chrome pathname={usePathname()}>{children}</Chrome>;
}
