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
  const c = {city, items, lat:items[0].lat, lon:items[0].lon, country:items[0].country, tz:items[0].tz, code:items[0].code};
  c.ci = countryByName.get(c.country) || COUNTRY.find(k => d3.geoContains(k.feat, [c.lon, c.lat])) || null;
  return c;
});
COUNTRY.forEach(k => { [k.lon, k.lat] = k.centroid; });
$("#stats").textContent = `${PLAYLISTS.length} mixes and playlists · ${CITIES.length} places · ${new Set(PLAYLISTS.map(p=>p.by)).size} selectors`;

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
  return {kind:"country", c, lat:p.lat, lng:p.lon, a:p.a, text:name.toUpperCase()};
}).sort((x, y) => y.a - x.a);
const CITY_LABELS = CITIES.map(c => ({kind:"city", c, lat:c.lat, lng:c.lon, text:c.city}));
function labelEl(d){
  if(d.el) return d.el;
  const el = document.createElement("div"), s = document.createElement("span");
  el.className = "glabel " + d.kind; s.textContent = d.kind === "city" ? d.text : d.text.toLowerCase();
  if(d.kind === "country") s.style.fontSize = (Math.max(9, Math.min(12, 8.5 + Math.sqrt(d.a)*16))).toFixed(1) + "px";
  let down = null;
  s.addEventListener("pointerdown", e => { down = [e.clientX, e.clientY]; });
  s.addEventListener("click", e => { e.stopPropagation(); labelClickAt = performance.now();
    if(down && Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 8) return; // a drag that started on a label spins the globe
    d.kind === "city" ? openCity(d.c.city) : openCountry(d.c); });
  for(const t of ["pointerup", "mouseup"]) s.addEventListener(t, e => { labelClickAt = performance.now(); });
  el.appendChild(s); d.el = el; return el;
}
const PIN = "#ffc76e", PIN_ON = "#fff4dc";
const world = Globe({animateIn:false})(document.getElementById("globeViz"))
  .globeImageUrl(WOR.img + "earth-blue-marble.jpg" + IMGV).bumpImageUrl(WOR.img + "earth-topology.png" + IMGV).backgroundColor("rgba(0,0,0,0)")
  .showAtmosphere(true).atmosphereColor("#7fb6ff").atmosphereAltitude(0.16)
  .pathsData(BORDERS).pathPoints(d => d).pathPointLat(p => p[1]).pathPointLng(p => p[0]).pathPointAlt(0.002)
  .pathColor(() => "rgba(255,255,255,0.2)").pathStroke(null).pathTransitionDuration(0)
  .polygonsData([]).polygonCapColor(() => "rgba(255,214,150,0.13)").polygonSideColor(() => "rgba(0,0,0,0)")
  .polygonStrokeColor(() => "rgba(255,226,170,0.85)").polygonAltitude(0.005).polygonCapCurvatureResolution(1.5).polygonsTransitionDuration(0)
  .pointsData(CITIES).pointLat("lat").pointLng("lon").pointAltitude(0.003).pointsMerge(false).pointsTransitionDuration(0)
  .pointRadius(d => 0.2 + 0.09*Math.sqrt(d.items.length)).pointColor(d => d === activeCity ? PIN_ON : PIN)
  .onPointHover(d => { document.body.style.cursor = d ? "pointer" : ""; })
  .arcsData([]).arcColor(() => ["rgba(255,199,110,0.2)", "rgba(255,199,110,0.95)"]).arcStroke(0.5).arcAltitudeAutoScale(0.42)
  .arcDashLength(0.35).arcDashGap(0.12).arcDashInitialGap(1).arcDashAnimateTime(2600).arcsTransitionDuration(0)
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
world.ringsData(CITIES).ringLat("lat").ringLng("lon").ringAltitude(0.0028)
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
      world.lights().forEach(l => { if(l.isAmbientLight) l.intensity *= 0.72; if(l.isDirectionalLight) l.intensity *= 1.35; });
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
        hd = true;
        if(roomy) img(WOR.img + "earth-hd.jpg" + IMGV).then(i => {
          const t = new Tex(i), old = mat.map; if(old.colorSpace) t.colorSpace = old.colorSpace;
          t.anisotropy = aniso; t.needsUpdate = true; mat.map = t; mat.needsUpdate = true; old.dispose();
        }).catch(() => {});
        fetch(WOR.img + "borders-50m.json" + IMGV).then(r => r.json()).then(l => { fine = l; wantDetail(world.pointOfView().altitude); }).catch(() => {});
      }
      if(!fine) return;
      if(alt < 1.1 && !fineOn){ fineOn = true; world.pathsData(fine); }
      else if(alt > 1.5 && fineOn){ fineOn = false; world.pathsData(BORDERS); }
    };
    wantDetail(world.pointOfView().altitude);
    try {
      const w = await img(WOR.img + "earth-water.jpg" + IMGV), wt = new Tex(w); wt.needsUpdate = true;
      mat.specularMap = wt; mat.specular.set("#5b6b7a"); mat.shininess = 16; mat.needsUpdate = true;
    } catch(e){}
    try {
      const c = await img(WOR.img + "clouds.jpg" + IMGV), ct = new Tex(c); ct.needsUpdate = true;
      const R = world.getGlobeRadius(), seg = globe.geometry.parameters || {};
      const geo = new globe.geometry.constructor(R * 1.011, seg.widthSegments || 75, seg.heightSegments || 75);
      const cm = new mat.constructor({ color: 0xffffff, alphaMap: ct, transparent: true, opacity: cloudOp, depthWrite: false, shininess: 0 });
      clouds = new globe.constructor(geo, cm); clouds.renderOrder = 1; clouds.raycast = () => {};
      world.scene().add(clouds); setCloudsFor(world.pointOfView().altitude);
      const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
      (function drift(){ if(!still) clouds.rotation.y += 0.00006; requestAnimationFrame(drift); })();
    } catch(e){}
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
  world.htmlElementsData([...COUNTRY_LABELS.filter(l => l.a >= minA), ...CITY_LABELS]);
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
  world.polygonsData(hl && hl.feat ? [hl.feat] : []);
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
  const order = [...data].sort((x, y) => (x.kind === "city" ? 1e9 + x.c.items.length : x.a) < (y.kind === "city" ? 1e9 + y.c.items.length : y.a) ? 1 : -1);
  for(const d of order){
    const s = d.el && d.el.firstChild; if(!s) continue;
    let show = d3.geoDistance([d.lng, d.lat], centre) < horizon;
    if(show){
      const {x, y} = world.getScreenCoords(d.lat, d.lng, 0.006);
      if(!d.w){ d.w = s.offsetWidth; d.h = s.offsetHeight; }
      if(d.kind === "city"){ placed.push([x - 6, y - 10, x + 9 + d.w, y + 8]); }
      else {
        /* A country name that would sit on a city label or a bigger neighbour's name slides up or down a little instead of vanishing */
        show = false;
        for(const o of [0, -1.25, 1.25, -2.5, 2.5]){
          const dy = o*d.h, b = [x - d.w/2, y - d.h/2 + dy, x + d.w/2, y + d.h/2 + dy];
          if(!overlaps(b, placed)){ placed.push(b); s.style.top = dy + "px"; show = true; break; }
        }
      }
    }
    s.style.visibility = show ? "visible" : "hidden";
  }
}
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
  const pls = cities.flatMap(c => c.items);
  openPanel(`
    <div class="panel-head">
      <div><h2>${esc(k.name)}</h2>
        <div class="where"><span>${pls.length} ${pls.length===1?"mix or playlist":"mixes and playlists"}</span><span>${cities.length} place${cities.length===1?"":"s"}</span></div></div>
      <button class="close" type="button" aria-label="Close">×</button>
    </div>
    <div class="panel-body">
      ${cities.length ? `
        <div><div class="label" style="margin-bottom:8px">Places</div>
          <div class="cities">${cities.map(c=>`<button class="citybtn" type="button" data-city="${esc(c.city)}">${esc(c.city)} <small>${c.items.length}</small></button>`).join("")}</div></div>
        <div><div class="label" style="margin-bottom:8px">All mixes and playlists from ${esc(k.name)}</div>
          <div class="list">${pls.map(p=>`<button class="item" type="button" data-id="${p.id}">${stamp(p,52)}<span><span class="item-title">${esc(p.title)}</span><br><span class="item-sub">${esc(COMPILERS[p.by].name)} · ${esc(p.city)}</span></span><span class="item-dur">${durLabel(p.dur)}</span></button>`).join("")}</div></div>`
      : `<div class="empty"><strong>Nothing from ${esc(k.name)} yet</strong><p>No selector has pinned a mix or playlist here so far. On the live site, this is where a selector from ${esc(k.name)} would be invited to add the first one.</p></div>`}
      ${countryGuide(k.name)}
    </div>`);
  $("#panel").querySelectorAll("[data-city]").forEach(b => b.onclick = () => openCity(b.dataset.city));
  $("#panel").querySelectorAll(".item").forEach(b => b.onclick = () => { const p = byId(b.dataset.id); openCity(p.city, p.id); });
  updatePinClasses(); updateNow(); dirty = true;
  flyTo(k);
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
  activeCity = c; activeCountry = null;
  const sel = playlistId || (player.id && c.items.some(i=>i.id===player.id) ? player.id : c.items[0].id);
  const lt = localTime(c.tz);
  openPanel(`
    <div class="panel-head">
      <div>
        <div class="visa-top"><span>Visa · ${iso3(c.country)}</span><span>No. ${c.code} ${String(c.items.length).padStart(4, "0")}</span></div>
        <h2>${esc(c.city)}</h2>
        <div class="where">${c.ci ? `<button class="crumb" type="button" data-country="${esc(c.ci.name)}">${esc(c.country)}</button>` : `<span>${esc(c.country)}</span>`}<span>${coord(c.lat,c.lon)}</span>${lt ? `<span>Local time ${lt}</span>` : ""}</div>
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
      <div class="chips">${p.genres.map(g=>`<span class="chip">${esc(g)}</span>`).join("")}</div>
      <p class="desc">${esc(p.desc)}</p>
      <div class="actions">
        <button class="btn primary" type="button" id="playThis">${on ? "Playing now" : "▶ Play this mix"}</button>
        <a class="btn" href="playlists/${p.slug || slugOf(p.title)}/">Playlist page</a>
        <a class="btn" href="#compiler-${p.by}">${esc(comp.name.split(" ")[0])}'s profile →</a>
      </div>
      ${p.mixcloud ? "" : `<p class="deck-note">Demo audio: Rhythm Passport Vol.1 by DJ Ni Mo stands in until this playlist's own Mixcloud link is added.</p>`}
    </div>`;
  $("#playThis").onclick = () => { playMix(p); $("#playThis").textContent = "Playing now"; };
  if(autoplay && !(current && current.id === p.id)){ playMix(p); $("#playThis").textContent = "Playing now"; }
}
function closePanel(){
  $("#panel").hidden = true; app.classList.remove("is-open");
  activeCity = null; activeCountry = null; cueTarget = null;
  updatePinClasses(); updateNow(); dirty = true; lastInteract = performance.now(); recenter();
}

/* ---------- Profile page ---------- */
function stamp(p, size=104){
  const h = hash(p.id), r = rng(h), rot = (r()*18 - 9).toFixed(1), v = h % 3;
  const INKS = ["#24498a", "#a3302b", "#2d6a44", "#5a3d88", "#1d6466", "#7a4719"], col = INKS[(h >>> 3) % INKS.length];
  const d = new Date(p.added + "T12:00:00Z");
  const date = `${String(d.getUTCDate()).padStart(2,"0")} ${["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"][d.getUTCMonth()]} ${d.getUTCFullYear()}`;
  const uid = "s" + hash(p.id + size), city = esc(plain(p.city).toUpperCase());
  const who = p.by && COMPILERS[p.by] ? esc(plain(COMPILERS[p.by].name).toUpperCase()) : (p.who ? esc(p.who) : "RHYTHM PASSPORT");
  const M = `font-family="IBM Plex Mono,ui-monospace,monospace"`, B = `font-family="Barlow Condensed,Arial Narrow,sans-serif" font-weight="600"`;
  let body;
  if(v === 0) body = `
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
function passCount(){ const n = Object.keys(MYPASS).length; const el = $("#my-pass-n"); if(el) el.textContent = n; return n; }
function addPassStamp(city){
  if(MYPASS[city]) return;
  MYPASS[city] = new Date().toISOString().slice(0, 10);
  try { localStorage.setItem(PASS_KEY, JSON.stringify(MYPASS)); } catch(e){}
  passCount();
  const c = CITIES.find(x => x.city === city), t = $("#toast");
  if(!c || !t) return;
  t.innerHTML = `${stamp({id:"me-" + city, city, code:c.code, added:MYPASS[city], who:"YOUR PASSPORT"}, 52)}<div><strong>Stamped: ${esc(city)}</strong><small>${passCount()} of ${CITIES.length} places in your passport</small></div>`;
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
      ${got.length ? `<div class="stamps-grid">${got.map(c => `<button class="stampcard" type="button" data-city="${esc(c.city)}">${stamp({id:"me-" + c.city, city:c.city, code:c.code, added:MYPASS[c.city], who:"YOUR PASSPORT"}, 120)}<small>${esc(c.city)}<br>${dateLabel(MYPASS[c.city])}</small></button>`).join("")}</div>`
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
function route(){ const h = location.hash.slice(1); if(h === "random"){ closeProfile(); if(!introOn) showRecord(); return; } if(h.startsWith("city-")){ closeProfile(); const cc = CITIES.find(x => slugOf(x.city) === h.slice(5)); if(cc) openCity(cc.city); return; } if(h.startsWith("compiler-")) openProfile(h.slice(9)); else closeProfile(); }
window.addEventListener("hashchange", route);

/* ---------- Search ---------- */
const q = $("#q"), results = $("#results");
q.addEventListener("input", () => {
  const t = plain(q.value.trim().toLowerCase());
  if(!t){ results.hidden = true; return; }
  const m = s => plain(s.toLowerCase()).includes(t), hits = [];
  COUNTRY.forEach(k=>{ if(m(k.name)){ const n = CITIES.filter(c=>c.ci===k).reduce((a,c)=>a+c.items.length,0); hits.push({label:k.name,sub:`Country · ${n}`,go:()=>openCountry(k)}); } });
  CITIES.forEach(c=>{ if(m(c.city)) hits.push({label:c.city,sub:`${c.items.length} ${c.items.length>1?"mixes and playlists":"mix or playlist"}`,go:()=>openCity(c.city)}); });
  PLAYLISTS.forEach(p=>{ if(m(p.title)||m(p.genres.join(" "))) hits.push({label:p.title,sub:p.city,go:()=>openCity(p.city,p.id)}); });
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
  im.src = WOR.img + "earth-blue-marble.jpg" + IMGV;
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
function playMix(p){
  const from = current ? CITIES.find(x => x.city === current.city) : (CITIES.find(x => x.city === "London") || null), to = CITIES.find(x => x.city === p.city);
  if(from && to && from !== to) world.arcsData([{startLat:from.lat, startLng:from.lon, endLat:to.lat, endLng:to.lon}]);
  current = p;
  const bar = $("#bar");
  $("#bar-art").innerHTML = stamp(p, 44);
  $("#bar-title").textContent = p.title;
  const home = visitorCity(), dest = CITIES.find(x => x.city === p.city);
  $("#bp-from").textContent = home.code; $("#bp-fromc").textContent = home.name;
  $("#bp-to").textContent = dest ? dest.code : code3(p.city); $("#bp-toc").textContent = p.city;
  $("#bp-flight").textContent = "Flight RP " + String(hash(p.id) % 9000 + 1000);
  $("#bp-captain").textContent = COMPILERS[p.by].name + (p.mixcloud || p.spotify ? "" : " · demo audio");
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
