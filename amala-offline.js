/* Speichert ausschließlich bereits verfügbare Amala-MP3s auf Nutzerwunsch im Browsercache. */
const AMALA_OFFLINE_CACHE='kroatien2027-cache-amala-10-b2452da09e';
const AMALA_OFFLINE_FILES=["./audio/walk-senj-01.mp3", "./audio/walk-senj-02.mp3", "./audio/walk-senj-03.mp3", "./audio/walk-senj-04.mp3", "./audio/walk-senj-05.mp3", "./audio/main-senj-01.mp3", "./audio/main-senj-02.mp3", "./audio/main-senj-03.mp3", "./audio/main-senj-04.mp3", "./audio/main-senj-05.mp3"];
let amalaIsDownloading=false;
async function amalaOfflineSave(){
 const label=()=>document.getElementById('amala-offline-status');
 const show=s=>{const el=label();if(el)el.textContent=s;};
 if(amalaIsDownloading){show('Der Download läuft bereits.');return;}
 if(!('caches' in window)||!window.isSecureContext){show('Offline-Speichern funktioniert erst auf einer per HTTPS veröffentlichten App, z. B. GitHub Pages.');return;}
 amalaIsDownloading=true;
 try{
  const cache=await caches.open(AMALA_OFFLINE_CACHE);
  let completed=0;
  for(const file of AMALA_OFFLINE_FILES){
   const url=new URL(file,location.href).href;
   const have=await cache.match(url);
   if(!have){
    const response=await fetch(url,{cache:'no-cache'});
    if(!response.ok)throw new Error('HTTP '+response.status+' bei '+file);
    await cache.put(url,response);
   }
   completed++;
   show(completed+' von '+AMALA_OFFLINE_FILES.length+' MP3s auf diesem Gerät gespeichert …');
  }
  show('✓ Alle '+completed+' Amala-MP3s sind auf diesem Gerät offline gespeichert. Bitte vor der Reise einmal im Flugmodus testen.');
 }catch(e){show('Download nicht vollständig: '+(e?.message||'Speicher- oder Netzwerkfehler')+'. Bitte mit Internet erneut versuchen.');}
 finally{amalaIsDownloading=false;}
}
document.addEventListener('click',event=>{
 const el=event.target.closest('[data-action="amala-download-offline"]');
 if(el)amalaOfflineSave();
});
