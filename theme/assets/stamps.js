/* World on Rotation: entry stamps drawn after each country's real ones.
   Each style follows photos of actual entry stamps (shape, ink, wording, date format, symbols).
   A stamp has a "port" (the town, or the country for a whole-country mix) and a "big" line:
   the date on the passport pages, the country's name on the globe, so it reads at a small size.
   Countries without a style here fall back to the generic stamps in the globe script. */
(function(){
  const MO = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];
  const MO_ES = ["ENE.","FEB.","MAR.","ABR.","MAYO","JUN.","JUL.","AGO.","SEP.","OCT.","NOV.","DIC."];
  const MO_FR = ["JANV.","FÉVR.","MARS","AVR.","MAI","JUIN","JUIL.","AOÛT","SEPT.","OCT.","NOV.","DÉC."];
  const p2 = n => String(n).padStart(2, "0");
  const D = d => ({d: d.getUTCDate(), m: d.getUTCMonth(), y: d.getUTCFullYear(), yy: p2(d.getUTCFullYear() % 100)});
  const X = s => String(s).replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
  const MONO = `font-family="IBM Plex Mono,ui-monospace,monospace"`, COND = `font-family="Barlow Condensed,Arial Narrow,sans-serif"`,
        SANS = `font-family="Instrument Sans,Helvetica,Arial,sans-serif"`, SERIF = `font-family="Fraunces,Georgia,serif"`;
  // text that never runs wider than `max`
  function T(x, y, s, size, o = {}){
    const t = X(s), w = t.length * size * (o.k || 0.56), fit = o.max && w > o.max ? ` textLength="${o.max}" lengthAdjust="spacingAndGlyphs"` : "";
    return `<text x="${x}" y="${y}" text-anchor="${o.a || "middle"}" ${o.f || SANS} font-size="${size}" font-weight="${o.w || 700}"${o.ls ? ` letter-spacing="${o.ls}"` : ""}${fit} fill="${o.c || "currentColor"}"${o.tr ? ` transform="${o.tr}"` : ""}>${t}</text>`;
  }
  // text along the top or bottom of an ellipse
  function arc(id, cx, cy, rx, ry, top, s, size, o = {}){
    const d = top ? `M${cx - rx} ${cy} A${rx} ${ry} 0 0 1 ${cx + rx} ${cy}` : `M${cx - rx} ${cy} A${rx} ${ry} 0 0 0 ${cx + rx} ${cy}`;
    return `<path id="${id}" d="${d}" fill="none"/><text ${o.f || SANS} font-size="${size}" font-weight="${o.w || 700}" letter-spacing="${o.ls || 0.6}" fill="${o.c || "currentColor"}"><textPath href="#${id}" startOffset="50%" text-anchor="middle" dominant-baseline="${top ? "auto" : "hanging"}">${X(s)}</textPath></text>`;
  }
  const star = (x, y, r) => { let s = ""; for(let i = 0; i < 10; i++){ const a = -Math.PI/2 + i*Math.PI/5, R = i % 2 ? r*0.42 : r; s += (i ? "L" : "M") + (x + R*Math.cos(a)).toFixed(2) + " " + (y + R*Math.sin(a)).toFixed(2); } return `<path d="${s}Z" fill="currentColor"/>`; };
  const plane = (x, y, s) => `<path transform="translate(${x} ${y}) scale(${s})" d="M-6 0.6 L-1 0.6 L-3.4 5 L-2.1 5 L1.6 0.6 L5 0.6 Q6.5 0 5 -0.6 L1.6 -0.6 L-2.1 -5 L-3.4 -5 L-1 -0.6 L-6 -0.6 L-6.8 -2.2 L-7.6 -2.2 L-7 0 L-7.6 2.2 L-6.8 2.2 Z" fill="currentColor"/>`;
  const arrowIn = (x, y, s) => `<g transform="translate(${x} ${y}) scale(${s})" fill="none" stroke="currentColor" stroke-width="1.1"><rect x="-5" y="-4" width="10" height="8"/><path d="M-7.5 0H2M-0.5 -2.5 2 0-0.5 2.5"/></g>`;
  const big = (o, globe) => globe ? o.name : o.dateText;

  /* ---- the styles ---- */
  const S = {};
  // Ghana Immigration Service: green oval, double ring filled with 0101 microtext, stars at the sides, "Valid for ... days", ARRIVAL and the port below.
  S.Ghana = {shape: "oval", ink: "#2e7a4c", w: 100, h: 72, date: d => `${p2(d.d)} ${MO[d.m]} ${d.y}`, draw(o, g){
    return `<ellipse cx="50" cy="36" rx="47" ry="33" fill="none" stroke="currentColor" stroke-width="2.4"/>
      <ellipse cx="50" cy="36" rx="38" ry="25" fill="none" stroke="currentColor" stroke-width="1.2"/>
      ${arc(o.id + "m", 50, 36, 42.5, 29, true, "0101010101010101010101010101010101010101010101", 3.2, {f: MONO, w: 500, ls: 0})}
      ${arc(o.id + "n", 50, 36, 42.5, 29, false, "0101010101010101010101010101010101010101010101", 3.2, {f: MONO, w: 500, ls: 0})}
      ${star(12.5, 36, 2.6)}${star(87.5, 36, 2.6)}
      ${T(50, 22, "GHANA IMMIGRATION", 5.2, {max: 54})}${T(50, 27.5, "SERVICE", 4.6)}
      ${T(50, g ? 41 : 40, big(o, g), g ? 17 : 10, {max: 64, w: 800})}
      ${g ? T(50, 50, o.small, 5.4, {f: MONO}) : T(50, 47.5, "Valid for ____ days", 4.2, {w: 600})}
      ${T(50, 55.5, "ARRIVAL · " + o.port, 4.4, {max: 50})}`;
  }};
  // Mali: red rounded rectangle, the airport's name in italic, the date and time in a box, arrows under it.
  S.Mali = {shape: "rrect", ink: "#b03a36", w: 100, h: 60, date: d => `${p2(d.d)}.${p2(d.m + 1)}.${d.yy}  07:50`, draw(o, g){
    return `<rect x="3" y="3" width="94" height="54" rx="7" fill="none" stroke="currentColor" stroke-width="2.2"/>
      ${T(50, 15, "Aéroport International", 7, {f: SERIF, w: 600, max: 80})}
      ${T(50, 23.5, o.port, 6.4, {f: SERIF, w: 600, max: 80})}
      <rect x="11" y="27.5" width="78" height="${g ? 16 : 14}" fill="none" stroke="currentColor" stroke-width="1"/>
      ${T(50, g ? 40 : 38, big(o, g), g ? 17 : 9, {f: g ? COND : MONO, max: 72})}
      ${g ? T(50, 52, o.small, 5, {f: MONO}) : `<path d="M20 50l-4-3 4-3M80 50l4-3-4-3" fill="none" stroke="currentColor" stroke-width="1.1"/>${T(50, 50, "· · · · · · ·", 5, {f: MONO})}`}`;
  }};
  // Nigeria Immigration Service: green rounded rectangle, NIS and the port top left, the service badge top right,
  // EMPLOYMENT PROHIBITED up the left side, PERMITTED TO STAY ONE MONTH under the date.
  S.Nigeria = {shape: "rrect", ink: "#3c8a57", w: 100, h: 66, date: d => `${p2(d.d)} ${MO[d.m]} ${d.y}`, draw(o, g){
    return `<rect x="3" y="3" width="94" height="60" rx="9" fill="none" stroke="currentColor" stroke-width="2.2"/>
      ${T(22, 14, "NIS", 7, {a: "start"})}${T(22, 22, o.port, 6, {a: "start", max: 50})}
      <rect x="77" y="8" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1"/><path d="M79.5 17.5l4-6 2 3 2.5-4" fill="none" stroke="currentColor" stroke-width="1.2"/>
      ${T(0, 0, "EMPLOYMENT PROHIBITED", 4.6, {tr: "translate(14 33) rotate(-90)", max: 48})}
      ${T(55, g ? 41 : 39, big(o, g), g ? 17 : 11, {f: COND, w: 600, max: 66, ls: 0.8})}
      ${g ? T(55, 52, o.small, 5, {f: MONO}) : `${T(55, 49, "PERMITTED TO STAY ONE", 4.4, {max: 64})}${T(55, 55, "MONTH FROM DATE OF ENTRY", 4.4, {max: 64})}`}`;
  }};
  // Polícia Federal, Brazil: sharp rectangle, title on top, date and post number, CLAS. DOC. PRAZO boxes, a numbered column on the right.
  S.Brazil = {shape: "rect", ink: "#3a3352", w: 100, h: 60, date: d => `${p2(d.d)} ${p2(d.m + 1)} ${d.yy}`, draw(o, g){
    return `<rect x="3" y="3" width="94" height="54" fill="none" stroke="currentColor" stroke-width="1.8"/>
      <path d="M84 3V57M84 16.5H97M84 30H97M84 43.5H97" stroke="currentColor" stroke-width="1"/>
      ${["1","2","3","4"].map((n, i) => T(90.5, 12.5 + i*13.5, n, 6, {f: COND})).join("")}
      ${T(43.5, 13, "POLÍCIA FEDERAL - BRASIL", 6.6, {f: COND, max: 76})}<path d="M7 16.5H80" stroke="currentColor" stroke-width="1"/>
      ${g ? T(43.5, 34, o.name, 12, {f: COND, max: 72}) + T(43.5, 41.5, o.small, 4.6, {f: MONO}) : T(30, 34, o.dateText, 10, {f: COND, w: 600, ls: 1.2}) + T(68, 34, "554", 10, {f: COND, w: 600})}
      <path d="M3 45H84M30 45V57M57 45V57" stroke="currentColor" stroke-width="1"/>
      ${T(6, 50, "CLAS.", 3.6, {a: "start", w: 600})}${T(33, 50, "DOC.", 3.6, {a: "start", w: 600})}${T(60, 50, "PRAZO", 3.6, {a: "start", w: 600})}`;
  }};
  // Migración Colombia: rounded square frame, title top left, port code box top right, plane badge, E badge, PT PIP PO VISA tick boxes.
  S.Colombia = {shape: "rrect", ink: "#2a4f9e", w: 100, h: 66, date: d => `${p2(d.d)} ${MO_ES[d.m]} ${d.y}`, draw(o, g){
    return `<rect x="3" y="3" width="94" height="60" rx="5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-dasharray="0.8 0.7"/>
      ${T(8, 14, "MIGRACIÓN", 8, {a: "start", f: COND, w: 600})}${T(8, 19.5, "COLOMBIA", 5.2, {a: "start", ls: 1.5})}
      <rect x="70" y="7" width="22" height="13" rx="2" fill="none" stroke="currentColor" stroke-width="1.2"/>${T(81, 16.5, o.code, 7.5, {f: COND})}
      <circle cx="13" cy="33" r="5.5" fill="none" stroke="currentColor" stroke-width="1.1"/>${plane(13, 33, 0.55)}
      <circle cx="13" cy="49" r="5.5" fill="none" stroke="currentColor" stroke-width="1.1"/>${T(13, 51.8, "E", 7)}
      ${T(55, g ? 40 : 39, big(o, g), g ? 17 : 10.5, {max: 70, w: 600})}
      ${g ? T(55, 49, o.small, 5, {f: MONO}) : ""}
      ${T(55, 58, "PT▢ PIP▢ PO▢ VISA▢", 4.4, {f: MONO, w: 500, max: 64})}`;
  }};
  // República de Cuba: magenta, no outer frame; a rounded banner with the country's name, numbers in the corners, the airport's name below, dotted ornaments.
  S.Cuba = {shape: "banner", ink: "#c03380", w: 100, h: 60, date: d => `${p2(d.d)} ${MO_ES[d.m]} ${d.y}`, draw(o, g){
    return `<rect x="20" y="4" width="60" height="11" rx="5.5" fill="none" stroke="currentColor" stroke-width="1.3"/>
      ${T(50, 12, "REPÚBLICA DE CUBA", 5.6, {max: 54})}
      ${T(9, 12, "038", 5, {f: COND})}${T(91, 12, "038", 5, {f: COND})}${T(91, 55, "038", 5, {f: COND})}
      <path d="M8 22v28M92 22v28" stroke="currentColor" stroke-width="1.4" stroke-dasharray="1.2 2.2"/>
      ${T(50, g ? 37 : 36, big(o, g), g ? 17 : 11, {f: COND, w: 600, max: 74, ls: 0.8})}
      ${g ? T(50, 45, o.small, 5, {f: MONO}) : ""}
      ${T(50, 54, o.port, 6, {f: COND, max: 56})}<path d="M22 50h6M72 50h6" stroke="currentColor" stroke-width="1" stroke-dasharray="1 1.4"/>`;
  }};
  // DGM, DR Congo: blue double rectangle, the post on top, REP. DEM. DU CONGO / DGM at the bottom, sides marked, the date in red.
  S["DR Congo"] = {shape: "rect2", ink: "#2c4797", red: "#c23b3b", w: 100, h: 64, date: d => `${p2(d.d)} ${MO[d.m]} ${d.y}`, draw(o, g, s){
    return `<rect x="3" y="3" width="94" height="58" fill="none" stroke="currentColor" stroke-width="2"/><rect x="7" y="7" width="86" height="50" fill="none" stroke="currentColor" stroke-width=".9"/>
      ${T(50, 16, o.port, 6.6, {max: 64})}<path d="M18 19H82" stroke="currentColor" stroke-width=".8"/>
      <circle cx="13" cy="13" r="3.2" fill="none" stroke="currentColor" stroke-width=".9"/>${T(13, 14.8, "B", 4.2)}<circle cx="87" cy="13" r="3.2" fill="none" stroke="currentColor" stroke-width=".9"/>${T(87, 14.8, "B", 4.2)}
      ${T(0, 0, "ENTRÉE", 4.2, {tr: "translate(12 33) rotate(-90)"})}${T(0, 0, "ENTRÉE", 4.2, {tr: "translate(88 33) rotate(90)"})}
      ${T(50, 37, big(o, g), g ? 17 : 10.5, {f: COND, w: 600, max: 62, ls: 0.6, c: g ? "currentColor" : s.red})}
      ${g ? T(50, 44.5, o.small, 4.8, {f: MONO}) : ""}
      <path d="M18 46H82" stroke="currentColor" stroke-width=".8"/>${T(50, 51, "REP. DEM. DU CONGO", 5, {max: 62})}${T(50, 56, "DGM", 4.6)}`;
  }};
  // Ethiopian Immigration, Bole: rounded rectangle, an inner box for the date, a border of ARV numbers, the name in Ge'ez script on top.
  S.Ethiopia = {shape: "stadium", ink: "#55468a", w: 100, h: 64, date: d => `${p2(d.d)} ${MO[d.m]} ${d.y}`, draw(o, g){
    return `<rect x="3" y="3" width="94" height="58" rx="14" fill="none" stroke="currentColor" stroke-width="2"/>
      <rect x="8" y="8" width="84" height="48" rx="10" fill="none" stroke="currentColor" stroke-width=".9"/>
      ${T(50, 6.6, "ARV 226 · ARV 226 · ARV 226 · ARV 226", 2.8, {f: MONO, w: 500, max: 60})}${T(50, 60.2, "ARV 226 · ARV 226 · ARV 226 · ARV 226", 2.8, {f: MONO, w: 500, max: 60})}
      ${T(50, 17, "ኢትዮጵያ", 6.5, {f: `font-family="Noto Sans Ethiopic,Nyala,Abyssinica SIL,sans-serif"`, w: 600})}
      <rect x="15" y="21" width="70" height="${g ? 17 : 15}" fill="none" stroke="currentColor" stroke-width="1.1"/>
      ${T(50, g ? 34 : 32.5, big(o, g), g ? 17 : 10, {f: COND, w: 600, max: 64, ls: 0.8})}
      ${T(50, 45, "ETHIOPIAN IMMIGRATION", 5, {max: 66})}${T(50, 51, g ? o.small : o.port + " · Arrival", 4.6, {max: 60, w: 600})}`;
  }};
  // Georgia (current): rectangle; GE in an oval, the crossing point's name, the five-cross flag, date with the entry arrow, the vehicle, the officer's number.
  S.Georgia = {shape: "rect", ink: "#2f2f33", w: 100, h: 64, date: d => `${p2(d.d)} ${p2(d.m + 1)} ${d.y}  9`, draw(o, g){
    const flag = `<g transform="translate(77 7)"><rect width="16" height="11" fill="none" stroke="currentColor" stroke-width="1"/><path d="M8 0v11M0 5.5h16" stroke="currentColor" stroke-width="1.6"/>${[[4,2.75],[12,2.75],[4,8.25],[12,8.25]].map(([x,y]) => `<path d="M${x-1.3} ${y}h2.6M${x} ${y-1.3}v2.6" stroke="currentColor" stroke-width=".7"/>`).join("")}</g>`;
    return `<rect x="3" y="3" width="94" height="58" fill="none" stroke="currentColor" stroke-width="1.8"/>
      <ellipse cx="15" cy="12.5" rx="7.5" ry="5" fill="none" stroke="currentColor" stroke-width="1"/>${T(15, 14.6, "GE", 5.4)}
      ${T(47, 15.5, o.port, 7.5, {max: 46, w: 500, ls: 1})}${flag}
      ${T(g ? 50 : 44, g ? 37 : 36, big(o, g), g ? 17 : 9, {f: g ? SANS : MONO, w: 600, max: g ? 76 : 66})}
      ${g ? T(50, 46, o.small, 5, {f: MONO}) : arrowIn(86, 33.5, 0.7)}
      ${plane(14, 52, 0.7)}${T(50, 55, "0562", 7, {f: MONO, w: 600})}`;
  }};
  // Immigration India (New Delhi, 2022): double rectangle, code line, side codes, red date, ARRIVED, the port in its own box.
  S.India = {shape: "rect2", ink: "#2b5fae", red: "#c8363b", w: 100, h: 66, date: d => `${p2(d.d)} ${MO[d.m]} ${d.y}`, draw(o, g, s){
    return `<rect x="3" y="3" width="94" height="60" fill="none" stroke="currentColor" stroke-width="2"/><rect x="6.5" y="6.5" width="87" height="53" fill="none" stroke="currentColor" stroke-width=".9"/>
      ${T(50, 15, "IMMIGRATION INDIA", 7, {max: 70})}${T(50, 21.5, "A2-786", 5, {f: MONO})}
      ${T(0, 0, "A2 786", 4, {f: MONO, tr: "translate(12 36) rotate(-90)"})}${T(0, 0, "657 A2", 4, {f: MONO, tr: "translate(88 36) rotate(90)"})}
      ${T(50, 35, big(o, g), g ? 17 : 10.5, {f: COND, w: 600, max: 64, ls: 0.8, c: g ? "currentColor" : s.red})}
      ${T(50, 43.5, g ? o.small : "ARRIVED", 5, {f: g ? MONO : SANS})}
      <rect x="22" y="47" width="56" height="10" fill="none" stroke="currentColor" stroke-width=".9"/>${T(50, 54.5, o.port, 6, {max: 50})}`;
  }};
  // Imigrasi Indonesia: the triangle, lines of text narrowing to the top, the date across the middle.
  S.Indonesia = {shape: "tri", ink: "#4a3d8c", w: 100, h: 80, date: d => `${p2(d.d)} ${MO[d.m]} ${d.y}`, draw(o, g){
    return `<path d="M50 3L97 77H3Z" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/><path d="M50 12L88 72H12Z" fill="none" stroke="currentColor" stroke-width=".8" stroke-linejoin="round"/>
      ${T(50, 31, "A18", 4.8, {f: MONO})}${T(50, 38.5, o.port, 5.2, {max: 30})}
      ${T(50, 52, big(o, g), g ? 16 : 8.5, {f: COND, w: 600, max: g ? 58 : 50, ls: 0.5})}
      ${T(50, 61, g ? o.small : "IMIGRASI", 4.8, {f: g ? MONO : SANS})}${T(50, 68, "INDONESIA", 4.8, {ls: 1})}`;
  }};
  // Jamaica: purple oval, IMMIGRATION OFFICER round the top, Landed, the date in red, JAMAICA and EMPLOYMENT NOT PERMITTED below.
  S.Jamaica = {shape: "oval", ink: "#5f4489", red: "#c3373f", w: 100, h: 70, date: d => `${MO[d.m]} ${p2(d.d)} ${d.y}`, draw(o, g, s){
    return `<ellipse cx="50" cy="35" rx="47" ry="32" fill="none" stroke="currentColor" stroke-width="2"/>
      ${arc(o.id + "j", 50, 35, 41, 26, true, "0336 IMMIGRATION OFFICER", 5.4)}
      ${T(30, 25, "Landed", 4.6, {w: 600, f: SERIF})}
      ${T(50, 39, big(o, g), g ? 17 : 11, {f: COND, w: 600, max: 66, ls: 0.6, c: g ? "currentColor" : s.red})}
      ${T(50, 49, g ? o.small : o.port, 6, {max: 52, f: g ? MONO : SANS})}
      ${arc(o.id + "k", 50, 35, 41, 26, false, "EMPLOYMENT NOT PERMITTED", 4.3)}`;
  }};
  // Sûreté Générale, Lebanon: red rectangle; S.G. DU LIBAN, the cedar and the Arabic name across the top; the date; Arrivée, the port and a number.
  S.Lebanon = {shape: "rect", ink: "#c0353a", w: 100, h: 62, date: d => `${p2(d.d)} ${MO_FR[d.m]} ${d.y}`, draw(o, g){
    const cedar = `<path d="M50 6.5l-3.5 4.5h2l-3.5 4h2.5l-3.5 4h12l-3.5-4h2.5l-3.5-4h2zM49.3 19.5h1.4v2.5h-1.4z" fill="currentColor"/>`;
    return `<rect x="3" y="3" width="94" height="56" fill="none" stroke="currentColor" stroke-width="2"/><path d="M3 24H97" stroke="currentColor" stroke-width="1.2"/>
      ${T(24, 17, "S.G. DU LIBAN", 6, {max: 36, f: COND})}${cedar}${T(76, 17, "الأمن العام اللبناني", 6, {max: 36, f: `font-family="Noto Naskh Arabic,Geeza Pro,Arial,sans-serif"`})}
      ${T(50, 40, big(o, g), g ? 17 : 11.5, {f: COND, w: 600, max: 82, ls: 0.8})}
      ${g ? T(50, 53, o.small, 5, {f: MONO}) : `${T(8, 52, "Arrivée", 5.4, {a: "start", f: SERIF, w: 600})}${T(8, 57.5, o.port, 5.2, {a: "start", f: COND, max: 40})}${T(80, 56, "7982", 10, {f: COND, w: 600})}`}`;
  }};
  // South Africa: a circle; the airport round the top, ENTRY, the date written year-month-day, a number, REPUBLIC OF SOUTH AFRICA round the bottom, a plane at the side.
  S["South Africa"] = {shape: "circle", ink: "#353535", w: 100, h: 100, date: d => `${d.y}-${p2(d.m + 1)}-${p2(d.d)}`, draw(o, g){
    return `<circle cx="50" cy="50" r="46" fill="none" stroke="currentColor" stroke-width="2"/>
      ${arc(o.id + "s", 50, 50, 39, 39, true, o.whole ? "PASSPORT CONTROL" : o.port + " INTERNATIONAL", 6.2)}
      ${o.whole ? "" : T(50, 33, "AIRPORT", 5.4)}${T(50, 40, "ENTRY", 6)}
      ${T(50, 57, big(o, g), g ? 18 : 11.5, {f: COND, w: 500, max: 64, ls: 1})}
      ${T(50, 69, g ? o.small : "532", g ? 6 : 9, {f: g ? MONO : COND, w: 600})}
      ${plane(86, 50, 0.6)}${arc(o.id + "t", 50, 50, 39, 39, false, "REPUBLIC OF SOUTH AFRICA", 5.6)}`;
  }};
  // Türkiye Cumhuriyeti: rectangle; TR in a ring of stars, the crossing point, date with time code, the code column on the right, entry arrow and vehicle boxes.
  S["Türkiye"] = {shape: "rect", ink: "#2c2c2e", w: 100, h: 64, date: d => `${p2(d.d)}.${p2(d.m + 1)}.${d.yy}  01`, draw(o, g){
    let ring = ""; for(let i = 0; i < 12; i++){ const a = i * Math.PI / 6; ring += `<circle cx="${(15 + 7.2*Math.cos(a)).toFixed(2)}" cy="${(19 + 7.2*Math.sin(a)).toFixed(2)}" r=".7" fill="currentColor"/>`; }
    return `<rect x="3" y="3" width="94" height="58" rx="3" fill="none" stroke="currentColor" stroke-width="1.8"/>
      ${T(46, 9.8, "TÜRKİYE CUMHURİYETİ", 4.6, {max: 56})}${ring}<ellipse cx="15" cy="19" rx="5.2" ry="4.4" fill="none" stroke="currentColor" stroke-width=".9"/>${T(15, 21, "TR", 5)}
      ${T(50, 21, o.port, 8, {max: 46, w: 600})}
      <path d="M86 6V58" stroke="currentColor" stroke-width=".8"/>${["D","2","1","9"].map((c, i) => T(91.5, 16 + i*7, c, 5.5, {f: MONO, w: 600})).join("")}
      ${T(45, 37, big(o, g), g ? 17 : 10, {f: g ? SANS : MONO, w: 600, max: 72, ls: 0.5})}
      ${g ? T(45, 47, o.small, 5, {f: MONO}) : ""}
      ${arrowIn(14, 50, 0.85)}${T(45, 54, "34.3.03", 6.5, {f: MONO, w: 600})}
      <rect x="63" y="45" width="19" height="11" rx="1.5" fill="none" stroke="currentColor" stroke-width=".9"/>${plane(72.5, 50.5, 0.7)}`;
  }};
  // UK Immigration Officer: rounded double frame, the officer's number between stars, the date, the port with its terminal.
  S["United Kingdom"] = {shape: "rrect2", ink: "#2a2a2e", w: 100, h: 68, date: d => `${d.d < 10 ? "- " + d.d : d.d} ${MO[d.m]} ${d.y}`, draw(o, g){
    return `<rect x="3" y="3" width="94" height="62" rx="11" fill="none" stroke="currentColor" stroke-width="2.6"/><rect x="8" y="8" width="84" height="52" rx="7" fill="none" stroke="currentColor" stroke-width="1"/>
      ${T(50, 19, "IMMIGRATION OFFICER", 6.4, {max: 70})}
      ${star(30, 25.5, 2.2)}${T(50, 27.5, "(3631)", 6, {f: MONO, w: 600})}${star(70, 25.5, 2.2)}
      ${T(50, 42, big(o, g), g ? 17 : 11.5, {w: 700, max: 72})}
      ${T(50, 54, g ? o.small : o.port, 6.2, {max: 64, f: g ? MONO : SANS})}`;
  }};
  // US Customs and Border Protection: an arch with the department round it and stars at its feet; ADMITTED, the port code, the date in red, Class and Until lines.
  S["United States"] = {shape: "arch", ink: "#2b3450", red: "#c4363c", w: 100, h: 80, date: d => `${MO[d.m]} ${p2(d.d)} ${d.y}`, draw(o, g, s){
    return `<path d="M5 77V47A45 43 0 0 1 95 47V77" fill="none" stroke="currentColor" stroke-width="2"/>
      ${arc(o.id + "u", 50, 47, 38.5, 36.5, true, "DEPARTMENT OF HOMELAND SECURITY · U.S. CUSTOMS AND BORDER PROTECTION", 2.9, {w: 600, ls: 0})}
      ${star(5, 77, 2.4)}${star(95, 77, 2.4)}
      ${T(50, 31, "ADMITTED", 7.5, {ls: 0.6})}${T(50, 38, o.code, 5.5, {f: MONO, w: 600})}
      ${T(50, 51, big(o, g), g ? 17 : 11, {w: 700, max: 62, c: g ? "currentColor" : s.red})}
      ${g ? T(50, 60, o.small, 5, {f: MONO}) : `${T(20, 61, "Class", 4.6, {a: "start", w: 600})}<path d="M32 61H76" stroke="currentColor" stroke-width=".7"/>${T(20, 68, "Until", 4.6, {a: "start", w: 600})}<path d="M32 68H76" stroke="currentColor" stroke-width=".7"/>`}
      ${T(0, 0, "3781", 4.4, {f: MONO, tr: "translate(86 62) rotate(90)"})}`;
  }};
  // Schengen entry stamp: square corners, the country's letter in a ring of stars, the vehicle top right, the date in red, the port and its code, the entry arrow.
  const schengen = (letter) => ({shape: "rect", ink: "#2e2e30", red: "#c0393c", w: 100, h: 64, date: d => `${p2(d.d)}.${p2(d.m + 1)}.${d.yy}  45`, draw(o, g, s){
    let ring = ""; for(let i = 0; i < 12; i++){ const a = i * Math.PI / 6; ring += `<circle cx="${(15 + 7*Math.cos(a)).toFixed(2)}" cy="${(14 + 7*Math.sin(a)).toFixed(2)}" r=".75" fill="currentColor"/>`; }
    return `<rect x="3" y="3" width="94" height="58" fill="none" stroke="currentColor" stroke-width="1.8"/>
      ${ring}${T(15, 16.5, letter, letter.length > 1 ? 5 : 7)}
      <rect x="66" y="6" width="27" height="14" rx="2" fill="none" stroke="currentColor" stroke-width="1"/>${plane(79.5, 13, 0.85)}
      ${T(50, 36, big(o, g), g ? 17 : 11, {f: g ? SANS : MONO, w: 600, max: 80, ls: 0.5, c: g ? "currentColor" : s.red})}
      ${g ? T(55, 52, o.small, 5, {f: MONO}) : `${T(58, 49, o.port, 6.4, {max: 56, w: 600, ls: 0.8})}${T(58, 56, "B 237", 5, {f: MONO, w: 600})}`}
      ${arrowIn(14, 51, 0.8)}`;
  }});
  const SCH = {"Austria":"A","Belgium":"B","Bulgaria":"BG","Croatia":"HR","Czechia":"CZ","Czech Republic":"CZ","Denmark":"DK","Estonia":"EST","Finland":"FIN","France":"F","Germany":"D","Greece":"GR","Hungary":"H","Iceland":"IS","Italy":"I","Latvia":"LV","Liechtenstein":"FL","Lithuania":"LT","Luxembourg":"L","Malta":"M","Netherlands":"NL","Norway":"N","Poland":"PL","Portugal":"P","Romania":"RO","Slovakia":"SK","Slovenia":"SLO","Spain":"E","Sweden":"S","Switzerland":"CH"};
  for(const [c, l] of Object.entries(SCH)) S[c] = schengen(l);
  // other spellings of the same countries
  S.Turkey = S["Türkiye"]; S["Democratic Republic of the Congo"] = S["Dem. Rep. Congo"] = S["DR Congo"];
  S.UK = S["United Kingdom"]; S["United States of America"] = S.USA = S["United States"];

  // the town an airport stamp names for a few cities, from the stamps themselves
  const PORT = {"London": "HEATHROW (3)", "Johannesburg": "OR TAMBO", "Beirut": "R.H.I.A", "Havana": "JOSÉ MARTÍ", "Bamako": "Bamako-Sénou", "Lagos": "LAGOS-MMIA", "Mumbai": "CSMI AIRPORT, MUMBAI", "Addis Ababa": "BOLE", "Kinshasa": "N'DJILI", "Jakarta": "SOEKARNO-HATTA", "Lisbon": "LISBOA", "Naples": "NAPOLI"};
  const CODE = {"New Orleans": "NOL", "Bogotá": "BOG", "Medellín": "MDE"};

  const API = window.WORSTAMP = {
    has: c => !!S[c],
    /* the small pin for a town on the globe, in its country's stamp shape: 30x30, classes halo / o / i like the generic pin */
    pin(c, code){
      const s = S[c]; if(!s) return null;
      const t = `<text x="15" y="${s.shape === "tri" ? 22.4 : s.shape === "arch" ? 19.6 : 18.3}" text-anchor="middle">${X(code)}</text>`;
      const R = (x, y, w, h, r, cls, extra = "") => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" class="${cls}"${extra}/>`;
      const E = (rx, ry, cls) => `<ellipse cx="15" cy="15" rx="${rx}" ry="${ry}" class="${cls}"/>`;
      const P = (d, cls) => `<path d="${d}" class="${cls}"/>`;
      const sh = {
        oval: E(14.8, 11, "halo") + E(13.4, 9.6, "o") + E(10.6, 7, "i"),
        circle: `<circle cx="15" cy="15" r="14.7" class="halo"/><circle cx="15" cy="15" r="13" class="o"/><circle cx="15" cy="15" r="9.6" class="i"/>`,
        rect: R(0.3, 5.3, 29.4, 19.4, 0.5, "halo") + R(1.5, 6.5, 27, 17, 0, "o") + R(4, 9, 22, 12, 0, "i"),
        rect2: R(0.3, 5.3, 29.4, 19.4, 0.5, "halo") + R(1.5, 6.5, 27, 17, 0, "o") + R(3.6, 8.6, 22.8, 12.8, 0, "i", ' style="stroke-dasharray:none"'),
        rrect: R(0.3, 5.3, 29.4, 19.4, 4.5, "halo") + R(1.5, 6.5, 27, 17, 3.6, "o") + R(4, 9, 22, 12, 2, "i"),
        rrect2: R(0.3, 4.8, 29.4, 20.4, 6, "halo") + R(1.5, 6, 27, 18, 5, "o") + R(4, 8.6, 22, 12.8, 3, "i", ' style="stroke-dasharray:none"'),
        stadium: R(0.3, 5.3, 29.4, 19.4, 9.7, "halo") + R(1.5, 6.5, 27, 17, 8.5, "o") + R(5, 10, 20, 10, 1, "i", ' style="stroke-dasharray:none"'),
        banner: R(0.3, 5.3, 29.4, 19.4, 3, "halo") + R(1.5, 6.5, 27, 17, 2, "o", ' style="stroke-dasharray:1.4 1.1"') + R(7, 8.2, 16, 3.2, 1.6, "i", ' style="stroke-dasharray:none"'),
        tri: P("M15 0.6L29.6 27.4H0.4Z", "halo") + P("M15 2.6L27.8 26.2H2.2Z", "o") + P("M15 7.4L23.6 23.4H6.4Z", "i"),
        arch: P("M0.6 28.8V14.8A14.4 14.2 0 0 1 29.4 14.8V28.8Z", "halo") + P("M2 27.6V15A13 12.6 0 0 1 28 15V27.6", "o") + P("M5 25V15.4A10 9.6 0 0 1 25 15.4V25", "i"),
      }[s.shape] || "";
      return {ink: s.ink, svg: sh + t};
    },
    ink: c => S[c] && S[c].ink,
    /* country, {id, city, code, whole, added(YYYY-MM-DD), name (globe big line), small (globe line)}, globe? */
    draw(country, p, globe){
      const s = S[country]; if(!s) return null;
      const d = D(new Date((p.added || "2026-01-01") + "T12:00:00Z"));
      const plainUp = t => country === "Türkiye" || country === "Turkey" ? String(t).toLocaleUpperCase("tr") : String(t).toUpperCase();
      const port = p.whole ? plainUp(p.city) : (PORT[p.city] || plainUp(p.city));
      const o = {id: p.id, whole: !!p.whole, port, code: CODE[p.city] || p.code || "", dateText: s.date(d), name: plainUp(p.name || p.city), small: p.small || ""};
      return {w: s.w, h: s.h, ink: s.ink, body: `<g color="${s.ink}">${s.draw(o, !!globe, s)}</g>`};
    }
  };

  /* Pages rendered on the server tag their stamps with the country; redraw the ones we know */
  function swap(){
    document.querySelectorAll("svg.stamp[data-country]").forEach(el => {
      const c = el.dataset.country, id = "p" + Math.random().toString(36).slice(2, 8);
      const r = API.draw(c, {id, city: el.dataset.city, code: el.dataset.code, whole: !!el.dataset.whole, added: el.dataset.added});
      if(!r) return;
      let h = 0; for(const ch of el.dataset.id || id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
      const rot = ((h % 1000) / 1000 * 18 - 9) * (el.dataset.whole ? 0.5 : 1);
      el.innerHTML = `<rect width="100" height="100" rx="9" fill="#efe7d5"/><g transform="rotate(${rot.toFixed(1)} 50 50) translate(${(100 - r.w*0.92)/2} ${(100 - r.h*0.92)/2}) scale(.92)" filter="url(#rp-ink)" opacity=".9">${r.body}</g>`;
    });
  }
  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", swap); else swap();
})();
