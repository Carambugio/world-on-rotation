const TX = Object.assign({traditions:"Traditions and instruments",eras:"Key eras and labels",diaspora:"Diaspora",now:"The scene now",dig:"Where to dig",festivals:"Festivals",records:"Start here",born:"Born here",adopted:"Made it home",listen:"Hear it live",buy:"Find the records",radio:"Tune in",sound_of:"The sound of",intro_button:"Open the globe"}, (window.WOR && WOR.t) || {});
const CITY_INFO = WOR.places;
const LINKS = WOR.links;
const COUNTRY_INFO = WOR.countries;
const IMGV = "?v=" + (WOR.v || "");
/* ---------- Helpers ---------- */
const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
/* Guide text may carry <strong> and <em> (artist names, titles, foreign terms); everything else stays escaped. */
const rich = s => esc(s).replace(/&lt;(\/?)(strong|em)&gt;/g, "<$1$2>");
const fmt = s => { s=Math.max(0,Math.floor(s)); const h=Math.floor(s/3600),m=Math.floor(s%3600/60),x=s%60; return (h?h+":"+String(m).padStart(2,"0"):m)+":"+String(x).padStart(2,"0"); };
const durLabel = s => { const h=Math.floor(s/3600),m=Math.round(s%3600/60); return (h?h+"h ":"")+String(m).padStart(2,"0")+"m"; };
const coord = (lat,lon) => `${Math.abs(lat).toFixed(2)}°${lat>=0?"N":"S"} ${Math.abs(lon).toFixed(2)}°${lon>=0?"E":"W"}`;
const localTime = tz => { if(!tz) return ""; try { return new Intl.DateTimeFormat("en-GB",{hour:"2-digit",minute:"2-digit",timeZone:tz}).format(new Date()); } catch(e){ return ""; } };
const dateLabel = d => new Date(d+"T12:00:00Z").toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"});
const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
function hash(str){let h=2166136261;for(const c of str){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0}
function rng(seed){return()=>{seed=Math.imul(seed^seed>>>15,1|seed);seed^=seed+Math.imul(seed^seed>>>7,61|seed);return((seed^seed>>>14)>>>0)/4294967296}}
const TAU = Math.PI*2;
const wrap = a => ((a % TAU) + TAU + Math.PI) % TAU - Math.PI;
const plain = s => s.normalize("NFD").replace(/[̀-ͯ]/g,"");
const code3 = s => plain(s).replace(/[^A-Za-z]/g,"").slice(0,3).toUpperCase();

/* ---------- Sample data ---------- */
const BASE_COMPILERS = WOR.selectors;
const SMALL = WOR.playlists;

let PLAYLISTS = SMALL, COMPILERS = {...BASE_COMPILERS};
const DEMO_FEED = "/RhythmPassport/mixes-rhythm-passport-vol1-dj-ni-mo/";
const REAL_FEEDS = {"london-rpp-nov": "/RTM_FM/rhythm-passport-presents-marco-canepari-250323/"};
PLAYLISTS.forEach(p => { p.mixcloud = p.mixcloud || REAL_FEEDS[p.id] || ""; });
let current = null;
PLAYLISTS.forEach(p => { if(!p.code) p.code = code3(p.city); });

/* ---------- Countries ---------- */
const NAME_FIX = {"United States of America":"United States","Dem. Rep. Congo":"DR Congo","Bosnia and Herz.":"Bosnia & Herz.","S. Sudan":"South Sudan","Turkey":"Türkiye","Czech Rep.":"Czechia","Eq. Guinea":"Equatorial Guinea","W. Sahara":"Western Sahara","Solomon Is.":"Solomon Islands","Falkland Is.":"Falkland Islands","eSwatini":"Eswatini","Macedonia":"North Macedonia","Central African Rep.":"Central African Rep."};
const nice = n => NAME_FIX[n] || n;
const feat = g => ({type:"Feature", geometry:g});
const LANDS_LO = LO.map(f => ({n:f.n, c:f.c, f:feat(f.g)}));
const LANDS_HI = HI.map(f => ({n:f.n, c:f.c, f:feat(f.g)}));
const HI_BY_NAME = new Map(LANDS_HI.map((l,i)=>[l.n,i]));
const COUNTRY = LO.map((f,i) => {
  const polys = f.g.type === "Polygon" ? [f.g.coordinates] : f.g.coordinates;
  let best = null, ba = -1;
  for(const pc of polys){ const g = {type:"Polygon", coordinates:pc}; const a = d3.geoArea(g); if(a > ba && a < 6){ ba = a; best = g; } }
  const name = nice(f.n);
  return {i, name, raw:f.n, feat:LANDS_LO[i].f, area:d3.geoArea(LANDS_LO[i].f), main:ba, centroid: best ? d3.geoCentroid(best) : [0,0], code:code3(name)};
});
const countryByName = new Map(COUNTRY.map(c=>[c.name,c]));

const CITIES = d3.groups(PLAYLISTS, p=>p.city).map(([city, items]) => {
  const c = {city, items, lat:items[0].lat, lon:items[0].lon, country:items[0].country, tz:items[0].tz, code:items[0].code, whole:!!items[0].whole};
  c.ci = countryByName.get(c.country) || COUNTRY.find(k => d3.geoContains(k.feat, [c.lon, c.lat])) || null;
  return c;
});
COUNTRY.forEach(k => { [k.lon, k.lat] = k.centroid; });
{ // one sentence that explains the site, numbers included
  const nm = PLAYLISTS.length, ns = new Set(PLAYLISTS.map(p=>p.by)).size, np = CITIES.length;
  $("#stats").textContent = `${nm} ${nm === 1 ? "mix or playlist" : "mixes and playlists"} by ${ns} ${ns === 1 ? "selector" : "selectors"}, pinned to the ${np === 1 ? "place its" : np + " places their"} music comes from.`;
}

/* ---------- Globe: satellite imagery in WebGL ---------- */
const app = $("#app");
let W = 0, H = 0, dpr = 1, T = null, dirty = false, lastInteract = 0;
let activeCity = null, activeCountry = null, cueTarget = null;
const player = { id:null, pos:0, playing:false };
const byId = id => PLAYLISTS.find(p=>p.id===id);
const cityOf = id => { const p = byId(id); return p && CITIES.find(c=>c.city===p.city); };
const isOpen = () => !$("#panel").hidden;
function tok(n){ return getComputedStyle(document.documentElement).getPropertyValue(n).trim(); }
function readTokens(){ T = {}; }
function layout(){ const r = app.getBoundingClientRect(); W = r.width; H = r.height; dpr = Math.min(2, window.devicePixelRatio || 1); }
function render(){}
function hideHintSoon(){ const h = $("#hint"); if(h) h.hidden = true; }

const BORDERS = [];
for(const f of LO){ const polys = f.g.type === "Polygon" ? [f.g.coordinates] : f.g.coordinates; for(const p of polys) for(const ring of p) BORDERS.push(ring); }
/* Every country and territory gets a name; smaller ones appear as you zoom in */
const COUNTRY_LABELS = LABEL_PTS.map(p => {
  const name = nice(p.n), c = COUNTRY.find(k => k.raw === p.n) || {name, raw:p.n, lat:p.lat, lon:p.lon, main:p.a, code:code3(name), feat:null};
  // a mix for the whole country: the country name itself becomes the stamp
  const whole = CITIES.find(x => x.whole && x.ci && x.ci.raw === p.n) || null;
  return {kind:"country", c, whole, lat:p.lat, lng:p.lon, a:p.a, text:name.toUpperCase()};
}).sort((x, y) => y.a - x.a);
const CITY_LABELS = CITIES.filter(c => !c.whole).map(c => ({kind:"city", c, lat:c.lat, lng:c.lon, text:c.city}));
/* The biggest stamp-shaped box (in degrees) around the label point that stays inside the country */
function fitBox(d){
  const f = d.c && d.c.feat; if(!f) return {hw: 0.6};
  const cl = Math.max(0.2, Math.cos(d.lat * Math.PI / 180)), inside = hw => {
    const hh = hw * cl * (d.aspect || 0.56);
    for(let i = 0; i <= 6; i++){ const t = -1 + i / 3;
      if(!d3.geoContains(f, [d.lng + t*hw, d.lat + hh]) || !d3.geoContains(f, [d.lng + t*hw, d.lat - hh]) ||
         !d3.geoContains(f, [d.lng + hw, d.lat + t*hh]) || !d3.geoContains(f, [d.lng - hw, d.lat + t*hh])) return false; }
    return true;
  };
  let lo = 0, hi = 25; for(let i = 0; i < 14; i++){ const m = (lo + hi) / 2; if(inside(m)) lo = m; else hi = m; }
  return {hw: Math.max(lo, 0.3)};
}
function hasStamp(city){ try { return !!MYPASS[city]; } catch(e){ return false; } }
/* A town's pin: its country's stamp shape and ink when we have them, the round stamp otherwise */
function pinOf(c){
  const real = window.WORSTAMP && WORSTAMP.pin(c.country, c.code);
  return real || {ink: inkFor(c.city), svg: `<circle cx="15" cy="15" r="14.7" class="halo"/><circle cx="15" cy="15" r="13" class="o"/><circle cx="15" cy="15" r="9.6" class="i"/><text x="15" y="18.3" text-anchor="middle">${esc(c.code)}</text>`};
}
function labelEl(d){
  if(d.el) return d.el;
  const el = document.createElement("div"), s = document.createElement("span");
  el.className = "glabel " + d.kind; s.textContent = d.kind === "city" ? d.text : d.text.toLowerCase();
  if(d.kind === "city"){
    const rot = (((d.c.lat * 7 + d.c.lon * 3) % 16 + 16) % 16 - 8).toFixed(0);
    // the pin takes the shape and ink of its country's real entry stamp, when we have it
    const pin = pinOf(d.c);
    s.insertAdjacentHTML("afterbegin", `<svg class="pm" viewBox="0 0 30 30" style="transform:rotate(${rot}deg)">${pin.svg}</svg>`);
    const ink = pin.ink; s.style.setProperty("--ink", ink); s.style.setProperty("--ink-tint", ink + "2e");
    if(hasStamp(d.c.city)) el.classList.add("got");
    s.insertAdjacentHTML("beforeend", '<b class="cnt"></b>');
  }
  if(d.kind === "country") s.style.fontSize = (Math.max(9, Math.min(12, 8.5 + Math.sqrt(d.a)*16))).toFixed(1) + "px";
  if(d.kind === "country" && d.whole){
    el.classList.add("whole"); const ink = inkFor(d.whole.city); s.style.setProperty("--ink", ink);
    d.rot = (((d.lat * 7 + d.lng * 3) % 8 + 8) % 8 - 4).toFixed(0); s.style.transform = `translate(-50%,-50%) rotate(${d.rot}deg)`;
    const n = d.whole.items.length;
    // the stamp is sized to fit inside its own country (see tidyLabels); when the country is too small on screen, the plain name shows instead
    const label = `${esc(d.whole.city)}, ${n} mix${n > 1 ? "es" : ""}`, small = `${n} MIX${n > 1 ? "ES" : ""}`;
    const real = window.WORSTAMP && WORSTAMP.draw(d.whole.country, {id: "gl" + hash(d.whole.city), city: d.whole.city, code: d.whole.code, whole: true, name: d.whole.city, small}, true);
    if(real){
      // the country's own entry stamp, after the real ones: shape, ink, lettering
      el.classList.add("real"); d.nat = 56; d.aspect = real.h / real.w;
      s.innerHTML = `<svg viewBox="0 0 ${real.w} ${real.h}" width="56" height="${(56 * real.h / real.w).toFixed(1)}" aria-label="${label}">${real.body}</svg><em>${esc(d.text)}</em>`;
      // a paper card in the stamp's own outline, so the ink reads on any map
      const sv = s.querySelector("svg"), outer = sv.querySelector("g > :first-child");
      if(outer){ const u = outer.cloneNode(); u.setAttribute("class", "paper"); u.removeAttribute("stroke-dasharray"); sv.insertBefore(u, sv.firstChild); }
    } else {
      d.nat = 50; d.aspect = 0.56;
      const nm = esc(plain(d.whole.city).toUpperCase()), fit = nm.length > 6 ? ` textLength="72" lengthAdjust="spacingAndGlyphs"` : "";
      s.innerHTML = `<svg viewBox="0 0 100 56" width="50" height="28" aria-label="${label}">
      <path class="paper" d="M8 2H92L98 8V48L92 54H8L2 48V8Z"/>
      <g fill="none" stroke="${ink}"><path d="M8 2H92L98 8V48L92 54H8L2 48V8Z" stroke-width="3.4"/><path d="M10 7H90L93 10V46L90 49H10L7 46V10Z" stroke-width="1"/></g>
      <text x="50" y="31" text-anchor="middle" font-family="Barlow Condensed,Arial Narrow,sans-serif" font-weight="700" font-size="20" letter-spacing="1"${fit} fill="${ink}">${nm}</text>
      <text x="50" y="45" text-anchor="middle" font-family="IBM Plex Mono,ui-monospace,monospace" font-weight="600" font-size="12" letter-spacing=".2" fill="${ink}">${small}</text></svg><em>${esc(d.text)}</em>`;
    }
    if(hasStamp(d.whole.city)) el.classList.add("got");
  }
  let down = null;
  s.addEventListener("pointerdown", e => { down = [e.clientX, e.clientY]; });
  s.addEventListener("click", e => { e.stopPropagation(); labelClickAt = performance.now();
    if(down && Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 8) return; // a drag that started on a label spins the globe
    if(d.kind === "city" && d.members && d.members.length > 1){   // a group of places: zoom in until they separate
      const ms = d.members, lat = d3.mean(ms, m => m.c.lat), lng = d3.mean(ms, m => m.c.lon);
      world.pointOfView({ lat, lng, altitude: Math.max(0.12, world.pointOfView().altitude * 0.45) }, 900); return;
    }
    d.kind === "city" ? openCity(d.c.city) : d.whole ? openCity(d.whole.city) : openCountry(d.c); });
  for(const t of ["pointerup", "mouseup"]) s.addEventListener(t, e => { labelClickAt = performance.now(); });
  el.appendChild(s); d.el = el; return el;
}
const PIN = "#ffc76e", PIN_ON = "#fff4dc";
/* Land is drawn as shapes, so coasts and borders stay sharp at any zoom; the paper and relief come from a texture looked up by position. */
let HLRAW = null, LAND50 = null;
const world = Globe({animateIn:false})(document.getElementById("globeViz"))
  .globeImageUrl(WOR.img + "earth-passport.jpg" + IMGV).backgroundColor("rgba(0,0,0,0)")
  .showAtmosphere(true).atmosphereColor("#e8d6ad").atmosphereAltitude(0.11)
  .pathsData([]).pathPoints(d => d).pathPointLat(p => p[1]).pathPointLng(p => p[0]).pathPointAlt(p => p[2] === undefined ? 0.002 : p[2])
  .pathColor(d => d.color || "rgba(40,46,62,0.85)").pathStroke(d => d.stroke === undefined ? null : d.stroke).pathDashLength(d => d.dash || 1).pathDashGap(d => d.gap || 0).pathDashAnimateTime(0).pathTransitionDuration(0)
  .polygonsData([]).polygonCapColor(d => d.n === HLRAW ? "rgba(235,140,40,0.36)" : "rgba(240,170,80,0.24)").polygonSideColor(() => null)
  .polygonStrokeColor(d => d.n === HLRAW ? "rgba(163,48,43,0.95)" : null).polygonAltitude(0.006).polygonCapCurvatureResolution(4).polygonsTransitionDuration(0)
  .pointsData([]).pointLat("lat").pointLng("lon").pointAltitude(0.003).pointsMerge(false).pointsTransitionDuration(0)
  .pointRadius(d => 0.2 + 0.09*Math.sqrt(d.items.length)).pointColor(d => d === activeCity ? PIN_ON : PIN)
  .onPointHover(d => { document.body.style.cursor = d ? "pointer" : ""; })
  .arcsData([]).arcColor(() => ["rgba(163,48,43,0.25)", "rgba(163,48,43,0.95)"]).arcStroke(0.55).arcAltitudeAutoScale(0.42).arcAltitude(d => d.alt)
  .arcDashLength(0.012).arcDashGap(0.012).arcDashInitialGap(0).arcDashAnimateTime(0).arcsTransitionDuration(0)
  .htmlElementsData([]).htmlLat("lat").htmlLng("lng").htmlAltitude(0.006).htmlTransitionDuration(0)
  .htmlElement(labelEl).htmlElementVisibilityModifier((el, vis) => { el.style.opacity = vis ? 1 : 0; el.style.pointerEvents = vis ? "" : "none"; const s = el.firstChild; if(s) s.style.pointerEvents = vis ? "auto" : "none"; })
;
let labelClickAt = 0;
function countryAt(lat, lng){ if(performance.now() - labelClickAt < 500) return; const k = COUNTRY.find(c => d3.geoContains(c.feat, [lng, lat])); if(k) openCountry(k); else closeOnEmpty(); }
/* A tap on the sea, or on the space around the globe, closes an open country or place */
function closeOnEmpty(){ if(isOpen() && (activeCountry || activeCity)) closePanel(); }
/* Our own click detection: the globe library drops a click if the mouse moves even one pixel while pressed,
   so taps often needed two or three goes. Here a click is anything that moves less than 8px. */
(function globeTaps(){
  const box = document.getElementById("globeViz"); let down = null;
  box.addEventListener("pointerdown", e => { if(e.button !== 0 || e.target.tagName !== "CANVAS"){ down = null; return; } down = {x:e.clientX, y:e.clientY, t:performance.now()}; });
  box.addEventListener("pointerup", e => {
    if(!down || e.button !== 0) return;
    const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y), held = performance.now() - down.t; down = null;
    if(moved > 8 || held > 1500 || performance.now() - labelClickAt < 500) return;
    const r = box.querySelector("canvas").getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
    // a city pin within reach wins
    const pov = world.pointOfView(), centre = [pov.lng, pov.lat]; let best = null, bd = 16;
    for(const c of CITIES){ if(d3.geoDistance([c.lon, c.lat], centre) > Math.PI/2) continue; const sp = world.getScreenCoords(c.lat, c.lon, 0.003); const dd = Math.hypot(sp.x - x, sp.y - y); if(dd < bd){ bd = dd; best = c; } }
    if(best){ openCity(best.city); return; }
    const g = world.toGlobeCoords(x, y); if(g) countryAt(g.lat, g.lng); else closeOnEmpty();
  });
})();

