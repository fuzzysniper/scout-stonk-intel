/** Original geometric SVG composition studies for #132, authored in code.
 * Not stock imagery, commissioned final art, or a claim of trademark clearance.
 * Reproduce: node experiments/unfarmd-brand/art/create-art.mjs
 */
import {writeFileSync} from 'node:fs';
const bone='#e8e0cd', lime='#d2f65a', ink='#20231f', clay='#b96c50';
const path=(d,fill,extra='')=>`<path d="${d}" fill="${fill}" ${extra}/>`;
const eye=(x,y)=>`<path d="m${x} ${y} 19 2-6 8-12-1z" fill="${bone}"/><path d="m${x+10} ${y+1} 4 1-1 7h-4z" fill="${ink}"/>`;
const sheep=()=>`
 ${path('m72 217-10 75 21 2 23-75m39 2 10 74 24-1-8-75',ink)}
 ${path('m56 285 33 1-1 21H45zm96 2 29-2 13 19h-42',bone)}
 ${path('M46 144 33 123l9-20-7-22 23-18 2-24 28-7 17-19 25 8 24-6 17 20 27 5 4 25 20 17-8 25 9 19-14 22 1 22-24 9-6 20-24-2-22 11-23-9-25 5-9-20-25-10Z','#343932')}
 ${path('m45 102 40-21 14 8-39 37zm24-56 26 2-5 15-26 6zm73-14 14 22-10 12-17-25zm35 40 19 6 2 18-20-7zm-84 99 22-14 21 13-4 16-27 8zm70-39 27-10 12 11-22 17z','#44493e')}
 ${path('m70 98-35-5-18 15 16 13 38 4m109-30 35-8 16 11-12 17-35 9',ink)}
 ${path('m56 103-24 5 24 6m137-10 21-7-9 12',clay)}
 ${path('m73 84 34-16 47 9 26 21-9 64-27 46-31-1-33-44Z',ink)}
 ${path('m80 148 28-13 39 3 23 16-27 47-29-2-29-29Z','#73725e')}
 ${path('m106 172 20-5 17 7-18 8z',ink)}
 ${eye(84,114)}${eye(139,116)}
 ${path('m112 184 13 6 18-4','none',`stroke="${ink}" stroke-width="3"`)}
 ${path('m36 116-1 27 10 5 9-9-5-6 5-9Z',lime)}
 <path d="m40 124 5 1" stroke="${ink}" stroke-width="2"/>
 ${path('m53 197 42 7-6 18-40-6zm107-2 39-9 4 15-42 15Z',ink)}
 ${path('m187 177 33-3 4 44-33 3z',bone)}${path('m193 184 21-2 2 20-21 2z',lime)}
 <path d="m198 192 11-1m-5-5 1 11" stroke="${ink}" stroke-width="2"/>
 <path d="m40 241 154-10M45 255l141-11" stroke="#141713" stroke-width="2" opacity=".2"/>
`;
const goat=()=>`
 ${path('m76 207-9 89 27 2 15-93m31 4 15 88 24-2-10-92',ink)}
 ${path('M54 232 66 148l27-22 60 3 28 23 15 77-62 18z','#9b9a7d')}
 ${path('m78 88-5-45 17-32 8 6-8 32 12 40m42-1 10-51 20-27 11 6-16 35-2 48',bone)}
 ${path('m75 97-44-17-13 11 27 29 30-5m90-12 39-22 17 8-23 33-33-2',ink)}
 ${path('m71 81 44-12 46 15 18 60-45 46-22 29-19-29-32-48Z','#c1baa0')}
 ${path('m96 154 19 57 18-27 18-30z',ink)}
 ${eye(80,115)}${eye(139,112)}
 ${path('m103 141 26-3 8 12-17 11-18-11z',ink)}
 ${path('m65 171 37 15-7 18-36-15m88-3 40-17 5 16-41 18',ink)}
 ${path('m94 185 32-13 21 20-19 28-24-6z',lime)}
 <path d="m119 182 9 22-19-9z" fill="${ink}"/>
 <path d="m113 176 12 40" stroke="${ink}" stroke-width="2"/>
`;
const pig=()=>`
 ${path('m68 224-3 71 26 2 20-75m30 0 16 74 25-3-9-73',ink)}
 ${path('M48 218 41 159l23-25 88-2 40 34-6 63-65 21Z',clay)}
 ${path('m62 98-9-63 42 33m56 4 37-36 4 72',clay)}
 ${path('m66 71-7-27 20 20m85 6 18-24 1 31',ink)}
 ${path('m57 89 42-27 57 4 35 33 5 50-33 34-66 2-43-37Z','#c98a6b')}
 ${eye(69,104)}${eye(146,102)}
 ${path('m87 128 47-11 32 17-7 27-45 9-26-15z',clay)}
 <path d="m107 139 2 12m27-16 2 12" stroke="${ink}" stroke-width="7"/>
 ${path('m113 173 21-2 6 5-23 4z',ink)}
 ${path('m63 194 29 13-10 16-33-13m106-14 43-11 5 19-44 11',ink)}
 ${path('m89 181 56-1 9 69-56 1z',bone)}
 <path d="m100 196 34-1m-33 11 29-1m-28 11 34-1m-33 11 20-1" stroke="${ink}" stroke-width="3"/>
 ${path('m89 239 65-1 1 10-56 2z',lime)}
`;
const cow=()=>`
 ${path('m69 225-4 72 26 1 20-73m29 0 14 72 27-2-13-72',ink)}
 ${path('M44 229 53 155l33-27 69-1 32 26 16 73-71 22Z',bone)}
 ${path('m66 155 26 10 5 39-31 19-19-4m102-60 21 29-9 17-31-22m-5 45 25-9 25 16-47 12z',ink)}
 ${path('m62 86-15-32 9-15 23 42m82 0 18-41 11 10-7 35',bone)}
 ${path('m74 98-48-16-7 10 27 30 35-3m79-23 42-17 21 8-18 23-42 10',ink)}
 ${path('m69 78 49-13 50 16 13 69-34 34-54-3-33-37Z',bone)}
 ${path('m121 67 38 13-7 43-30 7-17-24z',ink)}
 ${eye(75,109)}${eye(138,109)}
 ${path('m78 140 33-10 52 9 7 32-34 19-47-14z','#ad8c73')}
 <path d="m98 151 2 10m43-9 2 11" stroke="${ink}" stroke-width="5"/>
 ${path('m63 201 37 8-6 16-38-8m100-6 38-13 5 16-43 12',ink)}
 <path d="m104 216 42-6" stroke="${lime}" stroke-width="8"/>
`;
const chicken=()=>`
 ${path('m91 247-13 49h-19l-5 9h40l18-57m25-3 10 50h18l9 10h-39l-15-58','#b98340')}
 ${path('m57 226-37-39 3-34 31 14 8-23 19 17 18 33',ink)}
 ${path('M57 224 56 161l38-39 55 2 42 41-6 66-59 26z',bone)}
 ${path('m69 194 29 6 25 28-27 11-28-23m79-45 20 3 10 32-26 18-21-16z','#b5b09b')}
 ${path('m95 78-13-21 10-19 16 12 11-23 17 2 5 27 21-9 13 17-21 30',clay)}
 ${path('m91 76 36-15 32 16 8 41-17 35-48-2-22-38Z',bone)}
 ${eye(109,94)}
 ${path('m151 110 45 13-39 12z','#b98340')}
 ${path('m125 133 24 1 4 25-15 11-15-18z',clay)}
 ${path('m80 173 26-5 8 36-26 5z',ink)}${path('m85 179 16-3 4 19-16 3z',lime)}
`;
const animals={sheep,goat,pig,cow,chicken};
const placed=(kind,x,y,scale=1,rotation=0)=>`<g transform="translate(${x} ${y}) scale(${scale}) rotate(${rotation} 120 160)">${animals[kind]()}</g>`;
const svg=(width,height,title,body)=>`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img"><title>${title}</title>${body}</svg>\n`;
const commonDefs=`<defs><radialGradient id="sky"><stop stop-color="#c0a17a"/><stop offset="1" stop-color="#70684e"/></radialGradient><linearGradient id="ground" x2="0" y2="1"><stop stop-color="#686a46"/><stop offset="1" stop-color="#242b23"/></linearGradient></defs>`;
const escape=svg(880,800,'The escape — original composition study',`${commonDefs}
 <path d="M34 702V323C34 154 203 27 435 27s409 154 409 321v354z" fill="url(#sky)"/>
 <circle cx="575" cy="210" r="135" fill="#dccfae" opacity=".3"/>
 <circle cx="578" cy="205" r="87" fill="#e7d9b8" opacity=".5"/>
 <path d="m35 393 166-75 205 65 200-48 238 70v306H34z" fill="#6d7151"/>
 <path d="m45 464 185-47 204 51 217-61 193 60v261H34z" fill="url(#ground)"/>
 <path d="M90 390V243l101-90 105 83v166" fill="#623e30"/>
 <path d="m73 250 118-104 123 96-11 14-111-83-105 94z" fill="#373b2e"/>
 <path d="m169 291 49-2 3 107-53-6z" fill="#242b23"/>
 <path d="m109 265 1 102m24-124 1 133m112-121 2 125m23-119 2 125" stroke="#8d6045" stroke-width="5"/>
 <path d="m184 216 20-1 1 23-20 1z" fill="#d3c296"/>
 <path d="M36 499 844 443M36 549l808-52" stroke="#a6a083" stroke-width="3"/>
 <path d="m74 472 8 127 14-1-7-128m140-18 8 124 14-2-8-125m425-26 8 122 14-1-7-124m128-5 8 128 15-1-9-128" fill="#514f3e"/>
 ${placed('goat',236,344,.67,-6)}${placed('pig',111,422,.58,4)}${placed('chicken',659,450,.53,8)}
 <path d="m34 633 217-56 228 42 202-50 163 27v144H34z" fill="#252e25"/>
 <path d="m53 721 199-59 201 55 163-44 208 17" fill="none" stroke="#69704a" stroke-width="3"/>
 <ellipse cx="463" cy="730" rx="210" ry="28" fill="#171e18" opacity=".5"/>
 ${placed('sheep',288,233,1.69,-5)}
 <path d="m34 655 239-42-28 34-194 41m612-98 181-27v28l-162 31-47-7" fill="#9a8963"/>
 <path d="m54 675 218-39m401-34 166-25" stroke="#c1ad7e" stroke-width="3"/>
 <path d="m253 608-4-82 21-6 19 110-24 9m395-31-14-98 22-6 24 98-10 20" fill="#ab9870"/>
 <path d="m275 575 32-15 8 9 23-15m298-8-23 9-9-7-23 7" fill="none" stroke="#c1ad7e" stroke-width="3"/>
 <path d="m35 743 48-43 12 30 26-40 5 46m639 6 16-41 18 25 27-44 9 53" stroke="#717b4c" stroke-width="4" fill="none"/>
 <path d="m745 135 13-12m13 22 18-2m-39 12-6 13" stroke="#e8e0cd" stroke-width="3"/>
 <path d="m688 199 7-6m9 11 9-1" stroke="#e8e0cd" stroke-width="2" opacity=".6"/>
`);
const squad=svg(900,730,'The misfits — original ensemble study',`
 <path d="m25 77 759-56 87 616-804 58z" fill="${lime}"/>
 <path d="m42 98 754-22-24 568-698 11z" fill="#c6bd9e"/>
 <path d="m52 492 731-172 14 339-721 1z" fill="${clay}"/>
 <path d="m70 97 238-2-26 567H75z" fill="#cfccb4"/>
 <path d="m682 70 124 10-34 571-149 7z" fill="#acae8e"/>
 <path d="M62 163 790 535M280 86l444 563M48 409l764-238" stroke="${bone}" stroke-width="3" opacity=".25"/>
 ${placed('cow',505,167,1.30,9)}${placed('goat',107,96,1.53,-10)}
 ${placed('pig',52,360,1.06,-8)}${placed('chicken',598,377,1.01,9)}
 <ellipse cx="469" cy="656" rx="150" ry="20" fill="${ink}" opacity=".3"/>
 ${placed('sheep',292,285,1.25,0)}
 <path d="m474 40 19 29 30-17-11 34 29 17-34 2 1 34-22-26-28 18 10-33-30-17 34-2z" fill="${ink}"/>
 <path d="m93 579 7 16m-18-6 24-2m580-446 7 16m-17-6 24-2" stroke="${bone}" stroke-width="4"/>
 <path d="m24 98 59-6-4 21-57 4m758 469 78-7 4 20-79 8" fill="${bone}" opacity=".75"/>
`);
const mark=svg(240,250,'Black sheep — original mascot candidate',`
 ${path('m47 97-25-17L7 92l9 31 34 10m144-39 26-19 15 15-10 33-33 9',ink)}
 ${path('m33 78 9-31 30-7 17-25 32 7 27-10 19 23 29 6 10 30-17 30-7 55-35 61-34 12-30-17-34-62z',ink)}
 ${path('m42 70 28-11 15 15-37 16m79-56 26 8-10 21-27-12m42 24 25-3 6 21-26 4','#42483c')}
 ${path('m67 137 28-15 49 2 30 14-32 63-25 7-24-13z','#85856c')}
 ${eye(65,105)}${eye(142,105)}
 ${path('m99 161 24-4 19 8-21 10z',ink)}
 ${path('m28 120-3 39 17 6 13-17-8-7 5-16z',lime)}
 <path d="m33 132 7 1" stroke="${ink}" stroke-width="3"/>
 <path d="m112 184 11 5 17-4" fill="none" stroke="${ink}" stroke-width="3"/>
`);
const sheet=svg(1440,660,'The trenchers — original character composition sheet, not final licensed art',`
 <rect width="1440" height="660" fill="${bone}"/>
 <text x="50" y="55" fill="${ink}" font-family="Arial,sans-serif" font-size="18" font-weight="700" letter-spacing="3">UNFARMD / THE TRENCHERS</text>
 <text x="50" y="91" fill="${ink}" font-family="Arial,sans-serif" font-size="14">ORIGINAL GEOMETRIC COMPOSITION STUDIES — NOT FINAL ART. NO MASCOT CHOSEN.</text>
 <path d="M50 119h1340" stroke="${ink}"/>
 ${placed('sheep',20,165,1.07)}${placed('goat',307,165,1.07)}${placed('pig',592,165,1.07)}${placed('cow',878,165,1.07)}${placed('chicken',1163,165,1.07)}
 ${[['SHEEP','The skeptic','Broken tag. Checks the story.'],['GOAT','The route-finder','Finds the gap. Not the hype.'],['PIG','The fine-print reader','The footnote has a footnote.'],['COW','The steady hand','Hard to rush. Harder to fool.'],['CHICKEN','The first to notice','Cautious is not cowardly.']].map((a,i)=>`<g fill="${ink}" font-family="Arial,sans-serif"><text x="${50+i*283}" y="540" font-size="19" font-weight="700">${a[0]}</text><text x="${50+i*283}" y="570" font-size="17">${a[1]}</text><text x="${50+i*283}" y="596" font-size="13">${a[2]}</text></g>`).join('')}
 <path d="M50 620h1340" stroke="${ink}"/>
 <text x="50" y="646" fill="${ink}" font-family="Arial,sans-serif" font-size="12">NO WEAPONS. NO NAMED VILLAINS. NO COPIED MEME IP. ANIMALS WITH AGENCY, NOT DUMB VICTIMS.</text>
`);
for(const [name,value] of Object.entries({'escape.svg':escape,'squad.svg':squad,'sheep-mark.svg':mark,'character-sheet.svg':sheet}))writeFileSync(new URL(name,import.meta.url),value);
