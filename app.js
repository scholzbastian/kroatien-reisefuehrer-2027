'use strict';
/* Ohne Tracking, Serverkonto oder externe Routing-API. Alle persönlichen Daten: localStorage. */
const STORE_KEY='adriaguide-2027-local-v3';
const colorByTour={t1:'#ce7055',t2:'#238a89',t3:'#2778a8'};
const dayLabel=d=>new Date(d+'T12:00:00').toLocaleDateString('de-DE',{weekday:'long',day:'numeric',month:'long'});
const fmtDate=d=>new Date(d+'T12:00:00').toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit'});
function restore(){try{return JSON.parse(localStorage.getItem(STORE_KEY))||{}}catch{return {}}}
let persisted=restore();
const state={page:'home',place:null,tour:null,visit:new Set(persisted.visit||[]),favorites:new Set(persisted.favorites||[]),added:new Set(persisted.added||[]),dates:persisted.dates||{},gpsEnabled:false,nearby:null,nearNote:null,search:'',filter:'all',discoverTour:'t1',discoverTime:60, onlinePhotos:persisted.onlinePhotos!==false,largerText:!!persisted.largerText,voiceURI:persisted.voiceURI||'',speed:Number(persisted.speed)||0.92,audioHistory:persisted.audioHistory||null,mapZoom:1,showMapNames:true};
let geoWatch=null,geoLastMessage='',toastTimer=null;
const player={place:null,index:0,active:false,paused:false,segments:[],segmentIndex:0,spoken:0,generation:0,total:0,mainSeries:false};
const byId=id=>PLACES.find(p=>p.id===id);
const tourById=id=>TRAVEL.tours.find(t=>t.id===id);
function persist(){try{localStorage.setItem(STORE_KEY,JSON.stringify({visit:[...state.visit],favorites:[...state.favorites],added:[...state.added],dates:state.dates,onlinePhotos:state.onlinePhotos,largerText:state.largerText,voiceURI:state.voiceURI,speed:state.speed,audioHistory:state.audioHistory}))}catch(e){notice('Speicherplatz nicht verfügbar – Änderungen gelten nur bis zum Schließen.')}}
const h=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const attr=h;
const photoLocal=p=>'assets/'+(p.image||'sea')+'-illustration.jpg';
function photoUrl(file){return 'https://commons.wikimedia.org/wiki/Special:FilePath/'+encodeURIComponent(file).replaceAll('%20','_')+'?width=860'}
function urlNav(search){return 'https://www.google.com/maps/dir/?api=1&destination='+encodeURIComponent(search)+'&travelmode=driving'}
function appleNav(search,mode='driving'){return 'https://maps.apple.com/?daddr='+encodeURIComponent(search)+'&dirflg='+(mode==='walking'?'w':'d')}
function googleWalk(search){return 'https://www.google.com/maps/dir/?api=1&destination='+encodeURIComponent(search)+'&travelmode=walking'}
function btn(label,action,value,kind='primary',other=''){return `<button type="button" class="btn ${kind}" data-action="${h(action)}" data-value="${attr(value??'') }" ${other}>${label}</button>`}
function navButton(p,sm=false){return `<a class="btn ${sm?'small':'primary'}" href="${attr(urlNav(p.nav))}" target="_blank" rel="noopener noreferrer">↗ Navigation starten</a>`}
function label(p){return p.required?'<span class="pill mandatory">● Pflichtziel</span>':'<span class="pill optional">◇ Optional</span>'}
function image(p,cls='card-img'){return `<img class="${cls}" src="${photoLocal(p)}" alt="Mediterrane Reiseillustration zu ${attr(p.name)} – kein dokumentarisches Foto" loading="lazy">`}
function pCard(p,small=false){
 const visited=state.visit.has(p.id),favorite=state.favorites.has(p.id),added=state.added.has(p.id);
 return `<article class="card place-card ${visited?'mark-done':''}">
  <div class="relative">${image(p,'card-img')}<span class="photo-tag">Illustration</span></div>
  <div class="card-pad"><div class="kicker">${h(tourById(p.tour).name)} · ${p.required?'Pflichtziel':'freiwillig'}</div>
  <h3>${h(p.name)}</h3><p class="card-subtitle">${h(p.label)}</p>
  <div class="card-quick"><span>⏱ ${h(p.min)} Min.</span>${visited?'<span class="card-check">✓ Besucht</span>':''}</div>
  <div class="actions card-actions">${btn('Ort öffnen','place',p.id,'primary small')}${btn('Gehführung','walk-start',p.id,'soft small')}
  ${btn(favorite?'♥':'♡','favorite',p.id,'icon-only small',`aria-label="${favorite?'Aus Merkliste entfernen':'Zur Merkliste hinzufügen'}"`)}</div>
  ${!p.required?`<div class="card-optional">${btn(added?'✓ Zur Tour hinzugefügt':'＋ Zur Tour hinzufügen','add',p.id,'ghost small')}</div>`:''}</div></article>`;
}
function statusFor(d){if(d==='2027-08-08')return ['Anreise','arrive'];if(d==='2027-08-15')return ['Abreise','depart'];let t=TRAVEL.tours.find(x=>(state.dates[x.id]||x.date)===d);return t?[t.name,t.id]:['Freier Tag','free']}
function travelToday(){const today=new Date(), local=`${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;return local}
function renderHome(){
 const today=travelToday(),tripActive=today>=TRAVEL.start&&today<=TRAVEL.end;
 const day=tripActive?today:'2027-08-09',[name,key]=statusFor(day),activeTour=tripActive?tourById(key):null;
 const visited=PLACES.filter(p=>state.visit.has(p.id)).length;
 return `<section class="hero"><img src="assets/senj-illustration.jpg" alt="Mediterrane Reiseillustration der Adriaküste"><div class="hero-copy">
  <span class="hero-kicker">DEIN REISEBEGLEITER · 08.–15.08.2027</span><h1>Kroatien <span class="hero-em">2027</span></h1>
  <p>Burgen · Geschichte · Meerblicke</p></div></section>
 <div class="intro-section content-width"><div class="today-card">
  <div class="eyebrow">${tripActive?'Dein Urlaubstag':'Dein Reiseplan'}</div>
  <h2>${tripActive?h(name):'Deine Woche an der Adria'}</h2>
  <p>${!tripActive?'Drei historische Ausflüge, drei freie Tage – mit Novi Vinodolski als Ausgangspunkt.':key==='free'?'Heute ist bewusst frei. Kein Besichtigungsprogramm.':key==='arrive'?'Heute ist Anreise. Genieße das Ankommen.':key==='depart'?'Heute ist Abreise. Gute Heimfahrt!':'Deine Tour ist vorbereitet. Entdecke die Orte in deinem Tempo.'}</p>
  <div class="actions">${activeTour?btn('Heutige Tour starten','tour',activeTour.id,'primary'):btn('Touren ansehen','tab','tours','primary')}${btn('Orte in meiner Nähe','near','','ghost')}</div>
 </div>
 <div class="section-title"><h2>Deine drei Ausflüge</h2><span class="text-note">${visited} von ${PLACES.length} Orten besucht</span></div>
 <div class="three-col">${TRAVEL.tours.map(t=>tourCard(t)).join('')}</div>
 <details class="content-fold week-fold"><summary>Reiseübersicht: 8.–15. August</summary>
  <div class="date-grid">${TRAVEL.dates.map(([d])=>{let [title,key]=statusFor(d);return `<div class="date-tile ${key==='free'?'free':key==='arrive'||key==='depart'?'travel':'active'}"><b>${h(fmtDate(d))} · ${h(dayLabel(d).split(',')[0])}</b><small>${h(title)}</small></div>`}).join('')}</div>
  <p class="fine" style="margin:12px 0 0">Die Ausflugstage kannst du in den Tourdetails verschieben. Freie Tage bleiben frei.</p>
 </details>
 <div class="home-tools"><div><strong>Unterwegs hören oder entdecken</strong><small>Historische Geschichten und zusätzliche Stopps</small></div><div class="actions">${btn('Audioguides','tab','audio','soft small')}${btn('Entdecken','tab','discover','ghost small')}</div></div>
 </div>`;
}
function tourCard(t){
 let p=byId(t.stops[0]);return `<article class="card tour-card"><div class="relative">${image(p)}<span class="photo-tag">Illustration</span></div>
  <div class="card-pad"><div class="kicker">${h(dayLabel(state.dates[t.id]||t.date))}</div>
  <h3>${h(t.name)}</h3><p>${h(t.subtitle)}</p>
  <p class="tour-stops">${t.stops.map(id=>h(byId(id)?.name)).join(' · ')}</p>
  ${btn('Tour öffnen','tour',t.id,'primary full')}</div></article>`;
}
function routePlaces(t){
 let ids=t.stops.slice();
 if(t.id==='t1'){
  // Sveti Juraj liegt südlich von Senj; die Gradina gehört nach Ledenice.
  if(state.added.has('svetijuraj')) ids.splice(2,0,'svetijuraj');
  if(state.added.has('gradina')) ids.push('gradina');
 }else if(t.id==='t2'){
  if(state.added.has('grizane')) ids.splice(1,0,'grizane');
 }else for(const op of t.optional)if(state.added.has(op))ids.push(op);
 return ids.map(byId).filter(Boolean);
}
function googleRoute(origin,dest,waypoints=[]){
 return 'https://www.google.com/maps/dir/?api=1&origin='+encodeURIComponent(origin)+'&destination='+encodeURIComponent(dest)+
 (waypoints.length?'&waypoints='+encodeURIComponent(waypoints.join('|')):'')+'&travelmode=driving';
}
function routeSegments(t){
 const stops=routePlaces(t).map(p=>p.nav);
 // Google erlaubt im mobilen Browser höchstens drei Zwischenstopps.
 if(stops.length<=3)return [{label:'Gesamte Tagesroute',url:googleRoute(TRAVEL.base,TRAVEL.base,stops)}];
 const first=stops.slice(0,4);
 return [{label:'Tagesroute · Teil 1',url:googleRoute(TRAVEL.base,first[3],first.slice(0,3))},
         {label:'Tagesroute · Teil 2 und Rückfahrt',url:googleRoute(first[3],TRAVEL.base,stops.slice(4))}];
}
function routeUrl(t){return routeSegments(t)[0].url;}
function renderTour(id){
 let t=tourById(id)||TRAVEL.tours[0],fixed=t.stops.map(byId),opts=t.optional.map(byId);
 return `<div class="page tour-detail"><div class="page-header"><div class="eyebrow">Dein Ausflug · ${h(dayLabel(state.dates[t.id]||t.date))}</div><h1>${h(t.name)}</h1><p class="muted">${h(t.subtitle)}</p></div>
 <div class="detail-hero"><img src="${photoLocal(fixed[0])}" alt="Reiseillustration zur Tour"><div class="detail-hero-text"><span class="pill">${h(t.duration)}</span><h2>${h(t.stops.map(id=>byId(id)?.name).join(' · '))}</h2></div></div>
 <div class="stats"><span class="stat">🚗 ${h(t.drive)}</span><span class="stat">${t.stops.length} Pflichtziele</span></div>
 <div class="actions tour-primary-actions">${routeSegments(t).map((r,i)=>`<a class="btn ${i===0?'primary':'soft'}" href="${attr(r.url)}" target="_blank" rel="noopener noreferrer">↗ ${h(r.label)}</a>`).join('')}${btn('Alle Ziele auf echter Karte','map-tour',t.id,'ghost')}${btn('Erstes Ziel öffnen','place',t.stops[0],'ghost')}</div>
 ${routeSegments(t).length>1?'<p class="fine">Zusatzstopps sind enthalten. Google Maps begrenzt Zwischenziele im mobilen Browser; deshalb ist die Route in zwei Abschnitte geteilt. Nach Teil 1 Teil 2 öffnen.</p>':''}
 <h2 class="subheading">Pflichtziele in Reihenfolge</h2><div class="two-col">${fixed.map(p=>pCard(p,true)).join('')}</div>
 ${opts.length?`<h2 class="subheading">Nur wenn noch Zeit ist</h2><div class="two-col">${opts.map(p=>pCard(p,true)).join('')}</div>`:''}
 <details class="content-fold" style="margin-top:22px"><summary>Genauer Tagesablauf und Fahrzeiten</summary>
 <div class="timeline">${t.schedule.map(([time,desc])=>`<div class="timeline-item"><div class="timeline-time">${h(time)}</div><div class="timeline-desc">${h(desc)}</div></div>`).join('')}</div>
 <p class="fine">Fahrzeiten sind Schätzungen, keine Live-Verkehrsdaten. Bei Stau – besonders an der Krk-Brücke oder auf dem Weg nach Grobnik – mehr Zeit einplanen.</p></details>
 <details class="content-fold"><summary>Tourdatum bei Schlechtwetter ändern</summary>
 <div class="date-change"><label for="moveDate-${t.id}">Neues Datum</label><input class="date-input" aria-label="Datum der Tour" type="date" min="2027-08-09" max="2027-08-14" value="${state.dates[t.id]||t.date}" data-date-tour="${t.id}" id="moveDate-${t.id}"></div>
 <p class="fine">Belegte Ausflugstage tauschen ihren Termin; sonst wird der bisherige Tag frei.</p></details>
 <div class="actions">${btn('Zusatzstopps entdecken','discover-tour',t.id,'ghost')}${btn('Zur Tourenübersicht','tab','tours','ghost')}</div></div>`;
}
function renderPlaces(){
 let filtered=filterPlaces();return `<div class="page"><div class="page-header"><div class="eyebrow">Dein Kulturreiseführer</div><h1>Orte entdecken</h1>
 <p class="muted">Wähle einen Ort und starte dort die Führung zu Fuß.</p></div>
 <input class="search" id="placeSearch" type="search" placeholder="Ort oder Geschichte suchen" value="${attr(state.search)}" aria-label="Sehenswürdigkeiten suchen">
 <div class="filter-bar">${[['all','Alle'],['required','Pflicht'],['optional','Optional'],['favorites','♡ Gemerkt'],['visited','✓ Besucht']].map(([val,text])=>btn(text,'filter',val,state.filter===val?'primary small':'ghost small')).join('')}</div>
 <div id="catalog" class="two-col">${filtered.length?filtered.map(p=>pCard(p,true)).join(''):'<div class="empty">Hier ist noch kein Ort. Bitte Filter ändern.</div>'}</div></div>`;
}
function filterPlaces(){let s=state.search.trim().toLowerCase();return PLACES.filter(p=>(state.filter==='all'||state.filter==='required'&&p.required||state.filter==='optional'&&!p.required||state.filter==='favorites'&&state.favorites.has(p.id)||state.filter==='visited'&&state.visit.has(p.id))&&(!s||`${p.name} ${p.intro} ${p.label} ${p.history.join(' ')}`.toLowerCase().includes(s)))}
function sourceLinks(keys){return keys.map(id=>SOURCES.find(s=>s[0]===id)).filter(Boolean).map(s=>`<a target="_blank" rel="noopener" href="${attr(s[2])}">${h(s[1])}</a>`).join('')}
function gallery(p){
 return `<div class="gallery"><figure>${image(p,'card-img')}<figcaption>Illustration für deinen Offline-Reiseplan</figcaption></figure>
 ${p.photos.map(ph=>`<figure class="original-photo">${state.onlinePhotos?`<img loading="lazy" referrerpolicy="no-referrer" src="${attr(photoUrl(ph.file))}" alt="Originalaufnahme: ${attr(ph.file)}" onerror="this.closest('figure').classList.add('photo-unavailable');this.remove()">`:''}
 <figcaption><a href="${attr(ph.link)}" target="_blank" rel="noopener noreferrer">Originalfoto auf Wikimedia öffnen</a><span> · ${h(ph.author)} · ${h(ph.license)}</span></figcaption></figure>`).join('')}</div>`;
}
function chaptersFor(p){let main=p.audio.map(([title,text])=>({title,text,spot:false}));let sights=p.sights.map((s,i)=>({title:`Vor Ort: ${s.name}`,text:s.audioText,spot:true,nav:s.nav}));return main.concat(sights)}
function audioMinutes(text){return Math.max(1,Math.round((text.trim().split(/\s+/).length/135)*10)/10)}
function renderAudioList(p){
 const chapters=chaptersFor(p), tot=chapters.filter(c=>!c.spot).reduce((n,c)=>n+audioMinutes(c.text),0);
 return `<div class="audiobox"><div class="kicker" style="color:#b9e9e3">Hörführung · Deutsch</div><h3>${h(p.name)}</h3>
 <p>Die historische Hauptführung dauert ungefähr ${Math.round(tot)} Minuten. Du kannst auch gezielt ein Kapitel wählen.</p>
 <div class="actions">${btn('▶ Ganze Hauptführung hören','main-guide',p.id,'coral')}${btn('Stimme wählen','settings','','ghost')}</div></div>
 <details class="chapter-fold"><summary>Alle ${chapters.length} Hörkapitel anzeigen</summary><div id="audiolist" class="audio-chapters">
 ${chapters.map((c,i)=>`<button class="chapter-btn ${player.place===p.id&&player.index===i?'current':''}" data-action="play-chapter" data-value="${p.id}:${i}" type="button"><span class="chapter-num">${i+1}</span><span><b>${h(c.title)}</b><small>${c.spot?'Hörstation':'Hauptführung'} · ca. ${audioMinutes(c.text).toLocaleString('de-DE')} Min.</small></span><span class="chapter-play">▶</span></button>`).join('')}</div></details>
 <p class="fine">Die ersten zehn Senj-Hörkapitel liegen jetzt als Amala-MP3 vor. Noch nicht aufgenommene Kapitel verwenden vorläufig die Systemstimme.</p>`;
}
function renderWalk(p){const w=p.walk;return `<div class="notice warn"><p><strong>Freiwilliger, steiniger Aufstieg!</strong> Dies ist die einzige bewusst als Aufstieg aufgenommene Ausnahme. Der Hauptplan bleibt ohne längere Wanderungen. Nicht bei schlechtem Wetter oder fehlender Trittsicherheit.</p></div><h2>Aufstieg & Navigation</h2><p class="prose">Empfohlener Ausgangspunkt: <strong>${h(w.start)}</strong></p><div class="walk-grid"><div class="walk-stat"><small>Vom nahen Parkplatz</small><strong>wenige Min.</strong><small>laut Wegbeschreibung</small></div><div class="walk-stat"><small>Alternative Fußroute</small><strong>806 m</strong><small>einfach, anderer Start</small></div><div class="walk-stat"><small>Alternative Route</small><strong>+47 hm</strong><small>13 Min. bergauf</small></div><div class="walk-stat"><small>Höhe der Ruine</small><strong>~379 m</strong><small>über Meer</small></div></div><div class="prose"><p><strong>Variante A – kurze Anfahrt:</strong> ${h(w.fromParking)}</p><p><strong>Variante B – alternativ berechneter Fußweg:</strong> ${h(w.alternative)}</p><p><strong>Was die Karte zeigt:</strong> ${h(w.osm)}</p><p><strong>Wegzustand:</strong> ${h(w.terrain)}</p><p><strong>Realistischer Puffer:</strong> ${h(w.recommended)}</p></div><div class="actions"><a class="btn primary" target="_blank" rel="noopener" href="${attr(urlNav(p.nav))}">↗ Zum Parkplatz / Friedhof</a><a class="btn ghost" target="_blank" rel="noopener" href="${attr('https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(p.lat+','+p.lon))}">◎ Ruinenstandort anzeigen</a><a class="btn ghost" target="_blank" rel="noopener" href="https://ppf.com.hr/stari-grad-ledenice/">↗ Markierter Weg & GPX</a></div><p class="fine">Achtung: Google Maps kann dich zu einem Fußweg oder anderen Parkplatz führen. Der reguläre Navigationsknopf steuert den namentlich recherchierten Parkplatz an; die Zufahrtsmöglichkeit muss vor Ort geprüft werden. Die 806 m und +47 hm gelten ausdrücklich NICHT nachweislich ab dem Kurzweg-Parkplatz.</p>`}
function renderPlace(id){
 const p=byId(id);if(!p)return renderPlaces();
 return `<div class="page place-detail"><div class="backline">${btn('← Orte','tab','places','ghost small')}<span>${h(tourById(p.tour).name)}</span></div>
 <div class="detail-hero"><img src="${photoLocal(p)}" alt="Illustration zu ${attr(p.name)}"><div class="detail-hero-text">
 <div class="eyebrow">${p.required?'Pflichtziel':'Freiwilliger Stopp'}</div><h1>${h(p.name)}</h1><p style="margin:0">${h(p.label)}</p></div></div>
 <div class="place-meta"><span class="pill">⏱ ca. ${p.min} Min.</span>${state.visit.has(p.id)?'<span class="pill done">✓ Besucht</span>':''}</div>
 <div class="primary-ctas">${btn('▶ Gehführung starten','walk-start',p.id,'primary')}<a class="btn soft" href="${attr(urlNav(p.nav))}" target="_blank" rel="noopener noreferrer">↗ Google Maps · Auto</a></div><div class="actions" style="margin-top:8px"><a class="btn ghost small" href="${attr(appleNav(p.nav))}" target="_blank" rel="noopener noreferrer">↗ Apple Karten · Auto</a>${btn('Auf der Karte ansehen','map-place',p.id,'ghost small')}</div>
 <p class="place-lead">${h(p.intro)}</p>
 <div class="mini-tools">${btn(state.favorites.has(p.id)?'♥ Gemerkt':'♡ Merken','favorite',p.id,'ghost small')}${btn(state.visit.has(p.id)?'✓ Besucht':'Als besucht markieren','visit',p.id,'ghost small')}${btn('Alle Hörkapitel','jump','audio','ghost small')}${!p.required?btn(state.added.has(p.id)?'✓ Zur Tour hinzugefügt':'＋ Zur Tour','add',p.id,'ghost small'):''}</div>
 ${p.walk?`<details class="content-fold climb-fold" open><summary>Aufstieg zur Burgruine: Strecke & Sicherheit</summary>${renderWalk(p)}</details>`:''}
 ${walkRenderPanel(p)}
 <div class="place-library"><h2>Wissen & Nachschlagen</h2><p class="muted">Alle ausführlichen Informationen bleiben erhalten. Öffne einfach den Abschnitt, der dich interessiert.</p>
 <details class="content-fold"><summary>Sehenswürdigkeiten (${p.sights.length})</summary>
 ${p.sights.map((s,i)=>`<details class="sight-fold" id="spot-${i}"><summary><span class="sight-number">${i+1}</span> ${h(s.name)}</summary>
 <div class="sight-inner"><p>${h(s.text)}</p><div class="look"><strong>Das erkennst du hier</strong><p>${h(s.look)}</p></div>
 <div class="actions"><a class="btn small ghost" target="_blank" rel="noopener noreferrer" href="${attr(googleWalk(s.nav||p.nav))}">↗ Google Fußweg</a><a class="btn small ghost" target="_blank" rel="noopener noreferrer" href="${attr(appleNav(s.nav||p.nav,'walking'))}">↗ Apple Fußweg</a>${btn('▶ Geschichte anhören','play-chapter',p.id+':'+(p.audio.length+i),'soft small')}</div>
 <details class="spoken-text"><summary>Erzähltext mitlesen</summary><div class="spoken-copy">${h(s.audioText)}</div></details>
 ${!s.nav?'<p class="fine">Ohne verifizierten Einzelpunkt: Google Maps verwendet den allgemeinen Ort als Ziel.</p>':''}</div></details>`).join('')}</details>
 <details class="content-fold"><summary>Geschichte des Ortes</summary><div class="prose">${p.history.map(t=>`<p>${h(t)}</p>`).join('')}</div></details>
 <details class="content-fold"><summary>Menschen, Ereignisse & Überlieferungen</summary><div class="prose">${p.stories.map(x=>`<p>${h(x)}</p>`).join('')}</div></details>
 <details class="content-fold" id="audio"><summary>Audioguide und einzelne Kapitel</summary>${renderAudioList(p)}</details>
 <details class="content-fold"><summary>Fotos & Bildnachweise</summary><p class="fine">Die Illustration ist offline enthalten; echte Fotos und deren Lizenzseiten werden über Wikimedia Commons geladen.</p>${gallery(p)}</details>
 <details class="content-fold"><summary>Historische Quellen & Hinweise</summary><div class="source-list">${sourceLinks(p.sources)}</div><p class="fine">Recherchestand November 2026. Öffnungszeiten, Wege und Zutritte für August 2027 bitte kurz vor der Reise prüfen.</p></details>
 </div><footer class="footer">Persönlicher Reiseführer Kroatien 2027 · Favoriten und Besuchsstatus bleiben lokal gespeichert.</footer></div>`;
}
// Echte Straßenkarte: Leaflet + OpenStreetMap. Keine kostenpflichtigen APIs.
// Kartenkacheln brauchen Internet und werden NICHT für Offlinekarten vorab geladen.
let leafletMap=null, leafletLoading=false, leafletFailed=false;
let mapFilter='all', mapShowStationPins=true, mapFocusId=null;
function mapPlaces(){return PLACES.filter(p=>mapFilter==='all'||p.tour===mapFilter);}
function mapChoiceLinks(p,mode='driving'){
 const target=p.nav;
 return `<a class="btn small primary" href="${attr(mode==='walking'?googleWalk(target):urlNav(target))}" target="_blank" rel="noopener noreferrer">Google Maps</a>
 <a class="btn small ghost" href="${attr(appleNav(target,mode))}" target="_blank" rel="noopener noreferrer">Apple Karten</a>`;
}
function renderMap(){
 const ps=mapPlaces();
 return `<div class="page map-page"><div class="eyebrow">Echte Straßenkarte · Online</div>
 <h1>Alle Ziele auf einer Karte</h1><p class="muted">Verschiebe und zoome die echte OpenStreetMap-Karte. Tippe auf eine Markierung für Reiseführer und Navigation. Auch ohne Karte bleiben unten alle Ziele anklickbar.</p>
 <div class="map-filterbar" aria-label="Tour auf Karte filtern">
 ${[['all','Alle Orte'],['t1','Tour 1'],['t2','Tour 2'],['t3','Tour 3']].map(([key,label])=>btn(label,'map-filter',key,mapFilter===key?'primary small':'ghost small')).join('')}
 </div>
 <div id="realMap" class="real-map" role="region" aria-label="Interaktive Straßenkarte mit Ausflugszielen"><p id="mapStatus" class="map-placeholder">Straßenkarte wird bei bestehender Internetverbindung geladen …</p></div>
 <div class="map-legend"><span><i class="swatch" style="background:${colorByTour.t1}"></i>Senj & Nehaj</span><span><i class="swatch" style="background:${colorByTour.t2}"></i>Burgen</span><span><i class="swatch" style="background:${colorByTour.t3}"></i>Haludovo</span><span><i class="swatch" style="background:#4e965e"></i>Besucht</span></div>
 <div class="actions">${btn(mapShowStationPins?'✓ Einzelne Gehstationen':'Gehstationen anzeigen','map-stations','','ghost small')}${btn('◎ Standort anzeigen','near','','soft small')}${btn('Karte neu laden','map-retry','','ghost small')}${btn('Alle Markierungen als KML','export-kml','','ghost small')}</div>
 <p class="fine">Die Karte zeigt ${ps.length} Ausflugsziele, bei eingeschalteten Gehstationen zusätzlich nur einzeln dokumentierte GPS-Punkte. Hauptort-Markierungen ersetzen keine genaue Hausnummer. Kartendaten © OpenStreetMap-Mitwirkende. Kartenkacheln und Navigation benötigen Internet; beim Laden gehen technische Verbindungsdaten an OpenStreetMap bzw. beim Öffnen an Google oder Apple.</p>
 <details class="content-fold map-place-list" open><summary>Alle ${ps.length} Ziele mit Navigation</summary><div class="compact-destinations">
 ${ps.map(p=>`<div class="compact-destination map-destination"><span><strong>${state.visit.has(p.id)?'✓ ':''}${h(p.name)}</strong><small>${h(tourById(p.tour).name)} · ${p.required?'Pflicht':'Optional'}${p.id==='gradina'?' · Navi zum Friedhof':''}</small></span><div class="map-place-actions">${btn('Details','place',p.id,'ghost small')}${mapChoiceLinks(p)}</div></div>`).join('')}
 </div></details>
 <p class="fine">Eine einzelne Google-Maps-Webadresse kann nicht zuverlässig alle zehn getrennten Pins anzeigen. In dieser Karte sind alle Ziele gleichzeitig sichtbar. Der KML-Export kann zusätzlich in Google My Maps importiert werden; das erfordert dort ein Google-Konto.</p></div>`;
}
function loadLeaflet(){
 if(state.page!=='map')return;
 if(window.L){setTimeout(drawRealMap,0);return;}
 if(leafletLoading||leafletFailed)return;
 if(!navigator.onLine){const t=document.getElementById('mapStatus');if(t)t.textContent='Keine Internetverbindung. Die Zielliste und die Navigationslinks darunter bleiben verfügbar.';return;}
 leafletLoading=true;
 if(!document.getElementById('leafletStyle')){
  const link=document.createElement('link');link.id='leafletStyle';link.rel='stylesheet';link.href='https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.css';document.head.appendChild(link);
 }
 const script=document.createElement('script');script.id='leafletScript';script.src='https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.js';script.onload=()=>{leafletLoading=false;if(state.page==='map')setTimeout(drawRealMap,0)};
 script.onerror=()=>{leafletLoading=false;leafletFailed=true;const t=document.getElementById('mapStatus');if(t)t.textContent='Karte konnte nicht geladen werden. Nutze die vollständige Zielliste mit Google Maps und Apple Karten darunter.';};
 document.head.appendChild(script);
}
function drawRealMap(){
 const holder=document.getElementById('realMap');if(!holder||!window.L)return;
 if(leafletMap){try{leafletMap.remove()}catch{}leafletMap=null;}
 holder.innerHTML='';
 let m;
 try{
  m=L.map(holder,{zoomControl:true,scrollWheelZoom:false,preferCanvas:true});leafletMap=m;
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{
    attribution:'&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors',
    maxZoom:19, minZoom:7
  }).addTo(m);
  const plotted=[];
  for(const p of mapPlaces()){
   if(!Number.isFinite(p.lat)||!Number.isFinite(p.lon))continue;
   const visited=state.visit.has(p.id);
   const pin=L.divIcon({className:'guide-map-icon',html:`<span class="guide-map-pin ${visited?'visited':''} ${!p.required?'optional':''}" style="--pin-color:${colorByTour[p.tour]}" aria-hidden="true">${visited?'✓':'●'}</span>`,iconSize:[36,43],iconAnchor:[18,38],popupAnchor:[0,-34]});
   const marker=L.marker([p.lat,p.lon],{icon:pin,title:p.name,alt:p.name,keyboard:true}).addTo(m);
   marker.bindPopup(`<div class="map-popup"><strong>${h(p.name)}</strong><small>${p.required?'Pflichtziel':'Optional'}${visited?' · ✓ besucht':''}${p.id==='gradina'?' · Navigation zum Friedhof':''}</small><div class="actions">${btn('Reiseführer','place',p.id,'soft small')}${mapChoiceLinks(p)}</div></div>`,{maxWidth:290});
   if(mapFocusId===p.id){marker.openPopup();}
   plotted.push([p.lat,p.lon]);
  }
  const plottedStationCoords=new Set();
  if(mapShowStationPins&&typeof WALK_GROUPS!=='undefined')for(const p of mapPlaces()){
   const groups=WALK_GROUPS[p.id]||[];
   for(const g of groups){
    if(!Array.isArray(g.coords)||!g.source||g.source==='mainPOI')continue;
    const key=g.coords.map(c=>Number(c).toFixed(6)).join(',');if(plottedStationCoords.has(key))continue;plottedStationCoords.add(key);
    const target=g.coords.join(',');
    const pin=L.circleMarker(g.coords,{radius:6,weight:2,color:'#fff',fillColor:colorByTour[p.tour],fillOpacity:.92});
    pin.addTo(m).bindPopup(`<div class="map-popup"><strong>${h(g.label)}</strong><small>Einzelne Gehstation · ${h(p.name)}</small><div class="actions"><a class="btn small primary" target="_blank" rel="noopener noreferrer" href="${attr(googleWalk(target))}">Google Fußweg</a><a class="btn small ghost" target="_blank" rel="noopener noreferrer" href="${attr(appleNav(target,'walking'))}">Apple Fußweg</a>${btn('Gehführung','walk-start',p.id,'ghost small')}</div></div>`);
   }
  }
  if(state.nearby){
   const c=state.nearby.coords;if(c&&Number.isFinite(c.latitude)&&Number.isFinite(c.longitude)){
    L.circleMarker([c.latitude,c.longitude],{radius:7,color:'#fff',weight:3,fillColor:'#e67a49',fillOpacity:1}).addTo(m).bindTooltip('Dein Standort (freigegeben)');
   }
  }
  if(plotted.length)m.fitBounds(L.latLngBounds(plotted).pad(.18),{maxZoom:13});
  else m.setView([45.12,14.75],9);
  setTimeout(()=>{if(leafletMap===m)m.invalidateSize()},120);
 }catch(e){if(m)try{m.remove()}catch{}leafletMap=null;holder.innerHTML='<p class="map-placeholder">Karte nicht verfügbar. Die Navigation zu allen Orten findest du darunter.</p>';console.warn('Karte:',e)}
}
function exportKml(){
 const esc=v=>String(v).replace(/[&<>"']/g,s=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&apos;'}[s]));
 const p=PLACES.filter(p=>Number.isFinite(p.lat)&&Number.isFinite(p.lon));
 const marks=p.map(q=>`<Placemark><name>${esc(q.name)}</name><description>${esc(tourById(q.tour).name+' – '+(q.required?'Pflichtziel':'Optional')+'; Navigation: '+q.nav)}</description><Point><coordinates>${q.lon},${q.lat},0</coordinates></Point></Placemark>`).join('');
 const kml=`<?xml version="1.0" encoding="UTF-8"?><kml xmlns="http://www.opengis.net/kml/2.2"><Document><name>Kroatien 2027 · Alle Reiseziele</name>${marks}</Document></kml>`;
 const blob=new Blob([kml],{type:'application/vnd.google-earth.kml+xml;charset=utf-8'});
 const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='Kroatien_2027_Alle_Ziele.kml';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),3000);
 notice(`${p.length} Ziele als KML gespeichert.`);
}
function kmBetween(lat1,lon1,lat2,lon2){let dLat=(lat2-lat1)*Math.PI/180,dLon=(lon2-lon1)*Math.PI/180,a=Math.sin(dLat/2)**2+Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;return 6371*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a))}
function nearbyList(){if(!state.nearby)return '<div class="notice"><p>Die Entfernung wird erst berechnet, wenn du ausdrücklich deinen Standort freigibst. Ohne GPS funktioniert die komplette Ortsauswahl weiterhin.</p></div>';let a=PLACES.map(p=>({...p,km:kmBetween(state.nearby.coords.latitude,state.nearby.coords.longitude,p.lat,p.lon)})).sort((a,b)=>a.km-b.km);return `<div class="notice"><p>Standort wurde lokal verarbeitet; nichts wird an einen eigenen Server übertragen. Entfernungen sind <strong>Luftlinie</strong>, keine Fahr- oder Gehstrecke.</p></div><div class="stack">${a.slice(0,5).map(p=>`<div class="card"><div class="card-pad"><div class="tools-row"><h3 style="margin:0">${h(p.name)}</h3><span class="pill">${(p.km<1?(p.km*1000).toFixed(0)+' m':p.km.toFixed(1)+' km')} Luftlinie</span></div><p>${h(p.label)}</p><div class="actions">${btn('Infos','place',p.id,'primary small')}${btn('▶ Audioguide','play-chapter',p.id+':0','ghost small')}${navButton(p,true)}</div></div></div>`).join('')}</div>`}
const EXTRA=[{id:'gradina',tour:'t1',time:70,detour:'Ab Dorf kurzer zusätzlicher Anfahrts-/Fußweg; vor Ort prüfen',walk:'Steiniger Aufstieg vom Parkplatz am runden Friedhof; alternativ 806 m und +47 Höhenmeter ab anderem Ausgangspunkt',why:'Echte mittelalterliche Höhenstadt, Aussicht, runder Friedhof'},{id:'svetijuraj',tour:'t1',time:75,detour:'Geschätzt zusätzlich ca. 25–45 Min. Fahrt gesamt, je nach Rückweg',walk:'Kurzer Hafenspaziergang, kein Wanderweg',why:'Authentischer Fischerhafen und Velebitküste'},{id:'grizane',tour:'t2',time:70,detour:'Geschätzt zusätzlicher Umweg ca. 15–30 Min., abhängig von der Reihenfolge',walk:'Dorf kurz zu Fuß; Burgzugang optional und evtl. steil',why:'Weiterer Ort des Vinodoler Gesetzbuchs von 1288'}];
function renderDiscover(){let t=tourById(state.discoverTour), opts=EXTRA.filter(e=>e.tour===t.id);return `<div class="page"><div class="eyebrow">Spontan · nur wenn du Lust hast</div><h1>Entdecken</h1><h2>Was ist hier zu sehen?</h2><div class="actions">${btn('◎ GPS-Standort einmalig abfragen','near','','primary')}${btn('Alle Orte auf Karte','tab','map','ghost')}</div><div style="margin:18px 0">${nearbyList()}</div><div class="divider"></div><h2>Ich habe noch Zeit</h2><p class="muted">Passend zu deiner geplanten Tour – keine Empfehlungen für ausgeschlossene Orte. Zusatzzeiten sind <strong>grobe Schätzungen</strong>, keine echte Routing-Berechnung.</p><div class="tools-row"><label for="discover-tour">Tour</label><select id="discover-tour" class="select">${TRAVEL.tours.map(x=>`<option value="${x.id}" ${x.id===t.id?'selected':''}>${h(x.name)}</option>`).join('')}</select></div><div class="filter-bar">${[30,60,90].map(n=>btn(n+' Minuten','discover-time',n,state.discoverTime===n?'primary':'ghost')).join('')}</div>${t.id==='t3'?'<div class="notice sand"><p>Haludovo bleibt bewusst ein kurzer, sicherer Ausflug. Keine zusätzlichen Krk-Ausflugsziele.</p></div>':`<div class="stack">${opts.filter(e=>e.time<=state.discoverTime).length?opts.filter(e=>e.time<=state.discoverTime).map(e=>{let p=byId(e.id);return `<div class="card"><div class="card-pad"><div class="tools-row">${label(p)}<span class="pill">~${e.time} Min. zusätzlich</span></div><h3>${h(p.name)}</h3><p>${h(e.why)}</p><p><b>Umweg:</b> ${h(e.detour)}<br><b>Fußweg:</b> ${h(e.walk)}</p><div class="actions">${btn(state.added.has(p.id)?'✓ In der Tour':'＋ Zur Tour hinzufügen','add',p.id,'primary small')}${btn('Geschichte & Audio','place',p.id,'ghost small')}${navButton(p,true)}</div></div></div>`}).join(''):'<div class="notice sand"><p>Für 30 Minuten eignet sich derzeit kein vollwertiger Zusatzstopp ohne Hektik. Bleib lieber beim aktuellen Ort, Kaffee oder Aussicht. Bei 60–90 Minuten gibt es passende Vorschläge.</p></div>'}</div>`}<div class="divider"></div><h2>Merkliste</h2><div class="two-col">${[...state.favorites].map(byId).filter(Boolean).map(p=>pCard(p,true)).join('')||'<div class="notice"><p>Noch keine Favoriten gespeichert. Tippe bei einem Ort auf ♡ Merken.</p></div>'}</div></div>`}
function renderAudioPage(){return `<div class="page"><div class="page-header"><div class="eyebrow">Geschichte zum Hören</div><h1>Deine Audioguides</h1><p class="muted">Wähle einen Ort. Die einzelnen Hörkapitel findest du auf seiner Detailseite.</p></div><div class="notice sand amala-offline-box"><strong>Amala · 10 fertige Kapitel</strong><p>Diese Hörkapitel sind als echte MP3 in der App enthalten. Für die Offline-Nutzung auf dem iPhone bitte einmal mit Internetverbindung herunterladen.</p><button type="button" class="btn primary" data-action="amala-download-offline">▶ 10 MP3s offline speichern</button><p id="amala-offline-status" class="fine" aria-live="polite"></p></div>${state.audioHistory?`<div class="today-card"><div class="eyebrow">Zuletzt gehört</div><h3>${h(byId(state.audioHistory.place)?.name||'')}</h3>${btn('▶ Weiterhören','play-chapter',state.audioHistory.place+':'+state.audioHistory.index,'primary')}</div>`:''}<div class="compact-destinations audio-destinations">${PLACES.map(p=>`<div class="compact-destination"><span><strong>${h(p.name)}</strong><small>${p.audio.length} Kapitel · ca. ${Math.round(p.audio.reduce((n,el)=>n+audioMinutes(el[1]),0))} Minuten</small></span><div>${btn('Kapitel','place-audio',p.id,'ghost small')}</div></div>`).join('')}</div><p class="fine" style="margin-top:20px">Die ersten zehn Senj-Hörkapitel liegen als Amala-MP3 vor. Fehlende Kapitel nutzen vorläufig die Systemstimme.</p></div>`}
let lastRenderedKey='';
function render(){let viewKey=state.page+'|'+(state.place||state.tour||'');let opened=viewKey===lastRenderedKey?[...document.querySelectorAll('#content details')].flatMap((d,i)=>d.open?[i]:[]):[];let html='';if(state.page==='home')html=renderHome();if(state.page==='tours')html=`<div class="page"><div class="eyebrow">Drei Geschichten · drei freie Tage</div><h1>Meine Ausflüge</h1><p class="muted">Alle Pflichtziele bleiben fest. Zusätzliche Orte kannst du separat hinzufügen. Die Tagesroute wird beim Öffnen in Google Maps zusammengestellt.</p><div class="three-col">${TRAVEL.tours.map(t=>tourCard(t)).join('')}</div><div class="notice sand"><p>Alle drei Touren können bei Schlechtwetter auf einen freien Urlaubstag zwischen 9. und 14. August verschoben werden. Bei einer belegten Tour wird das Datum getauscht.</p></div><div class="date-grid">${TRAVEL.dates.map(([d])=>{let [txt,k]=statusFor(d);return `<div class="date-tile ${k==='free'?'free':k==='arrive'||k==='depart'?'travel':'active'}"><b>${fmtDate(d)}</b><small>${h(txt)}</small></div>`}).join('')}</div></div>`;if(state.page==='tour')html=renderTour(state.tour);if(state.page==='places')html=renderPlaces();if(state.page==='place')html=renderPlace(state.place);if(state.page==='map')html=renderMap();if(state.page==='discover')html=renderDiscover();if(state.page==='audio')html=renderAudioPage();if(leafletMap){try{leafletMap.remove()}catch{}leafletMap=null;}document.getElementById('content').innerHTML=html;if(state.page==='map')setTimeout(loadLeaflet,0);const newDetails=document.querySelectorAll('#content details');opened.forEach(i=>{if(newDetails[i])newDetails[i].open=true});lastRenderedKey=viewKey;document.querySelectorAll('.tabbar button').forEach(b=>b.classList.toggle('active',b.id==='nav-'+(['tour'].includes(state.page)?'tours':state.page==='place'?'places':state.page==='audio'?'places':state.page)));document.documentElement.style.setProperty('--scale',state.largerText?'1.08':'1');updateDock();updateNetwork()}
function go(page,id=null,scroll=true){state.page=page;state.place=page==='place'?id:null;state.tour=page==='tour'?id:null;let hash=page==='place'?'ort/'+id:page==='tour'?'tour/'+id:page==='home'?'start':page==='tours'?'touren':page==='places'?'orte':page==='map'?'karte':page==='discover'?'entdecken':'audio';if(location.hash.slice(1)!==hash)history.pushState({},'', '#'+hash);render();if(scroll)window.scrollTo({top:0,behavior:'instant'})}
function fromHash(){let raw=decodeURIComponent(location.hash.slice(1));if(raw.startsWith('ort/')){go('place',raw.slice(4),false);return}if(raw.startsWith('tour/')){go('tour',raw.slice(5),false);return}let obj={'start':'home','touren':'tours','orte':'places','karte':'map','entdecken':'discover','audio':'audio'};go(obj[raw]||'home',null,false)}
function notice(message){const el=document.getElementById('toast');el.textContent=message;el.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),4200)}
function setMark(set,id,what){if(set.has(id))set.delete(id);else set.add(id);persist();render();notice(what)}
function addPlace(id){const p=byId(id);if(!p||p.required)return;if(state.added.has(id)){state.added.delete(id);notice('Optionaler Stopp aus der Tour entfernt.')}else{state.added.add(id);notice('Zusatzstopp zur Tour hinzugefügt.')}persist();render()}
function switchDate(tid,newDate){const t=tourById(tid);if(!t||!newDate||newDate<'2027-08-09'||newDate>'2027-08-14'){notice('Ausflüge sind nur vom 9. bis 14. August verschiebbar.');render();return}const other=TRAVEL.tours.find(x=>x.id!==tid&&(state.dates[x.id]||x.date)===newDate);const old=state.dates[tid]||t.date;state.dates[tid]=newDate;if(other)state.dates[other.id]=old;persist();render();notice(other?'Beide Ausflugstermine wurden getauscht.':'Ausflug verschoben; der vorherige Tag ist nun frei.')}
function updateNetwork(){let el=document.getElementById('connection');if(!el)return;el.textContent=navigator.onLine?'Offline-Texte':'Ohne Netz';el.title='Historische Texte sind lokal vorhanden; Karten, externe Fotos und aktuelle Verkehrsdaten benötigen Internet.';el.classList.toggle('is-offline',!navigator.onLine)}
function geoOnce(){if(!navigator.geolocation){notice('GPS ist in diesem Browser nicht verfügbar.');return}if(!isSecureContext){notice('GPS benötigt normalerweise HTTPS oder localhost.');return}notice('Standort wird nur auf diesem Gerät ermittelt.');navigator.geolocation.getCurrentPosition(pos=>{state.nearby=pos;checkClose(pos);if(state.page==='discover'||state.page==='map')render();else{state.page='discover';go('discover')}},err=>notice('Standort nicht verfügbar: '+(err.code===1?'Freigabe verweigert.':'Bitte GPS und Empfang prüfen.')),{enableHighAccuracy:true,timeout:12000,maximumAge:60000})}
function watchGPS(yes){state.gpsEnabled=!!yes;if(geoWatch!==null){navigator.geolocation.clearWatch(geoWatch);geoWatch=null}if(yes){if(!navigator.geolocation||!isSecureContext){state.gpsEnabled=false;notice('Automatischer Standort benötigt HTTPS und Freigabe.');return}geoWatch=navigator.geolocation.watchPosition(pos=>{state.nearby=pos;checkClose(pos);if(state.page==='discover'||state.page==='map')render() },err=>notice('GPS-Beobachtung unterbrochen: '+err.message),{enableHighAccuracy:false,maximumAge:30000,timeout:20000});notice('Standortbeobachtung aktiv – nur solange diese Seite geöffnet ist.')}else notice('Standortbeobachtung ausgeschaltet.');renderSettings()}
function checkClose(pos){let near=PLACES.map(p=>({p,m:kmBetween(pos.coords.latitude,pos.coords.longitude,p.lat,p.lon)*1000})).sort((a,b)=>a.m-b.m)[0];if(near&&near.m<=230&&geoLastMessage!==near.p.id){geoLastMessage=near.p.id;notice(`Du bist ${Math.round(near.m/10)*10} m von ${near.p.name} entfernt. Öffne den Ort, wenn du mehr erfahren möchtest.`)}}

/* iOS/Safari stellt nur die Stimmen bereit, die das System für Web Speech freigibt.
   Es gibt in SpeechSynthesisVoice kein standardisiertes Geschlechtsfeld. */
const voiceHasFemaleName=v=>/anna|helena|petra|marlene|katja|karla|sophie|lea|marie|sandra|monika|yvonne|vicki|femal|weiblich|frauenstimme|siri.*frau/i.test(v.name||'');
const voiceIsPremium=v=>/premium|enhanced|neural|natural|hochwertig|erweitert|verbessert/i.test(v.name||'');
function voiceScore(v){const n=(v.name||'').toLowerCase();return (voiceHasFemaleName(v)?70:0)+(voiceIsPremium(v)?40:0)+(v.lang.toLowerCase()==='de-de'?12:0)+(v.localService?4:0)-(/compact|kompakt/.test(n)?25:0)}
function germanVoices(){if(!('speechSynthesis' in window))return [];return speechSynthesis.getVoices().filter(v=>(v.lang||'').toLowerCase().startsWith('de')).sort((a,b)=>voiceScore(b)-voiceScore(a)||a.name.localeCompare(b.name,'de'))}
function chosenVoice(){const all=('speechSynthesis' in window)?speechSynthesis.getVoices():[];return all.find(v=>v.voiceURI===state.voiceURI)||germanVoices()[0]||null}
function previewVoice(){if(!('speechSynthesis' in window)){notice('Dieser Browser unterstützt keine Sprachausgabe.');return}const v=chosenVoice();if(!v){notice('Noch keine deutsche Stimme verfügbar. Bitte Stimmen aktualisieren.');renderSettings();return}audioStop(true);const speech=new SpeechSynthesisUtterance('Willkommen an der Adria. Entdecken Sie Senj, die Festung Nehaj und die geheimnisvollen Burgen der Frankopanen. Ich begleite Sie durch Kroatiens Geschichte.');speech.voice=v;speech.lang='de-DE';speech.onstart=()=>{player.started=true};speech.rate=state.speed;speech.pitch=1;speech.onerror=()=>notice('Die Sprachprobe konnte nicht abgespielt werden.');try{speechSynthesis.cancel();speechSynthesis.speak(speech);notice('Sprachprobe: '+v.name)}catch(e){notice('Sprachprobe konnte nicht gestartet werden.')}}
function renderSettings(){const voices=germanVoices(),pick=chosenVoice(),chosen=state.voiceURI?voices.find(v=>v.voiceURI===state.voiceURI):pick;document.getElementById('settingsContent').innerHTML=`<div class="setting voice-setting"><div class="eyebrow">Audioguide · Sprecherin</div><h3>Eine angenehmere Stimme wählen</h3><p class="muted" style="font-size:.88rem;margin:5px 0 13px">Wir bevorzugen eine bekannte weibliche deutsche Systemstimme, falls dein iPhone sie anbietet. Du kannst verschiedene Stimmen testen und selbst entscheiden.</p><label for="voiceChoice">Deutsche Stimme<select id="voiceChoice"><option value="" ${!state.voiceURI?'selected':''}>Frauenstimme (automatisch)</option>${voices.map(v=>`<option value="${attr(v.voiceURI)}" ${state.voiceURI===v.voiceURI?'selected':''}>${h(v.name)}${voiceHasFemaleName(v)?' · ♀':''}${voiceIsPremium(v)?' · Qualität +':''}${v.localService?' · lokal':''}</option>`).join('')}</select></label><div class="actions" style="margin-top:13px">${btn('▶ Stimme probehören','voice-preview','','coral')}${btn('↻ Stimmen neu laden','voices-refresh','','ghost small')}</div><small>${voices.length?`Aktuelle Auswahl: ${h(chosen?.name||'automatisch')}. `:'Noch keine deutschen Stimmen vom Browser gemeldet. '}Hochwertige iPhone-Stimmen lassen sich gegebenenfalls in den iOS-Bedienungshilfen herunterladen. Safari kann nicht jede installierte Stimme verwenden. Zehn Amala-Kapitel sind jetzt enthalten. Fehlende Kapitel nutzen vorläufig die Systemstimme.</small></div><div class="setting"><label>Größere Schrift <input id="bigText" type="checkbox" ${state.largerText?'checked':''}></label><small>Etwas vergrößerte Texte für unterwegs.</small></div><div class="setting"><label>Commons-Fotos online laden <input id="onlinePhotos" type="checkbox" ${state.onlinePhotos?'checked':''}></label><small>Nur bei bestehender Internetverbindung. Die PDF-Illustrationen bleiben offline.</small></div><div class="setting"><label>GPS beobachten <input id="gpsWatch" type="checkbox" ${state.gpsEnabled?'checked':''}></label><small>Freiwillig, nur lokal und nur solange die Seite offen bleibt; keine Hintergrundbenachrichtigungen.</small></div><div class="setting"><label>Sprechgeschwindigkeit <select id="settingSpeed">${[.75,.85,.92,1,1.15,1.3].map(x=>`<option ${x===state.speed?'selected':''} value="${x}">${x.toLocaleString('de-DE')}×</option>`).join('')}</select></label></div><div class="setting"><label>Daten sichern</label><div class="actions">${btn('Einstellungen als JSON exportieren','export','', 'ghost small')}${btn('Alle Markierungen löschen','reset','', 'ghost small')}</div></div><div class="setting"><small>Diese App verwendet kein Konto, kein Analytics und keinen eigenen GPS-Server. Google Maps und externe Fotos werden erst beim Aufruf mit ihren jeweiligen Diensten verbunden. Der Cache speichert HTML, CSS, JS und lokale Illustrationen.</small></div>`}
function settings(){renderSettings();document.getElementById('settingsDialog').showModal()}
function chunksOf(text){const sentences=(text.match(/[^.!?]+[.!?]+|[^.!?]+$/g)||[text]).map(s=>s.trim()).filter(Boolean);let arr=[],cur='';for(const s of sentences){if((cur+' '+s).length>220&&cur){arr.push(cur);cur=''}cur+=(cur?' ':'')+s}if(cur)arr.push(cur);return arr}
function audioStop(keep=false){player.walkStepId=null;player.mainSeries=false;player.generation++;try{speechSynthesis.cancel()}catch{}player.active=false;player.paused=false;player.spoken=0;player.segmentIndex=0;player.segments=[];if(!keep){player.place=null;player.index=0}updateDock()}
function selectChapter(id,index,auto=true,mainSeries=false){const p=byId(id);if(!p)return;const ch=chaptersFor(p);if(!ch[index])return;audioStop(true);player.place=id;player.index=index;player.mainSeries=mainSeries;player.segments=chunksOf(ch[index].text);player.total=ch[index].text.length;player.segmentIndex=0;player.spoken=0;state.audioHistory={place:id,index};persist();if(auto){player.active=true;playSegment(player.generation)}updateDock();if(state.page==='place'&&state.place===id)render()}
function playSegment(generation){if(generation!==player.generation||!player.active||player.paused)return;if(player.segmentIndex>=player.segments.length){const guideId=player.place,guideIndex=player.index,continueMain=!!player.mainSeries;player.active=false;updateDock();if(player.walkStepId&&typeof walkAudioFinished==='function'){walkAudioFinished();return;}const place=byId(guideId);if(continueMain&&place&&guideIndex+1<place.audio.length){selectChapter(guideId,guideIndex+1,true,true);return;}player.mainSeries=false;return}if(typeof speechSynthesis==='undefined'){notice('Keine Sprachausgabe verfügbar. Bitte anderen Browser verwenden.');player.active=false;if(typeof walkState!=='undefined'&&walkState.status==='playing')walkState.status='waiting';updateDock();return}let speech=new SpeechSynthesisUtterance(player.segments[player.segmentIndex]);speech.lang='de-DE';speech.rate=state.speed;speech.pitch=1;const v=chosenVoice();if(v)speech.voice=v;speech.onstart=()=>{if(generation===player.generation)player.started=true};speech.onend=()=>{if(generation!==player.generation||!player.active)return;player.spoken+=player.segments[player.segmentIndex].length;player.segmentIndex++;updateDock();playSegment(generation)};speech.onerror=e=>{if(generation!==player.generation)return;if(e.error!=='interrupted'&&e.error!=='canceled'){player.active=false;if(typeof walkState!=='undefined'&&walkState.status==='playing'){walkState.status='waiting';render()}notice('Sprachausgabe angehalten: '+e.error);updateDock()}};try{speechSynthesis.speak(speech)}catch(e){player.active=false;if(typeof walkState!=='undefined'&&walkState.status==='playing'){walkState.status='waiting';render()}notice('Audio konnte nicht gestartet werden.');updateDock()}}
function playPause(){if(!player.place){notice('Wähle zuerst eine Führung oder ein Kapitel.');return}if(player.active&&player.paused){try{speechSynthesis.resume();player.paused=false;updateDock()}catch{player.active=false;updateDock()}return}if(player.active){try{speechSynthesis.pause();player.paused=true;updateDock()}catch{audioStop(true)}return}if(player.segmentIndex>=player.segments.length){player.segmentIndex=0;player.spoken=0}player.active=true;player.paused=false;playSegment(player.generation);updateDock()}
function stepAudio(dir){if(player.walkStepId&&walkState.placeId){walkNext(dir);return}if(!player.place)return;let ch=chaptersFor(byId(player.place)),next=Math.min(Math.max(0,player.index+dir),ch.length-1);selectChapter(player.place,next,true,player.mainSeries&&next<byId(player.place).audio.length)}
function updateDock(){
 const el=document.getElementById('audioDock');document.body.classList.toggle('has-player',!!player.place);
 if(!player.place){el.hidden=true;return}const p=byId(player.place),ch=chaptersFor(p)[player.index],title=player.walkStepId?walkCurrent()?.label:ch?.title;
 const pct=player.total?Math.min(100,player.spoken/player.total*100):0;el.hidden=false;
 el.innerHTML=`<div class="audio-meta"><span class="minititle">${h(p.name)} · ${h(title||'Audioguide')}</span><button class="dock-close" type="button" data-action="hide-player" aria-label="Audioplayer schließen">✕</button></div>
 <progress max="100" value="${pct.toFixed(1)}" aria-label="Audio-Fortschritt"></progress>
 <div class="audio-controls"><button type="button" data-action="audio-prev" aria-label="Vorheriges Kapitel">⏮</button>
 <button class="main" type="button" data-action="audio-toggle" aria-label="${player.active&&!player.paused?'Pause':'Abspielen'}">${player.active&&!player.paused?'❚❚':'▶'}</button>
 <button type="button" data-action="audio-stop" aria-label="Stop">■</button>
 <button type="button" data-action="audio-next" aria-label="Nächstes Kapitel">⏭</button>
 <span class="audio-spacer"></span><label for="dockSpeed" class="audio-speed-label">Tempo</label><select id="dockSpeed" aria-label="Sprechgeschwindigkeit">${[.75,.85,.92,1,1.15,1.3].map(x=>`<option value="${x}" ${x===state.speed?'selected':''}>${x}×</option>`).join('')}</select></div>`;
}
function exportData(){const content=localStorage.getItem(STORE_KEY)||'{}';const a=document.createElement('a'),blob=new Blob([content],{type:'application/json'});a.href=URL.createObjectURL(blob);a.download='kroatien-2027-meine-daten.json';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),1000);notice('Lokale Daten exportiert.')}
function resetData(){if(!confirm('Alle Favoriten, Besucht-Markierungen, Touränderungen und Einstellungen wirklich löschen?'))return;localStorage.removeItem(STORE_KEY);state.visit.clear();state.favorites.clear();state.added.clear();state.dates={};state.audioHistory=null;state.onlinePhotos=true;state.largerText=false;audioStop();renderSettings();render();notice('Lokale Markierungen zurückgesetzt.')}
function handleAction(action,value){switch(action){case 'tab':go(value);break;case 'tour':go('tour',value);break;case 'place':go('place',value);break;case 'place-audio':go('place',value);setTimeout(()=>{let a=document.getElementById('audio');if(a){a.open=true;a.scrollIntoView({behavior:'smooth',block:'start'})}},50);break;case 'favorite':setMark(state.favorites,value,'Merkliste aktualisiert.');break;case 'visit':setMark(state.visit,value,'Besuchsstatus gespeichert.');break;case 'add':addPlace(value);break;case 'filter':state.filter=value;render();break;case 'settings':settings();break;case 'voice-preview':previewVoice();break;case 'voices-refresh':{if('speechSynthesis' in window)speechSynthesis.getVoices();renderSettings();notice('Die verfügbaren Stimmen wurden neu abgefragt.');break}case 'near':geoOnce();break;case 'discover-time':state.discoverTime=Number(value);render();break;case 'discover-tour':state.discoverTour=value;go('discover');break;case 'map-filter':mapFilter=value;mapFocusId=null;render();break;case 'map-tour':mapFilter=value;mapFocusId=null;go('map');break;case 'map-place':{mapFilter='all';mapFocusId=value;go('map');break}case 'map-stations':mapShowStationPins=!mapShowStationPins;render();break;case 'map-retry':leafletFailed=false;if(!window.L){document.getElementById('leafletScript')?.remove();}loadLeaflet();break;case 'export-kml':exportKml();break;case 'main-guide':{if(typeof walkState!=='undefined'&&walkState.status==='playing')walkState.status='waiting';selectChapter(value,0,true,true);break}case 'play-chapter':{if(typeof walkState!=='undefined'&&walkState.status==='playing')walkState.status='waiting';let [p,i]=value.split(':');selectChapter(p,Number(i),true);break}case 'audio-toggle':playPause();break;case 'audio-prev':stepAudio(-1);break;case 'audio-next':stepAudio(1);break;case 'audio-stop':{const guided=!!player.walkStepId;audioStop(true);if(guided){walkState.status='waiting';render()}break;}case 'hide-player':{const guided=!!player.walkStepId;audioStop();if(guided){walkState.status='waiting';render()}break;}case 'jump':{const el=document.getElementById(value);if(el){if(el.tagName==='DETAILS')el.open=true;el.closest('details')&&(el.closest('details').open=true);el.scrollIntoView({behavior:'smooth',block:'start'})}break}case 'export':exportData();break;case 'reset':resetData();break;case 'walk-start':walkStart(value);break;case 'walk-arrived':walkArrived(false);break;case 'walk-next':walkNext(1);break;case 'walk-prev':walkNext(-1);break;case 'walk-end':walkEnd();break;case 'walk-restart':walkStart(value);break;case 'walk-jump':{const [wp,wi]=value.split(':');walkJump(wp,Number(wi));break}default:break}}
document.addEventListener('click',event=>{const t=event.target.closest('[data-action]');if(!t)return;handleAction(t.dataset.action,t.dataset.value||'')});
document.addEventListener('input',event=>{if(event.target.id==='placeSearch'){state.search=event.target.value;let list=document.getElementById('catalog');if(list)list.innerHTML=filterPlaces().map(p=>pCard(p,true)).join('')||'<div class="empty">Keine passenden Orte gefunden.</div>'}});
document.addEventListener('change',event=>{const el=event.target;if(el.dataset.dateTour)switchDate(el.dataset.dateTour,el.value);if(el.id==='discover-tour'){state.discoverTour=el.value;render()}if(el.id==='bigText'){state.largerText=el.checked;persist();render()}if(el.id==='onlinePhotos'){state.onlinePhotos=el.checked;persist();render()}if(el.id==='gpsWatch')watchGPS(el.checked);if(el.id==='settingSpeed'||el.id==='dockSpeed'){state.speed=Number(el.value);persist();if(player.active)notice('Neue Sprechgeschwindigkeit gilt ab dem nächsten gesprochenen Abschnitt.');renderSettings();updateDock()}if(el.id==='walkAuto')walkAutoEnable(el.checked);if(el.id==='voiceChoice'){state.voiceURI=el.value;persist();notice('Stimme für das nächste Kapitel gespeichert.')}});
document.addEventListener('keydown',event=>{if((event.key==='Enter'||event.key===' ')&&event.target.closest('svg [data-action]')){event.preventDefault();let t=event.target.closest('[data-action]');handleAction(t.dataset.action,t.dataset.value)}});
window.addEventListener('popstate',fromHash);window.addEventListener('hashchange',fromHash);window.addEventListener('online',updateNetwork);window.addEventListener('offline',updateNetwork);
if('serviceWorker'in navigator&&(location.protocol==='https:'||location.hostname==='localhost')){window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}))}
if('speechSynthesis'in window)speechSynthesis.addEventListener?.('voiceschanged',()=>{if(document.getElementById('settingsDialog').open)renderSettings()});
fromHash();
