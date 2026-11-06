const SHELL="tid-shell-40cbc84be7", MEDIA="tid-media-v1";
const CORE=["./","./index.html","./manifest.webmanifest","./icon-180.png","./icon-192.png","./icon-512.png"];
self.addEventListener("install",e=>{ e.waitUntil(caches.open(SHELL).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting())); });
self.addEventListener("activate",e=>{ e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k.indexOf("tid-shell-")===0&&k!==SHELL).map(k=>caches.delete(k)))).then(()=>self.clients.claim())); });
async function shellFallback(){ const c=await caches.open(SHELL); return (await c.match("./index.html"))||(await c.match("./"))||(await caches.match("./index.html"))||new Response("Offline",{status:503}); }
async function media(req){
  const cache=await caches.open(MEDIA); let hit=await cache.match(req.url);
  if(!hit){ try{ const r=await fetch(req.url); if(!r.ok) return r; await cache.put(req.url,r.clone()); hit=r; }catch(e){ return new Response("",{status:504}); } }
  const range=req.headers.get("range"); if(!range) return hit;
  const buf=await hit.clone().arrayBuffer(), size=buf.byteLength, m=/bytes=(\d*)-(\d*)/.exec(range)||[];
  let start, end;
  if(!m[1]){ start=Math.max(0,size-parseInt(m[2]||"0",10)); end=size-1; } else { start=parseInt(m[1],10); end=m[2]?Math.min(parseInt(m[2],10),size-1):size-1; }
  if(start>=size) return new Response("",{status:416,headers:{"Content-Range":"bytes */"+size}});
  return new Response(buf.slice(start,end+1),{status:206,headers:{"Content-Type":hit.headers.get("Content-Type")||"audio/mp4","Content-Range":"bytes "+start+"-"+end+"/"+size,"Content-Length":String(end-start+1),"Accept-Ranges":"bytes"}});
}
self.addEventListener("fetch",e=>{
  const req=e.request; if(req.method!=="GET") return;
  const url=new URL(req.url);
  if(req.mode==="navigate"){
    e.respondWith(fetch(req).then(r=>{ if(r.ok){ const cp=r.clone(); caches.open(SHELL).then(c=>c.put("./index.html",cp)); } return r; }).catch(shellFallback));
    return;
  }
  if(url.origin===self.location.origin && url.pathname.indexOf("/audio/")>=0){ e.respondWith(media(req)); return; }
  if(url.origin===self.location.origin || /(^|\.)fonts\.(googleapis|gstatic)\.com$/.test(url.hostname)){
    e.respondWith(caches.match(req).then(hit=>hit||fetch(req).then(r=>{ if(r.ok||r.type==="opaque"){ const cp=r.clone(); caches.open(SHELL).then(c=>c.put(req,cp)); } return r; }).catch(()=>hit||new Response("",{status:504}))));
  }
});