/* ---------- Natural Earth: soft city glows, drifting clouds, sunlit seas ---------- */
function ringCol(){ return d => t => `rgba(255,${d === activeCity ? 236 : 199},${d === activeCity ? 200 : 110},${(1 - t) * 0.55})`; }
world.ringsData([]).ringLat("lat").ringLng("lon").ringAltitude(0.0028)
  .ringColor(ringCol())
  .ringMaxRadius(d => 1.1 + 0.35*Math.sqrt(d.items.length)).ringPropagationSpeed(0.7).ringRepeatPeriod(d => 2600 + (d.lat * 37 % 900));
(function naturalEarth(){
  let clouds = null, cloudOp = 0.55;
  window.setCloudsFor = alt => { cloudOp = Math.max(0, Math.min(0.62, (alt - 0.55) / 1.1 * 0.62)); if(clouds){ clouds.material.opacity = cloudOp; clouds.visible = cloudOp > 0.02; } };
  const img = src => new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = src; });
  world.onGlobeReady(async () => {
    const mat = world.globeMaterial(); let globe = null;
    world.scene().traverse(o => { if(o.isMesh && o.material === mat) globe = o; });
    try {
      world.lights().forEach(l => { if(l.isAmbientLight) l.intensity *= 1.45; if(l.isDirectionalLight) l.intensity *= 0.55; }); mat.shininess = 0; if(mat.specular) mat.specular.set("#000000");
    } catch(e){}
    if(!globe || !mat.map) return;
    const Tex = mat.map.constructor;
    /* Sharper picture once you zoom in: an 8K Earth on screens that can hold it, and finer borders */
    const caps = world.renderer().capabilities, aniso = caps.getMaxAnisotropy ? caps.getMaxAnisotropy() : 1;
    mat.map.anisotropy = aniso; mat.map.needsUpdate = true;
    const roomy = Math.min(screen.width, screen.height) >= 600 && caps.maxTextureSize >= 8192 && !(navigator.connection && navigator.connection.saveData);
    let hd = false, fine = null, fineOn = false;
    window.wantDetail = alt => {
      if(alt < 1.6 && !hd){
        hd = true; if(window.landHD) landHD();
        if(roomy) img(WOR.img + "earth-passport-hd.jpg" + IMGV).then(i => {
          const t = new Tex(i), old = mat.map; if(old.colorSpace) t.colorSpace = old.colorSpace;
          t.anisotropy = aniso; t.needsUpdate = true; mat.map = t; mat.needsUpdate = true; old.dispose();
        }).catch(() => {});
      }
      if(!fine) return;
    };
    wantDetail(world.pointOfView().altitude);
    if(roomy) wantDetail(1.5);   // computers and tablets get the detailed Earth straight away
    // The land shape is built ahead of time (land-mesh.bin), so the browser only has to draw it.
    Promise.all([img(WOR.img + (WOR.land || "land-paper") + ".jpg" + IMGV), fetch(WOR.img + "land-mesh.bin" + IMGV).then(r => r.arrayBuffer()), fetch(WOR.img + "borders-50m.json" + IMGV).then(r => r.json())]).then(([pi, bin, lines]) => {
      const lt = new Tex(pi); if(mat.map.colorSpace) lt.colorSpace = mat.map.colorSpace; lt.anisotropy = aniso; lt.needsUpdate = true;
      const landMat = new mat.constructor({ color: 0xffffff, shininess: 0 }); if(landMat.specular) landMat.specular.set("#000000");
      const landUni = { value: lt };
      window.landHD = roomy ? () => { window.landHD = null; img(WOR.img + (WOR.land || "land-paper") + "-hd.jpg" + IMGV).then(i => {
        const t = new Tex(i); if(lt.colorSpace) t.colorSpace = lt.colorSpace; t.anisotropy = aniso; t.needsUpdate = true; landUni.value = t; lt.dispose();
      }).catch(() => {}); } : null;
      if(hd && window.landHD) landHD();
      landMat.onBeforeCompile = sh => {
        sh.uniforms.landTex = landUni;
        sh.vertexShader = "varying vec3 vGeo;\n" + sh.vertexShader.replace("#include <begin_vertex>", "#include <begin_vertex>\n  vGeo = position;");
        sh.fragmentShader = "uniform sampler2D landTex;\nvarying vec3 vGeo;\n" + sh.fragmentShader.replace("#include <map_fragment>", `
  vec3 pn = normalize(vGeo);
  vec2 luv = vec2(atan(pn.x, pn.z) / 6.2831853 + 0.5, asin(clamp(pn.y, -1.0, 1.0)) / 3.1415927 + 0.5);
  vec2 luvB = vec2(fract(luv.x + 0.5), luv.y);
  vec2 dx = dFdx(luv), dy = dFdy(luv), dxB = dFdx(luvB), dyB = dFdy(luvB);
  if(abs(dx.x) + abs(dy.x) > abs(dxB.x) + abs(dyB.x)){ dx.x = dxB.x; dy.x = dyB.x; }
  diffuseColor.rgb *= textureGrad(landTex, luv, dx, dy).rgb;`);
      };
      landMat.customProgramCacheKey = () => "wor-land";
      // Borrow three.js classes from globe.gl through a throwaway shape, then build all land as one mesh and all lines as one object.
      world.polygonStrokeColor(() => "#000").polygonsData([{ type: "Feature", n: "", geometry: { type: "Polygon", coordinates: [[[0, 0], [1, 0], [1, 1], [0, 0]]] } }]);
      const probe = () => {
        let cone = null, seg = null;
        world.scene().traverse(o => { if(o.geometry && o.geometry.type === "ConicPolygonGeometry") cone = o; if(o.isLineSegments) seg = o; });
        if(!cone || !seg) return setTimeout(probe, 40);
        const Conic = cone.geometry.constructor, BG = Object.getPrototypeOf(Conic.prototype).constructor;
        const Attr = Object.getPrototypeOf(cone.geometry.getAttribute("position").constructor.prototype).constructor, Mesh = cone.constructor, Seg = seg.constructor, LineMat = seg.material.constructor;
        world.polygonStrokeColor(d => d.n === HLRAW ? "rgba(163,48,43,0.95)" : null).polygonsData([]);
        const cat = (arrs, T) => { const out = new T(arrs.reduce((a, b) => a + b.length, 0)); let o = 0; arrs.forEach(a => { out.set(a, o); o += a.length; }); return out; };
        const merged = (feats, done) => {
        const polys = []; feats.forEach(f => f.geometry.coordinates.forEach(pc => polys.push(pc)));
        const pos = [], nor = [], idx = []; let off = 0, i = 0;
        const step = () => {
          const end = Math.min(polys.length, i + 80);
          for(; i < end; i++){
            let g; try { g = new Conic(polys[i], 0, 100, false, true, false, 4); } catch(e){ continue; }
            const p = g.getAttribute("position").array, n = g.getAttribute("normal").array, ix = g.getIndex(), cnt = p.length / 3;
            const sh = new Uint32Array(ix ? ix.count : cnt);
            for(let k = 0; k < sh.length; k++) sh[k] = (ix ? ix.array[k] : k) + off;
            pos.push(p); nor.push(n); idx.push(sh); off += cnt; g.dispose();
          }
          if(i < polys.length) return setTimeout(step, 0);
          const geo = new BG();
          geo.setAttribute("position", new Attr(cat(pos, Float32Array), 3)); geo.setAttribute("normal", new Attr(cat(nor, Float32Array), 3)); geo.setIndex(new Attr(cat(idx, Uint32Array), 1));
          done(geo);
        };
        step();
        };
        {
          const head = new Uint32Array(bin, 0, 2), nV = head[0], nI = head[1];
          const q = new Int16Array(bin, 8, nV * 3), ind = new Uint32Array(bin, 8 + Math.ceil(nV * 6 / 4) * 4, nI);
          const pos = new Float32Array(nV * 3), nor = new Float32Array(nV * 3);
          for(let k = 0; k < nV * 3; k += 3){ const x = q[k], y = q[k + 1], z = q[k + 2], r = Math.hypot(x, y, z) || 1; nor[k] = x / r; nor[k + 1] = y / r; nor[k + 2] = z / r; pos[k] = nor[k] * 100; pos[k + 1] = nor[k + 1] * 100; pos[k + 2] = nor[k + 2] * 100; }
          const geo = new BG(); geo.setAttribute("position", new Attr(pos, 3)); geo.setAttribute("normal", new Attr(nor, 3)); geo.setIndex(new Attr(ind, 1));
          const land = new Mesh(geo, landMat); land.scale.setScalar(1.003); world.scene().add(land);
          const lp = [], toXYZ = (lng, lat, r) => { const ph = (90 - lat) * Math.PI / 180, th = (90 - lng) * Math.PI / 180; return [r * Math.sin(ph) * Math.cos(th), r * Math.cos(ph), r * Math.sin(ph) * Math.sin(th)]; };
          // Long straight borders get extra points every half degree, so the line follows the curve of the globe instead of cutting under the land.
          const segs = (ls, r) => { const a = []; ls.forEach(l => { for(let k = 0; k < l.length - 1; k++){
            const [x0, y0] = l[k], [x1, y1] = l[k + 1]; if(Math.abs(x1 - x0) > 180) continue;
            const n = Math.max(1, Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) / 0.5));
            let prev = toXYZ(x0, y0, r);
            for(let j = 1; j <= n; j++){ const t = j / n, cur = toXYZ(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, r); a.push(...prev, ...cur); prev = cur; }
          } }); const g = new BG(); g.setAttribute("position", new Attr(new Float32Array(a), 3)); return g; };
          world.scene().add(new Seg(segs(lines, 100.34), new LineMat({ color: 0x28303f, transparent: true, opacity: 0.85 })));
          const overlayMat = (hex, op) => { const m = new mat.constructor({ color: hex, transparent: true, opacity: op, shininess: 0, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }); if(m.specular) m.specular.set("#000000"); return m; };
          // Countries keep their colour; only the open country changes
          window.setVisited = () => {};
          // The open country: lifted to near white, with a dark ink outline
          const hlMat = overlayMat(0xfffdf6, 0.55), hlLine = new LineMat({ color: 0x1d2230 }); let hlObjs = [], hlWant = null;
          window.setHL = raw => {
            hlWant = raw; hlObjs.forEach(o => { world.scene().remove(o); o.geometry.dispose(); }); hlObjs = [];
            if(!raw || !LAND50) return;
            const feats = LAND50.filter(f => f.n === raw); if(!feats.length) return;
            const rings = []; feats.forEach(f => f.geometry.coordinates.forEach(pc => pc.forEach(r => rings.push(r))));
            const line = new Seg(segs(rings, 100.46), hlLine); world.scene().add(line); hlObjs.push(line);
            merged(feats, g => { if(hlWant !== raw){ g.dispose(); return; } const m = new Mesh(g, hlMat); m.scale.setScalar(1.0042); world.scene().add(m); hlObjs.push(m); });
          };
          // Country outlines for the passport wash and the open country load after the globe is drawn
          fetch(WOR.img + "land-50m.json" + IMGV).then(r => r.json()).then(shapes => {
            LAND50 = shapes.map(f => ({ type: "Feature", n: f.n, geometry: f.g }));
            setVisited(); if(HLRAW) setHL(HLRAW);
          }).catch(() => {});
        }
      };
      probe();
    }).catch(e => console.warn(e));
  });
})();
(function guilloche(){
  const gold = a => `rgba(240,180,94,${a})`, f = n => n.toFixed(1);
  let band = "";
  for(let k = 0; k < 12; k++){
    let d = "";
    for(let x = 0; x <= 360; x += 4){
      const y = 5 + k*10 + 4*Math.sin(x/360*TAU*3 + k*0.55) + 2.2*Math.sin(x/360*TAU*7 - k*0.9);
      d += (x ? "L" : "M") + f(x) + " " + f(y);
    }
    band += `<path d='${d}'/>`;
  }
  const bandSvg = `<svg xmlns='http://www.w3.org/2000/svg' width='360' height='120' viewBox='0 0 360 120'><g fill='none' stroke='${gold(0.07)}' stroke-width='0.8'>${band}</g></svg>`;
  let rose = "";
  for(let k = 0; k < 22; k++){
    let d = "";
    for(let i = 0; i <= 360; i++){
      const t = i/360*TAU, rr = 70 + 26*Math.sin(9*t + k*TAU/22) + 10*Math.sin(23*t - k*0.4);
      d += (i ? "L" : "M") + f(140 + rr*Math.cos(t)) + " " + f(140 + rr*Math.sin(t));
    }
    rose += `<path d='${d}'/>`;
  }
  const roseSvg = `<svg xmlns='http://www.w3.org/2000/svg' width='280' height='280' viewBox='0 0 280 280'><g fill='none' stroke='${gold(0.16)}' stroke-width='0.6'>${rose}</g></svg>`;
  const url = svg => `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
  document.documentElement.style.setProperty("--guil-band", url(bandSvg));
  document.documentElement.style.setProperty("--guil-rose", url(roseSvg));
})();
(function stars(){
  const c = document.createElement("canvas"), w = 1600, h = 1000; c.width = w; c.height = h; const g = c.getContext("2d");
  let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for(let i = 0; i < 900; i++){ const x = rnd()*w, y = rnd()*h, m = rnd(), r = m > .985 ? 1.3 : m > .9 ? .85 : .5;
    g.fillStyle = `rgba(${225 + rnd()*30|0},${225 + rnd()*25|0},255,${(.15 + rnd()*.55) * (r > 1 ? 1 : .8)})`; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); }
  const v = document.getElementById("globeViz");
  v.style.backgroundImage = `url(${c.toDataURL()}), radial-gradient(ellipse 120% 90% at 50% 45%,#0b1a2c 0%,#060c16 45%,#020409 100%)`;
  v.style.backgroundSize = "1600px 1000px, cover";
  const it = document.getElementById("intro"); it.style.backgroundImage = v.style.backgroundImage; it.style.backgroundSize = v.style.backgroundSize;
})();
const ctl = world.controls();
ctl.autoRotate = false; ctl.autoRotateSpeed = 0.35; // positive: the Earth turns eastward, as it does ctl.enableDamping = true; ctl.dampingFactor = 0.08;
ctl.addEventListener("start", () => { lastInteract = performance.now(); hideHintSoon(); });
world.pointOfView({lat:22, lng:10, altitude:1.85}, 0);
let labelKey = "", cityLabelSize = 0.55;
function refreshLabels(){
  const alt = world.pointOfView().altitude, key = Math.round(Math.log2(alt)*5);
  if(key === labelKey) return; labelKey = key;
  const minA = 0.0022*alt*alt; // country names show from about 300,000 km² at the opening view
  world.htmlElementsData([...COUNTRY_LABELS.filter(l => l.a >= minA || l.whole), ...CITY_LABELS]);
  const f = Math.max(0.1, Math.min(1, alt/1.85));
  world.pointRadius(d => (0.2 + 0.09*Math.sqrt(d.items.length))*f);
  world.ringMaxRadius(d => (1.1 + 0.35*Math.sqrt(d.items.length))*f);
  if(window.setCloudsFor) setCloudsFor(alt);
  if(window.wantDetail) wantDetail(alt);
}
ctl.addEventListener("change", refreshLabels);
refreshLabels();

function fitGlobe(){
  const narrow = W <= 720, open = isOpen();
  world.width(open && !narrow ? W - 430 : W).height(open && narrow ? H*0.38 : H);
}
function updatePinClasses(){
  world.pointColor(d => d === activeCity ? PIN_ON : PIN);
  world.ringColor(ringCol());
  CITY_LABELS.forEach(l => { if(l.el) l.el.classList.toggle("on", l.c === activeCity); });
  const hl = activeCountry || (activeCity && activeCity.ci);
  const raw = hl && hl.raw ? hl.raw : (hl && hl.feat ? (COUNTRY.find(k => k.feat === hl.feat) || {}).raw : null);
  if(raw !== HLRAW){ HLRAW = raw || null; if(window.setHL) setHL(HLRAW); }
}
function flyTo(t){
  fitGlobe();
  const alt = t.main ? Math.max(0.35, Math.min(2.4, Math.sqrt(t.main)*5.5)) : 0.8;
  world.pointOfView({lat:t.lat, lng:t.lon, altitude:alt}, reduce ? 0 : 1300);
  lastInteract = performance.now();
}
function recenter(){ fitGlobe(); lastInteract = performance.now(); }

/* Keep labels tidy: none floating past the edge of the globe, none on top of each other */
function overlaps(b, list){ for(const o of list){ if(b[0] < o[2] && b[2] > o[0] && b[1] < o[3] && b[3] > o[1]) return true; } return false; }
function tidyLabels(){
  const data = world.htmlElementsData(); if(!data || !data.length) return;
  const pov = world.pointOfView(), centre = [pov.lng, pov.lat], placed = [], horizon = Math.acos(1/(1 + pov.altitude)) - 0.1;
  const rank = x => x.kind === "city" ? 1e9 + (x.c === activeCity ? 1e6 : 0) + x.c.items.length : x.whole ? 1e8 + (x.whole === activeCity ? 1e6 : 0) + x.a : x.a;
  const order = [...data].sort((x, y) => rank(x) < rank(y) ? 1 : -1), heads = [], stamps = [];
  for(const d of order){
    const s = d.el && d.el.firstChild; if(!s) continue;
    let show = d3.geoDistance([d.lng, d.lat], centre) < horizon;
    if(show){
      const {x, y} = world.getScreenCoords(d.lat, d.lng, 0.006);
      if(!d.w){ d.w = s.offsetWidth; d.h = s.offsetHeight; }
      if(d.kind === "city"){
        /* Places that would overlap merge into one stamp with a count; the place open or playing always stands alone */
        const host = d.c === activeCity ? null : heads.find(h => h.c !== activeCity && Math.hypot(h.sx - x, h.sy - y) < 28);
        if(host){ host.members.push(d); d.members = null; show = false; }
        else { d.sx = x; d.sy = y; d.members = [d]; heads.push(d); placed.push([x - 13, y - 13, x + 13 + d.w, y + 13]); }
      }
      else {
        /* A country name that would sit on a city label or a bigger neighbour's name slides up or down a little instead of vanishing */
        show = false;
        /* A whole-country stamp is printed inside its own country: it grows and shrinks with the country on screen,
           never past 55px, and below a legible size it turns back into the plain country name */
        if(d.whole){
          if(!d.fit) d.fit = fitBox(d);
          const L = world.getScreenCoords(d.lat, d.lng - d.fit.hw, 0.006), R = world.getScreenCoords(d.lat, d.lng + d.fit.hw, 0.006);
          const k = Math.min(1, Math.hypot(R.x - L.x, R.y - L.y) / (d.nat || 50)), mini = k < 0.72 && d.whole !== activeCity, kk = mini ? 1 : Math.max(0.72, k);
          if(d.mini !== mini){ d.mini = mini; d.el.classList.toggle("mini", mini); s.style.transform = ""; d.k = null; d.w = s.offsetWidth; d.h = s.offsetHeight; }
          if(!mini && (d.k == null || Math.abs(d.k - kk) > 0.02)){ d.k = kk; s.style.transform = `translate(-50%,-50%) rotate(${d.rot}deg) scale(${kk.toFixed(2)})`; }
          if(!mini){
            const b = [x - d.w*kk/2, y - d.h*kk/2, x + d.w*kk/2, y + d.h*kk/2];
            if(!overlaps(b, stamps) || d.whole === activeCity){ stamps.push(b); placed.push(b); s.style.top = "0px"; show = true; }
            s.style.visibility = show ? "visible" : "hidden"; continue;
          }
          if(mini && !s.style.transform) s.style.transform = "translate(-50%,-50%)";
        }
        for(const o of [0, -1.25, 1.25, -2.5, 2.5]){
          const dy = o*d.h, b = [x - d.w/2, y - d.h/2 + dy, x + d.w/2, y + d.h/2 + dy];
          if(!overlaps(b, placed)){ placed.push(b); s.style.top = dy + "px"; show = true; break; }
        }
      }
    }
    s.style.visibility = show ? "visible" : "hidden";
  }
  for(const d of data) if(d.kind === "city" && d.el){
    const n = d.members ? d.members.length : 0, grp = n > 1;
    d.el.classList.toggle("grp", grp);
    // places too close to separate: their own stamps, stacked one on another (up to three), no number badge
    const key = grp ? d.members.map(m => m.c.city).join("|") : "";
    if(d.stackKey !== key){
      d.stackKey = key; const s = d.el.firstChild; let st = s.querySelector(".stk");
      if(!grp){ if(st) st.remove(); }
      else {
        if(!st){ st = document.createElement("i"); st.className = "stk"; s.insertBefore(st, s.firstChild); }
        st.innerHTML = d.members.filter(m => m !== d).slice(0, 2).map((m, i) => { const pn = pinOf(m.c), r = ((hash(m.c.city) % 15) - 7) + (i ? 9 : -6);
          return `<svg class="pm" viewBox="0 0 30 30" style="--ink:${pn.ink};transform:translate(${i ? 9 : 5}px,${i ? -8 : -4}px) rotate(${r}deg)">${pn.svg}</svg>`; }).reverse().join("");
      }
    }
  }
  for(const d of heads){
    const nb = [d.sx + 16, d.sy - 8, d.sx - 13 + d.w, d.sy + 8];
    const clash = !grpOf(d) && d.c !== activeCity && heads.some(h => h !== d && nb[0] < h.sx + 13 && nb[2] > h.sx - 13 && nb[1] < h.sy + 13 && nb[3] > h.sy - 13);
    d.el.classList.toggle("noname", clash);
  }
}
const grpOf = d => d.members && d.members.length > 1;
/* ---------- Main loop ---------- */
let last = performance.now(), uiAcc = 0, tidyAcc = 0;
d3.timer(() => {
  const now = performance.now(), dt = Math.min(0.05, (now-last)/1000); last = now;
  if(!W) return;
  if(introOn) introTick(dt);
  ctl.autoRotate = !introOn && !reduce && !isOpen() && $("#profile").hidden && now - lastInteract > 4000;
  if(!introOn && (tidyAcc += dt) > 0.12){ tidyAcc = 0; refreshLabels(); tidyLabels(); }
  if(player.playing){
    const p = byId(player.id); player.pos += dt;
    if(!p || player.pos >= p.dur){ player.pos = p ? p.dur : 0; player.playing = false; }
    uiAcc += dt; if(uiAcc > 0.25 || !player.playing){ uiAcc = 0; updateDeck(); updateNow(); }
  }
});

/* ---------- Player (simulated) ---------- */
function togglePlay(id){
  if(player.id !== id){ player.id = id; player.pos = 0; player.playing = true; }
  else player.playing = !player.playing;
  updateDeck(); updateNow(); dirty = true;
}
const playIcon = on => on
  ? `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 4h4v16H6zm8 0h4v16h-4z"/></svg>`
  : `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4l13 8-13 8z"/></svg>`;
function waveBars(p){
  const r = rng(hash(p.id+"w")); let out = "";
  for(let i=0;i<64;i++){ const h = 18 + Math.round((Math.sin(i/5)*0.3+0.6+r()*0.5)*45); out += `<i style="height:${Math.min(100,h)}%"></i>`; }
  return out;
}
function updateDeck(){
  const deck = $("#deck"); if(!deck) return;
  const id = deck.dataset.id, p = byId(id); if(!p) return;
  const on = player.id===id && player.playing, pos = player.id===id ? player.pos : 0;
  deck.querySelector(".play").innerHTML = playIcon(on);
  deck.querySelector(".play").setAttribute("aria-label", on?"Pause":"Play");
  const bars = deck.querySelectorAll(".wave i"), n = Math.floor(pos/p.dur*bars.length);
  bars.forEach((b,i)=>b.classList.toggle("done", i<n));
  deck.querySelector(".t-pos").textContent = fmt(pos);
}
function updateNow(){
  const el = $("#now"), p = byId(player.id);
  const showing = isOpen() && $("#deck") && $("#deck").dataset.id === player.id;
  if(!p || showing){ el.hidden = true; return; }
  el.hidden = false; hideHint();
  el.innerHTML = `<button class="play" type="button" aria-label="${player.playing?"Pause":"Play"}">${playIcon(player.playing)}</button>
    <button class="txt" type="button"><strong>${esc(p.title)}</strong><small>${esc(p.city)} · ${fmt(player.pos)} / ${fmt(p.dur)}</small></button>`;
  el.querySelector(".play").onclick = () => togglePlay(p.id);
  el.querySelector(".txt").onclick = () => { if(location.hash.startsWith("#compiler-")) location.hash = "map"; openCity(p.city, p.id); };
}
function hideHint(){ $("#hint").hidden = true; }

/* ---------- Panels: country and city ---------- */
function openPanel(html){
  const panel = $("#panel");
  panel.innerHTML = html; panel.hidden = false; app.classList.add("is-open");
  panel.querySelector(".close").onclick = closePanel;
  panel.querySelectorAll("[data-country]").forEach(b => b.onclick = () => { const k = COUNTRY.find(c=>c.name===b.dataset.country); if(k) openCountry(k); });
  hideHint();
}
function nm(n){ const u = LINKS[String(n).replace(/<\/?(strong|em)>/g, "")]; return u ? `<a class="g-link" href="${esc(u)}" target="_blank" rel="noopener">${rich(n)} ↗</a>` : rich(n); }
function theName(n){ return ["United Kingdom","United States"].includes(n) ? "the " + n : n; }
function countryGuide(name){
  const g = COUNTRY_INFO[name]; if(!g) return "";
  const list = (title, rows, cls) => rows && rows.length ? `<div class="g-block${cls ? " " + cls : ""}"><div class="label">${title}</div><ul class="g-list">${rows.map(([n, d]) => `<li><strong>${nm(n)}</strong>${d ? `<span> · ${rich(d)}</span>` : ""}</li>`).join("")}</ul></div>` : "";
  const paras = (title, ps) => ps && ps.length ? `<div class="g-block"><div class="label">${title}</div>${ps.map(t => `<p>${rich(t)}</p>`).join("")}</div>` : "";
  return `<section class="guide" aria-label="${esc(TX.sound_of)} ${esc(theName(name))}">
    <h3>${esc(TX.sound_of)} ${esc(theName(name))}</h3>
    <a class="page-link" href="countries/${(WOR.slugs.countries || {})[name] || slugOf(name)}/">Open the ${esc(name)} page →</a>
    ${g.map.map(t => `<p>${rich(t)}</p>`).join("")}
    ${list(TX.traditions, g.traditions)}
    ${paras(TX.eras, g.eras)}
    ${paras(TX.diaspora, g.diaspora)}
    ${paras(TX.now, g.now)}
    ${list(TX.dig, g.dig)}
    ${list(TX.festivals, g.festivals)}
    ${list(TX.records, g.records, "g-records")}
  </section>`;
}
function openCountry(k){
  activeCountry = k; activeCity = null;
  const cities = CITIES.filter(c => c.ci === k).sort((a,b)=>b.items.length - a.items.length);
  const pls = cities.flatMap(c => c.items), guide = countryGuide(k.name);
  openPanel(`
    <div class="panel-head">
      <div><h2>${esc(k.name)}</h2>
        ${cities.length ? `<div class="where"><span>${pls.length} ${pls.length===1?"mix or playlist":"mixes and playlists"}</span><span>${cities.length} place${cities.length===1?"":"s"}</span></div>` : ""}</div>
      <button class="close" type="button" aria-label="Close">×</button>
    </div>
    <div class="panel-body">
      ${cities.length ? `
        <div><div class="label" style="margin-bottom:8px">Places</div>
          <div class="cities">${cities.map(c=>`<button class="citybtn" type="button" data-city="${esc(c.city)}">${esc(c.city)} <small>${c.items.length}</small></button>`).join("")}</div></div>
        <div><div class="label" style="margin-bottom:8px">All mixes and playlists from ${esc(k.name)}</div>
          <div class="list">${pls.map(p=>`<button class="item" type="button" data-id="${p.id}">${stamp(p,52)}<span><span class="item-title">${esc(p.title)}</span><br><span class="item-sub">${esc(COMPILERS[p.by].name)} · ${esc(p.city)}</span></span><span class="item-dur">${durLabel(p.dur)}</span></button>`).join("")}</div></div>`
      : ""}
      ${guide}
      ${cities.length ? "" : guide
        ? `<p class="empty-line">No mixes from ${esc(k.name)} yet. <a href="submit/">Send the first one</a></p>`
        : `<div class="empty"><strong>Nothing from ${esc(k.name)} yet</strong><p>No selector has pinned a mix or playlist here so far. <a href="submit/">Send the first one</a>.</p></div>`}
    </div>`);
  $("#panel").querySelectorAll("[data-city]").forEach(b => b.onclick = () => openCity(b.dataset.city));
  $("#panel").querySelectorAll(".item").forEach(b => b.onclick = () => { const p = byId(b.dataset.id); openCity(p.city, p.id); });
  updatePinClasses(); updateNow(); dirty = true;
  flyTo(k);
}

/* A music style or genre: every mix tagged with it, wherever it is pinned */
/* Tags hold styles, the country and artists. A tag that names a country or a place is not a style. */
const NOT_STYLE = new Set([...COUNTRY.map(k => k.name), ...CITIES.flatMap(c => [c.city, c.country])].filter(Boolean).map(x => plain(String(x).toLowerCase().trim())));
const styleTags = p => p.genres.filter(g => !NOT_STYLE.has(plain(g.toLowerCase().trim())));
const STYLES = (() => { const m = new Map();
  PLAYLISTS.forEach(p => styleTags(p).forEach(g => { const k = plain(g.toLowerCase().trim()); if(!k) return; if(!m.has(k)) m.set(k, {name: g.trim(), items: []}); const st = m.get(k); st.items.push(p);
    if(/^[A-ZÀ-Þ]/.test(g.trim()) && !/^[A-ZÀ-Þ]/.test(st.name)) st.name = g.trim(); }));   // prefer the capitalised spelling
  m.forEach(st => { st.name = st.name.charAt(0).toUpperCase() + st.name.slice(1); });
  return m; })();
function styleOf(g){ return STYLES.get(plain(String(g).toLowerCase().trim())); }
function openStyle(g){
  const st = styleOf(g); if(!st) return;
  activeCountry = null; activeCity = null;
  const pls = st.items, places = [...new Set(pls.map(p => p.city))];
  openPanel(`
    <div class="panel-head">
      <div><div class="visa-top"><span>Style</span></div><h2>${esc(st.name)}</h2>
        <div class="where"><span>${pls.length} ${pls.length===1?"mix or playlist":"mixes and playlists"}</span><span>${places.length} place${places.length===1?"":"s"}</span></div></div>
      <button class="close" type="button" aria-label="Close">×</button>
    </div>
    <div class="panel-body">
      <div><div class="label" style="margin-bottom:8px">Where it is pinned</div>
        <div class="cities">${places.map(c => `<button class="citybtn" type="button" data-city="${esc(c)}">${esc(c)} <small>${pls.filter(p => p.city === c).length}</small></button>`).join("")}</div></div>
      <div><div class="label" style="margin-bottom:8px">${esc(st.name)} mixes and playlists</div>
        <div class="list">${pls.map(p=>`<button class="item" type="button" data-id="${p.id}">${stamp(p,52)}<span><span class="item-title">${esc(p.title)}</span><br><span class="item-sub">${esc(COMPILERS[p.by].name)} · ${esc(p.city)}</span></span><span class="item-dur">${durLabel(p.dur)}</span></button>`).join("")}</div></div>
    </div>`);
  $("#panel").querySelectorAll("[data-city]").forEach(b => b.onclick = () => openCity(b.dataset.city));
  $("#panel").querySelectorAll(".item").forEach(b => b.onclick = () => { const p = byId(b.dataset.id); openCity(p.city, p.id); });
  updatePinClasses(); updateNow(); dirty = true;
}
const slugOf = s => plain(String(s)).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
function cityGuide(name){
  const g = CITY_INFO[name]; if(!g) return "";
  const list = (title, rows) => rows && rows.length ? `<div class="g-block"><div class="label">${title}</div><ul class="g-list">${rows.map(([n, d]) => `<li><strong>${nm(n)}</strong>${d ? `<span> · ${rich(d)}</span>` : ""}</li>`).join("")}</ul></div>` : "";
  return `<section class="guide" aria-label="${esc(TX.sound_of)} ${esc(name)}">
    <h3>${esc(TX.sound_of)} ${esc(name)}</h3>
    <a class="page-link" href="places/${(WOR.slugs.places || {})[name] || slugOf(name)}/">Open the ${esc(name)} page →</a>
    ${g.intro.map(t => `<p>${rich(t)}</p>`).join("")}
    ${g.born.length ? `<div class="g-block"><div class="label">${esc(TX.born)}</div><p class="g-names">${g.born.map(nm).join(" · ")}</p></div>` : ""}
    ${list(TX.adopted, g.adopted)}
    ${list(TX.listen, g.listen)}
    ${list(TX.buy, g.buy)}
    ${list(TX.radio, g.radio)}
  </section>`;
}
function openCity(city, playlistId){
  const c = CITIES.find(x=>x.city===city); if(!c) return;
  if(activeCity && activeCity !== c) TRAIL = activeCity;
  activeCity = c; activeCountry = null;
  if(ROUTE && ROUTE.to === c && !FLIGHT && !introOn) flyPlane(ROUTE.from, ROUTE.to);
  const sel = playlistId || (player.id && c.items.some(i=>i.id===player.id) ? player.id : c.items[0].id);
  const lt = localTime(c.tz);
  openPanel(`
    <div class="panel-head">
      <div>
        <div class="visa-top"><span>${c.whole ? "Country visa" : "Visa"} · ${iso3(c.country)}</span><span>No. ${c.code} ${String(c.items.length).padStart(4, "0")}</span></div>
        <h2>${esc(c.city)}</h2>
        <div class="where">${c.whole ? `<span>The whole country</span>${c.ci ? `<button class="crumb" type="button" data-country="${esc(c.ci.name)}">Country guide</button>` : ""}` : `${c.ci ? `<button class="crumb" type="button" data-country="${esc(c.ci.name)}">${esc(c.country)}</button>` : `<span>${esc(c.country)}</span>`}<span>${coord(c.lat,c.lon)}</span>`}${lt ? `<span>Local time ${lt}</span>` : ""}</div>
      </div>
      <button class="close" type="button" aria-label="Close">×</button>
    </div>
    <div class="panel-body">
      <div id="playerSlot"></div>
      ${c.items.length>1 ? `<div><div class="label" style="margin-bottom:8px">${c.items.length} playlists from ${esc(c.city)}</div><div class="list" id="cityList"></div></div>` : ""}
      ${cityGuide(c.city)}
    </div>`);
  if(c.items.length>1){
    const list = $("#cityList");
    list.innerHTML = c.items.map(p=>`<button class="item" type="button" data-id="${p.id}">${stamp(p,52)}<span><span class="item-title">${esc(p.title)}</span><br><span class="item-sub">${esc(COMPILERS[p.by].name)}</span></span><span class="item-dur">${durLabel(p.dur)}</span></button>`).join("");
    list.querySelectorAll(".item").forEach(b=>b.onclick=()=>showPlaylist(b.dataset.id, true));
  }
  showPlaylist(sel, !current);
  updatePinClasses(); dirty = true;
  flyTo(c);
}
function showPlaylist(id, autoplay){
  const p = byId(id), comp = COMPILERS[p.by];
  document.querySelectorAll("#cityList .item").forEach(b=>b.classList.toggle("on", b.dataset.id===id));
  const on = current && current.id === p.id;
  $("#playerSlot").innerHTML = `
    <div class="player">
      <div class="player-top">
        ${stamp(p,104)}
        <div>
          <h3>${esc(p.title)}</h3>
          <div class="by">Compiled by <a href="#compiler-${p.by}">${esc(comp.name)}</a></div>
        </div>
      </div>
      <div class="meta"><span>${durLabel(p.dur)}</span><span>${p.tracks} tracks</span><span>Added ${dateLabel(p.added)}</span></div>
      <div class="chips">${p.genres.map(g=>`<button class="chip" type="button" data-style="${esc(g)}">${esc(g)}</button>`).join("")}${(p.tags || []).map(g=>`<span class="chip tag">${esc(g)}</span>`).join("")}</div>
      <p class="desc">${esc(p.desc)}</p>
      <div class="actions">
        <button class="btn primary" type="button" id="playThis">${on ? "Playing now" : "Board ▶"}</button>
        <a class="btn" href="playlists/${p.slug || slugOf(p.title)}/">Playlist page</a>
        <a class="btn" href="#compiler-${p.by}">${esc(comp.name.split(" ")[0])}'s profile →</a>
      </div>
      ${p.mixcloud ? "" : `<p class="deck-note">Demo audio: Rhythm Passport Vol.1 by DJ Ni Mo stands in until this playlist's own Mixcloud link is added.</p>`}
    </div>`;
  $("#panel").querySelectorAll("[data-style]").forEach(b => b.onclick = () => openStyle(b.dataset.style));
  $("#playThis").onclick = () => { BOARDING = null; $("#bar-show").textContent = "Show on globe"; $("#bar-show").classList.remove("primary"); playMix(p); $("#playThis").textContent = "Playing now"; };
  if(autoplay && !(current && current.id === p.id)) boardingPass(p);
}
function closePanel(){
  $("#panel").hidden = true; app.classList.remove("is-open");
  if(activeCity) TRAIL = activeCity;
  activeCity = null; activeCountry = null; cueTarget = null;
  updatePinClasses(); updateNow(); dirty = true; lastInteract = performance.now(); recenter();
}

/* ---------- Profile page ---------- */
/* Every place has its own stamp ink, the same on the globe, the mix cards and the passport */
const INKS = ["#24498a", "#a3302b", "#2d6a44", "#6a3d8f", "#0f6b70", "#8a4a14", "#a0306a", "#3d5560"];
// Inks go round the globe in order of longitude, so neighbouring places never share one
const INK_OF = new Map();
function inkFor(city){
  if(!INK_OF.size) [...CITIES].sort((a, b) => a.lon - b.lon).forEach((c, i) => INK_OF.set(c.city, INKS[i % INKS.length]));
  return INK_OF.get(city) || INKS[(hash(plain(city)) >>> 3) % INKS.length];
}
/* A country entry stamp: wide, cut corners, double frame, the country's name large.
   Used for whole-country mixes so they never look like a town. */
function countryStampBody(col, name, top, bottom){
  const M = `font-family="IBM Plex Mono,ui-monospace,monospace"`, B = `font-family="Barlow Condensed,Arial Narrow,sans-serif" font-weight="700"`;
  const n = esc(plain(name).toUpperCase()), fit = n.length > 8 ? ` textLength="66" lengthAdjust="spacingAndGlyphs"` : "";
  return `
      <path d="M15 21H85L95 31V69L85 79H15L5 69V31Z" fill="none" stroke="${col}" stroke-width="3.6"/>
      <path d="M17.5 25.5H82.5L90.5 33.5V66.5L82.5 74.5H17.5L9.5 66.5V33.5Z" fill="none" stroke="${col}" stroke-width="1"/>
      <text x="50" y="34.5" text-anchor="middle" ${M} font-size="5.2" font-weight="600" letter-spacing="1.6" fill="${col}">${top}</text>
      <path d="M16 38.5H84" stroke="${col}" stroke-width=".9"/>
      <text x="50" y="56" text-anchor="middle" ${B} font-size="${n.length > 8 ? 15 : 18}" letter-spacing="1.8"${fit} fill="${col}">${n}</text>
      <path d="M16 61H84" stroke="${col}" stroke-width=".9"/>
      <path d="M19 67.6h7m-2.4-2.4 2.4 2.4-2.4 2.4" fill="none" stroke="${col}" stroke-width="1.1"/>
      <text x="52" y="69.4" text-anchor="middle" ${M} font-size="5" font-weight="600" letter-spacing=".8" fill="${col}">${bottom}</text>
      <path d="M74 67.6h7m-2.4-2.4 2.4 2.4-2.4 2.4" fill="none" stroke="${col}" stroke-width="1.1"/>`;
}
function stamp(p, size=104){
  const h = hash(p.id), r = rng(h), rot = (r()*18 - 9).toFixed(1) * (p.whole ? 0.5 : 1), v = h % 3;
  const col = inkFor(p.city);
  const d = new Date(p.added + "T12:00:00Z");
  const date = `${String(d.getUTCDate()).padStart(2,"0")} ${["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"][d.getUTCMonth()]} ${d.getUTCFullYear()}`;
  const uid = "s" + hash(p.id + size), city = esc(plain(p.city).toUpperCase());
  const who = p.by && COMPILERS[p.by] ? esc(plain(COMPILERS[p.by].name).toUpperCase()) : (p.who ? esc(p.who) : "RHYTHM PASSPORT");
  const M = `font-family="IBM Plex Mono,ui-monospace,monospace"`, B = `font-family="Barlow Condensed,Arial Narrow,sans-serif" font-weight="600"`;
  const real = window.WORSTAMP && WORSTAMP.draw(p.country, {id: uid, city: p.city, code: p.code, whole: p.whole, added: p.added});
  if(real) return `<svg class="stamp" viewBox="0 0 100 100" width="${size}" height="${size}" aria-hidden="true">
    <rect width="100" height="100" rx="9" fill="#efe7d5"/>
    <g transform="rotate(${rot} 50 50) translate(${(100 - real.w*0.92)/2} ${(100 - real.h*0.92)/2}) scale(.92)" filter="url(#rp-ink)" opacity=".9">${real.body}</g></svg>`;
  let body;
  if(p.whole) body = countryStampBody(col, p.city, "ENTRY · " + iso3(p.country || p.city), date);
  else if(v === 0) body = `
      <circle cx="50" cy="50" r="40" fill="none" stroke="${col}" stroke-width="3.2"/>
      <circle cx="50" cy="50" r="33" fill="none" stroke="${col}" stroke-width="1.2"/>
      <path id="${uid}a" d="M50 50 m-36.5 0 a36.5 36.5 0 1 1 73 0" fill="none"/>
      <path id="${uid}b" d="M50 50 m-36.5 0 a36.5 36.5 0 1 0 73 0" fill="none"/>
      <text ${M} font-size="6" font-weight="600" letter-spacing="1.2" fill="${col}"><textPath href="#${uid}a" startOffset="50%" text-anchor="middle" dominant-baseline="middle">${city}</textPath></text>
      <text ${M} font-size="4.6" letter-spacing=".9" fill="${col}"><textPath href="#${uid}b" startOffset="50%" text-anchor="middle" dominant-baseline="middle">${who}</textPath></text>
      <text x="50" y="40" text-anchor="middle" ${M} font-size="5" letter-spacing="1.4" fill="${col}">ARRIVAL</text>
      <text x="50" y="58" text-anchor="middle" ${B} font-size="21" fill="${col}">${p.code}</text>
      <text x="50" y="67" text-anchor="middle" ${M} font-size="5" fill="${col}">${date}</text>`;
  else if(v === 1) body = `
      <rect x="10" y="20" width="80" height="60" rx="7" fill="none" stroke="${col}" stroke-width="3"/>
      <rect x="15" y="25" width="70" height="50" rx="4" fill="none" stroke="${col}" stroke-width="1"/>
      <text x="50" y="35" text-anchor="middle" ${M} font-size="6.2" font-weight="600" letter-spacing="1" fill="${col}">${city}</text>
      <text x="50" y="55" text-anchor="middle" ${B} font-size="20" fill="${col}">${p.code}</text>
      <text x="50" y="63.5" text-anchor="middle" ${M} font-size="5" fill="${col}">${date}</text>
      <text x="50" y="71" text-anchor="middle" ${M} font-size="3.9" letter-spacing=".6" fill="${col}">${who}</text>`;
  else body = `
      <ellipse cx="50" cy="50" rx="42" ry="31" fill="none" stroke="${col}" stroke-width="3"/>
      <ellipse cx="50" cy="50" rx="36" ry="25.5" fill="none" stroke="${col}" stroke-width="1" stroke-dasharray="2 1.6"/>
      <text x="50" y="38" text-anchor="middle" ${M} font-size="5.8" font-weight="600" letter-spacing="1" fill="${col}">${city}</text>
      <text x="50" y="56" text-anchor="middle" ${B} font-size="19" fill="${col}">${p.code}</text>
      <text x="50" y="64" text-anchor="middle" ${M} font-size="4.8" fill="${col}">${date}</text>
      <path d="M22 50h8M70 50h8" stroke="${col}" stroke-width="1.2"/>`;
  return `<svg class="stamp" viewBox="0 0 100 100" width="${size}" height="${size}" aria-hidden="true">
    <rect width="100" height="100" rx="9" fill="#efe7d5"/>
    <g transform="rotate(${rot} 50 50)" filter="url(#rp-ink)" opacity=".9">${body}
    </g></svg>`;
}
/* ---------- Passport helpers ---------- */
const ISO3 = {"United Kingdom":"GBR","Nigeria":"NGA","DR Congo":"COD","Mali":"MLI","Ethiopia":"ETH","South Africa":"ZAF","Portugal":"PRT","Brazil":"BRA","Cuba":"CUB","Colombia":"COL","Jamaica":"JAM","Türkiye":"TUR","Georgia":"GEO","Lebanon":"LBN","India":"IND","Indonesia":"IDN","Italy":"ITA","United States":"USA"};
const iso3 = n => ISO3[n] || code3(n || "XXX");
const mrzT = s => plain(String(s)).toUpperCase().replace(/[^A-Z0-9]+/g, "<").replace(/^<+|<+$/g, "");
const mrzL = s => (s + "<".repeat(44)).slice(0, 44);
const mrzCoord = (v, pos, neg, w) => String(Math.round(Math.abs(v)*100)).padStart(w, "0") + (v >= 0 ? pos : neg);
function cityMRZ(c){
  const genres = [...new Set(c.items.flatMap(p => p.genres))].slice(0, 3).join(" ");
  const sel = [...new Set(c.items.map(p => COMPILERS[p.by].name.split(" ").pop()))].join(" ");
  return mrzL(`V<${iso3(c.country)}${mrzT(c.city)}<<${mrzT(genres)}`) + "\n" +
         mrzL(`${c.code}${String(c.items.length).padStart(4, "0")}<${iso3(c.country)}${mrzCoord(c.lat, "N", "S", 4)}${mrzCoord(c.lon, "E", "W", 5)}<<${mrzT(sel)}`);
}
/* The listener's own passport: a stamp for every city played, kept in this browser */
const PASS_KEY = "rp-atlas-passport";
let MYPASS = {};
try { MYPASS = JSON.parse(localStorage.getItem(PASS_KEY) || "{}") || {}; } catch(e){ MYPASS = {}; }
CITY_LABELS.forEach(l => { if(l.el) l.el.classList.toggle("got", !!MYPASS[l.c.city]); });
function passCount(){ const n = Object.keys(MYPASS).length; const el = $("#my-pass-n"); if(el) el.textContent = n; return n; }
function addPassStamp(city){
  if(MYPASS[city]) return;
  MYPASS[city] = new Date().toISOString().slice(0, 10);
  CITY_LABELS.forEach(l => { if(l.el && l.c.city === city) l.el.classList.add("got"); });
  if(window.setVisited) setTimeout(setVisited, 0);
  try { localStorage.setItem(PASS_KEY, JSON.stringify(MYPASS)); } catch(e){}
  passCount();
  const c = CITIES.find(x => x.city === city), t = $("#toast");
  if(!c || !t) return;
  t.innerHTML = `${stamp({id:"me-" + city, city, code:c.code, country:c.country, whole:c.whole, added:MYPASS[city], who:"YOUR PASSPORT"}, 52)}<div><strong>Stamped: ${esc(city)}</strong><small>${passCount()} of ${CITIES.length} places in your passport</small></div>`;
  t.hidden = false; t.classList.remove("out");
  clearTimeout(addPassStamp.t); addPassStamp.t = setTimeout(() => { t.classList.add("out"); setTimeout(() => { t.hidden = true; }, 450); }, 3200);
}
function openPassport(){
  activeCity = null; activeCountry = null;
  const got = CITIES.filter(c => MYPASS[c.city]).sort((a, b) => MYPASS[a.city] < MYPASS[b.city] ? -1 : 1);
  const left = CITIES.filter(c => !MYPASS[c.city]);
  const countries = new Set(got.map(c => c.country)).size;
  openPanel(`
    <div class="panel-head">
      <div><div class="visa-top"><span>Rhythm Passport</span><span>Holder's stamps</span></div>
        <h2>Your passport</h2>
        <div class="where"><span>Every place you play earns a stamp</span></div></div>
      <button class="close" type="button" aria-label="Close">×</button>
    </div>
    <div class="panel-body">
      <div class="pass-count"><div><span class="label">Places</span><strong>${got.length}<small style="font-size:13px;color:var(--muted)"> / ${CITIES.length}</small></strong></div><div><span class="label">Countries</span><strong>${countries}</strong></div></div>
      ${got.length ? `<div class="stamps-grid">${got.map(c => `<button class="stampcard" type="button" data-city="${esc(c.city)}">${stamp({id:"me-" + c.city, city:c.city, code:c.code, country:c.country, whole:c.whole, added:MYPASS[c.city], who:"YOUR PASSPORT"}, 120)}<small>${esc(c.city)}<br>${dateLabel(MYPASS[c.city])}</small></button>`).join("")}</div>`
        : `<div class="empty"><strong>No stamps yet</strong><p>Play a mix or playlist from any place and it gets stamped here.</p></div>`}
      ${left.length ? `<div><div class="label" style="margin-bottom:10px">Still to visit</div><div class="stamps-grid">${left.map(c => `<button class="stampcard empty-slot" type="button" data-city="${esc(c.city)}"><span class="slot">${esc(c.city)}</span></button>`).join("")}</div></div>` : ""}
      <p class="deck-note">Stamps are kept in this browser only.</p>
    </div>`);
  $("#panel").querySelectorAll("[data-city]").forEach(b => b.onclick = () => openCity(b.dataset.city));
  updatePinClasses(); updateNow(); dirty = true;
}
$("#my-pass").onclick = openPassport;
passCount();
function openProfile(slug){
  const c = COMPILERS[slug]; if(!c){ closeProfile(); return; }
  const mine = PLAYLISTS.filter(p=>p.by===slug);
  const cities = new Set(mine.map(p=>p.city));
  const total = mine.reduce((a,p)=>a+p.dur,0);
  const initials = c.name.split(" ").map(w=>w[0]).join("").slice(0,2);
  const since = mine.map(p=>p.added).sort()[0] || "2026-11-01";
  const baseCity = CITIES.find(x => x.city === c.base), bc = baseCity ? iso3(baseCity.country) : "XXX";
  const parts = c.name.split(" "), surname = parts.pop(), given = parts.join(" ");
  const passNo = "RP" + String(hash(slug) % 9000000 + 1000000);
  const yymmdd = since.slice(2).replace(/-/g, "");
  const mrz = mrzL(`P<${bc}${mrzT(surname)}<<${mrzT(given)}`) + "\n" + mrzL(`${passNo}<${bc}${yymmdd}<<${String(mine.length).padStart(2, "0")}MIXES<${cities.size}CITIES`);
  const el = $("#profile");
  el.innerHTML = `<div class="profile-inner">
    <a class="btn back" href="#map">← Back to the globe</a>
    <header class="datapage">
      <div class="dp-top"><span>Rhythm Passport · Selector</span><span>${passNo}</span></div>
      <div class="dp-photo${c.photo ? " has-img" : ""}" aria-hidden="true">${c.photo ? `<img src="${esc(c.photo)}" alt="">` : esc(plain(initials).toUpperCase())}</div>
      <div class="dp-fields">
        <div class="dp-name"><small>Selector</small><span>${esc(c.name)}</span></div>
        <div><small>Based in</small><span>${esc(c.base)}</span></div>
        <div><small>Selector since</small><span>${dateLabel(since)}</span></div>
        <div><small>Role</small><span>${esc(c.role)}</span></div>
        <div><small>Issued by</small><span>Rhythm Passport${c.sample ? " · sample profile" : ""}</span></div>
      </div>
    </header>
    <div class="prof-cols">
      <div style="display:flex;flex-direction:column;gap:16px">
        <p class="bio">${esc(c.bio)}</p>
        <div class="actions"><a class="btn" href="selectors/${slug}/">Full profile page</a>${c.links.map(([t,u])=>`<a class="btn" href="${u}" target="_blank" rel="noopener">${esc(t)} ↗</a>`).join("")}</div>
      </div>
      <div class="facts">
        <div><span class="label">Mixes and playlists</span><strong>${mine.length}</strong></div>
        <div><span class="label">Places</span><strong>${cities.size}</strong></div>
        <div><span class="label">Listening time</span><strong>${durLabel(total)}</strong></div>
      </div>
    </div>
    <section>
      <h3 class="sec">Stamps: mixes and playlists on the map</h3>
      <div class="stamps-grid">${mine.map(p=>`<button class="stampcard pcard-stamp" type="button" data-id="${p.id}">${stamp(p,120)}<small><strong style="color:var(--ink)">${esc(p.title)}</strong><br>${esc(p.city)} · ${durLabel(p.dur)}</small></button>`).join("")}</div>
    </section>
  </div>`;
  el.hidden = false; el.scrollTop = 0;
  el.querySelectorAll(".pcard-stamp").forEach(b=>b.onclick=()=>{ const p=byId(b.dataset.id); location.hash="map"; setTimeout(()=>openCity(p.city,p.id),30); });
  updateNow();
}
function closeProfile(){ $("#profile").hidden = true; }
function route(){ const h = location.hash.slice(1); if(h === "random"){ closeProfile(); if(!introOn) showRecord(); return; } if(h.startsWith("city-")){ closeProfile(); const cc = CITIES.find(x => slugOf(x.city) === h.slice(5)); if(cc) openCity(cc.city); return; } if(h.startsWith("style-")){ closeProfile(); const st = [...STYLES.values()].find(x => slugOf(x.name) === h.slice(6)); if(st) openStyle(st.name); return; } if(h.startsWith("compiler-")) openProfile(h.slice(9)); else closeProfile(); }
window.addEventListener("hashchange", route);

/* ---------- Search ---------- */
const q = $("#q"), results = $("#results");
q.addEventListener("input", () => {
  const t = plain(q.value.trim().toLowerCase());
  if(!t){ results.hidden = true; return; }
  const m = s => plain(s.toLowerCase()).includes(t), hits = [];
  [...STYLES.values()].filter(st => m(st.name)).sort((a, b) => b.items.length - a.items.length).forEach(st => {
    const np = new Set(st.items.map(p => p.city)).size;
    hits.push({label: st.name, sub: `Style · ${st.items.length} mix${st.items.length > 1 ? "es" : ""} in ${np} place${np > 1 ? "s" : ""}`, go: () => openStyle(st.name)}); });
  COUNTRY.forEach(k=>{ if(m(k.name)){ const n = CITIES.filter(c=>c.ci===k).reduce((a,c)=>a+c.items.length,0); hits.push({label:k.name,sub:`Country · ${n}`,go:()=>openCountry(k)}); } });
  CITIES.forEach(c=>{ if(m(c.city)) hits.push({label:c.city,sub:`${c.items.length} ${c.items.length>1?"mixes and playlists":"mix or playlist"}`,go:()=>openCity(c.city)}); });
  PLAYLISTS.forEach(p=>{ if(m(p.title)||m(p.genres.join(" "))||m((p.tags || []).join(" "))) hits.push({label:p.title,sub:`${p.city}${styleTags(p).length ? " · " + styleTags(p).slice(0, 2).join(", ") : ""}`,go:()=>openCity(p.city,p.id)}); });
  Object.entries(COMPILERS).forEach(([s,c])=>{ if(m(c.name)) hits.push({label:c.name,sub:"Selector",go:()=>{location.hash="compiler-"+s}}); });
  results.innerHTML = hits.length ? hits.slice(0,10).map((h,i)=>`<button type="button" data-i="${i}"><span>${esc(h.label)}</span><small>${esc(h.sub)}</small></button>`).join("") : `<div style="padding:10px 12px;color:var(--muted);font-size:12px">Nothing found for “${esc(q.value)}”.</div>`;
  results.hidden = false;
  results.querySelectorAll("button").forEach(b=>b.onclick=()=>{ hits[+b.dataset.i].go(); results.hidden=true; q.value=""; q.blur(); });
});
q.addEventListener("keydown", e => { if(e.key==="Escape"){ results.hidden=true; q.value=""; } if(e.key==="Enter"){ const b=results.querySelector("button"); if(b) b.click(); } });
document.addEventListener("click", e => { if(!e.target.closest(".search")) results.hidden = true; });


/* ---------- Opening: two turntables, one half of the world on each. Tap one to drop the needle and enter the globe ---------- */
const intro = $("#intro"), rc = $("#rec"), rctx = rc.getContext("2d");
const RU = 1000, RMAPR = 0.94*RU, RLABEL = 0.15*RU;
const RCLIP = 90, RSCALE = RMAPR/(2*Math.sin(RCLIP/2*Math.PI/180));
const rRing = lat => RSCALE*2*Math.sin((90 - Math.abs(lat))/2*Math.PI/180);
const RPROJ = {A: d3.geoAzimuthalEqualArea().rotate([0,-90]).clipAngle(RCLIP).scale(RSCALE).translate([0,0]).precision(0.3),
               B: d3.geoAzimuthalEqualArea().rotate([0,90]).clipAngle(RCLIP).scale(RSCALE).translate([0,0]).precision(0.3)};
const RLANDS = {A: LO.map(f => ({c:f.c, p:new Path2D(d3.geoPath(RPROJ.A)(feat(f.g)) || "M0,0")})),
                B: LO.map(f => ({c:f.c, p:new Path2D(d3.geoPath(RPROJ.B)(feat(f.g)) || "M0,0")}))};
const RARM = {px:0.98, py:-0.98, L:1.25, rest:80*Math.PI/180};
const DECKS = [
  {side:"A", name:"Side A", rot:-0.6, speed:TAU/45, arm:RARM.rest, armTarget:RARM.rest, lift:1, L:null, cache:null},
  {side:"B", name:"Side B", rot:1.1,  speed:TAU/52, arm:RARM.rest, armTarget:RARM.rest, lift:1, L:null, cache:null},
];
let introOn = false, entering = null, RT = null;

function rArcText(c, str, r, mid, size, color, spacing){
  c.save(); c.font = `500 ${size}px "Instrument Sans", system-ui, sans-serif`; c.fillStyle = color; c.textAlign = "center"; c.textBaseline = "middle";
  const chars = [...str], w = chars.map(ch => c.measureText(ch).width + size*spacing);
  let a = mid - w.reduce((s,x)=>s+x,0)/r/2;
  chars.forEach((ch,i) => { a += w[i]/r/2; c.save(); c.translate(r*Math.cos(a), r*Math.sin(a)); c.rotate(a+Math.PI/2); c.fillText(ch,0,0); c.restore(); a += w[i]/r/2; });
  c.restore();
}
let RIG = null, xf = 0, xfTarget = 0;
function introLayout(){
  const barEl = $("#bar"), barH = barEl && !barEl.hidden ? barEl.offsetHeight : 0;
  const narrow = W <= 720, top = narrow ? 128 : 172, bottom = Math.max(narrow ? 190 : 200, barH + 84), ah = H - top - bottom;
  const mw = narrow ? 0.85 : 1.1, gap = 0.12;
  const R = Math.max(40, Math.min((W - 24)/(2*2.62 + mw + 2*gap), ah/2.3)*0.98);
  const PW = 2.62*R, PH = 2.24*R, MW = mw*R, total = 2*PW + MW + 2*gap*R;
  const x0 = W/2 - total/2, y0 = top + (ah - PH)/2;
  RIG = {R, plinths:[{x:x0, y:y0, w:PW, h:PH}, {x:x0 + PW + MW + 2*gap*R, y:y0, w:PW, h:PH}], mixer:{x:x0 + PW + gap*R, y:y0, w:MW, h:PH}};
  DECKS.forEach((d, i) => d.L = {x: RIG.plinths[i].x + 1.12*R, y: y0 + 1.12*R, R});
  intro.querySelectorAll(".deck-btn").forEach((b, i) => {
    b.textContent = TX.intro_button;
    const p = RIG.plinths[i]; b.style.left = (p.x + p.w/2) + "px"; b.style.transform = "translateX(-50%)"; b.style.bottom = ""; b.style.top = (y0 + PH + 18) + "px";
  });
  $("#turn").style.top = (y0 - 30) + "px";
}
let EARTH_TEX = null;
(function loadEarthTex(){
  const im = new Image(); im.onload = () => {
    const w = 2048, h = 1024, cv = document.createElement("canvas"); cv.width = w; cv.height = h;
    const g = cv.getContext("2d"); g.drawImage(im, 0, 0, w, h);
    try { EARTH_TEX = {w, h, d: g.getImageData(0, 0, w, h).data}; if(RIG) buildRecord(); } catch(e){}
  };
  im.src = WOR.img + "earth-passport-flat.jpg" + IMGV;
})();
function earthDisc(sd, px){
  const out = document.createElement("canvas"); out.width = out.height = px;
  const g = out.getContext("2d"), img = g.createImageData(px, px), o = img.data, T = EARTH_TEX, k = RU/(px/2), D = 180/Math.PI;
  for(let j = 0; j < px; j++){
    const y = (j + 0.5 - px/2)*k;
    for(let i = 0; i < px; i++){
      const x = (i + 0.5 - px/2)*k, r = Math.hypot(x, y); if(r > RMAPR) continue;
      const cc = 2*Math.asin(Math.min(1, r/(2*RSCALE)))*D;
      const lon = sd === "A" ? Math.atan2(x, y)*D : Math.atan2(x, -y)*D, lat = sd === "A" ? 90 - cc : cc - 90;
      const u = Math.min(T.w - 1, ((lon + 180)/360*T.w)|0), v = Math.min(T.h - 1, ((90 - lat)/180*T.h)|0), si = (v*T.w + u)*4, di = (j*px + i)*4;
      const shade = 0.82 + 0.18*(1 - r/RMAPR);
      o[di] = T.d[si]*shade; o[di+1] = T.d[si+1]*shade; o[di+2] = T.d[si+2]*shade; o[di+3] = 255;
    }
  }
  g.putImageData(img, 0, 0); return out;
}
function buildSide(sd, R){
  const px = Math.min(1400, Math.ceil(2*R*dpr*1.1)), can = document.createElement("canvas"); can.width = can.height = px;
  const c = can.getContext("2d"), s = px/2/RU, pr = RPROJ[sd]; c.translate(px/2, px/2); c.scale(s, s);
  c.beginPath(); c.arc(0,0,RU,0,TAU); c.fillStyle = RT.vinyl; c.fill();
  c.beginPath(); for(let r = RLABEL+22; r < RU*0.962; r += 5.5){ c.moveTo(r,0); c.arc(0,0,r,0,TAU); }
  c.strokeStyle = RT.groove; c.lineWidth = Math.min(2.2, 0.75/s); c.stroke();
  for(const lat of [60,30]){ const r = rRing(lat);
    c.beginPath(); c.arc(0,0,r,0,TAU); c.strokeStyle = RT.vinyl; c.lineWidth = 9; c.stroke();
    c.beginPath(); c.arc(0,0,r-4.5,0,TAU); c.arc(0,0,r+4.5,0,TAU); c.strokeStyle = RT.grooveHi; c.lineWidth = Math.min(1.6, 0.6/s); c.stroke(); }
  c.beginPath(); c.arc(0,0,RU-1.5,0,TAU); c.strokeStyle = RT.edge; c.lineWidth = Math.max(2, 1.4/s); c.stroke();
  const earth = EARTH_TEX ? earthDisc(sd, px) : null;
  if(earth){ c.save(); c.setTransform(1,0,0,1,0,0); c.drawImage(earth, 0, 0); c.restore(); }
  else {
    c.beginPath(); c.arc(0,0,RMAPR,0,TAU); c.fillStyle = "#0d2238"; c.fill();
    for(const l of RLANDS[sd]){ c.fillStyle = RT.lands[l.c]; c.fill(l.p); }
    if(sd === "B"){ const ant = new Path2D(d3.geoPath(pr)(feat(ANTARCTICA)) || "M0,0"); c.fillStyle = "#e8edf0"; c.fill(ant); }
  }
  // fine grooves pressed through the picture
  c.beginPath(); for(let r = RLABEL+22; r < RMAPR; r += 6){ c.moveTo(r,0); c.arc(0,0,r,0,TAU); }
  c.strokeStyle = "rgba(0,0,0,0.16)"; c.lineWidth = Math.min(2, 0.7/s); c.stroke();
  c.strokeStyle = "rgba(255,255,255,0.22)"; c.lineWidth = Math.min(1.2, 0.5/s); for(const l of RLANDS[sd]) c.stroke(l.p);
  for(const lat of [60,30]){ c.beginPath(); c.arc(0,0,rRing(lat),0,TAU); c.strokeStyle = "rgba(0,0,0,0.35)"; c.lineWidth = 7; c.stroke(); }
  for(const city of CITIES){ if(sd === "A" ? city.lat < 0 : city.lat > 0) continue; const [x,y] = pr([city.lon, city.lat]);
    const g = c.createRadialGradient(x,y,0,x,y,34); g.addColorStop(0,"rgba(255,199,110,0.75)"); g.addColorStop(1,"rgba(255,199,110,0)");
    c.beginPath(); c.arc(x,y,34,0,TAU); c.fillStyle = g; c.fill();
    c.beginPath(); c.arc(x,y,city.items.length>1?10:8,0,TAU); c.fillStyle = "#fff1d6"; c.fill(); }
  c.beginPath(); c.arc(0,0,RMAPR,0,TAU); c.strokeStyle = "rgba(0,0,0,0.6)"; c.lineWidth = 10; c.stroke();
  c.beginPath(); c.arc(0,0,RLABEL,0,TAU); c.fillStyle = sd === "A" ? RT.label : RT.label2; c.fill();
  c.save(); c.globalAlpha = 0.22; c.strokeStyle = RT.labelInk; c.lineWidth = 0.9;
  for(let k = 0; k < 14; k++){ c.beginPath();
    for(let i = 0; i <= 240; i++){ const t = i/240*TAU, rr = RLABEL*(0.5 + 0.07*Math.sin(11*t + k*TAU/14) + 0.03*Math.sin(29*t - k)); i ? c.lineTo(rr*Math.cos(t), rr*Math.sin(t)) : c.moveTo(rr*Math.cos(t), rr*Math.sin(t)); }
    c.stroke(); }
  c.restore();
  c.beginPath(); c.arc(0,0,RLABEL*0.93,0,TAU); c.strokeStyle = RT.labelInk; c.globalAlpha = .35; c.lineWidth = 1.4; c.stroke(); c.globalAlpha = 1;
  rArcText(c, "WORLD ON ROTATION · 33⅓ RPM · STEREO ·", RLABEL*0.8, -Math.PI/2, 13, RT.labelInk, 0.12);
  c.beginPath(); c.arc(0,0,11,0,TAU); c.fillStyle = RT.space; c.fill();
  return can;
}
function buildRecord(){
  RT = {ink:"#07090c", metal:"#22262d", metalDark:"#121418", metalHi:"#b9bdc4", paper:"#ece6da", accent:"#f0b45e", vinyl:"#0b0c0e", groove:"rgba(255,255,255,0.05)", grooveHi:"rgba(255,255,255,0.12)", edge:"#3b3e44", label:"#e3b46a", label2:"#a9bfa3", labelInk:"#1d1508", space:"#060c16", pin:"#ffc76e", lands:["#4d6b3c","#8a7650","#5d7a45","#a08a5c","#6b7f4a","#7d6a48","#56703f"]};
  rc.width = Math.round(W*dpr); rc.height = Math.round(H*dpr); rc.style.width = W+"px"; rc.style.height = H+"px";
  introLayout();
  DECKS.forEach(d => d.cache = buildSide(d.side, d.L.R));
}
function rNeedle(r){
  const {px,py,L:al} = RARM, d = Math.hypot(px,py), a = (r*r - al*al + d*d)/(2*d), h = Math.sqrt(Math.max(0, r*r - a*a));
  const n = [a*px/d + h*(-py/d), a*py/d + h*(px/d)]; return Math.atan2(n[1]-py, n[0]-px);
}
const SVGNS = "http://www.w3.org/2000/svg";
DECKS.forEach(d => {
  const g = document.createElementNS(SVGNS, "g"); $("#recarm").appendChild(g); d.el = {};
  for(const [k, tag, cls, filt] of [["post","circle","post"],["shadow","path","shadow",1],["cw","path","cw"],["b1","circle","base1"],["b2","circle","base2"],["tube","path","tube"],["tubehi","path","tube-hi"],["lift","path","lift"],["head","path","head"],["b3","circle","base3"]]){
    const e = document.createElementNS(SVGNS, tag); e.setAttribute("class", cls); if(filt) e.setAttribute("filter","url(#rblur)"); g.appendChild(e); d.el[k] = e;
  }
});
function drawArm(d){
  const {x:cx, y:cy, R} = d.L, E = d.el;
  const P = [cx + RARM.px*R, cy + RARM.py*R], Lp = RARM.L*R, dv = [Math.cos(d.arm), Math.sin(d.arm)];
  const N = [P[0]+dv[0]*Lp, P[1]+dv[1]*Lp], hd = [Math.cos(d.arm+0.4), Math.sin(d.arm+0.4)], hn = [-hd[1], hd[0]];
  const headLen = 0.12*R, J = [N[0]-hd[0]*headLen, N[1]-hd[1]*headLen];
  const pt = p => p[0].toFixed(1)+","+p[1].toFixed(1), add = (p,v,m) => [p[0]+v[0]*m, p[1]+v[1]*m], ts = add(P, dv, 0.04*R);
  E.tube.setAttribute("d", `M${pt(ts)}L${pt(J)}`); E.tube.setAttribute("stroke-width", 0.022*R);
  const ho = [-dv[1]*0.004*R, dv[0]*0.004*R];
  E.tubehi.setAttribute("d", `M${pt(add(ts,ho,-1))}L${pt(add(J,ho,-1))}`); E.tubehi.setAttribute("stroke-width", 0.006*R);
  const off = (0.012 + 0.03*d.lift)*R;
  E.shadow.setAttribute("d", `M${pt([ts[0]+off*0.6, ts[1]+off])}L${pt([J[0]+off*0.6, J[1]+off])}L${pt([N[0]+off*0.6, N[1]+off])}`); E.shadow.setAttribute("stroke-width", 0.03*R);
  const w = 0.05*R;
  E.head.setAttribute("d", `M${pt(add(J,hn,w*0.55))}L${pt(add(N,hn,w*0.38))}L${pt(add(N,hd,0.012*R))}L${pt(add(N,hn,-w*0.38))}L${pt(add(J,hn,-w*0.55))}Z`);
  const lm = add(J, hd, headLen*0.35);
  E.lift.setAttribute("d", `M${pt(add(lm,hn,-w*0.5))}L${pt(add(lm,hn,-w*1.25))}`); E.lift.setAttribute("stroke-width", 0.012*R);
  const cw0 = add(P,dv,-0.07*R), cw1 = add(P,dv,-0.23*R), cn = [-dv[1], dv[0]], cww = 0.042*R;
  E.cw.setAttribute("d", `M${pt(add(cw0,cn,cww))}L${pt(add(cw1,cn,cww))}L${pt(add(cw1,cn,-cww))}L${pt(add(cw0,cn,-cww))}Z`);
  for(const [k,r] of [["b1",0.09],["b2",0.055],["b3",0.02]]){ E[k].setAttribute("cx",P[0]); E[k].setAttribute("cy",P[1]); E[k].setAttribute("r", r*R); }
  const post = add(P, [Math.cos(RARM.rest), Math.sin(RARM.rest)], Lp*0.8);
  E.post.setAttribute("cx", post[0]); E.post.setAttribute("cy", post[1]); E.post.setAttribute("r", 0.028*R);
}
function rrect(c, x, y, w, h, r){ c.beginPath(); c.moveTo(x+r, y); c.arcTo(x+w, y, x+w, y+h, r); c.arcTo(x+w, y+h, x, y+h, r); c.arcTo(x, y+h, x, y, r); c.arcTo(x, y, x+w, y, r); c.closePath(); }
function box(b, fill, rad){
  const c = rctx;
  c.save(); c.shadowColor = "rgba(0,0,0,0.6)"; c.shadowBlur = Math.max(18, b.h*0.08); c.shadowOffsetY = Math.max(8, b.h*0.03);
  rrect(c, b.x, b.y, b.w, b.h, rad); const g = c.createLinearGradient(b.x, b.y, b.x, b.y + b.h);
  g.addColorStop(0, "#2c3139"); g.addColorStop(1, "#181b20"); c.fillStyle = g; c.fill(); c.restore();
  rrect(c, b.x + 0.5, b.y + 0.5, b.w - 1, b.h - 1, rad); c.lineWidth = 1; c.strokeStyle = "rgba(255,255,255,0.09)"; c.stroke();
}
function knob(x, y, r, ang){ const c = rctx, g = c.createRadialGradient(x - r*0.3, y - r*0.3, r*0.1, x, y, r);
  g.addColorStop(0, "#4a505a"); g.addColorStop(1, "#1c1f24"); c.beginPath(); c.arc(x, y, r, 0, TAU); c.fillStyle = g; c.fill();
  c.beginPath(); c.moveTo(x + Math.cos(ang)*r*0.3, y + Math.sin(ang)*r*0.3); c.lineTo(x + Math.cos(ang)*r*0.85, y + Math.sin(ang)*r*0.85); c.lineWidth = Math.max(1.5, r*0.16); c.lineCap = "round"; c.strokeStyle = RT.paper; c.stroke(); }
function fader(x0, y0, x1, y1, t, kw, kh){ const c = rctx; c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.lineWidth = Math.max(2, kw*0.18); c.strokeStyle = "#07090c"; c.lineCap = "round"; c.stroke();
  const x = x0 + (x1-x0)*t, y = y0 + (y1-y0)*t; c.save(); c.shadowColor = "rgba(0,0,0,0.5)"; c.shadowBlur = 6; c.shadowOffsetY = 2;
  rrect(c, x - kw/2, y - kh/2, kw, kh, Math.min(kw, kh)*0.2); c.fillStyle = "#3a3f47"; c.fill(); c.restore();
  c.beginPath(); c.moveTo(x - kw/2 + 3, y); c.lineTo(x + kw/2 - 3, y); c.lineWidth = 1.5; c.strokeStyle = RT.paper; c.stroke(); }
function drawIntro(){
  if(!DECKS[0].cache || !RIG) return;
  const c = rctx, R = RIG.R;
  c.setTransform(1,0,0,1,0,0); c.clearRect(0,0,rc.width,rc.height); c.setTransform(dpr,0,0,dpr,0,0);
  // mixer
  const m = RIG.mixer; box(m, RT.metal, Math.max(6, R*0.06));
  for(const [i, fx] of [[0, 0.3], [1, 0.7]].map(([i,f]) => [i, m.x + m.w*f])){
    for(let k=0;k<3;k++) knob(fx, m.y + R*(0.24 + k*0.2), R*0.065, -Math.PI*0.75 + (i ? 0.4 : 0.9)*k);
    fader(fx, m.y + R*0.95, fx, m.y + R*1.65, i ? 0.25 : 0.35, R*0.13, R*0.07);
  }
  fader(m.x + m.w*0.18, m.y + R*1.95, m.x + m.w*0.82, m.y + R*1.95, (xf + 1)/2, R*0.1, R*0.14);
  // turntables
  DECKS.forEach((d, i) => {
    const p = RIG.plinths[i], {x:cx, y:cy} = d.L;
    box(p, RT.metal, Math.max(8, R*0.08));
    // platter with strobe dots
    c.save(); c.shadowColor = "rgba(0,0,0,0.55)"; c.shadowBlur = R*0.06; c.shadowOffsetY = R*0.02;
    c.beginPath(); c.arc(cx, cy, R*1.05, 0, TAU); c.fillStyle = "#0e1013"; c.fill(); c.restore();
    c.beginPath(); c.arc(cx, cy, R*1.05, 0, TAU); c.lineWidth = 1; c.strokeStyle = "rgba(255,255,255,0.1)"; c.stroke();
    c.fillStyle = "rgba(200,205,212,0.8)";
    for(let k=0;k<72;k++){ const a = d.rot + k/72*TAU; c.beginPath(); c.arc(cx + Math.cos(a)*R*1.025, cy + Math.sin(a)*R*1.025, Math.max(0.8, R*0.008), 0, TAU); c.fill(); }
    c.save(); c.translate(cx, cy); c.rotate(d.rot); c.drawImage(d.cache, -R, -R, 2*R, 2*R); c.restore();
    if(c.createConicGradient){ const g = c.createConicGradient(0.45, cx, cy);
      g.addColorStop(0,"rgba(255,255,255,0)"); g.addColorStop(.08,"rgba(255,255,255,.11)"); g.addColorStop(.17,"rgba(255,255,255,0)"); g.addColorStop(.5,"rgba(255,255,255,0)"); g.addColorStop(.58,"rgba(255,255,255,.08)"); g.addColorStop(.67,"rgba(255,255,255,0)"); g.addColorStop(1,"rgba(255,255,255,0)");
      c.beginPath(); c.arc(cx,cy,R,0,TAU); c.fillStyle = g; c.fill(); }
    // start/stop and speed buttons
    const bx = p.x + R*0.12, by = p.y + p.h - R*0.3;
    rrect(c, bx, by, R*0.36, R*0.2, R*0.03); c.fillStyle = (entering === d || d.playing) ? RT.accent : "#101216"; c.fill();
    for(let k=0;k<2;k++){ rrect(c, bx + R*(0.46 + k*0.2), by + R*0.05, R*0.15, R*0.1, R*0.02); c.fillStyle = k === 0 ? "rgba(240,180,94,0.85)" : "#3a3f47"; c.fill(); }
    if(R > 120){ c.font = `600 ${Math.round(R*0.06)}px "Instrument Sans", system-ui, sans-serif`; c.fillStyle = (entering === d || d.playing) ? "#1e1407" : RT.paper; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText("START", bx + R*0.18, by + R*0.1); }
    // pitch slider
    fader(p.x + p.w - R*0.16, cy + R*0.05, p.x + p.w - R*0.16, p.y + p.h - R*0.18, 0.5, R*0.14, R*0.07);
    drawArm(d);
  });
}
function introTick(dt){
  const f = reduce ? 1 : Math.min(1, dt*4);
  xf += (xfTarget - xf)*Math.min(1, reduce ? 1 : dt*6);
  for(const d of DECKS){
    // Both records turn the way the Earth does: Side A (north pole up) anticlockwise, Side B (south pole up) clockwise
    d.rot += dt * (entering === d ? TAU/5 : d.playing ? TAU/9 : d.speed) * (reduce ? 0 : 1) * (d.side === "A" ? -1 : 1);
    d.arm += (d.armTarget - d.arm)*f; d.lift += ((entering === d || d.playing) ? 0 : 1) - d.lift > 0 ? Math.min(1, dt*5)*(((entering === d || d.playing) ? 0 : 1) - d.lift) : Math.min(1, dt*5)*(((entering === d || d.playing) ? 0 : 1) - d.lift);
  }
  drawIntro();
}
function deckAt(x, y){ if(!RIG) return null; const i = RIG.plinths.findIndex(p => x >= p.x && x <= p.x + p.w && y >= p.y && y <= p.y + p.h); return i < 0 ? null : DECKS[i]; }
function enterGlobe(d){
  if(entering || !d) return;
  entering = d; d.armTarget = rNeedle(0.62); xfTarget = d.side === "A" ? -1 : 1;
  setTimeout(() => {
    world.resumeAnimation(); fitGlobe();
    world.pointOfView({lat: d.side === "A" ? 88 : -88, lng: d.side === "A" ? 10 : 25, altitude: 3.2}, 0);
    intro.classList.add("out"); app.classList.remove("landing");
    setTimeout(() => world.pointOfView(d.side === "A" ? {lat:22, lng:10, altitude:1.85} : {lat:-20, lng:25, altitude:1.85}, reduce ? 0 : 2200), 60);
    setTimeout(() => { introOn = false; intro.hidden = true; lastInteract = performance.now(); }, reduce ? 0 : 700);
    if(location.hash === "#random") history.replaceState(null, "", location.pathname + location.search);
  }, reduce ? 0 : 950);
}
function showRecord(){
  closePanel(); app.classList.add("landing"); startLanding();
  entering = null; xfTarget = 0; DECKS.forEach(d => { if(!d.playing){ d.armTarget = RARM.rest; d.lift = 1; } });
  intro.hidden = false; introOn = true; introLayout(); drawIntro(); setTimeout(() => { if(introOn) world.pauseAnimation(); }, 800);
  requestAnimationFrame(() => intro.classList.remove("out"));
}
intro.addEventListener("pointermove", e => { if(entering) return; const r = intro.getBoundingClientRect(), d = deckAt(e.clientX - r.left, e.clientY - r.top); xfTarget = d ? (d.side === "A" ? -0.7 : 0.7) : (current ? (current.lat >= 0 ? -1 : 1) : 0); intro.style.cursor = d ? "pointer" : "default"; });
intro.addEventListener("click", e => { const r = intro.getBoundingClientRect(); enterGlobe(deckAt(e.clientX - r.left, e.clientY - r.top)); });
/* ---------- A vehicle travels the route while its place is selected: a train between nearby places joined by land,
   a boat when the way is mostly sea, a plane for everything else ---------- */
const PLANE = document.createElement("div"); PLANE.className = "wor-plane"; PLANE.hidden = true;
// The vehicles are emoji, so every phone and computer draws them in its own style
PLANE.innerHTML = '<span class="v-plane">\u2708\uFE0F</span><span class="v-train">\u{1F682}</span><span class="v-bus">\u{1F68C}</span><span class="v-boat">\u{1F6A2}</span>';
let FLIGHT = null, ROUTE = null, LANDMASK = null, TRAIL = null, MASKWAIT = null;
new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = WOR.img + "land-mask.png" + IMGV; }).then(im => {
  const cv = document.createElement("canvas"); cv.width = im.width; cv.height = im.height;
  const g = cv.getContext("2d"); g.drawImage(im, 0, 0);
  try { const d = g.getImageData(0, 0, im.width, im.height).data, a = new Uint8Array(im.width * im.height); for(let k = 0; k < a.length; k++) a[k] = d[k * 4] > 127 ? 1 : 0; LANDMASK = { w: im.width, h: im.height, a }; } catch(e){}
  if(MASKWAIT){ const w = MASKWAIT; MASKWAIT = null; if(activeCity === w.to) flyPlane(w.from, w.to); }
  setTimeout(loadNets, 1500);
}).catch(() => {});
function isLand(lon, lat){ const M = LANDMASK; if(!M) return true; const x = Math.min(M.w - 1, Math.max(0, ((lon + 180) / 360 * M.w) | 0)), y = Math.min(M.h - 1, Math.max(0, ((90 - lat) / 180 * M.h) | 0)); return M.a[y * M.w + x] === 1; }
/* Real connections (checked November 2026). Trains only where passenger trains run, across borders only where an
   international passenger service runs. Buses where scheduled coaches run, with changes, inside regions whose borders
   are open to them. Everything else flies, or sails when the way is mostly sea. */
const ZONE = list => new Set(list.split("|"));
const RAIL_NETS = [
  // Europe, joined to the UK by the Channel Tunnel and to Istanbul by the Sofia sleeper
  ZONE("United Kingdom|France|Belgium|Netherlands|Luxembourg|Germany|Denmark|Norway|Sweden|Finland|Poland|Czechia|Slovakia|Austria|Switzerland|Italy|Slovenia|Croatia|Hungary|Romania|Bulgaria|Serbia|Montenegro|Spain|Portugal|Lithuania|Latvia|Estonia|Ukraine|Moldova|Turkey|Türkiye"),
  ZONE("Georgia|Azerbaijan|Armenia"),                                    // Tbilisi–Baku (resumed May 2026), Tbilisi–Yerevan
  ZONE("Russia|Belarus|Kazakhstan|Uzbekistan|Kyrgyzstan|Tajikistan|Turkmenistan|Mongolia|China|Vietnam|Laos|Thailand|Malaysia"),
  ZONE("Ethiopia|Djibouti"),                                            // Addis Ababa–Djibouti
  ZONE("Tanzania|Zambia"),                                              // TAZARA (resumed 2026)
  ZONE("United States of America|United States|Canada")                 // Amtrak and VIA Rail
];
// Countries with intercity passenger trains of their own
const RAIL_HOME = ZONE("Ireland|Greece|Macedonia|North Macedonia|Bosnia and Herz.|Bosnia & Herz.|Iran|India|Pakistan|Bangladesh|Sri Lanka|Japan|South Korea|Taiwan|Indonesia|Vietnam|Morocco|Algeria|Tunisia|Egypt|Kenya|Nigeria|Cameroon|Gabon|Congo|Angola|Mozambique|South Africa|Zimbabwe|Botswana|Namibia|Mexico|Argentina|Chile|Peru|Australia|New Zealand|Saudi Arabia|Uzbekistan|Ukraine");
const BUS_ZONES = [
  ZONE("United Kingdom|Ireland|France|Belgium|Netherlands|Luxembourg|Germany|Denmark|Norway|Sweden|Finland|Poland|Czechia|Slovakia|Austria|Switzerland|Italy|Slovenia|Croatia|Bosnia and Herz.|Bosnia & Herz.|Serbia|Montenegro|Kosovo|Albania|Macedonia|North Macedonia|Greece|Hungary|Romania|Bulgaria|Spain|Portugal|Lithuania|Latvia|Estonia|Ukraine|Moldova|Turkey|Türkiye|Georgia|Armenia|Iran"),
  ZONE("Russia|Belarus|Kazakhstan|Kyrgyzstan|Uzbekistan|Tajikistan|Mongolia|Georgia"),
  ZONE("Lebanon|Syria|Jordan"),
  ZONE("Saudi Arabia|United Arab Emirates|Oman|Qatar|Kuwait|Jordan"),
  ZONE("Iraq|Turkey|Türkiye|Iran"),
  ZONE("Senegal|Gambia|Guinea-Bissau|Guinea|Sierra Leone|Liberia|Mali|Burkina Faso|Côte d'Ivoire|Ghana|Togo|Benin|Nigeria|Niger|Mauritania"),
  ZONE("Morocco|W. Sahara|Mauritania|Senegal"),
  ZONE("Tunisia|Algeria|Libya"),
  ZONE("Kenya|Uganda|Tanzania|Rwanda|Burundi|Ethiopia|Zambia|Malawi|Mozambique|Zimbabwe|Botswana|Namibia|South Africa|Lesotho|eSwatini"),
  ZONE("India|Nepal|Bhutan"),
  ZONE("Thailand|Laos|Cambodia|Vietnam|Malaysia|China"),
  ZONE("United States of America|United States|Canada|Mexico|Guatemala|Belize|El Salvador|Honduras|Nicaragua|Costa Rica|Panama"),
  ZONE("Colombia|Venezuela|Ecuador|Peru|Bolivia|Chile|Argentina|Uruguay|Paraguay|Brazil")
];
const names = c => c && c.ci ? [c.ci.raw, c.ci.name].filter(Boolean) : [c.country];
const sameCountry = (a, b) => names(a).some(n => names(b).includes(n));
const inBoth = (sets, a, b) => sets.some(z => names(a).some(n => z.has(n)) && names(b).some(n => z.has(n)));
const byRail = (a, b) => inBoth(RAIL_NETS, a, b) || (sameCountry(a, b) && (names(a).some(n => RAIL_HOME.has(n)) || inBoth(RAIL_NETS, a, a)));
const byBus = (a, b) => sameCountry(a, b) || inBoth(BUS_ZONES, a, b);
/* Overland routes follow the land: a shortest path over a land map, which may hop short stretches of water
   (a tunnel, a bridge, a ferry) but never more than about 70 km in all */
function landPath(a, b){
  const M = LANDMASK; if(!M || Math.abs(a.lon - b.lon) > 180) return null;
  const cw = 360 / M.w, toX = lon => Math.min(M.w - 1, Math.max(0, ((lon + 180) / 360 * M.w) | 0)), toY = lat => Math.min(M.h - 1, Math.max(0, ((90 - lat) / 180 * M.h) | 0));
  let x0 = toX(a.lon), y0 = toY(a.lat), x1 = toX(b.lon), y1 = toY(b.lat);
  const pad = Math.round(8 / cw), bx0 = Math.max(0, Math.min(x0, x1) - pad), bx1 = Math.min(M.w - 1, Math.max(x0, x1) + pad), by0 = Math.max(0, Math.min(y0, y1) - pad), by1 = Math.min(M.h - 1, Math.max(y0, y1) + pad);
  const BW = bx1 - bx0 + 1, N = BW * (by1 - by0 + 1), land = (x, y) => M.a[y * M.w + x] === 1;
  const snap = (x, y) => { if(land(x, y)) return [x, y]; for(let r = 1; r <= 6; r++) for(let dy = -r; dy <= r; dy++) for(let dx = -r; dx <= r; dx++){ const X = x + dx, Y = y + dy; if(X >= bx0 && X <= bx1 && Y >= by0 && Y <= by1 && land(X, Y)) return [X, Y]; } return [x, y]; };
  [x0, y0] = snap(x0, y0); [x1, y1] = snap(x1, y1);
  const kmY = 111.2 * cw, kmX = y => kmY * Math.max(0.05, Math.cos((90 - (y + 0.5) / M.h * 180) * Math.PI / 180));
  const id = (x, y) => (y - by0) * BW + (x - bx0), hcost = (x, y) => Math.hypot((x - x1) * kmX(y), (y - y1) * kmY);
  const g = new Float32Array(N).fill(Infinity), wet = new Float32Array(N), prev = new Int32Array(N).fill(-1), done = new Uint8Array(N);
  const hp = [], hf = [];
  const push = (n, f) => { hp.push(n); hf.push(f); let i = hp.length - 1; while(i > 0){ const q = (i - 1) >> 1; if(hf[q] <= hf[i]) break; [hp[q], hp[i]] = [hp[i], hp[q]]; [hf[q], hf[i]] = [hf[i], hf[q]]; i = q; } };
  const pop = () => { const top = hp[0], ln = hp.pop(), lf = hf.pop(); if(hp.length){ hp[0] = ln; hf[0] = lf; let i = 0; for(;;){ const l = 2 * i + 1, r = l + 1; let m = i; if(l < hp.length && hf[l] < hf[m]) m = l; if(r < hp.length && hf[r] < hf[m]) m = r; if(m === i) break; [hp[m], hp[i]] = [hp[i], hp[m]]; [hf[m], hf[i]] = [hf[i], hf[m]]; i = m; } } return top; };
  const s0 = id(x0, y0), goal = id(x1, y1); g[s0] = 0; push(s0, hcost(x0, y0));
  let found = false, it = 0;
  while(hp.length && it++ < 400000){
    const n = pop(); if(done[n]) continue; done[n] = 1; if(n === goal){ found = true; break; }
    const x = n % BW + bx0, y = (n / BW | 0) + by0;
    for(let dy = -1; dy <= 1; dy++) for(let dx = -1; dx <= 1; dx++){
      if(!dx && !dy) continue; const X = x + dx, Y = y + dy; if(X < bx0 || X > bx1 || Y < by0 || Y > by1) continue;
      const m = id(X, Y); if(done[m]) continue;
      const km = Math.hypot(dx * kmX(y), dy * kmY), sea = !land(X, Y), w = wet[n] + (sea ? km : 0);
      if(w > 70) continue;
      const c = g[n] + km * (sea ? 8 : 1);
      if(c < g[m]){ g[m] = c; wet[m] = w; prev[m] = n; push(m, c + hcost(X, Y)); }
    }
  }
  if(!found) return null;
  let pts = []; for(let n = goal; n !== -1; n = prev[n]) pts.push([(n % BW + bx0 + 0.5) * cw - 180, 90 - ((n / BW | 0) + by0 + 0.5) * cw]);
  pts.reverse(); pts[0] = [a.lon, a.lat]; pts[pts.length - 1] = [b.lon, b.lat];
  // simplify, then round the corners
  const dp = (P, tol) => { if(P.length < 3) return P; let md = 0, mi = 0; const [ax, ay] = P[0], [bx, by] = P[P.length - 1], L = Math.hypot(bx - ax, by - ay) || 1e-9;
    for(let i = 1; i < P.length - 1; i++){ const d = Math.abs((bx - ax) * (ay - P[i][1]) - (ax - P[i][0]) * (by - ay)) / L; if(d > md){ md = d; mi = i; } }
    return md > tol ? dp(P.slice(0, mi + 1), tol).slice(0, -1).concat(dp(P.slice(mi), tol)) : [P[0], P[P.length - 1]]; };
  pts = dp(pts, cw * 1.6);
  for(let k = 0; k < 3; k++){ const o = [pts[0]]; for(let i = 0; i < pts.length - 1; i++){ const [ax, ay] = pts[i], [bx, by] = pts[i + 1]; o.push([ax * 0.75 + bx * 0.25, ay * 0.75 + by * 0.25], [ax * 0.25 + bx * 0.75, ay * 0.25 + by * 0.75]); } o.push(pts[pts.length - 1]); pts = o; }
  let km = 0; for(let i = 1; i < pts.length; i++) km += d3.geoDistance(pts[i - 1], pts[i]) * 6371;
  return { line: pts, km };
}
function coastal(c){ for(let r = 0.15; r <= 0.6; r += 0.15) for(let k = 0; k < 12; k++){ const t = k * Math.PI / 6; if(!isLand(c.lon + r * Math.cos(t) / Math.max(0.2, Math.cos(c.lat * Math.PI / 180)), c.lat + r * Math.sin(t))) return true; } return false; }
const PLANS = new Map();
function planRoute(a, b){
  const key = a.city + ">" + b.city; if(LANDMASK && PLANS.has(key)) return PLANS.get(key);
  if(!LANDMASK) return { mode: "plane", line: null };
  const D = d3.geoDistance([a.lon, a.lat], [b.lon, b.lat]), straight = D * 6371;
  let res = null;
  const lp = straight < 7000 ? landPath(a, b) : null;
  if(lp && lp.km < straight * 1.8 + 200){
    if(byRail(a, b) && lp.km < 6000) res = { mode: "train", line: lp.line };
    else if(byBus(a, b) && lp.km < 2200) res = { mode: "bus", line: lp.line };
  }
  if(!res){
    // Ships only where a ship would really sail: two coastal cities, open sea all the way between them (a few islands at most),
    // and no further than an ocean crossing like Lagos to Salvador. Anything else flies.
    const ip = d3.geoInterpolate([a.lon, a.lat], [b.lon, b.lat]), n = Math.max(30, Math.ceil(D * 180 / Math.PI / 0.25)), edge = 150 / straight; let land = 0, cnt = 0;
    for(let k = 1; k < n; k++){ const t = k / n; if(t < edge || t > 1 - edge) continue; const q = ip(t); cnt++; if(isLand(q[0], q[1])) land++; }
    res = { mode: straight < 6500 && cnt > 0 && land / cnt < 0.04 && coastal(a) && coastal(b) ? "boat" : "plane", line: null };
  }
  // follow the real railway or main road when the data has one
  if(res.mode === "train" || res.mode === "bus"){ if(!NETLOAD) loadNets(); const real = netPath(res.mode === "train" ? "rail" : "road", a, b); if(real) res.line = smoothLine(real.line); }
  PLANS.set(key, res); return res;
}
function routeMode(a, b){ return planRoute(a, b).mode; }
// Real lines come with small kinks from the data: resample every 4 km and smooth them, so the line and the vehicle on it flow
function smoothLine(pts){
  const step = 4 / 6371, rs = [pts[0]]; let need = step;
  for(let i = 1; i < pts.length; i++){
    const p0 = pts[i - 1], p1 = pts[i], L = d3.geoDistance(p0, p1); if(!L) continue;
    const ip = d3.geoInterpolate(p0, p1); let at = 0;
    while(L - at >= need){ at += need; rs.push(ip(at / L)); need = step; }
    need -= L - at;
  }
  rs.push(pts[pts.length - 1]);
  let cur = rs;
  for(let pass = 0; pass < 3; pass++){
    const nx = cur.map((q, i) => {
      if(i === 0 || i === cur.length - 1) return q;
      const w = Math.min(5, i, cur.length - 1 - i); let x = 0, y = 0;
      for(let k = -w; k <= w; k++){ x += cur[i + k][0]; y += cur[i + k][1]; }
      return [x / (2 * w + 1), y / (2 * w + 1)];
    });
    cur = nx;
  }
  return cur;
}
// Real railways and main roads (Natural Earth, public domain): loaded once after the globe, then used to trace train and bus routes
const NETS = { rail: null, road: null }; let NETLOAD = null;
function loadNets(){
  if(NETLOAD) return NETLOAD;
  const get = k => fetch(WOR.img + "net-" + k + ".json" + IMGV).then(r => r.json()).then(d => {
    const N = d.n.length / 2, adj = Array.from({ length: N }, () => []);
    d.e.forEach((e, i) => { adj[e[0]].push(i); adj[e[1]].push(i); });
    NETS[k] = { n: d.n, e: d.e, adj, N };
  }).catch(() => {});
  NETLOAD = Promise.all([get("rail"), get("road")]).then(() => {
    PLANS.clear();
    if(ROUTE && ROUTE.to && activeCity === ROUTE.to && (ROUTE.mode === "train" || ROUTE.mode === "bus")) flyPlane(ROUTE.from, ROUTE.to);
  });
  return NETLOAD;
}
function netPath(kind, a, b){
  const G = NETS[kind]; if(!G) return null;
  const n = G.n, rad = Math.PI / 180, km = (x0, y0, x1, y1) => d3.geoDistance([x0, y0], [x1, y1]) * 6371;
  const near = c => {
    let best = Infinity, bi = -1; const cl = Math.cos(c.lat * rad);
    for(let i = 0; i < G.N; i++){ if(!G.adj[i].length) continue; const dx = (n[2 * i] / 100 - c.lon) * cl, dy = n[2 * i + 1] / 100 - c.lat, d = dx * dx + dy * dy; if(d < best){ best = d; bi = i; } }
    return bi < 0 ? null : { i: bi, km: km(c.lon, c.lat, n[2 * bi] / 100, n[2 * bi + 1] / 100) };
  };
  const A = near(a), B = near(b), lim = kind === "rail" ? 120 : 150;
  if(!A || !B || A.km > lim || B.km > lim || A.i === B.i) return null;
  const dist = new Float64Array(G.N).fill(Infinity), via = new Int32Array(G.N).fill(-1), heap = [];
  const push = (d, i) => { heap.push([d, i]); let k = heap.length - 1; while(k){ const p = (k - 1) >> 1; if(heap[p][0] <= heap[k][0]) break; [heap[p], heap[k]] = [heap[k], heap[p]]; k = p; } };
  const pop = () => { const top = heap[0], last = heap.pop(); if(heap.length){ heap[0] = last; let k = 0; for(;;){ const l = 2 * k + 1, r = l + 1; let m = k; if(l < heap.length && heap[l][0] < heap[m][0]) m = l; if(r < heap.length && heap[r][0] < heap[m][0]) m = r; if(m === k) break; [heap[m], heap[k]] = [heap[k], heap[m]]; k = m; } } return top; };
  dist[A.i] = 0; push(0, A.i);
  while(heap.length){
    const [d, u] = pop(); if(u === B.i) break; if(d > dist[u]) continue;
    for(const ei of G.adj[u]){ const e = G.e[ei], v = e[0] === u ? e[1] : e[0], nd = d + e[2]; if(nd < dist[v]){ dist[v] = nd; via[v] = ei; push(nd, v); } }
  }
  if(!isFinite(dist[B.i])) return null;
  const total = dist[B.i] / 10 + A.km + B.km, straight = km(a.lon, a.lat, b.lon, b.lat);
  if(total > straight * 2.2 + 300) return null;
  const P = i => [n[2 * i] / 100, n[2 * i + 1] / 100], seq = [];
  for(let u = B.i; u !== A.i; ){ const ei = via[u], e = G.e[ei]; seq.push([ei, u]); u = e[0] === u ? e[1] : e[0]; }
  seq.reverse();
  const pts = [[a.lon, a.lat], P(A.i)];
  for(const [ei, end] of seq){
    const e = G.e[ei], r = e[3] || [], x0 = n[2 * e[0]], y0 = n[2 * e[0] + 1], inner = [];
    for(let k = 0; k < r.length; k += 2) inner.push([(x0 + r[k]) / 100, (y0 + r[k + 1]) / 100]);
    if(end === e[0]) inner.reverse();
    inner.forEach(q => pts.push(q)); pts.push(P(end));
  }
  pts.push([b.lon, b.lat]);
  return { line: pts, km: total };
}
// A road or railway winds a little, the way real ones do; the same line every time for the same two places
function windingLine(a, b){
  const D = d3.geoDistance([a.lon, a.lat], [b.lon, b.lat]) * 180 / Math.PI, ip = d3.geoInterpolate([a.lon, a.lat], [b.lon, b.lat]);
  const n = Math.max(24, Math.ceil(D / 0.15)), r = rng(hash(a.city + ">" + b.city)), k1 = 1.5 + r() * 2, k2 = 3 + r() * 3, ph1 = r() * 6.28, ph2 = r() * 6.28;
  const amp = Math.min(1.2, D * 0.07), pts = [];
  for(let i = 0; i <= n; i++){
    const t = i / n, q = ip(t), q0 = ip(Math.max(0, t - 0.01)), q1 = ip(Math.min(1, t + 0.01));
    const cos = Math.max(0.2, Math.cos(q[1] * Math.PI / 180)), dx = (q1[0] - q0[0]) * cos, dy = q1[1] - q0[1], L = Math.hypot(dx, dy) || 1;
    const off = amp * Math.sin(Math.PI * t) * (0.65 * Math.sin(k1 * Math.PI * t + ph1) + 0.35 * Math.sin(k2 * Math.PI * t + ph2));
    pts.push([q[0] + (-dy / L) * off / cos, q[1] + (dx / L) * off]);
  }
  pts[0] = [a.lon, a.lat]; pts[n] = [b.lon, b.lat];
  return pts;
}
let BASEPATHS = [], ROUTEPATHS = [];
let TRIPPATHS = [];
/* Preview: faint latitude and longitude lines every 15 degrees, like an old printed map. Add ?grid to the address to see them. */
if(/[?&]grid\b/.test(location.search)){
  BASEPATHS = d3.geoGraticule().step([15, 15]).extent([[-180, -75], [180, 75.001]]).lines().map(l => {
    const c = l.coordinates, out = [];
    for(let i = 1; i < c.length; i++){ const ip = d3.geoInterpolate(c[i - 1], c[i]), n = Math.max(1, Math.ceil(d3.geoDistance(c[i - 1], c[i]) * 180 / Math.PI / 2)); for(let k = i === 1 ? 0 : 1; k <= n; k++){ const q = ip(k / n); out.push([q[0], q[1], 0.0034]); } }
    out.color = "rgba(160,142,108,0.5)"; out.stroke = 0.8; return out;
  });
  setTimeout(setPaths, 0);
}
function setPaths(){ world.pathsData(BASEPATHS.concat(TRIPPATHS, ROUTEPATHS)); }
/* The visitor's own journey, kept in their browser: a dotted line from each place they boarded to the next */
const TRIP_KEY = PASS_KEY + "-trip";
let TRIP = [];
try { TRIP = JSON.parse(localStorage.getItem(TRIP_KEY) || "null"); } catch(e){ TRIP = null; }
if(!Array.isArray(TRIP)) TRIP = Object.entries(MYPASS).sort((a, b) => a[1] < b[1] ? -1 : a[1] > b[1] ? 1 : 0).map(e => e[0]);
TRIP = TRIP.filter(c => CITIES.some(x => x.city === c));
function addToTrip(city){
  if(TRIP[TRIP.length - 1] === city) return;
  TRIP.push(city); if(TRIP.length > 60) TRIP = TRIP.slice(-60);
  try { localStorage.setItem(TRIP_KEY, JSON.stringify(TRIP)); } catch(e){}
  drawTrip();
}
function drawTrip(){
  TRIPPATHS = [];
  for(let i = 1; i < TRIP.length; i++){
    const a = CITIES.find(x => x.city === TRIP[i - 1]), b = CITIES.find(x => x.city === TRIP[i]); if(!a || !b || a === b) continue;
    const ip = d3.geoInterpolate([a.lon, a.lat], [b.lon, b.lat]), deg = d3.geoDistance([a.lon, a.lat], [b.lon, b.lat]) * 180 / Math.PI || 1;
    const n = Math.max(12, Math.ceil(deg / 1.5)), line = d3.range(n + 1).map(k => { const q = ip(k / n); return [q[0], q[1], 0.0035]; });
    line.color = "rgba(163,48,43,0.85)"; line.stroke = 1.9; line.dash = 0.9 / deg; line.gap = 1.1 / deg;
    TRIPPATHS.push(line);
  }
  setPaths();
}
setTimeout(drawTrip, 0);
// Draw the route: a railway or a road for land, a dotted line for sea and air
function drawRoute(a, b, mode, given){
  let line = null; ROUTEPATHS = [];
  if(mode === "train" || mode === "bus"){
    line = given || windingLine(a, b);
    const len = d3.geoLength({ type: "LineString", coordinates: line }) * 180 / Math.PI || 1;
    const lift = (pts, h) => { const x = pts.map(q => [q[0], q[1], h]); return x; };
    if(mode === "train"){                                    // a map railway: a thin line crossed by sleepers
      const halo = lift(line, 0.0045); halo.color = "rgba(246,239,226,0.8)"; halo.stroke = 5;
      const ties = lift(line, 0.005); ties.color = "#2a2f3a"; ties.stroke = 6.5; ties.dash = 0.07 / len; ties.gap = 0.45 / len;
      const rail = lift(line, 0.0052); rail.color = "#2a2f3a"; rail.stroke = 1.6;
      ROUTEPATHS = [halo, ties, rail];
    } else {                                                  // a map road: one solid black line on a pale edge
      const halo = lift(line, 0.0045); halo.color = "rgba(246,239,226,0.85)"; halo.stroke = 5;
      const road = lift(line, 0.005); road.color = "#151515"; road.stroke = 2.4;
      ROUTEPATHS = [halo, road];
    }
    world.arcsData([]);
  } else world.arcsData([{ startLat: a.lat, startLng: a.lon, endLat: b.lat, endLng: b.lon, alt: mode === "plane" ? null : 0 }]);
  setPaths();
  return line;
}
// The vehicle keeps travelling the route, again and again, for as long as its destination is the selected place
function flyPlane(a, b){
  ROUTE = { from: a, to: b };
  const D = d3.geoDistance([a.lon, a.lat], [b.lon, b.lat]); if(D < 0.003) return;
  if(!PLANE.parentNode){ const host = world.renderer().domElement.parentElement; host.appendChild(PLANE); }
  if(!LANDMASK){ MASKWAIT = { from: a, to: b }; }
  const plan = planRoute(a, b), mode = ROUTE.mode = plan.mode, line = drawRoute(a, b, mode, plan.line);
  PLANE.dataset.mode = mode;
  const ip = d3.geoInterpolate([a.lon, a.lat], [b.lon, b.lat]);
  const v = (lng, lat, h) => { const r = 100 * (1 + h), la = lat * Math.PI / 180, ln = lng * Math.PI / 180; return [r * Math.cos(la) * Math.sin(ln), r * Math.sin(la), r * Math.cos(la) * Math.cos(ln)]; };
  let at;
  if(mode === "plane"){
    const alt = D / 2 * 0.42, m1 = ip(0.25), m2 = ip(0.75), P = [v(a.lon, a.lat, 0), v(m1[0], m1[1], alt * 1.5), v(m2[0], m2[1], alt * 1.5), v(b.lon, b.lat, 0)];
    at = k => { const u = 1 - k; return [0, 1, 2].map(i => u * u * u * P[0][i] + 3 * u * u * k * P[1][i] + 3 * u * k * k * P[2][i] + k * k * k * P[3][i]); };
  } else if(line){
    const cum = [0]; for(let i = 1; i < line.length; i++) cum.push(cum[i - 1] + d3.geoDistance(line[i - 1], line[i]));
    const tot = cum[cum.length - 1] || 1;
    at = k => { const target = k * tot; let i = d3.bisectLeft(cum, target); i = Math.max(1, Math.min(line.length - 1, i)); const f = (target - cum[i - 1]) / ((cum[i] - cum[i - 1]) || 1), q = d3.geoInterpolate(line[i - 1], line[i])(Math.max(0, Math.min(1, f))); return v(q[0], q[1], 0.0052); };
  } else at = k => { const q = ip(k); return v(q[0], q[1], 0.002); };
  const slow = mode === "plane" ? 1 : mode === "boat" ? 1.35 : 1.5, km = line ? d3.geoLength({ type: "LineString", coordinates: line }) * 6371 : D * 6371;
  FLIGHT = { at, t0: performance.now(), dur: Math.min(14000, (5200 + D * 3200) * slow), to: b, mode, span: Math.min(0.08, Math.max(0.005, 50 / (km || 1))) };
}
(function planeTick(){
  requestAnimationFrame(planeTick);
  if(!FLIGHT){ if(!PLANE.hidden) PLANE.hidden = true; return; }
  const stay = activeCity && activeCity === FLIGHT.to;
  if(stay) FLIGHT.seen = true; else if(FLIGHT.seen){ FLIGHT = null; PLANE.hidden = true; return; } // the place was closed: the vehicle goes
  let t = (performance.now() - FLIGHT.t0) / FLIGHT.dur;
  if(t >= 1){ if(stay){ FLIGHT.t0 = performance.now() + 700; FLIGHT.hs = FLIGHT.left = undefined; } else { FLIGHT = null; } return; }
  if(t < 0){ PLANE.hidden = true; if(!stay) FLIGHT = null; return; }
  const e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  const lla = q => { const r = Math.hypot(q[0], q[1], q[2]); return [Math.asin(q[1] / r) * 180 / Math.PI, Math.atan2(q[0], q[2]) * 180 / Math.PI, r / 100 - 1]; };
  const p = FLIGHT.at(e), q = FLIGHT.at(Math.min(1, e + 0.01)), A = lla(p), B = lla(q);
  // hidden while it is behind the globe
  const c = world.camera().position, d = [p[0] - c.x, p[1] - c.y, p[2] - c.z];
  const qa = d[0] * d[0] + d[1] * d[1] + d[2] * d[2], qb = 2 * (c.x * d[0] + c.y * d[1] + c.z * d[2]), qc = c.x * c.x + c.y * c.y + c.z * c.z - 100 * 100, disc = qb * qb - 4 * qa * qc;
  const behind = disc > 0 && (-qb - Math.sqrt(disc)) / (2 * qa) < 0.995;
  const s1 = world.getScreenCoords(A[0], A[1], A[2]), s2 = world.getScreenCoords(B[0], B[1], B[2]);
  let ang = Math.atan2(s2.y - s1.y, s2.x - s1.x) * 180 / Math.PI, flip = 1;
  if(FLIGHT.mode === "plane") ang += 45;                      // the plane emoji points up and to the right
  else {                                                       // seen from the side: the body lies along the line and turns with it, never upside down
    const sp = FLIGHT.span || 0.01, u = FLIGHT.at(Math.max(0, e - sp)), w = FLIGHT.at(Math.min(1, e + sp)), U = lla(u), V = lla(w);
    const a1 = world.getScreenCoords(U[0], U[1], U[2]), a2 = world.getScreenCoords(V[0], V[1], V[2]);
    const raw = Math.atan2(a2.y - a1.y, a2.x - a1.x) * 180 / Math.PI, wrap = x => ((x + 540) % 360) - 180;
    FLIGHT.hs = FLIGHT.hs === undefined ? raw : wrap(FLIGHT.hs + wrap(raw - FLIGHT.hs) * 0.1);   // turn gently, never snap
    const h = FLIGHT.hs, ah = Math.abs(h);
    if(FLIGHT.left === undefined) FLIGHT.left = ah > 90; else if(FLIGHT.left && ah < 70) FLIGHT.left = false; else if(!FLIGHT.left && ah > 110) FLIGHT.left = true;
    if(FLIGHT.left){ flip = -1; ang = h > 0 ? h - 180 : h + 180; } else ang = h;
  }
  const sc = FLIGHT.mode === "plane" ? 0.85 + Math.min(0.5, A[2] * 2.2) : 1;
  PLANE.hidden = behind;
  PLANE.style.opacity = String(Math.min(1, t * 8, (1 - t) * 8));
  if(FLIGHT.mode !== "plane") flip = -flip;                    // the train, bus and ship emoji face left
  PLANE.style.transform = `translate(${s1.x}px, ${s1.y}px) rotate(${ang}deg) scale(${sc * flip}, ${sc})`;
})();
/* The boarding pass for a mix: route, flight, mix, the captain with their face, flight time */
function fillPass(p){
  const comp = COMPILERS[p.by] || {name: ""}, home = visitorCity(), dest = CITIES.find(x => x.city === p.city);
  $("#bar-art").innerHTML = stamp(p, 44); $("#bar-title").textContent = p.title;
  $("#bp-from").textContent = home.code; $("#bp-fromc").textContent = home.name;
  $("#bp-to").textContent = dest ? dest.code : code3(p.city); $("#bp-toc").textContent = p.city;
  $("#bp-flight").textContent = "Flight RP " + String(hash(p.id) % 9000 + 1000);
  $("#bp-captain").textContent = comp.name + (p.mixcloud || p.spotify ? "" : " · demo audio");
  const face = $("#bp-face"); if(face){ if(comp.photo){ face.src = comp.photo; face.hidden = false; } else face.hidden = true; }
  $("#bp-time").textContent = durLabel(p.dur);
}
/* 3. Tapping a stamp gives the boarding pass first; the music starts when the visitor presses Board */
let BOARDING = null;
function boardingPass(p){
  if(current) return;             // something is already playing: the panel's Board button switches flights
  BOARDING = p; fillPass(p);
  const bar = $("#bar"); bar.classList.add("boarding"); bar.hidden = false; app.classList.add("has-bar");
  $("#bar-show").textContent = "Board ▶"; $("#bar-show").classList.add("primary");
  requestAnimationFrame(() => { app.style.setProperty("--barh", bar.offsetHeight + "px"); });
}
function playMix(p){
  const to = CITIES.find(x => x.city === p.city);
  const from = (TRAIL && TRAIL !== to) ? TRAIL : current ? CITIES.find(x => x.city === current.city) : (CITIES.find(x => x.city === "London") || null);
  if(to) TRAIL = to;
  if(from && to && from !== to){ if(!introOn) flyPlane(from, to); else { const pl = planRoute(from, to); ROUTE = { from, to, mode: pl.mode }; drawRoute(from, to, pl.mode, pl.line); } }
  current = p; addToTrip(p.city);
  const bar = $("#bar"); bar.classList.remove("boarding");
  $("#bar-art").innerHTML = stamp(p, 44);
  $("#bar-title").textContent = p.title;
  const home = visitorCity(), dest = CITIES.find(x => x.city === p.city);
  $("#bp-from").textContent = home.code; $("#bp-fromc").textContent = home.name;
  $("#bp-to").textContent = dest ? dest.code : code3(p.city); $("#bp-toc").textContent = p.city;
  $("#bp-flight").textContent = "Flight RP " + String(hash(p.id) % 9000 + 1000);
  fillPass(p);
  $("#bp-time").textContent = durLabel(p.dur);
  addPassStamp(p.city);
  $("#bar-frame").src = (!p.mixcloud && p.spotify) ? p.spotify + "?utm_source=generator&theme=0" : `https://player-widget.mixcloud.com/widget/iframe/?hide_cover=1&mini=1&autoplay=1&feed=${encodeURIComponent(p.mixcloud || DEMO_FEED)}`;
  bar.hidden = false; app.classList.add("has-bar");
  requestAnimationFrame(() => { app.style.setProperty("--barh", bar.offsetHeight + "px"); });
  const d = DECKS.find(x => x.side === (p.lat >= 0 ? "A" : "B"));
  DECKS.forEach(x => { x.playing = x === d; if(x !== d && entering !== x){ x.armTarget = RARM.rest; } });
  d.armTarget = rNeedle(Math.max(0.15, rRing(p.lat)/RU));
}
$("#bar-show").onclick = () => {
  if(BOARDING && !current){ const p = BOARDING; BOARDING = null; $("#bar-show").textContent = "Show on globe"; $("#bar-show").classList.remove("primary"); playMix(p); const b = $("#playThis"); if(b) b.textContent = "Playing now"; return; }
  if(!current) return;
  if(introOn) enterGlobe(DECKS.find(x => x.side === (current.lat >= 0 ? "A" : "B")));
  setTimeout(() => openCity(current.city, current.id), introOn ? 2400 : 0);
};
/* Which half of the world the visitor is in, guessed from their time zone (no location permission needed).
   Add ?from=north or ?from=south to the address to test either side. */
const SOUTH_TZ = /^(Australia|Antarctica)\/|^Pacific\/(Auckland|Chatham|Fiji|Tongatapu|Apia|Noumea|Efate|Port_Moresby|Tahiti|Rarotonga|Pago_Pago|Norfolk|Pitcairn|Easter|Gambier|Marquesas|Niue|Wallis|Funafuti|Nauru|Guadalcanal)|^America\/(Sao_Paulo|Argentina|Buenos_Aires|Santiago|Montevideo|Asuncion|La_Paz|Lima|Bahia|Recife|Fortaleza|Belem|Maceio|Cuiaba|Campo_Grande|Porto_Velho|Rio_Branco|Manaus|Araguaina|Santarem|Punta_Arenas|Noronha|Eirunepe|Guayaquil)|^Africa\/(Johannesburg|Maputo|Harare|Lusaka|Windhoek|Gaborone|Maseru|Mbabane|Luanda|Kinshasa|Lubumbashi|Lilongwe|Blantyre|Dar_es_Salaam|Bujumbura|Kigali|Brazzaville|Nairobi)|^Indian\/(Antananarivo|Mauritius|Reunion|Mayotte|Comoro|Kerguelen)|^Asia\/(Jakarta|Makassar|Jayapura|Dili)|^Atlantic\/(St_Helena|South_Georgia|Stanley)/;
function visitorSide(){
  let q = null; try { q = new URLSearchParams(location.search).get("from"); } catch(e){}
  if(!q){ const m = location.hash.match(/from-(north|south)/); if(m) q = m[1]; }
  if(q) return q === "south" ? "B" : "A";
  let tz = ""; try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ""; } catch(e){}
  return SOUTH_TZ.test(tz) ? "B" : "A";
}
function visitorCity(){
  let tz = ""; try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ""; } catch(e){}
  const name = (tz.split("/").pop() || "Home").replace(/_/g, " ");
  return {name, code: code3(name) || "HOM"};
}
/* On arrival, with nothing asked for in the address: a departures board with a dozen mixes listed like flights,
   the first one boarding. The globe turns slowly to it. Tapping a row gives its boarding pass; Board starts the music. */
