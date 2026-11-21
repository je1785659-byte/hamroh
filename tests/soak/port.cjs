// Port: tasodifiy o'yinchi bilan missiyalar (o'lish/yutish oxirigacha) + "o'lmaydigan" 10 daqiqalik o'yin: xato, NaN, sahnada narsa to'planib qolishi (xotira oqishi).
const { chromium } = require('playwright');
(async()=>{const br=await chromium.launch({args:['--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist']});
 const ctx=await br.newContext({viewport:{width:780,height:390},hasTouch:true,isMobile:true});const p=await ctx.newPage();const errs=[];p.on('pageerror',x=>errs.push(x.message.slice(0,200)));
 await p.goto('http://127.0.0.1:8392/port/index.html#uz');await p.waitForFunction(()=>window.__G&&__G.start,null,{timeout:30000});await p.waitForTimeout(4000);
 let bad=0;const run0=(god,secs)=>p.evaluate(([god,secs])=>new Promise(res=>{const G=__G,I=G.I,P=G.P;G.start();let t=0,nan=0,maxE=0,ch0=G.scene.children.length,maxCh=ch0,err=null;
   const step=()=>{try{for(let k=0;k<120&&t<secs;k++){if(k%30===0){I.mx=Math.random()*2-1;I.my=Math.random()*1.4-.4;I.fire=Math.random()<.6;I.jump=Math.random()<.05;I.use=Math.random()<.3;P.yaw+=Math.random()-.5}
       if(god){P.hp=100}G.update(1/60);t+=1/60;if(!isFinite(P.x+P.z+P.y))nan++;for(const e of G.ens)if(!isFinite(e.x+e.z))nan++;maxE=Math.max(maxE,G.ens.length);maxCh=Math.max(maxCh,G.scene.children.length);if(G.state!=='play'&&G.state!=='pause')break}}catch(e){err=e.message+' | '+(e.stack||'').split('\n')[1]}
     if(err||t>=secs||(G.state!=='play'&&G.state!=='pause'))res({state:G.state,stage:G.stage,sec:Math.round(t),nan,maxEnemies:maxE,sceneStart:ch0,sceneMax:maxCh,sceneEnd:G.scene.children.length,err});else setTimeout(step,0)};step()}),[god,secs]);
 const run=async(g,s)=>{const r=await run0(g,s);if(r.err||r.nan||r.sceneMax>r.sceneStart+20)bad++;return r};
 for(let k=0;k<6;k++)console.log('tasodifiy o‘yinchi',k+1,JSON.stringify(await run(false,600)));
 console.log('o‘lmaydigan 10 daq',JSON.stringify(await run(true,600)));
 console.log('o‘lmaydigan 10 daq (2)',JSON.stringify(await run(true,600)));
 console.log('JS xatolari:',errs.length,[...new Set(errs)].slice(0,5));await br.close();process.exit(bad||errs.length?1:0)})();
