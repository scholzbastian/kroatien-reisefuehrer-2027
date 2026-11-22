/* Offline PWA. Kein Tracking, kein Push, keine Server-Standortübermittlung. */
const VERSION='kroatien2027-cache-amala-10-b2452da09e';
const CORE=['./','./index.html','./styles.css','./data.js','./bonus-audio.js','./editorial-master.js','./story-audio.js','./app.js','./walking-guide.js','./katrin-audio.js','./katrin-player.js','./amala-offline.js','./manifest.webmanifest','./assets/icon.svg','./assets/icon-192.png','./assets/icon-512.png','./assets/hero-illustration.jpg','./assets/senj-illustration.jpg','./assets/nehaj-illustration.jpg','./assets/ledenice-illustration.jpg','./assets/bribir-illustration.jpg','./assets/drivenik-illustration.jpg','./assets/grobnik-illustration.jpg','./assets/haludovo-illustration.jpg','./assets/sea-illustration.jpg'];
self.addEventListener('install',event=>{event.waitUntil(caches.open(VERSION).then(cache=>cache.addAll(CORE)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('kroatien2027-cache-')&&k!==VERSION).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',event=>{
 const request=event.request;if(request.method!=='GET')return;
 const url=new URL(request.url);if(url.origin!==self.location.origin)return; // Externe Bilder/Maps nicht als offline garantiert.
 // Safari-Audio verlangt häufig HTTP-Teilbereiche (Range: bytes=...).
 // Bei offline gespeicherten vollständigen MP3s selbst korrekte 206-Antworten liefern.
 if(url.pathname.toLowerCase().endsWith('.mp3')){
  event.respondWith((async()=>{
   const cache=await caches.open(VERSION);
   const cached=await cache.match(url.href);
   const requestedRange=request.headers.get('range');
   if(cached&&requestedRange){
    const match=/^bytes=(\d*)-(\d*)$/.exec(requestedRange.trim());
    if(match){
     const full=await cached.blob();
     const length=full.size;
     let start=match[1]?Number(match[1]):0;
     let end=match[2]?Number(match[2]):length-1;
     if(!match[1]&&match[2]){const last=Number(match[2]);start=Math.max(0,length-last);end=length-1;}
     if(Number.isSafeInteger(start)&&Number.isSafeInteger(end)&&start>=0&&start<length&&end>=start){
      end=Math.min(end,length-1);
      return new Response(full.slice(start,end+1,'audio/mpeg'),{status:206,headers:{'Content-Type':'audio/mpeg','Accept-Ranges':'bytes','Content-Range':`bytes ${start}-${end}/${length}`,'Content-Length':String(end-start+1)}});
     }
     return new Response('',{status:416,headers:{'Content-Range':`bytes */${length}`}});
    }
   }
   if(cached)return cached;
   try{const response=await fetch(request);if(!requestedRange&&response.ok&&response.status===200)cache.put(url.href,response.clone());return response;}catch{return Response.error();}
  })());return;
 }
 if(request.mode==='navigate'){event.respondWith((async()=>{try{const resp=await fetch(request);if(resp.ok){try{await (await caches.open(VERSION)).put('./index.html',resp.clone())}catch{}}return resp}catch{return await caches.match('./index.html')||Response.error()}})());return}
 event.respondWith(caches.match(request).then(cached=>cached||fetch(request).then(resp=>{if(resp.ok)caches.open(VERSION).then(cache=>cache.put(request,resp.clone()));return resp})))
});
