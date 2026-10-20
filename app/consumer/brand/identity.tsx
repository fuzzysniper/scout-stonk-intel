import Link from 'next/link';
import {escapeArt} from './art';
export function BrandArrow(){return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 19 19 5M5 5h14v14" stroke="currentColor" strokeWidth="2.2"/></svg>;}
/** A native picture keeps art recomposition local, explicit and independent of evidence. */
export function EscapeArt(){return <figure className="escape-art" aria-label="The Escape · original placeholder artwork">
 <picture><source media="(max-width: 700px)" srcSet={escapeArt.mobile}/>
  <img src={escapeArt.desktop} width={escapeArt.width} height={escapeArt.height} alt={escapeArt.alt} fetchPriority="high" decoding="async"/>
 </picture><figcaption>{escapeArt.caption}</figcaption>
 </figure>;}
export function ResearchInstruments(){return <nav className="research-instruments" aria-label="UNFARMD research instruments">
 <div><span className="instrument-index" aria-hidden="true">01</span><div><strong>SCOUT</strong><p>Facts. Concerns. Unknowns.</p><a href="#mint">Analyze an exact mint <span aria-hidden="true">↑</span></a></div></div>
 <div><span className="instrument-index" aria-hidden="true">02</span><div><strong>PULSE <span className="instrument-status">Research only</span></strong><p>Pair research. Financial figures withheld.</p><Link href="/research/cards" prefetch={false}>Explore the research <span aria-hidden="true">↗</span></Link></div></div>
 <div><span className="instrument-index" aria-hidden="true">03</span><div><strong>RECEIPTS</strong><p>Sources, dates and what’s still unproven.</p><Link href="/research/history" prefetch={false}>Read the dated source index <span aria-hidden="true">↗</span></Link></div></div>
 </nav>;}
export function Trenchers(){return <details className="trenchers" onKeyDown={event=>{if(event.key==='Escape'){event.currentTarget.open=false;event.currentTarget.querySelector('summary')?.focus();}}}>
 <summary><span>Not following the herd.</span><span>Meet the crew</span></summary><div><p>The farm runs on information gaps. The sheep checks the story. The pig reads the fine print. The goat finds another way out. Curiosity is a survival skill.</p>
 {/* eslint-disable-next-line @next/next/no-img-element -- Small original local SVG lore placeholder, never a remote or licensed-art fallback. */}
 <img src={escapeArt.crew} width="640" height="180" alt="Original supporting-cast vector placeholders: a pig, goat, cow and chicken." loading="lazy"/>
 <p className="small-note">Original supporting-cast study. Final art pending. Animals are a metaphor for independent research, not token recommendations.</p></div></details>;}
