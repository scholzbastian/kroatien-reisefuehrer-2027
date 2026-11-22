'use strict';
/* GPS-begleitete Fußführung. Alle exakten Ankunftskoordinaten stammen aus
   den in WALK_TARGET_SOURCES verlinkten Orts-/OSM-Datensätzen (Ausnahme:
   Primärbauwerke: POI-Punkte der ursprünglichen recherchierten Datenbasis).
   Wo eine verifizierte Einzelkoordinate fehlt, gibt es NUR manuelle Ankunft.
   GPS bleibt lokal. Die App verschickt keine Standorte an eigene Server. */
const WALK_TARGET_SOURCES={
  senjCilnica:'https://www.livecamcroatia.com/en/camera/senj-cilnica-square',
  senjCathedral:'https://mapcarta.com/W694978108',
  senjMuseum:'https://mapcarta.com/N2259960533',
  ledeniceChurch:'https://mapcarta.com/W198713206',
  ledeniceCemetery:'https://mapcarta.com/W234014811',
  ledeniceGradina:'https://mapcarta.com/N1890585800',
  mainPOI:'Koordinaten des Hauptortes in der ursprünglichen Ortsdatenbasis; keine eigenständige Stationseinmessung'
};
// parts sind Indizes in PLACES[id].sights. Mehrere Unterpunkte am selben Gebäude
// werden bewusst als EINE Hörstation zusammengefasst.
const WALK_GROUPS={
 senj:[
  {parts:[0],label:'Cilnica – am Platz beginnen',coords:[44.98917,14.90243],source:'senjCilnica',hint:'Stell dich auf den Platz Cilnica. Hier beginnt dein Altstadtrundgang.'},
  {parts:[1],label:'Kathedrale Mariä Himmelfahrt',coords:[44.99031,14.90238],source:'senjCathedral',hint:'Gehe durch die kurzen Altstadtgassen zum Dom. Achte auf das Pflaster und die Stufen.'},
  {parts:[2,5],label:'Vukasović-Palast und Stadtmuseum',coords:[44.9906,14.90175],source:'senjMuseum',hint:'Folge den Gassen zum Stadtmuseum im Vukasović-Palast. Der Eingang kann je nach Öffnungslage variieren.'},
  {parts:[3,6],label:'Stadtmauern und alte Tore',hint:'Gehe zu einem erhaltenen Befestigungsabschnitt. Den konkreten Zugang kontrollierst du vor Ort.'},
  {parts:[4],label:'Uskoken-Gassen und Hafen',hint:'Beende die Runde am öffentlichen Hafenbereich. Beachte den Verkehr auf der Uferstraße.'}
 ],
 nehaj:[
  {parts:[0],label:'Nehaj – vor den Außenmauern',poi:true,hint:'Beginne außen vor der Festung. Betrachte die Mauern und Schießöffnungen aus sicherer Entfernung.'},
  {parts:[1,2,3,5,6],label:'Tor, Zisterne und Uskokenmuseum',hint:'Gehe nur bei geöffnetem Museum und erlaubtem Zugang hinein. Hier bleiben wir an einem Standort und verbinden drei Themen.'},
  {parts:[4],label:'Aussichtsplattform und Meerblick',hint:'Falls zugänglich: Begib dich über die freigegebene Innenroute zur Aussicht. Es gibt Treppen.'}
 ],
 ledenice:[
  {parts:[0],label:'Ledenice – Kirche',coords:[45.13742,14.8405],source:'ledeniceChurch',hint:'Beginne vor der Kirche der Karmelmuttergottes.'},
  {parts:[1,2,4],label:'Steinhäuser und Blick zur Gradina',hint:'Gehe nur ein kurzes Stück durch den bewohnten Dorfkern, bis die alte Burghöhe sichtbar wird.'},
  {parts:[3],label:'Optional: Georgskapelle am kreisrunden Friedhof',coords:[45.13125,14.83405],source:'ledeniceCemetery',mode:'driving',optional:true,hint:'Dieser Friedhof liegt außerhalb des Dorfspaziergangs. Fahre nur über erlaubte Straßen zum Okruglo groblje; dort kannst du die Georgskapelle ansehen. Die Burgruine darüber bleibt ein eigener freiwilliger Aufstieg.'}
 ],
 gradina:[
  {parts:[0,4],label:'Ausgangspunkt Okruglo groblje',coords:[45.13125,14.83405],source:'ledeniceCemetery',hint:'Beginne am kreisrunden Friedhof. Prüfe Wegmarkierungen und Kondition, bevor du den steinigen Aufstieg beginnst.'},
  {parts:[1,2,3],label:'Gradina – Tor, Mauern und Terrassen',coords:[45.12991,14.83638],source:'ledeniceGradina',hint:'Folge dem markierten, steinigen Zustieg zur Ruine. Betritt keine instabilen Mauern und verzichte bei unsicheren Bedingungen.'}
 ],
 svetijuraj:[
  {parts:[0,2],label:'Hafen von Sveti Juraj',poi:true,hint:'Stell dich in einen öffentlich zugänglichen Bereich des kleinen Hafens.'},
  {parts:[1],label:'Kirche des heiligen Georg',hint:'Gehe zur Kirche, sofern der Zugang offen und der kurze Weg gut begehbar ist.'}
 ],
 bribir:[
  {parts:[0,1,4],label:'Turan und Befestigungsspuren',poi:true,hint:'Beginne beim erhaltenen Turan. Von dort erkennst du die ehemalige Befestigung.'},
  {parts:[2,3],label:'Burgbereich und alter Ortskern',hint:'Schau dir die umliegenden alten Gassen und Steinbauten an.'}
 ],
 drivenik:[
  {parts:[0,1,6],label:'Drivenik – Außenmauern und Burgtor',poi:true,hint:'Beginne außen am Burgtor, betrachte besonders die Schießscharten. Nur sichere, freigegebene Zugänge.'},
  {parts:[2,7],label:'Burghof, Zisterne und Funde',hint:'Betritt den Burghof nur bei erlaubtem Zugang und sicherer Begehbarkeit. Sonst diese Station überspringen.'},
  {parts:[3,4],label:'Pfarrkirche und alter Dorfkern',hint:'Gehe durch den alten Ort zur Pfarrkirche. Prüfe die tatsächlichen Wege.'},
  {parts:[5],label:'Stephanskirche – zusätzliche Kurzstation',hint:'Diese Kirche ist eine zusätzliche Station. Wenn der Weg zu weit, steil oder unklar ist, höre das Kapitel vom Dorf aus.'}
 ],
 grobnik:[
  {parts:[0,1],label:'Grobnik – Burg und Ausstellung',poi:true,hint:'Beginne am offiziell zugänglichen Burgbereich.'},
  {parts:[2,3,5,6],label:'Frankopanenplatz und Gassen',hint:'Gehe vom Burgbereich zum Platz und achte auf die steinernen Hausfassaden.'},
  {parts:[4],label:'Blick über das Grobničko polje',hint:'Bleibe an einem sicheren, öffentlich erreichbaren Aussichtspunkt nahe der Burg.'}
 ],
 grizane:[
  {parts:[0,3],label:'Grižane – Blick zur Burgruine',poi:true,hint:'Betrachte die Ruinen von zugänglichen, sicheren Punkten. Kein Klettern über Mauerreste.'},
  {parts:[1,2],label:'Historisches Dorf Grižane und Belgrad',hint:'Erkunde nur die gut begehbaren Gassen des Orts.'}
 ],
 haludovo:[
  {parts:[2,0,1,4,5],label:'Öffentlicher Strand – Blick auf Haludovo',hint:'Beginne ausschließlich an einem öffentlich zugänglichen Strand- oder Promenadenabschnitt. Das Gebäude selbst und abgesperrte Flächen sind kein GPS-Ziel und dürfen nicht betreten werden.'},
  {parts:[3,6],label:'Rajska cesta – Promenade',hint:'Gehe nur über den öffentlich freigegebenen Promenadenabschnitt. Keine Zugänge durch Hotelruinen.'}
 ]
};

