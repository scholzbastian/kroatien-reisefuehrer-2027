'use strict';
/* MP3-Schicht über dem bewährten Browser-Vorleser. Keine Zahlung und keine
   Audiosynthese im Browser; nur bestätigte MP3-Links in KATRIN_MP3.
   Ist keine MP3 vorhanden, bleibt der bisherige Text-/Vorlesemodus nutzbar. */
let katrinCurrentAudio=null;
let katrinCurrentKey=null;
let katrinLastCompleted=false;
const katrinOldPlaySegment=playSegment;
const katrinOldAudioStop=audioStop;
const katrinOldPlayPause=playPause;
const katrinOldUpdateDock=updateDock;
const katrinOldWalkSpeak=walkSpeak;
function katrinTrackKey(){
 if(!player.place)return null;
 if(player.walkStepId){const [place,idx]=player.walkStepId.split(':');return 'walk:'+place+':'+idx;}
 const p=byId(player.place);return p&&player.index<p.audio.length?'main:'+player.place+':'+player.index:null;
}
function katrinResetAudio(){
 const old=katrinCurrentAudio;katrinCurrentAudio=null;katrinCurrentKey=null;
 if(old){old.pause();old.onended=null;old.onerror=null;old.ontimeupdate=null;old.onloadedmetadata=null;old.removeAttribute('src');old.load();}
}
function katrinStop(keep=false){katrinResetAudio();katrinOldAudioStop(keep)}
audioStop=katrinStop;
function katrinSyncProgress(){
 const a=katrinCurrentAudio;
 if(!a||!player.total||!Number.isFinite(a.duration)||a.duration<=0)return;
 player.spoken=Math.round(player.total*Math.min(1,a.currentTime/a.duration));
 const prog=document.querySelector('#audioDock progress');if(prog)prog.value=Math.min(100,Math.round(a.currentTime/a.duration*1000)/10);
}
function katrinStart(generation){
 if(generation!==player.generation||!player.active||player.paused)return false;
 if(katrinCurrentAudio)return true;
 const key=katrinTrackKey(),file=key&&KATRIN_MP3[key];
 if(!file?.url)return false;
 const audio=new Audio(file.url);audio.preload='auto';audio.playbackRate=state.speed;
 katrinCurrentAudio=audio;katrinCurrentKey=key;player.started=false;
 audio.onloadedmetadata=()=>{if(katrinCurrentAudio===audio)katrinSyncProgress()};
 audio.ontimeupdate=()=>{if(katrinCurrentAudio===audio)katrinSyncProgress()};
 audio.onended=()=>{
  if(katrinCurrentAudio!==audio||generation!==player.generation)return;
  katrinSyncProgress();const wasWalk=!!player.walkStepId;
  const place=player.place,index=player.index,continues=!!player.mainSeries;
  katrinResetAudio();player.active=false;updateDock();
  if(wasWalk&&typeof walkAudioFinished==='function'){
   katrinLastCompleted=true;walkAudioFinished();katrinLastCompleted=false;return;
  }
  const p=byId(place);
  if(continues&&p&&index+1<p.audio.length){selectChapter(place,index+1,true,true);return;}
  player.mainSeries=false;
 };
 audio.onerror=()=>{
  if(katrinCurrentAudio!==audio||generation!==player.generation)return;
  katrinResetAudio();player.active=false;player.paused=false;
  if(player.walkStepId&&walkState.status==='playing')walkState.status='waiting';
  updateDock();notice('Die Amala-MP3 konnte nicht geladen werden. Bitte Internet prüfen oder den Erzähltext lesen.');
 };
 try{
  const promise=audio.play();
  if(promise&&typeof promise.then==='function')promise.then(()=>{
   if(katrinCurrentAudio===audio&&generation===player.generation){player.started=true;updateDock()}
  }).catch(()=>{
   if(katrinCurrentAudio!==audio)return;
   katrinResetAudio();player.active=false;player.paused=false;
   if(player.walkStepId&&walkState.status==='playing')walkState.status='waiting';
   updateDock();notice('Das iPhone hat den automatischen MP3-Start blockiert. Tippe erneut auf „Hier erzählen“.');
  });
 }catch{
  katrinResetAudio();player.active=false;updateDock();notice('MP3 konnte nicht gestartet werden.');
 }
 updateDock();return true;
}
playSegment=function(generation){
 if(katrinStart(generation))return;
 katrinOldPlaySegment(generation);
};
playPause=function(){
 // Stop lässt den Player offen, leert aber die Abschnitte. Play startet neu.
 if(player.place&&!player.active&&!player.segments.length){
  if(typeof walkState!=='undefined'&&walkState.placeId===player.place&&walkState.status==='waiting'){walkArrived(false);return;}
  selectChapter(player.place,player.index,true,false);return;
 }
 if(katrinCurrentAudio){
  const a=katrinCurrentAudio;
  if(!a.paused){a.pause();player.paused=true;updateDock();}
  else{a.play().then(()=>{player.active=true;player.paused=false;updateDock()}).catch(()=>notice('Tippe noch einmal auf Play, um die MP3 fortzusetzen.'))}
  return;
 }
 katrinOldPlayPause();
};
updateDock=function(){
 katrinOldUpdateDock();
 const el=document.getElementById('audioDock');if(!el||!player.place)return;
 if(katrinCurrentAudio&&katrinCurrentKey){
  const info=el.querySelector('.minititle');if(info&&!info.querySelector('.amala-label')){
   const sub=document.createElement('span');sub.className='amala-label';sub.textContent=' · Amala MP3';info.appendChild(sub);
  }
 }
};
const katrinOldWalkStart=walkStart;
walkStart=function(placeId){katrinLastCompleted=false;katrinOldWalkStart(placeId)};
walkSpeak=function(text){
 if(katrinLastCompleted){
  katrinLastCompleted=false;
  // Die endgültigen Amala-Stationen erhalten eine aufgenommene Übergangsansage.
  // Bis dahin: Keine abrupte Rückkehr zur störenden Safari-Computerstimme.
  return;
 }
 katrinOldWalkSpeak(text);
};
// Audio-Tempo während einer laufenden MP3 aktualisieren.
document.addEventListener('change',e=>{
 if((e.target.id==='dockSpeed'||e.target.id==='settingSpeed')&&katrinCurrentAudio){
  katrinCurrentAudio.playbackRate=state.speed;
 }
});
