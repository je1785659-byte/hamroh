// Bog' himoyasi: har bir bosqich 3 xil o'yinchi bilan (kuchli / tasodifiy / hech narsa qilmaydigan) tezlashtirib o'ynaladi.
// Tekshiruv: JS xatosi yo'q, NaN yo'q, o'yin har doim tugaydi (yutish yoki yutqazish) — "o'yin davom etyapti-yu hech narsa bo'lmayapti" holati yo'q.
const { chromium } = require('playwright');const RUNS=+process.argv[2]||2;
(async()=>{const br=await chromium.launch();const p=await (await br.newContext({viewport:{width:960,height:540}})).newPage();const errs=[];p.on('pageerror',x=>errs.push(x.message.slice(0,200)));
 await p.goto('http://127.0.0.1:8392/bog/index.html');await p.waitForFunction(()=>window.__bog&&__bog.LV,null,{timeout:15000});
 const n=await p.evaluate(()=>__bog.LV.length);const bad=[];
 for(let i=0;i<n;i++)for(const who of ['kuchli','tasodifiy','bekor'])for(let k=0;k<(who==='tasodifiy'?RUNS:1);k++){
  const r=await p.evaluate(([i,who])=>{const B=__bog;B.setProg(20);B.newLevel(i);const L=B.LV[i],mode=L.mode,S=B.seedsFor(i);B.setSeeds(S);B.st='play';
   const ok=(t,r,c)=>{try{return B.canPlant(t,r,c)}catch(e){return false}};let n=0,nan=0,idle=0,lastZ=-1,lastW=-1;
   if(who==='kuchli'&&mode!=='bowl')for(const r of L.lanes){if(L.water&&L.water.includes(r))for(let c=0;c<7;c++)if(ok('raft',r,c))B.plantAt('raft',r,c);
     for(let c=0;c<3;c++)if(ok('pea',r,c))B.plantAt(c===0?'twin':c===1?'ice':'pea',r,c);if(ok('nut',r,5))B.plantAt('nut',r,5);if(ok('snap',r,3))B.plantAt('snap',r,3)}
   while(n<30000&&B.s.ST==='play'&&!B.s.rewardDrop){B.update(1/30);n++;
     if(who==='kuchli'&&mode==='bowl'&&n%45===0){try{B.plantAt((n/45|0)%4===0?'xnut':'nut',L.lanes[(n/45|0)%L.lanes.length],0)}catch(e){}}
     if(who==='tasodifiy'&&n%60===0){B.give(25);const t=S[Math.floor(Math.random()*S.length)],r=Math.floor(Math.random()*5),c=Math.floor(Math.random()*9);if(ok(t,r,c))B.plantAt(t,r,c)}
     if(n%30===0){for(const z of B.z)if(!isFinite(z.x)||!isFinite(z.hp))nan++;const s=B.s;if(s.zombies===lastZ&&s.wave===lastW)idle++;else idle=0;lastZ=s.zombies;lastW=s.wave}}
   const s=B.s;return {ST:s.ST,won:!!s.rewardDrop,sec:Math.round(n/30),wave:s.wave+'/'+s.waves,z:s.zombies,nan,idle}},[i,who]);
  const lv=(Math.floor(i/10)+1)+'-'+(i%10+1);const ended=r.won||r.ST==='lost';
  const prob=!ended?'TUGAMADI (o‘yin qotgan)':r.nan?'NaN':(who==='kuchli'&&!r.won)?'kuchli o‘yinchi yutqazdi':(who==='bekor'&&r.won)?'hech narsa qilmay yutdi':'';
  if(prob)bad.push(lv+' '+who+': '+prob+' '+JSON.stringify(r));
  if(k===0)console.log(lv.padEnd(5),who.padEnd(10),r.won?'yutdi':r.ST,(r.sec+'s').padStart(5),r.wave,prob)}
 console.log('\nMUAMMOLAR:',bad.length?'\n'+bad.join('\n'):'yo‘q','\nJS xatolari:',errs.length,[...new Set(errs)].slice(0,5));await br.close();process.exit(bad.length||errs.length?1:0)})();
