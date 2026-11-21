// Yugur: 1000 ta yo'l (urug') avtomatik yuguruvchi bilan, 1000 tasi tasodifiy tugmalar bilan. Xato/NaN va "o'tib bo'lmaydigan" to'siqlar qidiriladi.
const fs=require('fs'),vm=require('vm');const src=fs.readFileSync(require('path').join(__dirname,'../../rn/game.js'),'utf8');vm.runInThisContext(src.slice(0,src.indexOf('function rnMissions')));
const N=+process.argv[2]||1000,dt=1/60;let errs=[],nan=0,crash={},dist=[],far=0;
for(let k=0;k<N;k++){const s=rnNew(1000+k);try{let i=0;while(s.alive&&s.t<300){rnBot(s);rnStep(s,dt);s.ev.length=0;if(!isFinite(s.z)||!isFinite(s.y)||!isFinite(s.x)){nan++;break}if(++i>300*60+10)break}
  if(!s.alive){const c=(s.crash&&(s.crash.type||s.crash.k||JSON.stringify(s.crash).slice(0,40)))||'?';crash[c]=(crash[c]||0)+1}else far++;dist.push(Math.round(s.z))}catch(e){errs.push('bot '+k+': '+e.message)}}
const ks=['left','right','up','down','board'];let rerr=0;
for(let k=0;k<N;k++){const s=rnNew(5000+k);s.boards=3;try{let i=0;while(s.alive&&i<60*120){if(Math.random()<.06)rnInput(s,ks[Math.floor(Math.random()*5)]);rnStep(s,dt);s.ev.length=0;i++;if(!isFinite(s.z+s.y+s.x)){nan++;break}}}catch(e){rerr++;errs.push('tasodifiy '+k+': '+e.message)}}
dist.sort((a,b)=>a-b);console.log('avtomatik yuguruvchi:',N,'yo‘l | 5 daqiqa yiqilmay yugurdi:',far,'| yiqilish sabablari:',JSON.stringify(crash));
console.log('masofa: eng qisqa',dist[0],'o‘rtacha',dist[N>>1],'| NaN:',nan,'| xatolar:',errs.length,errs.slice(0,3));process.exit(errs.length||nan?1:0);