// Die 73 vertiefenden historischen Hauptkapitel bleiben in der separaten
// Audioguide-Kapitelliste. Während des Gehens sprechen eigenständig redigierte
// Stationsgeschichten, nicht die sichtbaren Infokästen.
const WALK_LOCAL_KEY='adriaguide-2027-gehrundgang-v1';
function walkRestore(){try{return JSON.parse(localStorage.getItem(WALK_LOCAL_KEY))||{}}catch{return {}}}
const walkSaved=walkRestore();
const walkState={placeId:walkSaved.placeId||null,step:Number.isInteger(walkSaved.step)?walkSaved.step:0,
 status:walkSaved.placeId?'waiting':'idle',automatic:false,watchId:null,location:null,lastDistance:null,
 awaitingUnlock:false,lastTrigger:'',speakingTransition:false};
function walkPersist(){try{localStorage.setItem(WALK_LOCAL_KEY,JSON.stringify({placeId:walkState.placeId,step:walkState.step}))}catch{}}
function walkSteps(placeId){const p=byId(placeId), groups=WALK_GROUPS[placeId];if(!p||!groups)return [];
 return groups.map((g,i)=>({
  id:placeId+':'+i, placeId, index:i, label:g.label, hint:g.hint, mode:g.mode||'walking', optional:!!g.optional,
  parts:g.parts, title:g.label, target:p.sights[g.parts[0]].nav||p.nav,
  coords:Array.isArray(g.coords)?g.coords:(g.poi?[p.lat,p.lon]:null),
  source:g.source|| (g.poi?'mainPOI':null),
  note:g.source?'Einzelpunkt aus verlinktem Kartendatensatz':g.poi?'POI-Koordinate aus der ursprünglichen Ortsdatenbasis':'Kein verifizierter Einzelpunkt – Ankunft manuell bestätigen',
  script:g.parts.map(part=>p.sights[part].audioText).filter(Boolean).join('\n\n'),
  min:Math.max(1,Math.round(g.parts.reduce((sum,part)=>sum+(p.sights[part].audioText||'').split(/\s+/).length,0)/130))
 }));
}
function walkCurrent(){const list=walkSteps(walkState.placeId);return list[Math.min(walkState.step,list.length-1)]||null}
function walkTargetUrl(step,mode){const useMode=mode||step.mode||'walking';return 'https://www.google.com/maps/dir/?api=1&destination='+encodeURIComponent(step.coords?step.coords.join(','):step.target)+'&travelmode='+useMode}
function walkEntireUrl(p){const steps=walkSteps(p.id);if(!steps.length)return walkTargetUrl({target:p.nav});
 // Mobile Maps hat nur begrenzte Zwischenstopps. Maximal drei markierte Zwischenhalte.
 const entries=steps.length>5?[steps[0],steps[Math.floor(steps.length/3)],steps[Math.floor(steps.length*2/3)],steps[steps.length-1]]:steps;
 const to=t=>t.coords?t.coords.join(','):t.target;
 return 'https://www.google.com/maps/dir/?api=1&origin='+encodeURIComponent(to(entries[0]))+'&destination='+encodeURIComponent(to(entries[entries.length-1]))+
 (entries.length>2?'&waypoints='+encodeURIComponent(entries.slice(1,-1).map(to).join('|')):'')+'&travelmode=walking';
}
function walkDistance(step){if(!step||!step.coords||!walkState.location)return null;
 const c=walkState.location.coords;return Math.round(kmBetween(c.latitude,c.longitude,step.coords[0],step.coords[1])*1000);
}
function walkDistanceLabel(step){const d=walkDistance(step);if(d===null)return 'GPS-Abstand nicht verfügbar';const a=Math.round(walkState.location.coords.accuracy||0);
 return `${d} m Luftlinie · GPS ±${a} m`;
}
function walkRenderPanel(p){
 const steps=walkSteps(p.id),active=walkState.placeId===p.id,cur=active?steps[walkState.step]:steps[0];if(!steps.length)return '';
 const finished=active&&walkState.status==='done';
 return `<section class="walkguide" id="fussfuehrung"><div class="walkguide-heading"><div class="eyebrow">DEINE FÜHRUNG VOR ORT</div><h2>Schritt für Schritt</h2>
 <span class="pill">${steps.length} Stationen</span></div>
 ${!active?`<div class="walkguide-preview"><div class="guide-steps">Erste Station</div><h3>${h(steps[0].label)}</h3><p>${h(steps[0].hint)}</p></div>
 <div class="actions"><button class="btn primary" type="button" data-action="walk-start" data-value="${attr(p.id)}">▶ Führung beginnen</button>
 <a class="btn soft" target="_blank" rel="noopener noreferrer" href="${attr(walkTargetUrl(steps[0]))}">↗ Google · Startpunkt</a><a class="btn ghost" target="_blank" rel="noopener noreferrer" href="${attr(appleNav(steps[0].coords?steps[0].coords.join(','):steps[0].target,steps[0].mode))}">↗ Apple · Fußweg</a></div>`:
 `<div class="walkguide-live" aria-live="polite"><div class="guide-steps">${finished?'Führung beendet':`Station ${walkState.step+1} von ${steps.length}`}</div>
 <h3>${finished?'Alle Stationen besucht':h(cur.label)}</h3>${!finished&&cur.optional?'<span class="pill optional">Freiwilliger Zusatzstopp</span>':''}
 ${finished?'<p>Du hast die Gehführung abgeschlossen. Du kannst sie erneut starten oder weitere Orte entdecken.</p>':
 `<p>${h(cur.hint)}</p>${cur.coords?`<div class="walkguide-distance">${h(walkDistanceLabel(cur))}</div>`:''}
 <div class="actions walk-primary"><a class="btn primary" target="_blank" rel="noopener noreferrer" href="${attr(walkTargetUrl(cur))}">↗ Google ${cur.mode==='driving'?'Autofahrt':'Fußweg'}</a>
 <a class="btn ghost" target="_blank" rel="noopener noreferrer" href="${attr(appleNav(cur.coords?cur.coords.join(','):cur.target,cur.mode))}">↗ Apple ${cur.mode==='driving'?'Auto':'Fußweg'}</a>
 ${btn('▶ Hier erzählen','walk-arrived','','coral')}</div><div class="walk-secondary actions">${walkState.step>0?btn('← Zurück','walk-prev','','ghost small'):''}${btn('Station überspringen','walk-next','','ghost small')}</div>`}
 <div class="walkguide-choice"><label class="walk-autolabel"><input type="checkbox" id="walkAuto" ${walkState.automatic?'checked':''}>
 <span><b>Bei GPS-Ankunft automatisch starten</b><small>Nur freiwillig und bei sichtbarer App; bei Sperrbildschirm oder Wechsel zu Maps kann iOS pausieren. Bei einem Auto-Zusatzstopp startest du erst nach dem Parken selbst.</small></span></label></div>
 <div class="actions">${btn('Führung beenden','walk-end','','ghost small')}${btn('Neustart','walk-restart',p.id,'ghost small')}</div></div>`}
 <details class="walk-list"><summary>Alle Stationen anzeigen</summary><ol class="walk-sequence">
 ${steps.map((s,i)=>`<li class="${active&&i===walkState.step?'is-current':''} ${active&&i<walkState.step?'is-done':''}">
 <button type="button" data-action="walk-jump" data-value="${p.id}:${i}"><span class="walk-index">${i+1}</span><span><strong>${h(s.label)}</strong><small>${s.optional?'Optional · ':''}${s.mode==='driving'?'Anfahrt mit Auto · ':''}${s.coords?'Standort nutzbar':'Ankunft manuell'} · ca. ${h(s.min)} Min. Hörzeit</small></span></button></li>`).join('')}</ol></details>
 <details class="walk-info"><summary>Wegführung, Vertiefungen & GPS</summary>
 <p>Die Gehführung spielt eigens verfasste Vor-Ort-Geschichten ab. Wenn du tiefer einsteigen möchtest, findest du alle ausführlichen historischen Kapitel im Abschnitt „Audioguide und einzelne Kapitel“.</p>
 <p>Die Ankunftsprüfung nutzt nur lokal den freiwillig freigegebenen Standort. Google Maps benötigt Internet, GPS kann in Altstadtgassen ungenau sein. Automatischer Tonstart kann auf dem iPhone blockiert werden; nutze dann „Hier erzählen“.</p>
 <p>Einzelne Stationen haben keine zuverlässige Einzelkoordinate; dort startest du manuell. Der optionale Friedhof bei Ledenice wird ausdrücklich als separate Autofahrt angezeigt, nicht als Dorfspaziergang. Prüfe Sperrungen und Treppen vor Ort.</p></details>
 ${p.id==='ledenice'?`<div class="walk-extra"><strong>Auch möglich: Burgruine Ledenice</strong><p>Freiwilliger steiniger Aufstieg mit separater Führung.</p>${btn('Burgruine ansehen','place','gradina','ghost small')}</div>`:''}
 </section>`;
}
function walkStart(placeId){if(!WALK_GROUPS[placeId]){notice('Für diesen Ort gibt es keine Gehführung.');return}if(typeof audioStop==='function'&&player.place)audioStop();walkStopWatch();
 walkState.placeId=placeId;walkState.step=0;walkState.status='waiting';walkState.automatic=false;walkState.location=null;walkState.lastDistance=null;walkState.lastTrigger='';walkPersist();
 if(state.page!=='place'||state.place!==placeId)go('place',placeId);else render();
 notice('Gehführung bereit. Gehe zur ersten Station und tippe auf „Ich bin hier“ – oder aktiviere freiwillig GPS.');
 document.getElementById('fussfuehrung')?.scrollIntoView({behavior:'smooth',block:'start'});
}
function walkStopWatch(){if(walkState.watchId!==null&&navigator.geolocation){navigator.geolocation.clearWatch(walkState.watchId)}walkState.watchId=null;walkState.automatic=false}
function walkEnd(){if(typeof audioStop==='function'&&player.walkStepId)audioStop(true);walkStopWatch();walkState.placeId=null;walkState.step=0;walkState.status='idle';walkState.lastDistance=null;walkPersist();render();notice('Gehführung beendet. GPS-Beobachtung ausgeschaltet.')}
function walkJump(placeId,index){if(!walkState.placeId||walkState.placeId!==placeId)walkStart(placeId);
 if(player.walkStepId)audioStop(true);const steps=walkSteps(placeId);if(!Number.isInteger(index)||index<0||index>=steps.length)return;
 walkState.step=index;walkState.status='waiting';walkState.lastTrigger='';walkPersist();render();
}
function walkNext(direction=1){if(!walkState.placeId)return;if(player.walkStepId)audioStop(true);const steps=walkSteps(walkState.placeId);
 let n=walkState.step+direction;
 if(n<0)n=0;
 if(n>=steps.length){walkState.status='done';walkStopWatch();walkPersist();render();notice('Deine Gehführung ist abgeschlossen.');return}
 walkState.step=n;walkState.status='waiting';walkState.lastTrigger='';walkState.lastDistance=null;walkPersist();render();
 // Richtungsansage ist die Fortsetzung einer bereits vom Nutzer gestarteten Führung.
 // Der Browser kann selbst diese Wiedergabe unterbinden, dann bleibt die Anzeige sichtbar.
 const next=steps[n];walkSpeak((next.optional?'Wenn Sie noch Zeit und Lust haben, folgt dieser freiwillige Zusatzstopp: ':'Als Nächstes führt Sie der Rundgang zu ')+next.label+'. '+next.hint);
}
function walkSpeak(text){if(!('speechSynthesis'in window)||!walkState.placeId)return;
 try{speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(text);u.lang='de-DE';u.rate=state.speed;const v=chosenVoice();if(v)u.voice=v;speechSynthesis.speak(u)}catch{notice('Die nächste Station ist auf dem Bildschirm angezeigt.')}
}
function walkArrived(automatic=false){const step=walkCurrent();if(!step)return;
 if(walkState.status==='playing')return;
 if(automatic&&(!walkState.automatic||document.visibilityState!=='visible'))return;
 walkState.status='playing';walkState.lastTrigger=step.id; // verhindert doppelte GPS-Starts.
 // Der gesprochene Text stammt ausschließlich aus der eigenen Vor-Ort-Hörfassung.
 const p=byId(step.placeId),chapter=p.audio.length+step.parts[0];
 selectChapter(step.placeId,chapter,false);
 player.segments=chunksOf(step.script);player.total=step.script.length;
 player.spoken=0;player.segmentIndex=0;player.active=true;player.paused=false;
 player.walkStepId=step.id;
 player.started=false;playSegment(player.generation);render();updateDock();
 if(automatic){const at=step.id;setTimeout(()=>{
  if(walkState.status!=='playing'||player.walkStepId!==at)return;
  const synthesisBusy=typeof speechSynthesis!=='undefined'&&speechSynthesis.speaking;
  if(!player.started&&!synthesisBusy){audioStop(true);walkState.status='waiting';render();notice('Safari hat das automatische Abspielen blockiert. Bitte auf „Ich bin hier – erzählen“ tippen.');}
 },8000);}
 notice((automatic?'GPS-Ankunft erkannt. ':'')+'Hörstation: '+step.label);
}
function walkAudioFinished(){if(!player.walkStepId||walkState.status!=='playing')return;
 const cur=walkCurrent();if(!cur||player.walkStepId!==cur.id)return;
 // Nach dem Kapitelende den alten Audioplayer schließen, damit nicht die vorige Station mit 100 % Fortschritt stehen bleibt.
 audioStop();
 walkNext(1);
}
function walkAutoEnable(enabled){
 if(!enabled){walkStopWatch();walkState.lastDistance=null;render();notice('Automatische GPS-Fortsetzung ausgeschaltet.');return}
 if(!walkState.placeId){notice('Bitte starte zunächst eine Gehführung.');return}
 if(!navigator.geolocation||!isSecureContext){notice('GPS erfordert eine HTTPS-Webseite und Standortfreigabe.');render();return}
 walkStopWatch();walkState.automatic=true;
 walkState.watchId=navigator.geolocation.watchPosition(pos=>{
  walkState.location=pos;walkState.lastDistance=walkDistance(walkCurrent());
  const step=walkCurrent();
  if(step&&step.coords&&step.mode!=='driving'&&walkState.status==='waiting'&&document.visibilityState==='visible'&&!(Number.isFinite(pos.coords.speed)&&pos.coords.speed>1.6)){
   const accuracy=pos.coords.accuracy;
   // Nur brauchbare Genauigkeit; Durchgänge/Innenräume können GPS stören.
   const radius=step.placeId==='gradina'?50:step.placeId==='senj'?45:70;
   if(Number.isFinite(accuracy)&&accuracy<=70&&walkState.lastDistance!==null&&walkState.lastDistance<=radius&&walkState.lastTrigger!==step.id){
    walkArrived(true);
   }
  }
  if(state.page==='place'&&state.place===walkState.placeId){
   const label=document.querySelector('.walkguide-distance');if(label&&step)label.textContent=walkDistanceLabel(step);
  }
 },err=>{
  notice('GPS konnte nicht fortgesetzt werden: '+(err.code===1?'Standortfreigabe fehlt.':err.message));
  if(err.code===1)walkStopWatch();
 },{enableHighAccuracy:true,maximumAge:15000,timeout:18000});
 render();notice('GPS-Fortsetzung aktiv. Die Seite muss sichtbar bleiben.');
}
