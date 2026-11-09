/* Hamroh: oflayn rejim. Sahifa — avval tarmoqdan, bo'lmasa keshdan; ?v= li fayllar — keshdan (trafik tejaladi). */
const SW_C='hamroh-1';
function swKey(u){const x=new URL(u);return x.pathname.endsWith('/')||x.pathname.endsWith('/index.html')?x.origin+x.pathname.replace(/index\.html$/,''):x.origin+x.pathname+x.search}
function swKind(u,mode){const x=new URL(u);
  if(x.origin!==self.location.origin)return x.href.startsWith('https://telegram.org/js/')?'fresh':'net';
  if(mode==='navigate'||x.pathname.endsWith('/')||x.pathname.endsWith('/index.html'))return 'page';
  if(/\/(version\.json|bot\.txt)$/.test(x.pathname)||/^\/(api|rn)\b/.test(x.pathname)&&!/\.\w+$/.test(x.pathname))return 'net';
  return x.searchParams.has('v')?'static':'fresh'}
async function swPut(c,req,res,key){await c.put(key,res);
  if(!key.includes('?v='))return; // eski versiyalarni o'chiramiz
  const p=key.split('?')[0];for(const r of await c.keys())if(r.url!==key&&r.url.split('?')[0]===p)c.delete(r)}
self.addEventListener('install',e=>{self.skipWaiting()});
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==SW_C).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{const r=e.request;if(r.method!=='GET')return;let k;try{k=swKind(r.url,r.mode)}catch(_){return}if(k==='net')return;
  const key=swKey(r.url);
  e.respondWith(caches.open(SW_C).then(async c=>{const hit=await c.match(key);
    if(k==='static'&&hit)return hit;
    const net=fetch(r).then(res=>{if(res&&(res.ok||res.type==='opaque'))swPut(c,r,res.clone(),key).catch(()=>{});return res});
    if(k==='fresh'&&hit){e.waitUntil(net.catch(()=>{}));return hit}
    if(k==='page'&&hit)return Promise.race([net,new Promise((_,rej)=>setTimeout(rej,4000))]).catch(()=>hit);
    return net.catch(()=>hit||Response.error())}))});
