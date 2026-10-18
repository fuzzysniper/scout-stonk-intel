// Vite-only Next Link stand-in. The production app uses the real Next component.
import React from 'react';
export default function Link({prefetch:_,...props}:React.ComponentProps<'a'>&{prefetch?:boolean}){void _;return <a {...props}/>;}
