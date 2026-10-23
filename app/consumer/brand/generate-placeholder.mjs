/** Original UNFARMD geometry, #134. No imported reference image or final-art claim.
 * Reproduce from root: node app/consumer/brand/generate-placeholder.mjs
 */
import {mkdirSync,writeFileSync} from 'node:fs';
const ink='#191e18',bone='#e8e0cd',lime='#d2f65a',coral='#c88676';
const head=()=>`
 <path d="M52 95 22 83Q6 89 15 110l38 20m133-34 27-17q22 8 13 28l-37 22" fill="${ink}"/>
 <path d="m31 96 21 9-5 9-17-7m173-8-17 12 9 7 17-14" fill="#785848"/>
 <path d="M44 94Q26 75 42 56q-3-25 24-27Q75 7 99 19 119-3 140 15q27-9 39 12 29-2 29 24 23 15 8 38l-20 15-10 42-38 58-33 5-32-19-29-46Z" fill="#343b30"/>
 <path d="M55 59q11-15 25-9M96 33q10-10 24-4m30 5q15-3 21 11m15 23q12 3 12 16M52 87q5-7 12-9" stroke="#505547" stroke-width="12" stroke-linecap="round" fill="none"/>
 <path d="M69 91q19-22 46-17l39 1q24 6 32 29l-11 55-32 40-27 4-32-26-18-37Z" fill="${ink}"/>
 <path d="m78 141 30-17 38 2 30 18-28 49-29 8-28-27Z" fill="#72725c"/>
 <path d="m102 164 23-4 18 9-20 9-20-7Z" fill="${ink}"/>
 <path d="m78 111 28 2-4 10-20-1Zm62 2 27-4-3 12-20 3Z" fill="#dbab62"/>
 <path d="m91 113 5 1-1 9-5-1m60-8 5-1 1 9-5 1" fill="${ink}"/>
 <path d="m76 109 31 3m32 0 30-4" stroke="${ink}" stroke-width="5" stroke-linecap="round"/>
 <path d="m112 183 12 5 17-4" fill="none" stroke="${ink}" stroke-width="3" stroke-linecap="round"/>
 <path d="m33 115-3 29 10 10 12-9-6-8 6-15-10-5Z" fill="${lime}"/>
 <circle cx="39" cy="123" r="2" fill="${ink}"/>
`;
const sheep=()=>`
 <path d="m80 210-19 78 24 6 27-82m29 0 12 81 25-1-10-85" fill="${ink}"/>
 <path d="m59 282 30 4-1 19-47-3zm91 4 30-2 15 18-45 3Z" fill="${bone}"/>
 <path d="M52 218q-16-15-5-35-10-20 7-33l23-9 63-10 38 13q28 0 24 30 16 19-4 38-3 28-31 24-18 18-39 4-22 12-38-1-29 7-38-21Z" fill="#30372c"/>
 <path d="m66 200 31 12m39 9 28-14m-53-34 24 2" stroke="#424b38" stroke-width="10" stroke-linecap="round"/>
 ${head()}
 <path d="m59 191 36 16-7 18-36-13m108-17 37-19 10 14-42 24Z" fill="${ink}"/>
 <g transform="rotate(-8 203 189)"><rect x="185" y="165" width="39" height="53" rx="6" fill="${bone}"/><rect x="190" y="170" width="29" height="32" rx="3" fill="${lime}"/><circle cx="204" cy="186" r="8" fill="${ink}"/><circle cx="204" cy="186" r="3" fill="#a2b46d"/><path d="m198 209 12-1" stroke="${ink}" stroke-width="3" stroke-linecap="round"/></g>
`;
const defs=`<defs><radialGradient id="dusk"><stop stop-color="#d8a68b"/><stop offset="1" stop-color="#9a6d60"/></radialGradient><linearGradient id="field" x2="0" y2="1"><stop stop-color="#62684b"/><stop offset="1" stop-color="#2d392a"/></linearGradient></defs>`;
const barn=(x,y,s)=>`<g transform="translate(${x} ${y}) scale(${s})"><path d="M0 148V57L63 0l70 52v101Z" fill="#5c4134"/><path d="M-12 58 62-8l83 60-7 12-76-55-66 61Z" fill="#343c2e"/><path d="m44 88 39-1 2 63-42-3Z" fill="${ink}"/><path d="m18 61 2 69m12-82 2 85m64-74 2 80m14-68 2 73" stroke="#92654e" stroke-width="3"/><path d="m55 39 14-1 1 17-14 1Z" fill="#cbb98b"/></g>`;
const svg=(w,h,title,body)=>`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img"><title>${title}</title>${body}</svg>\n`;
const desktop=svg(800,720,'Original placeholder: a skeptical black sheep leaves the farm with its SCOUT scanner',`${defs}
 <path d="M31 641V307C31 145 180 21 395 21s373 133 373 310v310Z" fill="url(#dusk)"/>
 <circle cx="552" cy="186" r="115" fill="#e2c9a8" opacity=".27"/><circle cx="556" cy="181" r="73" fill="#ecd6b3" opacity=".5"/>
 <path d="m31 352 142-51 198 55 197-44 200 66v277H31Z" fill="#777958"/>
 ${barn(81,182,1.15)}
 <path d="m31 418 193-54 187 66 172-50 185 56v225H31Z" fill="url(#field)"/>
 <path d="m31 451 737-43m-737 91 737-40" fill="none" stroke="#a0a083" stroke-width="2"/>
 <path d="m78 430 9 119 13-1-8-120m533-31 9 120 13-1-8-121m85-5 9 122 13-1-8-124" fill="#565a42"/>
 <path d="m31 587 221-63 240 68 276-56v140H31Z" fill="#263322"/>
 <path d="m45 647 198-44 168 26 210-49 134 25" fill="none" stroke="#62704a" stroke-width="3"/>
 <ellipse cx="430" cy="655" rx="173" ry="24" fill="#141d15" opacity=".65"/>
 <g transform="translate(201 177) scale(1.62) rotate(-4 120 160)">${sheep()}</g>
 <path d="m31 594 199-39-23 34-167 35m558-49 170-34v29l-164 31-30-13" fill="#9d8d65"/>
 <path d="m43 612 169-34m391 13 160-32" fill="none" stroke="#c9b688" stroke-width="3"/>
 <path d="m222 553-12-77 20-4 22 95-22 10m366 18-16-90 21-4 25 92-17 18" fill="#b2a076"/>
 <path d="m243 520 23-11 9 8 21-11m286 6-23 9-7-6-17 7" fill="none" stroke="#c6b98e" stroke-width="3"/>
 <path d="m53 667 24-39 12 28 22-38 5 47m550 8 18-38 10 20 21-34 10 47" fill="none" stroke="#7a8253" stroke-width="3"/>
 <path d="m695 121 10-9m4 23 15-1m-32 14-5 10" stroke="${bone}" stroke-width="2"/>
`);
const mobile=svg(720,380,'Original mobile placeholder: skeptical amber-eyed black sheep, broken ear tag and small optical SCOUT scanner',`${defs}
 <path d="M16 354V158C16 65 133 12 355 12s349 52 349 157v185Z" fill="url(#dusk)"/>
 <circle cx="534" cy="102" r="67" fill="#e5ceb0" opacity=".45"/>
 <path d="m16 221 151-38 192 43 155-35 190 50v113H16Z" fill="#727754"/>
 ${barn(91,115,.86)}
 <path d="m16 271 181-49 183 57 189-34 135 41v68H16Z" fill="url(#field)"/>
 <path d="m16 285 688-20m-688 43 688-17" stroke="#b7b18b" stroke-width="2"/>
 <g transform="translate(254 12) scale(1.09)">${sheep()}</g>
 <path d="m16 335 223-37-25 25-189 30m514-38 165-27v20l-159 32-26-13" fill="#a1916d"/>
 <path d="m221 299-5-48 16-4 15 65-18 7m307 16-12-60 16-4 16 63-13 9" fill="#c0ad84"/>
 <path d="m38 355 20-27 7 17 17-27m545 36 13-26 11 13 16-26" stroke="#7a8253" stroke-width="3" fill="none"/>
`);
const avatar=svg(240,230,'Original black-sheep avatar placeholder, skeptical amber eyes and broken tag',head());
const crew=svg(640,180,'Original supporting-cast placeholder: pig, goat, cow and chicken, secondary to the sheep',`
 <g transform="translate(17 12)"><path d="m10 53-3-37 31 20m63 4 28-26-2 44" fill="${coral}"/><path d="M12 54q52-54 107 0l7 66-36 26-52-4-30-29Z" fill="${coral}"/><path d="m32 69 20 3-4 8-14-2m46-8 20-3-3 10-14 2" fill="${bone}"/><path d="m40 100 33-6 27 12-5 17-36 4-19-13" fill="#99634d"/><path d="m57 108 1 9m20-11 1 9" stroke="${ink}" stroke-width="4"/><path d="m44 139 50-2 4 20-49 2Z" fill="${bone}"/></g>
 <g transform="translate(177 5)"><path d="m28 57-6-31L34 3l10 4-6 27 9 24m47-3 9-30 17-21 9 8-15 22-3 29" fill="${bone}"/><path d="m10 74-10-17 31 1m71 1 33-2-13 20" fill="#82846a"/><path d="m24 52 44-14 37 17 12 58-42 43-20 8-35-56Z" fill="#aeb093"/><path d="m36 83 20 2-5 7-13-1m44-7 20-3-3 9-13 1" fill="${bone}"/><path d="m53 117 27-1-10 39-11 6Z" fill="${ink}"/></g>
 <g transform="translate(336 12)"><path d="m20 45-8-28 12-9 17 35m57 3 17-33 11 10-9 27" fill="${bone}"/><path d="m28 66-27-9-1 15 27 15m83-22 27-10v16l-29 15" fill="${bone}"/><path d="m27 46 45-12 36 16 7 66-29 31-46-4-18-30" fill="${bone}"/><path d="m72 35 24 11 4 45-26 9-12-30" fill="${ink}"/><path d="m31 103 35-8 35 7 3 29-27 16-37-8Z" fill="#b89b7d"/><path d="m37 76 18 1-4 8-13-2m46-7 19-3-4 9-12 1" fill="#a8b18e"/></g>
 <g transform="translate(501 11)"><path d="m43 54-7-19 10-13 14 10 8-26 14 3 6 25 20-11 9 14-24 24" fill="${coral}"/><path d="m37 56 42-11 25 23 3 46-23 35-40-5-18-40Z" fill="${bone}"/><path d="m101 89 37 9-37 16Z" fill="#c09b56"/><path d="m63 80 22 1-5 9-15-2Z" fill="${ink}"/><path d="m65 125 22 1-3 28-12 10-12-18Z" fill="${coral}"/></g>
`);
const directory=new URL('../../../public/consumer/unfarmd/',import.meta.url);mkdirSync(directory,{recursive:true});
for(const [name,body] of Object.entries({'escape-desktop.svg':desktop,'escape-mobile.svg':mobile,'sheep-avatar.svg':avatar,'crew.svg':crew}))writeFileSync(new URL(name,directory),body.replace(/[ \t]+$/gm,''));