function featureOnArrival(){
  if(location.hash || introOn || isOpen() || current) return;
  const sd = visitorSide(), mine = PLAYLISTS.filter(p => sd === "A" ? p.lat >= 0 : p.lat < 0), rest = PLAYLISTS.filter(p => !mine.includes(p));
  const shuffle = a => a.map(x => [Math.random(), x]).sort((u, v) => u[0] - v[0]).map(x => x[1]);
  const list = shuffle(mine).concat(shuffle(rest)).slice(0, 12); if(!list.length) return;
  const now = new Date(), hhmm = m => String(Math.floor(m / 60)).padStart(2, "0") + ":" + String(m % 60).padStart(2, "0");
  const flap = (txt, cls = "") => `<span class="fl ${cls}">${[...txt].map((ch, i) => `<b data-c="${esc(ch)}" style="--d:${i * 45}ms">${ch === " " ? "&nbsp;" : esc(ch)}</b>`).join("")}</span>`;
  const rows = list.map((p, i) => { const dest = CITIES.find(x => x.city === p.city), comp = COMPILERS[p.by] || {name: ""};
    return `<button class="dep-row" type="button" data-id="${p.id}" style="--r:${i}">
      ${flap(localTime(dest && dest.tz) || hhmm(((now.getUTCHours() * 60 + now.getUTCMinutes() + Math.round(p.lon / 15) * 60) % 1440 + 1440) % 1440), "dep-time")}${flap((dest ? dest.code : code3(p.city)).padEnd(3, " "), "dep-code")}
      <span class="dep-mix"><strong>${esc(p.title)}</strong><small>${styleTags(p).length ? `<em>${styleTags(p).slice(0, 2).map(esc).join(" · ")}</em> · ` : ""}${esc(p.city)}</small></span>
      ${i === 0 ? `<span class="dep-st">BOARDING</span>` : ""}</button>`; }).join("");
  const board = document.createElement("section"); board.className = "deps"; board.setAttribute("aria-label", "Departures");
  board.innerHTML = `<div class="deps-head"><button class="deps-fold" type="button" aria-expanded="true">Departures <small>local time there</small><i aria-hidden="true">▾</i></button><span class="deps-clock">${hhmm(now.getHours() * 60 + now.getMinutes())}</span><button class="deps-x" type="button" aria-label="Close">×</button></div><div class="deps-list">${rows}</div>`;
  app.appendChild(board); const h = $("#hint"), hv = h && !h.hidden; if(h) h.hidden = true;
  // the split-flap letters riffle through the alphabet before they settle
  if(!reduce){
    // one animation loop for every letter: each riffles until its own moment, then shows its real character
    const abc = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789", t0 = performance.now(), cells = [...board.querySelectorAll(".fl b")].filter(b => b.dataset.c !== " ")
      .map((b, j) => ({b, end: b.dataset.c, at: 250 + j * 38 + Math.random() * 260, last: 0}));
    const tick = now => { let busy = false;
      for(const c of cells){ if(c.done) continue; const t = now - t0;
        if(t >= c.at){ c.b.textContent = c.end; c.done = true; continue; }
        busy = true; if(now - c.last > 55){ c.last = now; c.b.textContent = abc[Math.floor(Math.random() * abc.length)]; } }
      if(busy && board.isConnected) requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
  }
  const gone = () => board.remove();
  // the board folds down to its title as soon as the visitor starts exploring the globe; tapping the title opens it again
  const fold = on => { board.classList.toggle("folded", on); board.querySelector(".deps-fold").setAttribute("aria-expanded", on ? "false" : "true"); };
  board.querySelector(".deps-fold").onclick = () => fold(!board.classList.contains("folded"));
  const gv = document.getElementById("globeViz"), explore = () => fold(true);
  gv.addEventListener("pointerdown", explore, {passive: true}); gv.addEventListener("wheel", explore, {passive: true});
  board.querySelector(".deps-x").onclick = () => { gone(); if(hv && !current) h.hidden = false; };
  board.querySelectorAll(".dep-row").forEach(r => r.onclick = () => { const p = byId(r.dataset.id); openCity(p.city, p.id); boardingPass(p); });
  const p = list[0];
  if(!reduce){
    lastInteract = performance.now() + 7000;   // hold the idle spin while the globe turns
    const pov = world.pointOfView();
    world.pointOfView({lat: Math.max(-50, Math.min(55, p.lat)) * 0.7, lng: p.lon, altitude: Math.max(1.5, Math.min(pov.altitude, 2.1))}, 6500);
  }
  // the board steps aside once the visitor boards a flight
  const watch = setInterval(() => { if(current){ gone(); clearInterval(watch); } }, 500);
}
setTimeout(featureOnArrival, 2200);
function startLanding(){
  const sd = visitorSide(), pool = PLAYLISTS.filter(p => sd === "A" ? p.lat >= 0 : p.lat < 0);
  const p = pool[Math.floor(Math.random()*pool.length)];
  xfTarget = sd === "A" ? -1 : 1;
  playMix(p);
}
intro.querySelectorAll(".deck-btn").forEach((b, i) => b.addEventListener("click", e => { e.stopPropagation(); enterGlobe(DECKS[i]); }));


/* ---------- Controls ---------- */

const zoomBy = f => { const p = world.pointOfView(); world.pointOfView({lat:p.lat, lng:p.lng, altitude:Math.max(0.15, Math.min(4, p.altitude/f))}, 400); lastInteract = performance.now(); };
$("#zin").onclick = () => zoomBy(1.7);
$("#zout").onclick = () => zoomBy(1/1.7);
$("#zreset").onclick = () => { const p = world.pointOfView(); world.pointOfView({lat:22, lng:p.lng, altitude:1.85}, 900); };
document.addEventListener("keydown", e => {
  if(e.target.closest("input,textarea")) return;
  if(e.key==="Escape"){ if(!$("#profile").hidden) location.hash="map"; else if(isOpen()) closePanel(); }
});
let rt; window.addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(() => { layout(); fitGlobe(); buildRecord(); }, 120); });
const mq = window.matchMedia("(prefers-color-scheme: dark)");
if(mq.addEventListener) mq.addEventListener("change", () => { readTokens(); buildRecord(); });
new MutationObserver(() => { readTokens(); buildRecord(); }).observe(document.documentElement, {attributes:true, attributeFilter:["data-theme"]});

(function grain(){
  const c = document.createElement("canvas"); c.width = c.height = 240; const g = c.getContext("2d"), im = g.createImageData(240, 240);
  for(let i=0;i<im.data.length;i+=4){ const v = Math.random(); im.data[i] = 70; im.data[i+1] = 62; im.data[i+2] = 50; im.data[i+3] = v < 0.55 ? v*46 : (v > 0.992 ? 120 : 0); }
  g.putImageData(im, 0, 0); $("#grain").style.backgroundImage = `url(${c.toDataURL()})`;
})();
layout(); fitGlobe(); readTokens(); buildRecord(); route();
if(document.fonts && document.fonts.ready) document.fonts.ready.then(buildRecord);
/* rp-newtab: every link that leaves the globe opens in a new tab */
document.addEventListener("click", e => { const a = e.target.closest && e.target.closest("a[href]"); if(!a) return; const h = a.getAttribute("href") || ""; if(h.startsWith("#")) return; a.target = "_blank"; a.rel = "noopener"; }, true);
