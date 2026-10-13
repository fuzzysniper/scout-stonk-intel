import Link from 'next/link';

export default function EcosystemFooter() {
 return <footer className="ecosystem-footer" aria-label="STORK ecosystem connection">
  <div>
   <h2>SCOUT &amp; the STORK ecosystem</h2>
   <p>Independent, read-only research. No STORK ownership is required to use SCOUT.</p>
  </div>
  <div className="ecosystem-links">
   <a href="https://storkcoin.xyz" rel="external noreferrer">Visit STORK ecosystem ↗ <span>(external site)</span></a>
   <Link href="/research#stork-relationship">About the relationship</Link>
  </div>
 </footer>;
}
