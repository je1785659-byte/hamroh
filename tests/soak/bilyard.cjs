// Bilyard: 300 ta kuchli yon aylanishli tasodifiy zarba — sharlar to'xtagach o'yin kutib qolmasligi (qotish) tekshiriladi.
const { chromium } = require('playwright');
(async()=>{const br=await chromium.launch();const p=await br.newPage();await p.goto('http://127.0.0.1:8392/bilyard/index.html');await p.waitForTimeout(200);
 const res=(await p.evaluate(()=>{const B=__bil,W=B.W,H=B.H,R=B.R,gaps=[],longs=[];let worst=null;
  for(let t=0;t<300;t++){B.newGame('solo');const bs=B.balls;
   if(t%2){bs.forEach(b=>{if(Math.random()<.5&&!b.cue){b.on=false;return}let ok=false,k=0;while(!ok&&k++<60){b.x=R+.002+Math.random()*(W-2*R-.004);b.y=R+.002+Math.random()*(H-2*R-.004);ok=bs.every(o=>o===b||!o.on||Math.hypot(o.x-b.x,o.y-b.y)>2*R+.0005)}})}
   const c=bs.find(b=>b.cue),a=Math.random()*6.283,sp=[Math.cos(a),Math.sin(a)];
   B.set({sel:bs.indexOf(c),ang:Math.random()*6.283,pow:.15+Math.random()*.85,spin:sp});B.fire();let n=0,stop=null;
   while(n++<36000){const mv=B.step(1/300);const still=bs.every(b=>!b.on||Math.hypot(b.vx,b.vy)<.004);if(still&&stop==null)stop=n;if(!still)stop=null;if(!mv)break}
   const gap=(n-(stop||n))/300;gaps.push(gap);if(gap>1)longs.push({gap:+gap.toFixed(1),wz:+Math.max(...bs.map(b=>Math.abs(b.wz))).toFixed(0),spin:sp.map(v=>+v.toFixed(2))});if(!worst||gap>worst.gap)worst={gap:+gap.toFixed(1),t,n};B.endShot()}
  gaps.sort((a,b)=>a-b);return {zarbalar:300,'1 s dan ko\'p kutgan':longs.length,'eng uzun kutish (s)':worst.gap,median:+gaps[150].toFixed(2),misollar:longs.slice(0,5)}}));console.log(JSON.stringify(res));await br.close();process.exit(res['1 s dan ko\'p kutgan']?1:0)})();
