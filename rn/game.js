// Yugur! o'yini (asosiy sahifadan ajratilgan; rn/game.js?v=APP_VER bilan yuklanadi)
/* ---------- YUGUR (runner): yo'l, harakat, to'siqlar, bonuslar — DOM'siz ---------- */
const RN={lanes:[2.2,0,-2.2],g:-38,jumpV:13.2,shoeV:19,laneSpd:14,pw:0.36,ph:1.75,prh:0.85,roll:0.62,
  trainH:3.6,tw:1.0,bw:0.95,low:0.95,highY:1.3,highTop:3.2,blockH:2.9,jetY:9,gapSw:15.6,car:12.5,
  dur:{magnet:12,jet:8,shoe:12,x2:15,board:30}};
function rnRng(s){s=(s>>>0)||1;return()=>{s=(s*16807)%2147483647;return s/2147483647}}
const rnSpeed=t=>11+15*(1-Math.exp(-t/150));
function rnNew(seed){
  return {seed,t:0,z:0,v:11,lane:1,prevLane:1,x:0,y:0,vy:0,roll:0,dive:false,alive:true,crash:null,coins:0,score:0,guard:0,inv:0,
    pw:{magnet:0,jet:0,shoe:0,x2:0,shield:0,board:0},boards:0,obs:[],coinsL:[],items:[],ev:[],nid:1,R:rnRng(seed*7919+13),
    genZ:30,wallsUntil:[-99,-99,-99],pf:1,lastItem:0,genLog:[]};
}
function rnInput(s,k){
  if(!s.alive)return;
  if(k==='left'&&s.lane>0){s.prevLane=s.lane;s.lane--;s.ev.push({k:'swipe'})}
  else if(k==='right'&&s.lane<2){s.prevLane=s.lane;s.lane++;s.ev.push({k:'swipe'})}
  else if(k==='up'){if(s.pw.jet>0)return;const h=rnSurf(s,s.x,s.z);if(s.y<=h+0.05&&s.vy<=0){s.vy=s.pw.shoe>0?RN.shoeV:RN.jumpV;s.roll=0;s.jbuf=0;s.ev.push({k:'jump'})}else s.jbuf=0.18}
  else if(k==='board'){if(s.boards>0&&!(s.pw.board>0)){s.boards--;s.pw.board=RN.dur.board;s.ev.push({k:'board'})}}
  else if(k==='down'){if(s.pw.jet>0)return;const h=rnSurf(s,s.x,s.z);if(s.y>h+0.2){s.dive=true;s.vy=Math.min(s.vy,-18)}s.roll=RN.roll;s.ev.push({k:'roll'})}
}
const rnLX=l=>RN.lanes[l];
// oyoq ostidagi balandlik (poyezd tomi yoki rampa)
function rnSurf(s,x,z){
  let h=0;
  for(const o of s.obs){if(o.dead||Math.abs(x-rnLX(o.lane))>=RN.tw+0.3)continue;if(z<o.z0||z>o.z1)continue;
    if(o.type==='train'||o.type==='mtrain')h=Math.max(h,RN.trainH);
    else if(o.type==='ramp')h=Math.max(h,RN.trainH*(z-o.z0)/(o.z1-o.z0))}
  return h;
}
function rnBox(o){ // [halfWidth, yLo, yHi]
  switch(o.type){case 'train':case 'mtrain':return [RN.tw,0,RN.trainH];case 'block':return [RN.tw,0,RN.blockH];
    case 'low':return [RN.bw,0,RN.low];case 'high':return [RN.bw,RN.highY,RN.highTop];default:return null}
}
function rnStep(s,dt){
  if(!s.alive)return;s.t+=dt;
  const v=rnSpeed(s.t)*(s.pw.jet>0?1.12:1);s.v=v;const pz=s.z,px=s.x;s.z+=v*dt;
  for(const o of s.obs)if(o.type==='mtrain'&&o.z0-s.z<(o.trig||1e9)){o.z0-=o.v*dt;o.z1-=o.v*dt}
  const tx=rnLX(s.lane),dx=tx-s.x,mx=Math.min(26,Math.max(5,Math.abs(dx)*17))*dt;s.x=Math.abs(dx)<=mx||Math.abs(dx)<0.01?tx:s.x+Math.sign(dx)*mx;s.vx=(s.x-px)/dt;
  for(const k of ['magnet','jet','shoe','x2','board'])if(s.pw[k]>0){s.pw[k]=Math.max(0,s.pw[k]-dt);if(!s.pw[k]){s.ev.push({k:'pwEnd',p:k});if(k==='jet')s.inv=2.2}}
  s.roll=Math.max(0,s.roll-dt);if(s.jbuf>0)s.jbuf=Math.max(0,s.jbuf-dt);s.inv=Math.max(0,s.inv-dt);if(s.guard>0)s.guard=Math.max(0,s.guard-dt);
  // tik harakat
  const h=rnSurf(s,s.x,s.z);
  if(s.pw.jet>0){const d=Math.min(RN.jetY,s.ceil?s.ceil(s.z):Infinity)-s.y;s.y+=Math.sign(d)*Math.min(Math.abs(d),9*dt);s.vy=0}
  else if(s.vy>0||s.y>h+1e-3){s.vy+=RN.g*dt*(s.dive?2.2:1);s.y+=s.vy*dt;if(s.y<=h&&s.vy<=0){s.y=h;s.vy=0;s.dive=false;s.ev.push({k:'land'});if(s.jbuf>0){s.jbuf=0;rnInput(s,'up')}}}
  else if(h-s.y<0.6){s.y=h;s.vy=0}
  // to'qnashuvlar
  if(s.pw.jet<=0&&s.inv<=0){
    const hgt=s.roll>0?RN.prh:RN.ph;
    for(const o of s.obs){if(o.dead)continue;const b=rnBox(o);if(!b)continue;
      if(s.z+0.35<o.z0||s.z-0.35>o.z1)continue;const lx=rnLX(o.lane);
      if(Math.abs(s.x-lx)>=b[0]+RN.pw)continue;
      if(s.y>=b[2]-0.3&&(o.type==='train'||o.type==='mtrain'))continue; // tomida
      if(s.y+hgt<=b[1]+0.05||s.y>=b[2]-0.02)continue;
      const side=Math.abs(px-lx)>=b[0]+RN.pw-1e-6;
      if(side){ // yon tomondan urildi: qoqilish
        s.lane=s.prevLane;s.x=px;
        if(s.guard>0){s.alive=false;s.crash='caught';s.ev.push({k:'crash',c:'caught'});return}
        s.guard=8;s.ev.push({k:'stumble'});break}
      if(s.pw.board>0){s.pw.board=0;o.dead=true;s.inv=2;s.ev.push({k:'boardBreak',id:o.id});continue}
      if(s.pw.shield>0){s.pw.shield=0;o.dead=true;s.inv=1;s.ev.push({k:'shield',id:o.id});continue}
      s.alive=false;s.crash=o.type;s.ev.push({k:'crash',c:o.type});return}
  }
  // tanga va bonuslar
  const hgt=s.roll>0?RN.prh:RN.ph,mag=s.pw.magnet>0;
  for(const c of s.coinsL){if(c.got)continue;
    if(c.fly){ // magnitga uchib kelayotgan tanga
      const tx=s.x,ty=s.y+1.0,tz=s.z+0.4,rx=tx-c.fx,ry=ty-c.y,rz=tz-c.z,L=Math.hypot(rx,ry,rz);c.fv=Math.min(46,c.fv+70*dt);
      const st=Math.min(L,c.fv*dt);if(L<0.6||st>=L){c.got=true;s.coins++;s.score+=5*(s.pw.x2>0?2:1);s.ev.push({k:'coin',id:c.id,mag:true});continue}
      c.fx+=rx/L*st;c.y+=ry/L*st+Math.min(L,4)*0.9*dt*(c.fv<20?1:0);c.z+=rz/L*st;continue}
    if(s.ceil&&c.z-s.z<170){const cy=s.ceil(c.z)+0.6;if(c.y>cy)c.y=cy}
    const cx=rnLX(c.lane);
    const near=Math.abs(cx-s.x)<0.9&&Math.abs(c.z-s.z)<1.0&&c.y>s.y-0.4&&c.y<s.y+hgt+0.5;
    if(near){c.got=true;s.coins++;s.score+=5*(s.pw.x2>0?2:1);s.ev.push({k:'coin',id:c.id});continue}
    if(mag&&c.z-s.z<16&&c.z>s.z-1&&Math.abs(c.y-s.y)<6){c.fly=true;c.fx=cx;c.fv=8;s.ev.push({k:'magPull',id:c.id})}}
  for(const it of s.items){if(it.got)continue;
    if(Math.abs(rnLX(it.lane)-s.x)<0.95&&Math.abs(it.z-s.z)<1.1&&Math.abs((it.y||1)-(s.y+0.9))<1.6){it.got=true;
      if(it.kind==='shield')s.pw.shield=1;else s.pw[it.kind]=RN.dur[it.kind];if(it.kind==='jet'){s.vy=0;s.roll=0;let l=s.lane;const v0=rnSpeed(s.t)*1.12;for(let z=s.z+12;z<s.z+v0*RN.dur.jet-6;z+=2.6){if(s.R()<0.06)l=Math.max(0,Math.min(2,l+(s.R()<0.5?-1:1)));s.coinsL.push({id:s.nid++,lane:l,z,y:RN.jetY+0.6})}}s.ev.push({k:'item',p:it.kind,id:it.id})}}
  s.score+=v*dt*(s.pw.x2>0?2:1);
  // orqada qolganlarni tozalash, oldinni yasash
  if(!s.noGen){
    if((s.t*10|0)!==((s.t-dt)*10|0)){const cut=s.z-25;s.obs=s.obs.filter(o=>o.z1>cut);s.coinsL=s.coinsL.filter(c=>c.z>cut);s.items=s.items.filter(c=>c.z>cut)}
    while(s.genZ<s.z+220)rnGen(s);
  }
}
// ---- yo'l generatori: har doim kamida bitta yo'lak devorsiz, yo'lak almashtirishga yetarli oraliq ----
function rnGen(s){
  const R=s.R,d=Math.min(1,s.genZ/3000),W=s.wallsUntil;
  const add=o=>{o.id=s.nid++;s.obs.push(o);s.genLog.push({...o});return o};
  const coin=(lane,z,y=0.9)=>{s.coinsL.push({id:s.nid++,lane,z,y})};
  const line=(lane,z,n,y=0.9)=>{for(let i=0;i<n;i++)coin(lane,z+i*2.4,y)};
  const gap=15+d*10+R()*10*(1-d*0.5);let z=s.genZ+gap;
  // bo'sh yo'lak f: oldingi bo'sh yo'lakdan yetib borsa bo'ladigani
  const free=l=>W[l]<z-RN.gapSw;
  const reach=f=>f===s.pf||Math.abs(f-s.pf)===1||free(1);
  const cand=[0,1,2].filter(l=>free(l)&&reach(l));
  if(!cand.length){s.genZ=z+10;return}
  const f=cand[(R()*cand.length)|0];s.pf=f;
  const others=[0,1,2].filter(l=>l!==f&&W[l]<z-2);
  // bonus
  if(s.genZ-s.lastItem>320+R()*200){const ks=['magnet','jet','shoe','x2','shield'];s.items.push({id:s.nid++,kind:ks[(R()*ks.length)|0],lane:f,z:z-gap*0.5,y:1});s.lastItem=s.genZ}
  const r=R(),pT=0.36,pB=0.34,pM=d>0.08?0.12:0;
  if(r<pT&&others.length){ // poyezdlar
    const n=Math.min(others.length,R()<0.45+d*0.35?2:1),ls=others.sort(()=>R()-0.5).slice(0,n);let maxZ=z;
    ls.forEach((l,i)=>{const cars=1+((R()*(2+d*1.5))|0),L=cars*RN.car;let z0=z+(i?R()*8:0);
      const ramp=R()<0.42;if(ramp){add({type:'ramp',lane:l,z0,z1:z0+8});z0+=8;line(l,z0+2,Math.min(12,(L/2.4)|0),RN.trainH+0.9);
        line(l,z0-8.5,3,0.9)}
      add({type:'train',lane:l,z0,z1:z0+L,cars});W[l]=z0+L;maxZ=Math.max(maxZ,z0+L)});
    if(R()<0.35+d*0.4){const t=R()<0.5?'low':'high';const bz=z+6+R()*Math.max(4,maxZ-z-14);add({type:t,lane:f,z0:bz,z1:bz+(t==='low'?0.6:0.4)});
      if(t==='low')for(let i=-3;i<=3;i++)coin(f,bz+i*1.6,0.9+1.9*(1-(i*i)/9))}
    else line(f,z+2,Math.max(6,Math.min(14,((maxZ-z)/2.4)|0)));
    s.genZ=maxZ;
  }else if(r<pT+pB){ // to'siqlar qatori
    const row=[null,null,null];
    for(const l of [0,1,2]){if(l===f){row[l]=R()<0.55+d*0.3?(R()<0.5?'low':'high'):null;continue}
      const q=R();row[l]=others.includes(l)&&q<0.3+d*0.2?'block':q<0.75?(R()<0.5?'low':'high'):null}
    row.forEach((t,l)=>{if(!t)return;const len=t==='block'?1:t==='low'?0.6:0.4;add({type:t,lane:l,z0:z,z1:z+len});if(t==='block')W[l]=z+len;
      if(t==='low'&&R()<0.5)for(let i=-3;i<=3;i++)coin(l,z+i*1.6,0.9+1.9*(1-(i*i)/9))});
    if(!row[f])line(f,z-6,5);
    s.genZ=z+2;
  }else if(r<pT+pB+pM&&others.length){ // qarshidan kelayotgan poyezd
    const l=others[(R()*others.length)|0],L=RN.car*2,z0=z+45;
    add({type:'mtrain',lane:l,z0,z1:z0+L,v:7+d*5,trig:75,zb:z0-40,zs:z0});W[l]=z0+L;
    line(f,z,8);s.genZ=z0+L;
  }else{ // tangalar
    const n=8+((R()*8)|0);line(f,z,n);if(R()<0.4){const l2=others.length?others[0]:f;line(l2,z+n*2.4+6,6)}
    s.genZ=z+n*2.4;
  }
}
// oddiy bot: sinov uchun va "demo" rejim uchun — yo'lni o'qib, harakat qiladi
function rnBot(s){
  if(!s.alive||s.pw.jet>0)return;
  const v=s.v||11,look=v*1.25+10,cl=[look,look,look];
  for(const o of s.obs){if(o.dead)continue;if(!['train','block','mtrain','ramp'].includes(o.type))continue;
    let dz=o.z0-s.z;if(o.type==='mtrain'&&o.z0-s.z<o.trig+look)dz=dz*v/(v+o.v);
    const onTop=o.type==='train'&&s.y>RN.trainH-0.4&&s.z>=o.z0-0.5&&s.z<=o.z1&&o.lane===s.lane;
    if(onTop){cl[o.lane]=Math.min(cl[o.lane],look);continue}
    if(o.type==='ramp'){continue}
    if(o.z1<s.z-0.4)continue;
    // rampa orqali chiqsa bo'ladigan poyezd — devor emas
    if(o.type==='train'&&s.obs.some(r=>r.type==='ramp'&&r.lane===o.lane&&Math.abs(r.z1-o.z0)<0.01&&r.z1>s.z+0.5&&(r.z0>s.z+1||o.lane===s.lane)))continue;
    cl[o.lane]=Math.min(cl[o.lane],Math.max(0,dz))}
  const cur=s.lane,air=s.y>rnSurf(s,s.x,s.z)+0.05,nearBar=s.obs.some(o=>!o.dead&&(o.type==='low'||o.type==='high')&&Math.abs(o.z0-s.z)<v*0.3+1.5&&Math.abs(rnLX(o.lane)-s.x)<1.4);
  const sideFree=l=>!s.obs.some(o=>!o.dead&&o.lane===l&&['train','block','mtrain'].includes(o.type)&&o.z0<s.z+v*0.25+1.2&&o.z1>s.z-0.6&&!(s.y>RN.trainH-0.4&&o.type!=='block'));
  if(!air&&!nearBar&&cl[cur]<v*0.9+8&&Math.abs(s.x-rnLX(cur))<0.05){
    let best=cur;for(const l of [0,1,2])if(cl[l]>cl[best]+0.5)best=l;
    if(best!==cur){const st=best>cur?1:-1;if(sideFree(cur+st))rnInput(s,st>0?'right':'left')}
  }
  // sakrash / sirpanish
  for(const o of s.obs){if(o.dead||o.lane!==s.lane||(o.type!=='low'&&o.type!=='high'))continue;const dz=o.z0-s.z;
    if(o.type==='low'&&dz>0&&dz<v*0.22+0.8&&s.y<=rnSurf(s,s.x,s.z)+0.05)rnInput(s,'up');
    if(o.type==='high'&&dz>0&&dz<v*0.2+0.6&&s.roll<0.2&&!air)rnInput(s,'down')}
}

/* ---------- YUGUR: kunlik vazifalar va kunlik kirish mukofoti (DOM'siz) ---------- */
// t: tur, one: bitta yugurishdagi eng yaxshi natija (aks holda kun davomida yig'iladi), lv: [maqsad, mukofot]
const RN_MT={
  coins:{one:true,lv:[[60,120],[120,200],[220,350]]},
  dist:{one:true,lv:[[600,120],[1200,220],[2200,400]]},
  score:{one:true,lv:[[2500,150],[6000,260],[12000,450]]},
  jumps:{one:false,lv:[[25,100],[50,180],[90,300]]},
  rolls:{one:false,lv:[[15,100],[35,180],[60,300]]},
  items:{one:false,lv:[[3,120],[6,220],[10,350]]},
  games:{one:false,lv:[[3,100],[5,160],[8,260]]}};
const RN_LOGIN=[100,150,200,300,400,600,1000];
function rnHashDay(d){let h=2166136261;for(let i=0;i<d.length;i++){h^=d.charCodeAt(i);h=Math.imul(h,16777619)}return h>>>0}
function rnMissions(st,day){
  if(st&&st.day===day&&st.list)return st;
  let h=rnHashDay(day);const nx=()=>{h=Math.imul(h^(h>>>15),2246822519)>>>0;h=(h^(h>>>13))>>>0;return h/4294967296};
  const ts=Object.keys(RN_MT),pick=[];while(pick.length<3){const t=ts[(nx()*ts.length)|0];if(!pick.includes(t))pick.push(t)}
  const list=pick.map((t,i)=>{const L=RN_MT[t].lv,[n,r]=L[Math.min(L.length-1,(nx()*L.length)|0)];return {t,n,r,p:0}});
  return Object.assign(st||{},{day,list,chest:false});
}
function rnMissionRun(st,run){
  for(const m of st.list){if(m.p>=m.n)continue;const one=RN_MT[m.t].one,v=m.t==='games'?1:(run[m.t]||0);
    m.p=Math.min(m.n,one?Math.max(m.p,v):m.p+v)}
  return st;
}
function rnMissionClaim(st,i){const m=st.list[i];if(!m||m.claimed||m.p<m.n)return 0;m.claimed=true;return m.r}
function rnChest(st){if(st.chest||!st.list||!st.list.every(m=>m.claimed))return 0;st.chest=true;return 500}
function rnLogin(st,day){
  if(st.last===day)return 0;
  const prev=new Date(day+'T00:00:00Z');prev.setUTCDate(prev.getUTCDate()-1);const y=prev.toISOString().slice(0,10);
  st.streak=st.last===y?(st.streak||0)+1:1;st.last=day;
  return RN_LOGIN[Math.min(st.streak,RN_LOGIN.length)-1];
}
// ---------- bayramlar: sanaga qarab bezak va maxsus vazifa ----------
const RN_RAM={2026:['02-18','03-21'],2027:['02-08','03-11'],2028:['01-28','02-28'],2029:['01-16','02-16'],2030:['01-06','02-06']}; // Ramazon + Hayit (taxminiy)
function rnEvent(day){
  const y=+day.slice(0,4),md=day.slice(5),in_=(a,b)=>md>=a&&md<=b;
  const r=RN_RAM[y];if(r&&in_(r[0],r[1]))return {id:'ramazon',key:'ramazon-'+y};
  if(in_('03-15','03-25'))return {id:'navruz',key:'navruz-'+y};
  if(in_('08-25','09-03'))return {id:'mustaqillik',key:'mustaqillik-'+y};
  if(md>='12-20')return {id:'yangiyil',key:'yangiyil-'+y};
  if(md<='01-10')return {id:'yangiyil',key:'yangiyil-'+(y-1)};
  return null;
}
// trafikni tejash: o'yinchi tanlamagan bo'lsa — telefondagi "Data Saver" sozlamasiga qaraymiz
function rnLite(stored,saveData){return stored==null?!!saveData:!!stored}
// skeyt: har 2.8 soniyada 0.7 soniya oyoq bilan itaradi (0 — sirpanib ketyapti, 0..1 — itarish fazasi)
function rnSkatePush(t){const u=t%2.8;return t<2.8||u>=0.7?0:u/0.7}
const rnProg=()=>store.get('rn_p',{best:0,coins:0,games:0});
// qahramonlar do'koni: tangalarga yangi qahramon
const RN_SK=[{id:'kid',p:0,n:()=>'Jasur',d:()=>KT("Doppili bola — sizning birinchi qahramoningiz",'Мальчик в тюбетейке — ваш первый герой','Boy in a doppi — your first hero')},
  {id:'girl',p:1500,n:()=>'Malika',d:()=>KT('Atlas kofta, ikki o\'rim soch','Худи из атласа, две косы','Atlas hoodie, two braids')},
  {id:'skater',p:3000,n:()=>'Sardor',d:()=>KT('Skeytchi: har yugurishda 1 bepul skeyt','Скейтер: 1 бесплатный скейт за забег','Skater: 1 free board per run')},
  {id:'afandi',p:6000,n:()=>'Afandi',d:()=>KT("Ertaklardagi hazilkash chol",'Весёлый мудрец из сказок','The witty sage of folk tales')},
  {id:'polvon',p:4000,n:()=>'Polvon',d:()=>KT("Kurashchi yigit — yashil yaktak, qizil belbog'",'Борец кураша — зелёный яктак, красный пояс','Kurash wrestler — green robe, red belt')},
  {id:'askiya',p:5000,n:()=>'Askiyachi',d:()=>KT("Hazil-mutoyiba ustasi, beqasam to'nda",'Мастер аскии в полосатом чапане','Master of askiya wit, striped chapan')},
  {id:'dutor',p:7000,n:()=>'Dutorchi qiz',d:()=>KT("Atlas ko'ylak, yelkasida dutor",'Атласное платье, дутар за спиной','Atlas dress, dutar on her back')},
  {id:'buvi',p:8000,n:()=>'Buvijon',d:()=>KT("Chaqqon buvijon — nevaralaridan tez!",'Шустрая бабушка — быстрее внуков!','Speedy granny — faster than the grandkids!')},
  {id:'cosmo',p:10000,n:()=>'Kosmonavt',d:()=>KT('Skafandrli jasur bola','Отважный мальчик в скафандре','Brave kid in a space suit')}];
const RN_CITY=[{n:'Toshkent',r:'Ташкент',e:'Tashkent',g:'CHORSU'},{n:'Samarqand',r:'Самарканд',e:'Samarkand',g:'SIYOB'},{n:'Buxoro',r:'Бухару',e:'Bukhara',g:'TOQI ZARGARON'},{n:'Xiva',r:'Хиву',e:'Khiva',g:"ICHAN QAL'A"},{n:"Farg'ona",r:'Фергану',e:'Fergana',g:"MARG'ILON"}];
const rnTx=t=>typeof LANG!=='undefined'&&LANG==='uzc'&&typeof cyrSafe==='function'?cyrSafe(t):t;
const RN_LITE=()=>rnLite(store.get('rn_lite',null),navigator.connection&&navigator.connection.saveData);
// skeyt holati: suyaklarga qo'lda poza (Mixamo skeleti)
function rnSkateRig(sk,T){const B=n=>sk.bones.find(b=>b.name==='mixamorig'+n||b.name==='mixamorig:'+n);const R={T,v:new T.Vector3(),w:new T.Vector3()};
  for(const n of ['Hips','Spine','Spine1','Spine2','Neck','Head','LeftUpLeg','LeftLeg','LeftFoot','RightUpLeg','RightLeg','RightFoot','LeftArm','LeftForeArm','RightArm','RightForeArm']){const b=B(n);if(!b)return null;R[n]=b;b.userData.q0=b.quaternion.clone();b.userData.p0=b.position.clone()}
  R.e=new T.Euler();R.q=new T.Quaternion();return R}
// t — vaqt, push — itarish fazasi (0..1, 0 = yo'q), air — havoda (0..1), lean — burilish
function rnSkatePose(R,t,push,air){const S=(n,x,y,z)=>{const b=R[n];R.e.set(x,y,z);R.q.setFromEuler(R.e);b.quaternion.copy(b.userData.q0).multiply(R.q)};
  const ck=0.42+air*0.45,sw=Math.sin(t*2.3),pp=push>0?Math.sin(push*Math.PI):0;
  
  R.Hips.position.copy(R.Hips.userData.p0);S('Hips',0,0,0);
  S('Spine',0.22+pp*0.15,0,0);S('Spine1',0.06,0,0);S('Spine2',0,0.35,0);S('Neck',0,0.45,0);S('Head',0.05,0.55,0);
  // oldingi oyoq (chap) — taxta oldida, orqa oyoq (o'ng) — orqada; itarganda o'ng oyoq yerga tushib orqaga tepadi
  S('LeftUpLeg',-ck-pp*0.25,0.15,-0.28);S('LeftLeg',ck*2.1+pp*0.5,0,0);S('LeftFoot',-ck*0.9,0.2,0);
  S('RightUpLeg',-ck*(1-pp)+pp*0.15,-0.15,0.28+pp*0.55);S('RightLeg',ck*2.1*(1-pp)+pp*0.15,0,0);S('RightFoot',-ck*0.9*(1-pp),-0.2,0);
  S('LeftArm',0.15,0,0.35+sw*0.08+air*0.4);S('LeftForeArm',0,0,0.35);S('RightArm',-0.1,0,-0.35+sw*0.08-air*0.4);S('RightForeArm',0,0,-0.35);
}
// oyoqlarni taxtaga tushirish: eng past oyoq taxta ustida tursin
function rnSkateGround(R,root,top,push){root.parent.updateMatrixWorld(true);const a=R.LeftFoot.getWorldPosition(R.v).y,b=push>0.1&&push<0.9?a:R.RightFoot.getWorldPosition(R.w).y;
  root.position.y+=top-Math.min(a,b)+0.02}
const RN_REGS=[['tsh','Toshkent shahri'],['tsv','Toshkent viloyati'],['and','Andijon'],['bux','Buxoro'],['far',"Farg'ona"],['jiz','Jizzax'],['xor','Xorazm'],['nam','Namangan'],['nav','Navoiy'],['qas','Qashqadaryo'],['qqr',"Qoraqalpog'iston"],['sam','Samarqand'],['sir','Sirdaryo'],['sur','Surxondaryo']];
const rnRegN=k=>{const r=RN_REGS.find(x=>x[0]===k);return r?r[1]:'—'};
let RN_LB=null;
function rnSync(region){const ref=store.get('rn_ref','');
  return rnApi('/rn/me',{region:region||store.get('rn_region',''),ref:ref||null}).then(j=>{if(!j||!j.ok)return null;RN_LB=j;if(ref)store.set('rn_ref','');
    if(j.region)store.set('rn_region',j.region);
    if(j.bonus>0){const P=rnProg();P.coins+=j.bonus;store.set('rn_p',P);haptic('done');
      rnToastG(j.winBonus?KT(`🏆 ${rnRegN(j.win)} o'tgan haftada g'olib! +${j.bonus} tanga`,`🏆 ${rnRegN(j.win)} победил на прошлой неделе! +${j.bonus}`,`🏆 ${rnRegN(j.win)} won last week! +${j.bonus}`):KT(`🎁 Do'st taklifi uchun +${j.bonus} tanga`,`🎁 За приглашение друга +${j.bonus}`,`🎁 Friend invite bonus +${j.bonus}`))}
    return j})}
function rnRegPick(){const cur=store.get('rn_region','');const ov=document.createElement('div');ov.className='rn-sheet';
  ov.innerHTML=`<div class="rn-sh"><h3>${KT('Viloyatingiz qaysi?','Ваш регион?','Your region?')}</h3><p class="note">${KT("Har hafta qaysi viloyat ko'proq yugurganini hisoblaymiz. G'olib viloyat o'yinchilariga +300 tanga!",'Каждую неделю считаем, какой регион пробежал больше. Победителям +300 монет!','Each week we count which region ran the most. Winners get +300 coins!')}</p>
    <div class="rn-regs">${RN_REGS.map(([k,n])=>`<button class="chip${k===cur?' on':''}" data-rg="${k}">${n}</button>`).join('')}</div><button class="chip" id="rgx">${KT('Keyinroq','Позже','Later')}</button></div>`;
  document.body.appendChild(ov);ov.querySelector('#rgx').onclick=()=>ov.remove();ov.onclick=e=>{if(e.target===ov)ov.remove()};
  ov.querySelectorAll('[data-rg]').forEach(b=>b.onclick=()=>{store.set('rn_region',b.dataset.rg);ov.remove();rnSync(b.dataset.rg).then(()=>{if(current==='yugur'&&!$('#rnstage'))viewYugur()})})}
function rnLbSheet(){const j=RN_LB;if(!j)return;const ov=document.createElement('div');ov.className='rn-sheet';const mx=Math.max(1,...j.regs.map(r=>r.d));
  ov.innerHTML=`<div class="rn-sh"><h3>🏆 ${KT('Haftalik reyting','Рейтинг недели','Weekly ranking')}</h3>
    <div class="label">${KT('Viloyatlar (yugurilgan masofa)','Регионы (дистанция)','Regions (distance)')}</div>
    <div class="rn-rgl">${RN_REGS.map(([k])=>j.regs.find(r=>r.k===k)||{k,d:0,n:0}).sort((a,b)=>b.d-a.d).map((r,i)=>`<div class="${r.k===j.region?'me':''}"><span>${i+1}. ${rnRegN(r.k)}</span><i><u style="width:${Math.round(100*r.d/mx)}%"></u></i><b>${(r.d/1000).toFixed(1)} km</b></div>`).join('')}</div>
    <div class="label" style="margin-top:12px">${KT("Eng yaxshi o'yinchilar",'Лучшие игроки','Top players')}</div>
    <div class="rn-tops">${j.top.length?j.top.map((t,i)=>`<div><span>${['🥇','🥈','🥉'][i]||(i+1)+'.'}</span><b>${esc(t.name)}</b><small>${rnRegN(t.region)}</small><em>${t.best.toLocaleString()}</em></div>`).join(''):`<p class="note">${KT("Bu hafta hali hech kim yugurmadi — birinchi bo'ling!",'На этой неделе ещё никто не бегал — будьте первым!','Nobody ran yet this week — be first!')}</p>`}</div>
    ${j.me?`<p class="note">${KT(`Sizning o'rningiz: ${j.rank}-o'rin · rekord ${j.me.best.toLocaleString()}`,`Ваше место: ${j.rank} · рекорд ${j.me.best.toLocaleString()}`,`Your place: #${j.rank} · best ${j.me.best.toLocaleString()}`)}</p>`:''}
    <button class="btn" id="lbx">${KT('Yopish','Закрыть','Close')}</button></div>`;
  document.body.appendChild(ov);ov.querySelector('#lbx').onclick=()=>ov.remove();ov.onclick=e=>{if(e.target===ov)ov.remove()}}
function rnInvite(){const id=tg&&tg.initDataUnsafe&&tg.initDataUnsafe.user&&tg.initDataUnsafe.user.id;const link=BOT_LINK+'?startapp=yugur'+(id?'-r'+id:'');
  const t=trText("🏃 «Yugur!» — Toshkent, Chorsu va metro bo'ylab yuguradigan o'zbekcha o'yin! Shu havola orqali kirsang, ikkalamizga 500 tanga beriladi 🎁");
  const u=`https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(t)}`;tg&&tg.openTelegramLink?tg.openTelegramLink(u):window.open(u,'_blank')}
// natija kartasi: rasm chiziladi va bot orqali o'zingizga yuboriladi — keyin do'stlarga uzatasiz
function rnCard(sc,dist,coins){return new Promise(res=>{const c=document.createElement('canvas');c.width=1080;c.height=1350;const x=c.getContext('2d'),ft=x.fillText.bind(x);x.fillText=(t,a,b)=>ft(rnTx(String(t)),a,b);
  const g=x.createLinearGradient(0,0,0,1350);g.addColorStop(0,'#0e4a6e');g.addColorStop(1,'#1fa7b8');x.fillStyle=g;x.fillRect(0,0,1080,1350);
  x.globalAlpha=0.12;x.fillStyle='#fff';for(let r=0;r<8;r++)for(let k=0;k<6;k++){const cx=k*200+(r%2)*100,cy=r*190;x.beginPath();for(let i=0;i<16;i++){const a=i*Math.PI/8,rr=i%2?28:70;x.lineTo(cx+Math.cos(a)*rr,cy+Math.sin(a)*rr)}x.fill()}x.globalAlpha=1;
  x.fillStyle='#fff';x.textAlign='center';x.font='bold 92px system-ui,sans-serif';x.fillText('YUGUR!',540,150);
  x.font='600 40px system-ui,sans-serif';x.fillStyle='#d9f5f8';x.fillText(KT('Hamroh ilovasidagi o\'zbekcha yugurish o\'yini','Узбекская игра-бегалка в Hamroh','Uzbek runner game in Hamroh'),540,215);
  const img=new Image();img.onload=img.onerror=()=>{try{x.drawImage(img,290,250,500,625)}catch(e){}
    x.fillStyle='rgba(0,0,0,.25)';x.beginPath();x.roundRect(90,900,900,330,40);x.fill();
    x.fillStyle='#ffd54a';x.font='bold 150px system-ui,sans-serif';x.fillText(sc.toLocaleString(),540,1060);
    x.fillStyle='#fff';x.font='600 46px system-ui,sans-serif';x.fillText(`📏 ${dist} m   ·   🪙 ${coins}`+(store.get('rn_region','')?'   ·   📍 '+rnRegN(store.get('rn_region','')):''),540,1150);
    x.font='600 42px system-ui,sans-serif';x.fillStyle='#e8fbff';x.fillText(KT('Meni quvib o\'ta olasanmi? 👇','Сможешь обогнать? 👇','Can you beat me? 👇'),540,1300);
    c.toBlob(b=>res(b),'image/png')};img.src='rn/sk/'+rnSkin()+'.png?v='+APP_VER})}
const rnToday=()=>window.RN_DATE||rnDay();
const RN_EVD={navruz:{e:'🌷',t:()=>KT("Navro'z bayrami muborak!",'С праздником Навруз!','Happy Navruz!'),d:()=>KT("Yo'llar lolaga burkandi, sumalak qozonlari qaynayapti. Bayram davomida 3 km yuguring — 1000 tanga!",'Тюльпаны и сумаляк на улицах. Пробегите 3 км за праздник — 1000 монет!','Tulips and sumalak everywhere. Run 3 km during the holiday — 1000 coins!'),goal:3000,r:1000},
  mustaqillik:{e:'🇺🇿',t:()=>KT('Mustaqillik kuni muborak!','С Днём независимости!','Happy Independence Day!'),d:()=>KT("Ko'chalar bayroqlar bilan bezandi, kechqurun mushaklar! Bayram davomida 5 km yuguring — 1500 tanga!",'Флаги и салюты! Пробегите 5 км — 1500 монет!','Flags and fireworks! Run 5 km — 1500 coins!'),goal:5000,r:1500},
  yangiyil:{e:'🎄',t:()=>KT('Yangi yil muborak!','С Новым годом!','Happy New Year!'),d:()=>KT("Qor yog'yapti, archalar chiroqlarda! Bayram davomida 5 km yuguring — 1500 tanga!",'Идёт снег, ёлки в огнях! 5 км — 1500 монет!','Snow and lit-up trees! Run 5 km — 1500 coins!'),goal:5000,r:1500},
  ramazon:{e:'🌙',t:()=>KT('Ramazon oyi muborak!','Благословенного Рамадана!','Blessed Ramadan!'),d:()=>KT("Kechki ko'chalarda fonuslar yonadi. Oy davomida 10 km yuguring — 2000 tanga!",'Вечерние фонари на улицах. 10 км за месяц — 2000 монет!','Lanterns light the evening streets. Run 10 km this month — 2000 coins!'),goal:10000,r:2000}};
const rnEv=()=>rnEvent(rnToday()),rnEvSt=ev=>{const st=store.get('rn_ev',{});return st.key===ev.key?st:{key:ev.key,p:0,claimed:false}};
const RN_BOARD_P=300,rnDay=()=>{const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')};
const rnMS=()=>rnMissions(store.get('rn_ms',{}),rnDay());
const RN_MTXT={coins:n=>KT(`Bir yugurishda ${n} ta tanga`,`${n} монет за забег`,`${n} coins in one run`),dist:n=>KT(`Bir yugurishda ${n} m`,`${n} м за забег`,`Run ${n} m in one go`),score:n=>KT(`Bir yugurishda ${n.toLocaleString()} ochko`,`${n.toLocaleString()} очков за забег`,`${n.toLocaleString()} points in one run`),
  jumps:n=>KT(`${n} marta sakrang`,`Прыгните ${n} раз`,`Jump ${n} times`),rolls:n=>KT(`${n} marta sirpaning`,`Подкат ${n} раз`,`Roll ${n} times`),items:n=>KT(`${n} ta bonus yig'ing`,`Соберите ${n} бонусов`,`Grab ${n} power-ups`),games:n=>KT(`${n} marta yuguring`,`Сыграйте ${n} забега`,`Play ${n} runs`)};
const rnOwn=()=>{const o=store.get('rn_own',['kid']);return o.includes('kid')?o:['kid',...o]};
const rnSkin=()=>{const k=store.get('rn_skin','kid');return rnOwn().includes(k)&&RN_SK.some(x=>x.id===k)?k:'kid'};
const RN_PW={board:['🛹',()=>KT('Skeyt','Скейт','Skateboard')],magnet:['🧲',()=>KT('Magnit','Магнит','Magnet')],jet:['🚀',()=>KT('Reaktiv ryukzak','Реактивный ранец','Jetpack')],shoe:['👟',()=>KT('Sakrovchi krossovka','Супер-кроссовки','Super sneakers')],x2:['✖2',()=>KT('2× ochko','2× очки','2× score')],shield:['🛡',()=>KT('Qalqon','Щит','Shield')]};
// ---- tayyor 3D modellar (Kenney, CC0): bir marta yuklanadi ----
let RNA=null,RNAp=null,RN_FROT=0,RN_BROT=1,RN_HROT=0,RN_HBACK=1;
const RN_AV='m4',RN_LO=['coin','cab','car','apart','bazaar','mahalla','madrasa','choy','chinar','cart','low','high','block','ramp'];
const RN_MC=['registan','gurem','kalon','toki','khwall','kalta','cotton','atlasst','tut']; // shaharlar: o'yin boshlangach fonda yuklanadi
const RN_MN=['board','cab','car','low','high','block','ramp','coin','magnet','jet','shoe','shield','apart','bazaar','mahalla','madrasa','choy','chinar','lamp','cart'];
function rnHalf(h){const s=(h&0x8000)?-1:1,e=(h>>10)&31,f=h&1023;return e===0?s*Math.pow(2,-14)*(f/1024):e===31?(f?NaN:s*Infinity):s*Math.pow(2,e-15)*(1+f/1024)}
const rnGL=()=>{const l=new window.THREE_GLTFLoader();if(window.THREE_Meshopt)l.setMeshoptDecoder(window.THREE_Meshopt);return l};
function rnLoadAssets(){
  if(RNA&&RNA.skin!==rnSkin()){ // boshqa qahramon tanlangan: faqat uni yuklaymiz
    const sk=rnSkin();return RNAp=rnGL().loadAsync('rn/'+sk+'.glb?v='+RN_AV+'m').then(g=>{g.kid=true;RNA.hero=g;RNA.skin=sk;return RNA},()=>RNA)}
  if(RNA)return Promise.resolve(RNA);if(RNAp)return RNAp;
  const T=window.THREE,get=(u,t)=>fetch(u+'?v='+RN_AV).then(r=>{if(!r.ok)throw 0;return t==='j'?r.json():r.arrayBuffer()});
  const tex=u=>new Promise((res,rej)=>new T.TextureLoader().load(u+'?v='+RN_AV,t=>{t.colorSpace=T.SRGBColorSpace;t.flipY=false;t.magFilter=T.LinearFilter;res(t)},undefined,rej));
  const kit=n=>Promise.all([get('rn/'+n+'.json','j'),get('rn/'+n+'.bin'),tex('rn/'+n+'.png')]).then(([idx,bin,tx])=>{const G={};
    for(const [k,e] of Object.entries(idx)){const g=new T.BufferGeometry();
      g.setAttribute('position',new T.BufferAttribute(new Float32Array(bin,e.p,e.v*3),3));
      g.setAttribute('normal',new T.BufferAttribute(new Int8Array(bin,e.n,e.v*3),3,true));
      const h=new Uint16Array(bin,e.u,e.v*2),uv=new Float32Array(e.v*2);for(let i=0;i<uv.length;i++)uv[i]=rnHalf(h[i]);g.setAttribute('uv',new T.BufferAttribute(uv,2));
      g.setIndex(new T.BufferAttribute(e.b===32?new Uint32Array(bin,e.x,e.i):new Uint16Array(bin,e.x,e.i),1));
      g.userData={min:e.min,max:e.max};G[k]=g}
    return {G,tx}});
  const scr2=u=>new Promise((res,rej)=>{if(window.THREE_POST)return res();const el=document.createElement('script');el.src=u+'?v='+APP_VER;el.onload=res;el.onerror=rej;document.head.appendChild(el)});
  const scr=u=>new Promise((res,rej)=>{if(window.THREE_GLTFLoader)return res();const el=document.createElement('script');el.src=u+'?v='+APP_VER;el.onload=res;el.onerror=rej;document.head.appendChild(el)});
  // qahramon: Quaternius Universal Animation Library (CC0) — skelet va tayyor harakatlar
  const sk=rnSkin();
  const opt=n=>scr('lib/three-gltf.js').then(()=>rnGL().loadAsync('rn/'+n+'.glb?v='+RN_AV+'m')).catch(e=>{console.warn(n,e);return null});
  const LITE=RN_LITE(),guardP=LITE?Promise.resolve(null):opt('guard'),dogP=LITE?Promise.resolve(null):opt('dog');
  const L0=rnGL,hero=scr('lib/three-gltf.js').then(()=>L0().loadAsync('rn/'+sk+'.glb?v='+RN_AV+'m').catch(()=>L0().loadAsync('rn/kid.glb?v='+RN_AV+'m')).then(g=>(g.kid=true,g),()=>L0().loadAsync('rn/hero.glb?v='+RN_AV+'m'))).catch(e=>{console.warn('hero',e);return null});
  // Toshkent to'plami (Meshy): poyezd, to'siqlar, tanga, bonuslar, binolar — yagona uslubda
  const MROT={cab:-Math.PI/2,car:-Math.PI/2,ramp:Math.PI},CEN={coin:1,magnet:1,jet:1,shoe:1,shield:1};
  const toF=a=>{const it=a.itemSize,f=new Float32Array(a.count*it);for(let i=0;i<a.count;i++){f[i*it]=a.getX(i);if(it>1)f[i*it+1]=a.getY(i);if(it>2)f[i*it+2]=a.getZ(i);if(it>3)f[i*it+3]=a.getW(i)}return new T.BufferAttribute(f,it)};
  const prep=(k,me,ref)=>{ // geometriyani bir xil holatga keltirish (LOD juftlari bir xil siljish bilan)
      const geo=new T.BufferGeometry();for(const n of ['position','normal','uv','color'])if(me.geometry.attributes[n])geo.setAttribute(n,toF(me.geometry.attributes[n]));geo.setIndex(me.geometry.index?Array.from(me.geometry.index.array):null);
      geo.applyMatrix4(me.matrixWorld);if(MROT[k])geo.rotateY(MROT[k]);if(!geo.attributes.normal)geo.computeVertexNormals();
      {const nr=geo.attributes.normal.array,ps=geo.attributes.position.array;for(let i=0;i<nr.length;i+=3){const l=Math.hypot(nr[i],nr[i+1],nr[i+2]);if(!(l>1e-4)){nr[i]=0;nr[i+1]=1;nr[i+2]=0}else{nr[i]/=l;nr[i+1]/=l;nr[i+2]/=l}}for(let i=0;i<ps.length;i++)if(!isFinite(ps[i]))ps[i]=0}
      geo.computeBoundingBox();const b=geo.boundingBox,tr=ref?ref.tr:[-(b.min.x+b.max.x)/2,CEN[k]?-(b.min.y+b.max.y)/2:-b.min.y,-(b.min.z+b.max.z)/2];
      geo.translate(tr[0],tr[1],tr[2]);geo.computeBoundingBox();geo.computeBoundingSphere();
      const sz=new T.Vector3();geo.boundingBox.getSize(sz);const map=me.material&&me.material.map;if(map){map.colorSpace=T.SRGBColorSpace;map.anisotropy=4}
      return {geo,map,s:ref?ref.s:sz,tr}};
  const mods=scr('lib/three-gltf.js').then(()=>{const L=new window.THREE_GLTFLoader();if(window.THREE_Meshopt)L.setMeshoptDecoder(window.THREE_Meshopt);
    const one=n=>L.loadAsync('rn/m/'+n+'.glb?v='+RN_AV).then(g=>{let me=null;g.scene.updateMatrixWorld(true);g.scene.traverse(o=>{if(o.isMesh&&!me)me=o});return me});
    return Promise.all(RN_MN.map(k=>one(k).then(me=>{const hi=prep(k,me);if(!RN_LO.includes(k))return [[k,hi]];
        return one(k+'_lo').then(m2=>[[k,hi],[k+'_lo',prep(k,m2,hi)]],()=>[[k,hi]])},e=>{console.warn('rn/m',k,e);return []}))).then(a=>{const M={};for(const l of a)for(const [k,v] of l)M[k]=v;
      if(!LITE)setTimeout(()=>{let q=Promise.resolve();for(const k of RN_MC)q=q.then(()=>one(k).then(me=>{const hi=prep(k,me);return one(k+'_lo').then(m2=>{M[k+'_lo']=prep(k,m2,hi);M[k]=hi},()=>{M[k]=hi})},()=>{}))},1200);
      return M})}).catch(()=>({}));
  const post=LITE?Promise.resolve(null):scr2('lib/three-post.js').catch(()=>null);
  RNAp=Promise.all([kit('track'),hero,mods,post,guardP,dogP]).then(([t,h,m,_,gd,dg])=>{const base={t,c:null,hero:h,m,guard:gd,dog:dg,skin:sk};
    if(m.cab&&m.apart)return RNA=base; // Meshy to'plami bor — Kenney shahri kerak emas
    return Promise.all([kit('train'),kit('city')]).then(([t2,c])=>(RNA=Object.assign(base,{t:{G:Object.assign({},t2.G,t.G),tx:t2.tx},c})),()=>RNA=base)},e=>{RNAp=null;throw e});
  return RNAp;
}
function rnDispose(){rnMusic(false);cancelAnimationFrame(rnRAF);if(rnR){try{rnR.dispose()}catch(e){}rnR=null}}
function viewYugur(){
  rnDispose();document.body.classList.remove('rn-play');try{tg&&tg.enableVerticalSwipes&&tg.enableVerticalSwipes()}catch(e){}
  setHero('yugur');
  {const L=store.get('rn_login',{}),r=rnLogin(L,rnDay());if(r){store.set('rn_login',L);const P0=rnProg();P0.coins+=r;store.set('rn_p',P0);setTimeout(()=>rnToastG(KT(`🎁 ${L.streak}-kun mukofoti: +${r} tanga`,`🎁 Награда за ${L.streak}-й день: +${r} монет`,`🎁 Day ${L.streak} reward: +${r} coins`)),400)}}
  const P=rnProg(),MS=rnMS();store.set('rn_ms',MS);const nb=store.get('rn_boards',0);
  const EV=rnEv(),ED=EV&&RN_EVD[EV.id],ES=EV&&rnEvSt(EV);
  $('#screen').innerHTML=`${ED?`<section class="card rn-ev rn-ev-${EV.id}" data-notr><b>${ED.e} ${ED.t()}</b><small>${ED.d()}</small><i><u style="width:${Math.min(100,Math.round(100*ES.p/ED.goal))}%"></u></i>
      <div class="rn-evr"><span>${(Math.min(ES.p,ED.goal)/1000).toFixed(1)} / ${ED.goal/1000} km</span>${ES.claimed?'<span>✓</span>':`<button class="${ES.p>=ED.goal?'btn':'chip'}" id="rnevc" ${ES.p>=ED.goal?'':'disabled'}>🪙 ${ED.r}</button>`}</div></section>`:''}
    <section class="card rn-menu" data-notr>
      <div class="rn-stats"><div><small>${KT('Rekord','Рекорд','Best')}</small><b>${P.best.toLocaleString()}</b></div><div><small>${KT('Tangalar','Монеты','Coins')}</small><b>🪙 ${P.coins.toLocaleString()}</b></div><div><small>${KT("O'yinlar",'Игры','Games')}</small><b>${P.games}</b></div></div>
      <button class="btn rn-go" id="rngo">▶ ${KT('Yugurish','Бежать','Run')}</button></section>
    <section class="card rn-lb" data-notr><div class="label">🏆 ${KT('Viloyatlar bellashuvi','Битва регионов','Region battle')}</div><div id="rnlb">${rnLbHtml()}</div>
      <div class="rn-lba"><button class="chip" id="rnlball">${KT("To'liq reyting",'Весь рейтинг','Full ranking')}</button><button class="btn" id="rninv">👥 ${KT("Do'stni chaqirish +500",'Пригласить +500','Invite +500')}</button></div></section>
    <section class="card" data-notr><div class="label">${KT('Bugungi vazifalar','Задания на сегодня','Today\'s missions')} <small class="rn-streak">🔥 ${store.get('rn_login',{}).streak||1}</small></div><div class="rn-ms">${MS.list.map((m,i)=>`<div class="rn-m${m.claimed?' ok':''}"><div><b>${RN_MTXT[m.t](m.n)}</b><i><u style="width:${Math.round(100*m.p/m.n)}%"></u></i><small>${Math.floor(m.p).toLocaleString()} / ${m.n.toLocaleString()}</small></div>
      ${m.claimed?'<span>✓</span>':`<button class="${m.p>=m.n?'btn':'chip'}" data-ms="${i}" ${m.p>=m.n?'':'disabled'}>🪙 ${m.r}</button>`}</div>`).join('')}
      ${MS.list.every(m=>m.claimed)?(MS.chest?`<div class="rn-chest">🎉 ${KT('Bugungi sandiq ochildi. Ertaga yangi vazifalar!','Сундук открыт. Завтра новые задания!','Chest opened. New missions tomorrow!')}</div>`:`<button class="btn rn-chest" id="rnchest">🎁 ${KT('Sandiqni ochish: +500','Открыть сундук: +500','Open chest: +500')}</button>`):`<div class="rn-chest dim">🎁 ${KT('Uchala vazifa — sandiq (+500)','Все три задания — сундук (+500)','All three — chest (+500)')}</div>`}</div></section>
    <section class="card" data-notr><div class="rn-bd"><div class="rn-bdi">🛹</div><div><b>${KT('Skeyt','Скейт','Skateboard')} · ${nb}</b><small>${KT("30 soniya minasiz; urilsangiz skeyt sinadi, siz emas. O'yinda 🛹 tugmasi.",'30 секунд езды; при ударе ломается скейт, а не вы. Кнопка 🛹 в игре.','Ride for 30 s; a crash breaks the board, not you. 🛹 button in game.')}</small></div>
      <button class="btn" id="rnbuyb" ${P.coins<RN_BOARD_P?'disabled':''}>🪙 ${RN_BOARD_P}</button></div></section>
    <section class="card" data-notr><div class="label">${KT('Qahramonlar','Герои','Heroes')}</div><div class="rn-sk">${RN_SK.map(k=>{const own=rnOwn().includes(k.id),cur=rnSkin()===k.id;
      return `<div class="rn-skc${cur?' on':''}"><img src="rn/sk/${k.id}.png?v=${APP_VER}" alt="" loading="lazy"><b>${k.n()}</b><small>${k.d()}</small>
      <button class="${cur?'chip':own?'chip':'btn'}" data-sk="${k.id}" ${cur||(!own&&P.coins<k.p)?'disabled':''}>${cur?'✓ '+KT('Tanlangan','Выбран','Selected'):own?KT('Tanlash','Выбрать','Select'):'🪙 '+k.p.toLocaleString()}</button></div>`}).join('')}</div></section>
    <section class="card" data-notr><div class="label">${KT('Grafika','Графика','Graphics')}</div><div class="rn-q">${[['auto',KT('Avto','Авто','Auto')],['2',KT('Yuqori','Высокая','High')],['1',KT("O'rta",'Средняя','Medium')],['0',KT('Past','Низкая','Low')]].map(([k,t])=>`<button class="chip${String(store.get('rn_qset','auto'))===k?' on':''}" data-q="${k}">${t}</button>`).join('')}</div>
      <div class="rn-q rn-snd"><button class="chip${store.get('rn_mus',true)?' on':''}" id="rnmus">🎵 ${KT('Musiqa','Музыка','Music')}</button><button class="chip${store.get('rn_snd',true)?' on':''}" id="rnsfx">🔊 ${KT('Ovozlar','Звуки','Sounds')}</button><button class="chip${RN_LITE()?' on':''}" id="rnlite">📶 ${KT('Tejamkor','Экономия','Data saver')}</button></div>
      <small class="rn-qh">${KT("O'yin qotsa — «Past»ni tanlang. «Avto» telefoningizga qarab o'zi sozlaydi. «Tejamkor» — internet kam sarflanadi: qorovul, it va shahar binolari yuklanmaydi; o'yin bir marta yuklangach internetsiz ham ishlaydi.",'Если игра тормозит — выберите «Низкая». «Авто» подстроится само. «Экономия» — меньше трафика: без охранника, собаки и зданий городов; после первой загрузки игра работает и без интернета.','If the game lags, choose Low. Auto adapts to your phone. Data saver uses less traffic: no guard, dog or city buildings; after the first load the game also works offline.')}</small></section>
    <section class="card" data-notr><div class="label">${KT('Boshqaruv','Управление','Controls')}</div><div class="rn-how">
      <p>⬅️ ➡️ ${KT("Chapga/o'ngga suring — yo'lak almashtirish",'Свайп влево/вправо — смена пути','Swipe left/right — change lane')}</p>
      <p>⬆️ ${KT("Tepaga — sakrash (past to'siqlardan)",'Вверх — прыжок (через низкие барьеры)','Up — jump (over low barriers)')}</p>
      <p>⬇️ ${KT("Pastga — sirpanish (baland to'siq ostidan)",'Вниз — подкат (под высокими барьерами)','Down — roll (under high bars)')}</p>
      <p>🚆 ${KT("Poyezdga rampadan chiqing. Poyezd yoniga urilsangiz qorovul yaqinlashadi — ikkinchi marta ushlaydi!",'На поезд — по рампе. Удар о бок поезда — охранник ближе, второй раз — поймает!','Climb trains by ramps. Bump a side — the guard gets closer, twice and you are caught!')}</p>
      <p>🧲 🚀 👟 ✖2 🛡 ${KT('Bonuslarni yig\'ing','Собирайте бонусы','Grab power-ups')}</p></div></section>`;
  $('#rngo').onclick=()=>rnStart();
  if($('#rnevc'))$('#rnevc').onclick=()=>{const st=rnEvSt(EV);if(st.claimed||st.p<ED.goal)return;st.claimed=true;store.set('rn_ev',st);const P=rnProg();P.coins+=ED.r;store.set('rn_p',P);haptic('done');rnToastG(ED.e+' +'+ED.r+' 🪙');viewYugur()};
  $('#rnlball').onclick=()=>RN_LB?rnLbSheet():rnToastG(KT("Reyting faqat Telegram ichida ishlaydi",'Рейтинг работает только в Telegram','Ranking works inside Telegram'));$('#rninv').onclick=()=>rnInvite();
  if($('#rnreg'))$('#rnreg').onclick=()=>rnRegPick();
  rnSync().then(j=>{if(j&&$('#rnlb')){$('#rnlb').innerHTML=rnLbHtml();if($('#rnreg'))$('#rnreg').onclick=()=>rnRegPick()}
    if(j&&!j.region&&!store.get('rn_regask',false)&&tg&&tg.initData){store.set('rn_regask',true);rnRegPick()}});
  // menyu ochilganda 3D fayllarni oldindan yuklab qo'yamiz — «Yugurish» bosilganda kutish qisqaradi
  setTimeout(()=>{if(current==='yugur')blLoad3().then(ok=>ok&&rnLoadAssets()).catch(()=>{})},700);
  $('#rnmus').onclick=()=>{store.set('rn_mus',!store.get('rn_mus',true));viewYugur()};$('#rnsfx').onclick=()=>{store.set('rn_snd',!store.get('rn_snd',true));viewYugur()};$('#rnlite').onclick=()=>{store.set('rn_lite',!RN_LITE());viewYugur()};
  document.querySelectorAll('[data-q]').forEach(b=>b.onclick=()=>{store.set('rn_qset',b.dataset.q);if(b.dataset.q!=='auto')store.set('rn_q',+b.dataset.q);viewYugur()});
  document.querySelectorAll('[data-ms]').forEach(b=>b.onclick=()=>{const st=rnMS(),r=rnMissionClaim(st,+b.dataset.ms);if(!r)return;store.set('rn_ms',st);const P=rnProg();P.coins+=r;store.set('rn_p',P);haptic('done');rnToastG('+'+r+' 🪙');viewYugur()});
  if($('#rnchest'))$('#rnchest').onclick=()=>{const st=rnMS(),r=rnChest(st);if(!r)return;store.set('rn_ms',st);const P=rnProg();P.coins+=r;store.set('rn_p',P);haptic('done');rnToastG('🎁 +'+r+' 🪙');viewYugur()};
  $('#rnbuyb').onclick=()=>{const P=rnProg();if(P.coins<RN_BOARD_P)return;P.coins-=RN_BOARD_P;store.set('rn_p',P);store.set('rn_boards',store.get('rn_boards',0)+1);haptic('light');viewYugur()};
  document.querySelectorAll('[data-sk]').forEach(b=>b.onclick=()=>{const k=RN_SK.find(x=>x.id===b.dataset.sk),P=rnProg(),own=rnOwn();
    if(!own.includes(k.id)){if(P.coins<k.p)return;P.coins-=k.p;store.set('rn_p',P);own.push(k.id);store.set('rn_own',own);haptic('done');rnToastG(KT(`${k.n()} sizniki!`,`${k.n()} теперь ваш!`,`${k.n()} is yours!`))}
    store.set('rn_skin',k.id);viewYugur()});
}
function rnLbHtml(){const j=RN_LB,reg=store.get('rn_region','');
  if(!j)return `<p class="note">${reg?'📍 '+rnRegN(reg)+' · ':''}${KT("Har hafta viloyatlar yugurgan masofa bo'yicha bellashadi. G'olib viloyatga +300 tanga.",'Каждую неделю регионы соревнуются по дистанции. Победителям +300.','Regions compete weekly by distance. Winners get +300.')}</p>${reg?'':`<button class="btn" id="rnreg">📍 ${KT('Viloyatni tanlash','Выбрать регион','Choose region')}</button>`}`;
  const mx=Math.max(1,...j.regs.map(r=>r.d)),top=j.regs.slice(0,3),mine=j.regs.findIndex(r=>r.k===j.region);
  return `<div class="rn-rgl">${top.map((r,i)=>`<div class="${r.k===j.region?'me':''}"><span>${['🥇','🥈','🥉'][i]} ${rnRegN(r.k)}</span><i><u style="width:${Math.round(100*r.d/mx)}%"></u></i><b>${(r.d/1000).toFixed(1)} km</b></div>`).join('')||`<p class="note">${KT("Bu hafta hali hech kim yugurmadi.",'На этой неделе ещё не бегали.','Nobody ran yet this week.')}</p>`}</div>
    <p class="note">${j.region?`📍 ${rnRegN(j.region)}${mine>=0?' — '+(mine+1)+KT("-o'rinda",'-е место','th place'):''}`:''}${j.me?` · ${KT('Sizning haftalik rekordingiz','Ваш рекорд недели','Your weekly best')}: <b>${j.me.best.toLocaleString()}</b> (${j.rank}-${KT("o'rin",'место','place')})`:''}</p>${j.region?'':`<button class="btn" id="rnreg">📍 ${KT('Viloyatni tanlash','Выбрать регион','Choose region')}</button>`}`}
function rnToastG(t){try{toast(t)}catch(e){}}
function rnStart(){
  RNS=rnNew((Date.now()%1e6)|0);RNS.free=rnSkin()==='skater'?1:0;RNS.boards=store.get('rn_boards',0)+RNS.free;RNS.st={jumps:0,rolls:0,items:0};rnSt='ready';rnTrauma=0;statSec('yugur_game');rnGameV();window.scrollTo(0,0);
}
function rnGameV(){
  document.body.classList.add('rn-play');try{tg&&tg.disableVerticalSwipes&&tg.disableVerticalSwipes()}catch(e){}
  $('#hero').hidden=true;
  $('#screen').innerHTML=`<div class="rn" id="rnstage" data-notr>
    <div class="rn-view" id="rnview"><div class="rn-load">${KT('Shahar tayyorlanmoqda…','Город загружается…','Loading the city…')}</div></div>
    <div class="rn-top"><button class="rn-ib" id="rnback" aria-label="${KT('Orqaga','Назад','Back')}">⏸</button>
      <div class="rn-sc"><b id="rnscore">0</b><small id="rnmul"></small></div><div class="rn-coin">🪙 <b id="rncoins">0</b></div></div>
    <div class="rn-pws" id="rnpws"></div>
    <button class="rn-board" id="rnboard" hidden>🛹<b id="rnbn"></b></button>
    <div class="rn-guard" id="rnguard" hidden>👮 ${KT('Qorovul ortingizda!','Охранник сзади!','Guard is behind you!')}</div>
    <div class="rn-msg" id="rnmsg"></div>
    <div id="rnend"></div></div>`;
  $('#rnback').onclick=()=>rnPause();
  $('#rnboard').onclick=e=>{e.stopPropagation();if(rnSt==='ready'){rnSt='run';$('#rnmsg').hidden=true;rnMusic(true)}if(rnSt==='run')rnInput(RNS,'board')};
  rnHud();
  rnLoadT0=performance.now();
  blLoad3().then(ok=>ok?rnLoadAssets().then(()=>ok,()=>ok):ok).then(ok=>{
    if(!$('#rnstage')||rnR)return;rnLoadMs=performance.now()-rnLoadT0;const v=$('#rnview');v.innerHTML='';
    if(!ok){v.innerHTML=`<div class="rn-load">${KT("Qurilmangiz 3D ni qo'llamaydi",'Устройство не поддерживает 3D','3D is not supported')}</div>`;return}
    try{rnR=rnMake3D(v)}catch(e){console.error(e);v.innerHTML='<div class="rn-load">3D xato</div>';return}
    rnBind($('#rnstage'));rnReady();rnLoop();
  });
}
function rnReady(){rnSt='ready';const m=$('#rnmsg');m.innerHTML=`<div class="rn-start"><b>${KT('Suring — boshlaymiz!','Свайпните — поехали!','Swipe to start!')}</b><span>⬅️ ➡️ ⬆️ ⬇️</span></div>`;m.hidden=false}
function rnPause(){
  if(rnSt==='over')return rnLeave();
  if(rnSt==='run'){rnSt='pause';rnMusic(false)}
  $('#rnend').innerHTML=`<div class="rn-end"><div class="rn-endc"><h3>${KT('Pauza','Пауза','Paused')}</h3>
    <div class="rn-ea"><button class="btn" id="rnres">▶ ${KT('Davom etish','Продолжить','Resume')}</button><button class="chip" id="rnquit">${KT('Chiqish','Выйти','Quit')}</button></div></div></div>`;
  $('#rnres').onclick=()=>{$('#rnend').innerHTML='';if(rnSt==='pause'){rnSt='run';rnMusic(true)}};
  $('#rnquit').onclick=()=>rnLeave();
}
function rnLeave(){rnDispose();viewYugur()}
function rnBind(el){
  let sx=0,sy=0,id=null,done=false;
  el.addEventListener('pointerdown',e=>{if(e.target.closest('button'))return;id=e.pointerId;sx=e.clientX;sy=e.clientY;done=false});
  el.addEventListener('pointermove',e=>{if(e.pointerId!==id||done)return;const dx=e.clientX-sx,dy=e.clientY-sy;if(Math.hypot(dx,dy)<20)return;done=true;
    rnKey(Math.abs(dx)>Math.abs(dy)?(dx>0?'right':'left'):(dy<0?'up':'down'))});
  el.addEventListener('pointerup',()=>{id=null});
  const kd=e=>{if(!$('#rnstage')){removeEventListener('keydown',kd);return}const m={ArrowLeft:'left',ArrowRight:'right',ArrowUp:'up',ArrowDown:'down',a:'left',d:'right',w:'up',s:'down',' ':'up',b:'board',Shift:'board'}[e.key];if(m){e.preventDefault();rnKey(m)}};
  addEventListener('keydown',kd);
}
function rnKey(k){
  if(rnSt==='ready'&&k==='board')return;
  if(rnSt==='ready'){rnSt='run';$('#rnmsg').hidden=true;rnSnd('go');rnMusic(true)}
  if(rnSt!=='run')return;rnInput(RNS,k);
}
function rnHud(){
  if(!$('#rnstage')||!RNS)return;const s=RNS;
  $('#rnscore').textContent=Math.floor(s.score).toLocaleString();$('#rncoins').textContent=s.coins;
  $('#rnmul').textContent=s.pw.x2>0?'×2':'';
  $('#rnpws').innerHTML=['magnet','jet','shoe','x2','board'].filter(k=>s.pw[k]>0).map(k=>`<div class="rn-pw"><span>${RN_PW[k][0]}</span><i style="transform:scaleX(${s.pw[k]/RN.dur[k]})"></i></div>`).join('')+(s.pw.shield?`<div class="rn-pw"><span>🛡</span></div>`:'');
  $('#rnguard').hidden=!(s.guard>0&&s.alive);
  {const bb=$('#rnboard');if(bb){bb.hidden=!(s.boards>0)||s.pw.board>0||!s.alive;$('#rnbn').textContent=s.boards}}
}
function rnOver(){
  rnSt='over';rnMusic(false);const s=RNS,P=rnProg(),sc=Math.floor(s.score),nb=sc>P.best;
  P.best=Math.max(P.best,sc);P.coins+=s.coins;P.games++;store.set('rn_p',P);haptic(nb?'done':'heavy');
  const MS=rnMS(),before=MS.list.map(m=>m.p>=m.n);rnMissionRun(MS,{coins:s.coins,dist:Math.round(s.z),score:sc,jumps:s.st?s.st.jumps:0,rolls:s.st?s.st.rolls:0,items:s.st?s.st.items:0});store.set('rn_ms',MS);
  const newDone=MS.list.filter((m,i)=>m.p>=m.n&&!before[i]);
  {const ev=rnEv();if(ev){const st=rnEvSt(ev);st.p+=Math.round(s.z);store.set('rn_ev',st)}}
  if(s.z>30)rnApi('/rn/run',{score:sc,dist:Math.round(s.z)});
  const why={caught:KT('Qorovul ushlab oldi!','Охранник поймал!','The guard caught you!'),train:KT('Poyezdga urildingiz!','Врезались в поезд!','Hit a train!'),mtrain:KT('Poyezdga urildingiz!','Врезались в поезд!','Hit a train!'),block:KT("To'siqqa urildingiz!",'Врезались в барьер!','Hit a barrier!'),low:KT("Past to'siq — sakrash kerak edi",'Низкий барьер — надо было прыгать','Low barrier — jump!'),high:KT("Baland to'siq — sirpanish kerak edi",'Высокий барьер — надо было подкатиться','High bar — roll!')}[s.crash]||'';
  setTimeout(()=>{if(!$('#rnstage'))return;
    $('#rnend').innerHTML=`<div class="rn-end"><div class="rn-endc"><small>${why}</small>
      <h3>${nb?'🏆 '+KT('Yangi rekord!','Новый рекорд!','New record!'):KT("O'yin tugadi",'Игра окончена','Game over')}</h3>
      <div class="rn-big">${sc.toLocaleString()}</div>
      <div class="rn-row"><span>🪙 ${KT('Tangalar','Монеты','Coins')}</span><b>+${s.coins}</b></div>
      <div class="rn-row"><span>📏 ${KT('Masofa','Дистанция','Distance')}</span><b>${Math.round(s.z)} m</b></div>
      <div class="rn-row"><span>🏆 ${KT('Rekord','Рекорд','Best')}</span><b>${P.best.toLocaleString()}</b></div>
      ${newDone.map(m=>`<div class="rn-row rn-done"><span>✅ ${RN_MTXT[m.t](m.n)}</span><b>🪙 ${m.r}</b></div>`).join('')}
      <div class="rn-ea"><button class="btn" id="rnagain">↻ ${KT('Yana yugurish','Ещё раз','Run again')}</button>
      <button class="chip" id="rnshare">📸 ${KT('Natija kartasi','Карточка','Result card')}</button><button class="chip" id="rnmenu">${KT('Menyu','Меню','Menu')}</button></div></div></div>`;
    $('#rnagain').onclick=()=>{rnDispose();rnStart()};$('#rnmenu').onclick=()=>rnLeave();
    $('#rnshare').onclick=()=>{if(tg&&tg.initData){const b=$('#rnshare');b.disabled=true;rnCard(sc,Math.round(s.z),s.coins).then(img=>{const fd=new FormData();fd.append('initData',tg.initData);fd.append('img',img,'yugur.png');
        fd.append('cap',trText(`🏃 «Yugur!» o'yinida <b>${sc.toLocaleString()}</b> ochko to'pladim! Meni quvib o'ta olasanmi?`));
        return fetch(BOT_API+'/rn/card',{method:'POST',body:fd}).then(r=>r.json())}).then(j=>{b.disabled=false;rnToastG(j&&j.ok?KT("✅ Karta bot chatiga yuborildi — uni do'stlaringizga uzating!",'✅ Карточка отправлена в чат бота — перешлите друзьям!','✅ Card sent to the bot chat — forward it to friends!'):KT("Yuborib bo'lmadi, birozdan so'ng urinib ko'ring",'Не удалось отправить, попробуйте позже','Could not send, try later'))}).catch(()=>{b.disabled=false})
        return}
      const link=BOT_LINK+'?startapp=yugur',t=trText(`🏃 Hamrohdagi «Yugur!» o'yinida ${sc} ochko to'pladim! Meni quvib o'ta olasanmi?`);const u=`https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(t)}`;tg&&tg.openTelegramLink?tg.openTelegramLink(u):window.open(u,'_blank')};
  },900);
}
function rnLoop(){
  cancelAnimationFrame(rnRAF);let last=performance.now(),acc=0,hudT=0;
  const f=now=>{if(current!=='yugur'||!$('#rnstage')||!rnR){rnDispose();return}
    const dt=Math.min(0.05,(now-last)/1000);last=now;
    if(rnSt==='run'){acc+=dt;while(acc>=1/120){rnStep(RNS,1/120);acc-=1/120;if(!RNS.alive)break}}
    // hodisalar: ovoz, effekt
    for(const e of RNS.ev.splice(0)){rnR.fx(e);
      if(e.k==='coin'){const n=performance.now();rnStreak=n-rnStreakT<350?Math.min(12,rnStreak+1):0;rnStreakT=n;rnSnd('coin',rnStreak)}else if(e.k==='magPull'){}else if(e.k==='jump'){RNS.st.jumps++;rnSnd('jump')}else if(e.k==='roll'){RNS.st.rolls++;rnSnd('roll')}else if(e.k==='land')rnSnd('land');
      else if(e.k==='board'){rnSnd('item');haptic('light');if(RNS.free>0)RNS.free--;else store.set('rn_boards',Math.max(0,store.get('rn_boards',0)-1))}
      else if(e.k==='boardBreak'){rnSnd('shield');rnTrauma=Math.min(1,rnTrauma+0.5);haptic('medium');rnToast('🛹 '+KT('Skeyt sindi — siz omon qoldingiz!','Скейт сломан — вы спасены!','Board broke — you survived!'))}
      else if(e.k==='item'){RNS.st.items++;rnSnd('item');rnToast(RN_PW[e.p][0]+' '+RN_PW[e.p][1]());haptic('light')}
      else if(e.k==='stumble'){rnSnd('stumble');rnWhistle();rnTrauma=Math.min(1,rnTrauma+0.55);haptic('medium')}
      else if(e.k==='shield'){rnSnd('shield');rnTrauma=Math.min(1,rnTrauma+0.5)}
      else if(e.k==='crash'){rnSnd('crash');rnTrauma=1;rnOver()}}
    rnTrauma=Math.max(0,rnTrauma-dt*1.6);
    hudT-=dt;if(hudT<=0){hudT=0.1;rnHud();if(rnMus&&RNS)rnMus.spd=RNS.v-11}
    rnR.frame(dt,rnSt==='run'||rnSt==='over',rnSt==='run'&&RNS.alive?acc:0);
    rnRAF=requestAnimationFrame(f)};
  rnRAF=requestAnimationFrame(f);
}
let rnToastT=null;function rnToast(t){const m=$('#rnmsg');if(!m)return;m.innerHTML=`<div class="rn-toast">${esc(t)}</div>`;m.hidden=false;clearTimeout(rnToastT);rnToastT=setTimeout(()=>{if(rnSt==='run')m.hidden=true},1400)}
// ---------------- 3D ----------------
function rnMake3D(v){
  const T=window.THREE,W=()=>v.clientWidth||innerWidth,H=()=>v.clientHeight||innerHeight;
  const rd=new T.WebGLRenderer({antialias:true,powerPreference:'high-performance'});
  rd.setPixelRatio(Math.min(1.75,devicePixelRatio||1));rd.setSize(W(),H());rd.shadowMap.enabled=true;rd.shadowMap.type=T.PCFSoftShadowMap;rd.outputColorSpace=T.SRGBColorSpace;rd.toneMapping=T.ACESFilmicToneMapping;rd.toneMappingExposure=1.1;
  v.appendChild(rd.domElement);
  const sc=new T.Scene(),FOG=0xbfdcf0;sc.fog=new T.Fog(FOG,70,230);
  const cam=new T.PerspectiveCamera(62,W()/H(),0.1,600);
  // egilgan dunyo: har bir materialning vertex shaderiga egilish qo'shiladi
  const U={uBY:{value:0.0026},uBX:{value:0},uCZ:{value:0}};
  const bend=m=>{m.onBeforeCompile=sh=>{Object.assign(sh.uniforms,U);
    sh.vertexShader='uniform float uBY;uniform float uBX;uniform float uCZ;\n'+sh.vertexShader.replace('#include <project_vertex>',
`vec4 mvPosition = vec4( transformed, 1.0 );
#ifdef USE_INSTANCING
 mvPosition = instanceMatrix * mvPosition;
#endif
vec4 wPos = modelMatrix * mvPosition; float bz = max(0.0, wPos.z - uCZ);
wPos.y -= bz*bz*uBY; wPos.x += bz*bz*uBX;
mvPosition = viewMatrix * wPos; gl_Position = projectionMatrix * mvPosition;`).replace('#include <worldpos_vertex>',
`#if defined( USE_ENVMAP ) || defined( USE_DEPTH_PACKING ) || defined ( USE_SHADOWMAP ) || defined ( USE_TRANSMISSION ) || NUM_SPOT_LIGHT_COORDS > 0
vec4 worldPosition = vec4( transformed, 1.0 );
#ifdef USE_INSTANCING
 worldPosition = instanceMatrix * worldPosition;
#endif
worldPosition = modelMatrix * worldPosition; float bz2 = max(0.0, worldPosition.z - uCZ);
worldPosition.y -= bz2*bz2*uBY; worldPosition.x += bz2*bz2*uBX;
#endif`)};m.customProgramCacheKey=()=>'bend';return m};
  const cvT=(w,h,draw,rx=1,ry=1)=>{const c=document.createElement('canvas');c.width=w;c.height=h;draw(c.getContext('2d'),w,h);const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;t.wrapS=t.wrapT=T.RepeatWrapping;t.repeat.set(rx,ry);t.anisotropy=4;return t};
  const ML=(o)=>bend(new T.MeshLambertMaterial(o)),MS=(o)=>bend(new T.MeshStandardMaterial(o));
  // Meshy modellari: o'lchamga moslab joylash (har biri bitta tekstura, bitta material)
  const RM=(RNA&&RNA.m)||{},MMc={};
  const mMat=(k,o={})=>MMc[k]||(MMc[k]=ML(Object.assign({map:RM[k].map},o)));
  // LOD: yaqinda teksturali model, uzoqda yengil (rangli) nusxa — telefon uchun uchburchaklar kamayadi
  const loMat=ML({vertexColors:true}),LODD={cab:60,car:60,low:40,high:40,block:45,ramp:45,coin:30};
  const mesh=(k,mat)=>{const a=RM[k],lo=RM[k+'_lo'];if(!lo)return new T.Mesh(a.geo,mat||mMat(k));const L=new T.LOD();L.addLevel(new T.Mesh(a.geo,mat||mMat(k)),0);L.addLevel(new T.Mesh(lo.geo,loMat),LODD[k]||70);return L};
  const mm=(k,w,h,d)=>{const a=RM[k],m=mesh(k);m.scale.set(w/a.s.x,h/a.s.y,d/a.s.z);return m};
  const glowTx=cvT(128,128,(x)=>{const g=x.createRadialGradient(64,64,4,64,64,62);g.addColorStop(0,'rgba(255,248,220,1)');g.addColorStop(0.3,'rgba(255,214,130,.55)');g.addColorStop(1,'rgba(255,170,60,0)');x.fillStyle=g;x.fillRect(0,0,128,128)});
  const glowPG=new T.PlaneGeometry(1,1);
  const glowMat=(col,op)=>bend(new T.MeshBasicMaterial({map:glowTx,color:col,transparent:true,opacity:op,depthWrite:false,blending:T.AdditiveBlending,side:T.DoubleSide,fog:false}));
  const lampGM=glowMat(0xffd88a,0),headGM=glowMat(0xfff4d0,0);
  const glowP=(m,sz)=>{const g=new T.Mesh(glowPG,m);g.scale.setScalar(sz);return g};
  const mmU=(k,size,ax='y')=>{const a=RM[k],m=mesh(k);m.scale.setScalar(size/a.s[ax]);return m};
  // osmon
  // osmon: gradient + quyosh/oy gardishi (shader)
  const skyU={top:{value:new T.Color()},hor:{value:new T.Color()},sunC:{value:new T.Color()},sunDir:{value:new T.Vector3(0,1,0)}};
  const skyM=new T.Mesh(new T.SphereGeometry(400,32,16),new T.ShaderMaterial({uniforms:skyU,side:T.BackSide,depthWrite:false,fog:false,
    vertexShader:'varying vec3 vD;void main(){vD=normalize(position);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
    fragmentShader:'uniform vec3 top;uniform vec3 hor;uniform vec3 sunC;uniform vec3 sunDir;varying vec3 vD;void main(){vec3 d=normalize(vD);float y=max(d.y,0.0);vec3 c=mix(hor,top,pow(y,0.55));float s=max(dot(d,normalize(sunDir)),0.0);c+=sunC*(smoothstep(0.9993,0.9997,s)*2.2+pow(s,14.0)*0.35);gl_FragColor=vec4(c,1.0);\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}'}));
  skyM.renderOrder=-1;sc.add(skyM);
  // yulduzlar (tunda)
  const starM=new T.PointsMaterial({color:0xffffff,size:1.6,sizeAttenuation:false,transparent:true,opacity:0,fog:false,depthWrite:false});
  {const n=500,a=new Float32Array(n*3);for(let i=0;i<n;i++){const th=Math.random()*Math.PI*2,y=0.08+Math.random()*0.92,r=Math.sqrt(1-y*y);a[i*3]=Math.cos(th)*r*380;a[i*3+1]=y*380;a[i*3+2]=Math.sin(th)*r*380}
   const g=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(a,3));sc.add(new T.Points(g,starM))}
  const hemi=new T.HemisphereLight(0xd8ecff,0x7a6a52,0.95);sc.add(hemi);
  const sun=new T.DirectionalLight(0xfff0d0,2.1);sun.position.set(-9,18,-4);sun.target.position.set(0,0,14);sc.add(sun,sun.target);
  sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);Object.assign(sun.shadow.camera,{left:-11,right:11,top:24,bottom:-16,near:1,far:60});sun.shadow.camera.updateProjectionMatrix();sun.shadow.bias=-0.0008;sun.shadow.normalBias=0.02;sun.shadow.radius=3;
  const depthB=bend(new T.MeshDepthMaterial({depthPacking:T.RGBADepthPacking}));
  const shadowy=(g,recv=true)=>{g.traverse(o=>{if(o.isMesh&&!o.material.transparent){o.castShadow=true;o.receiveShadow=recv;o.customDepthMaterial=depthB}});return g};
  // yumaloq qirrali quti (Subway uslubidagi silliq shakllar uchun)
  const RBC=new Map();
  const rbx=(w,h,d,r=0.08,sg=3)=>{const k=[w,h,d,r].join();if(RBC.has(k))return RBC.get(k);r=Math.min(r,w/2-1e-3,h/2-1e-3,d/2-1e-3);
    const g=new T.BoxGeometry(w,h,d,sg*2,sg*2,sg*2),p=g.attributes.position,hw=w/2-r,hh=h/2-r,hd=d/2-r,v=new T.Vector3(),c=new T.Vector3();
    for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i);c.set(Math.max(-hw,Math.min(hw,v.x)),Math.max(-hh,Math.min(hh,v.y)),Math.max(-hd,Math.min(hd,v.z)));v.sub(c);if(v.lengthSq()>0)v.normalize().multiplyScalar(r);v.add(c);p.setXYZ(i,v.x,v.y,v.z)}
    g.computeVertexNormals();RBC.set(k,g);return g};
  // ---- yo'l: shpal va relslar teksturasi, harakatlanadi ----
  const TL=6; // tekstura plitkasi uzunligi (m)
  const trackT=cvT(512,256,(x,w,h)=>{x.fillStyle='#8c7b66';x.fillRect(0,0,w,h);
    for(let i=0;i<5000;i++){const v=110+Math.random()*90|0;x.fillStyle=`rgb(${v},${v-8},${v-20})`;x.fillRect(Math.random()*w,Math.random()*h,2+Math.random()*3,2+Math.random()*3)}
    const lx=l=>(0.5+RN.lanes[l]/9)*w;
    if(!RNA)for(const l of [0,1,2]){for(let j=0;j<4;j++){const y=j*h/4+8;x.fillStyle='#5a4130';x.fillRect(lx(l)-46,y,92,22);x.fillStyle='rgba(0,0,0,.25)';x.fillRect(lx(l)-46,y+18,92,4)}
      for(const sg of [-1,1]){x.fillStyle='#55585e';x.fillRect(lx(l)+sg*26-4,0,8,h);x.fillStyle='#d8dde3';x.fillRect(lx(l)+sg*26-2,0,3,h)}}});
  trackT.repeat.set(1,1);
  const KT_=RNA?ML({map:RNA.t.tx}):null,KC=RNA&&RNA.c?ML({map:RNA.c.tx}):null;
  // Kenney rels plitkalari (har yo'lakka), yo'l bilan birga suriladi
  const TK=2.2;let rails=null;
  if(RNA){const n=124,im=new T.InstancedMesh(RNA.t.G['track-detailed'],KT_,n*3),o=new T.Object3D();let k=0;
    for(const l of [0,1,2])for(let i=0;i<n;i++){o.position.set(RN.lanes[l],0.01,-20+i*TK);o.scale.set(1.9,1.3,TK);o.updateMatrix();im.setMatrixAt(k++,o.matrix)}
    im.receiveShadow=true;rails=new T.Group();rails.add(im);sc.add(rails)}
  const trackG=new T.PlaneGeometry(9,300,1,60);trackG.rotateX(-Math.PI/2);trackG.translate(0,0,140);
  // UV ni metrga moslash
  {const uv=trackG.attributes.uv,p=trackG.attributes.position;for(let i=0;i<uv.count;i++)uv.setY(i,p.getZ(i)/TL)}
  const track=new T.Mesh(trackG,ML({map:trackT}));track.receiveShadow=true;sc.add(track);
  // yon tomonlar: tosh devor va trotuar
  const sideT=cvT(256,256,(x,w,h)=>{x.fillStyle='#c9b79a';x.fillRect(0,0,w,h);x.strokeStyle='rgba(90,70,50,.35)';x.lineWidth=3;for(let y=0;y<h;y+=32){x.beginPath();x.moveTo(0,y);x.lineTo(w,y);x.stroke();for(let xx=(y/32%2)*32;xx<w;xx+=64){x.beginPath();x.moveTo(xx,y);x.lineTo(xx,y+32);x.stroke()}}});
  const walkG=new T.PlaneGeometry(60,300,1,60);walkG.rotateX(-Math.PI/2);{const uv=walkG.attributes.uv,p=walkG.attributes.position;for(let i=0;i<uv.count;i++){uv.setY(i,p.getZ(i)/6);uv.setX(i,uv.getX(i)*9.6)}}
  const walkM=ML({map:sideT});
  for(const sg of [-1,1]){const m=new T.Mesh(walkG,walkM);m.receiveShadow=true;m.position.set(sg*34.5,0.45,140);sc.add(m); // keng: binolar ostida bo'shliq qolmasin
    // bordyur: uzunasiga bo'laklangan — yo'l egilganda u ham birga egiladi (aks holda yo'l bilan trotuar orasi ochilib qoladi)
    const cur=new T.Mesh(new T.BoxGeometry(0.5,1.2,300,1,1,60),ML({color:0x9a9184}));cur.position.set(sg*4.75,-0.15,140);sc.add(cur)}
  // ---- shahar: binolar, gumbazlar, chinorlar (qayta ishlatiladigan hovuz) ----
  const winT=(base,frame)=>cvT(128,256,(x,w,h)=>{x.fillStyle=base;x.fillRect(0,0,w,h);for(let r=0;r<8;r++)for(let c=0;c<3;c++){x.fillStyle=frame;x.fillRect(12+c*38,14+r*30,30,22);x.fillStyle=Math.random()<0.25?'#ffe6a6':'#7fb6d9';x.fillRect(15+c*38,17+r*30,24,16)}});
  const FAC=[['#e9d8b8','#b98f5a'],['#f2efe8','#3e8fb0'],['#d9a679','#8a4d2a'],['#cfe0e8','#2b6a8a'],['#f0c9a0','#a0522d'],['#e8e2f2','#6a4fa0']].map(([b,f])=>ML({map:winT(b,f)}));
  const roofM=ML({color:0x8a5a3a}),domeM=MS({color:0x1fa7b8,roughness:0.35,metalness:0.1}),goldM=MS({color:0xe5b84a,metalness:0.8,roughness:0.3}),
    trunkM=ML({color:0x6b4a32}),leafM=ML({color:0x4f8f3a,flatShading:true}),poleM=ML({color:0x3a3f46}),lampM=new T.MeshBasicMaterial({color:0xfff2c4});bend(lampM);
  const boxG=new T.BoxGeometry(1,1,1),sphG=new T.SphereGeometry(1,16,10,0,Math.PI*2,0,Math.PI/2),icoG=new T.IcosahedronGeometry(1,1),cylG=new T.CylinderGeometry(1,1,1,12);
  const pool=[],SPAN=260;
  function makeProp(i){const g=new T.Group(),sg=i%2?1:-1,R=Math.random;g.userData.sg=sg;
    const kind=R();
    if(RM.apart&&RM.chinar){
      if(kind<0.3){ // chinorlar, fonar, meva aravasi
        for(let k=0;k<2;k++){const t=mmU('chinar',6.5+R()*2.5);t.rotation.y=R()*6.3;t.position.set(-sg*k*2.2,0,k*4.5);g.add(t)}
        if(RM.lamp){const l=mmU('lamp',5.2);l.position.set(-sg*3.4,0,2);g.add(l);const gl=glowP(lampGM,2.6);gl.position.set(-sg*3.4,4.75,2);g.add(gl)}
        if(RM.cart&&R()<0.5){const c=mmU('cart',2.8,'x');c.rotation.y=Math.PI/2*(R()<0.5?1:-1);c.position.set(-sg*2.6,0,7.5);g.add(c)}
        g.userData.w=10;
      }else{ // Toshkent binolari: madrasa, bozor, mahalla uyi, choyxona, ko'p qavatli uy
        const list=['apart','bazaar','mahalla','madrasa','choy','apart','mahalla','madrasa'].filter(k=>RM[k]),k=list[(R()*list.length)|0],a=RM[k];
        const fw={apart:9,bazaar:13,mahalla:11,madrasa:14,choy:9}[k]*(0.9+R()*0.2),sc0=fw/a.s.x;
        const b=mesh(k);b.scale.setScalar(sc0);b.rotation.y=-sg*Math.PI/2;g.add(b);
        g.userData.w=a.s.x*sc0+1.5;g.userData.wd=a.s.z*sc0;
      }
    }else if(kind<0.16){ // gumbazli bino (madrasa uslubi)
      const b=new T.Mesh(boxG,FAC[1]);b.scale.set(7,7,9);b.position.y=3.5;g.add(b);
      const dr=new T.Mesh(cylG,ML({color:0xf2efe8}));dr.scale.set(2.6,1.6,2.6);dr.position.y=7.8;g.add(dr);
      const d=new T.Mesh(sphG,domeM);d.scale.set(2.6,3.2,2.6);d.position.y=8.6;g.add(d);
      const sp=new T.Mesh(cylG,goldM);sp.scale.set(0.12,1.2,0.12);sp.position.y=12.3;g.add(sp);
      const ar=new T.Mesh(boxG,ML({color:0x1d6f86}));ar.scale.set(0.3,4.2,3.4);ar.position.set(-sg*3.55,2.6,0);g.add(ar);
      g.userData.w=10;
    }else if(kind<0.3){ // chinorlar va chiroq
      for(let k=0;k<2;k++){const t=new T.Mesh(cylG,trunkM);t.scale.set(0.3,3,0.3);t.position.set(-sg*k*2,1.5,k*4);g.add(t);
        const c=new T.Mesh(icoG,leafM);const s=2.2+R()*1.2;c.scale.set(s,s*1.1,s);c.position.set(-sg*k*2,4.2+s*0.4,k*4);g.add(c)}
      const p=new T.Mesh(cylG,poleM);p.scale.set(0.08,5,0.08);p.position.set(-sg*3.2,2.5,2);g.add(p);
      const l=new T.Mesh(boxG,lampM);l.scale.set(0.9,0.2,0.4);l.position.set(-sg*2.8,5,2);g.add(l);g.userData.w=9;
    }else if(RNA&&RNA.c){ // Kenney binolari
      const sky=R()<0.22,ks=sky?['a','b','c','d','e'].map(x=>'building-skyscraper-'+x):'abcdefghijklmn'.split('').map(x=>'building-'+x),key=ks[(R()*ks.length)|0],G=RNA.c.G[key],sc0=sky?7:9.5;
      const b=new T.Mesh(G,KC);b.scale.setScalar(sc0);b.rotation.y=sg*Math.PI/2*RN_BROT;g.add(b);
      const mn=G.userData.min,mx=G.userData.max;g.userData.w=(mx[0]-mn[0])*sc0+1;g.userData.wd=(mx[2]-mn[2])*sc0;
    }else{ // ko'p qavatli bino
      const hgt=6+R()*14,wd=6+R()*4,dp=7+R()*6;const b=new T.Mesh(boxG,FAC[(R()*FAC.length)|0]);b.scale.set(wd,hgt,dp);b.position.y=hgt/2;g.add(b);
      const r=new T.Mesh(boxG,roofM);r.scale.set(wd+0.4,0.5,dp+0.4);r.position.y=hgt+0.25;g.add(r);
      if(R()<0.4){const a=new T.Mesh(boxG,ML({color:['#d64545','#2f80c9','#f2a23a','#3aa36b'][(R()*4)|0]}));a.scale.set(0.2,1.2,dp*0.8);a.position.set(-sg*(wd/2+0.6),3,0);a.rotation.z=sg*0.5;g.add(a)}
      g.userData.w=dp+1;g.userData.wd=wd;
    }
    return g}
  // ---- Chorsu bozori: gumbaz, ziravor rastalari, choyxona, aravalar ----
  const spiceC=[0xc8321e,0xe8a317,0xd96b1c,0x7a4a24,0x6f8f2a,0xb5462a,0xf2c94c];
  const tableM=ML({color:0x8a5a34}),clothT=cvT(64,64,(x,w,h)=>{for(let i=0;i<8;i++){x.fillStyle=i%2?'#f4ede0':['#d6402f','#1f8fa0','#e3a21a'][(Math.random()*3)|0];x.fillRect(i*8,0,8,h)}});
  const coneG=new T.ConeGeometry(0.28,0.42,10),spM=spiceC.map(c=>ML({color:c}));
  function makeBazaar(i,sg){const g=new T.Group(),R=Math.random,kind=R();
    if(kind<0.22&&RM.bazaar){const a=RM.bazaar,s0=(17+R()*4)/a.s.x,b=mesh('bazaar');b.scale.setScalar(s0);b.rotation.y=-sg*Math.PI/2;g.add(b);g.userData.w=a.s.x*s0+1.5;g.userData.wd=a.s.z*s0}
    else if(kind<0.62){ // ziravor rastalari
      const n=2+((R()*2)|0);for(let k=0;k<n;k++){const st=new T.Group();st.position.set(0,0,k*3.4);g.add(st);
        const t=new T.Mesh(boxG,tableM);t.scale.set(1.5,0.9,2.8);t.position.y=0.45;st.add(t);
        for(let j=0;j<6;j++){const c=new T.Mesh(coneG,spM[(R()*spM.length)|0]);c.position.set(-0.35+(j%2)*0.7,1.1,-0.95+((j/2)|0)*0.95);c.scale.setScalar(0.9+R()*0.3);st.add(c)}
        const aw=new T.Mesh(boxG,ML({map:clothT}));aw.scale.set(2.6,0.08,3.1);aw.position.set(sg*0.3,2.75,0);aw.rotation.z=sg*0.28;st.add(aw);
        for(const z of [-1.4,1.4])for(const x of [-0.85,0.95]){const p=new T.Mesh(boxG,tableM);p.scale.set(0.08,2.6,0.08);p.position.set(x*sg,1.3,z);st.add(p)}}
      if(RM.apart&&R()<0.6){const k=['mahalla','madrasa','apart'][(R()*3)|0],a=RM[k],s0=10/a.s.x,b=mesh(k);b.scale.setScalar(s0);b.rotation.y=-sg*Math.PI/2;b.position.set(sg*(4+a.s.z*s0/2),0,n*1.7-1.7);g.add(b)}
      g.userData.w=n*3.4+1;g.userData.wd=2.2}
    else if(kind<0.82&&RM.choy){const a=RM.choy,s0=9/a.s.x,b=mesh('choy');b.scale.setScalar(s0);b.rotation.y=-sg*Math.PI/2;g.add(b);
      if(RM.cart){const c=mmU('cart',2.8,'x');c.rotation.y=Math.PI/2;c.position.set(-sg*(a.s.z*s0/2+1.4),0,a.s.x*s0/2+1);g.add(c)}
      g.userData.w=a.s.x*s0+2.5;g.userData.wd=a.s.z*s0}
    else{ // meva aravalari va chinor
      if(RM.cart)for(let k=0;k<2;k++){const c=mmU('cart',2.8,'x');c.rotation.y=Math.PI/2*(k?1:-1);c.position.set(-sg*0.3,0,k*3.5);g.add(c)}
      if(RM.chinar){const t=mmU('chinar',7.5+R()*2);t.position.set(sg*3,0,1.7);g.add(t)}
      g.userData.w=8;g.userData.wd=3}
    return g}
  {let zz=-20;for(let i=0;i<34;i++){const sg=i%2?1:-1,W=new T.Group(),a=makeProp(i),b=makeBazaar(i,sg);
    a.position.x=sg*(a.userData.wd?7.2+a.userData.wd/2:9.5);b.position.x=sg*(b.userData.wd?6.2+b.userData.wd/2:9);W.add(a,b);b.visible=false;
    W.userData={sg,z:zz+(i%2)*3,w:Math.max(a.userData.w,b.userData.w),a,b};W.position.y=0.45;if(i%2)zz+=W.userData.w+1+Math.random()*3;sc.add(W);pool.push(W)}}
  let propSpan=pool.reduce((m,g)=>Math.max(m,g.userData.z),0)+14;
  // ---- zonalar: shahar → metro tunneli → Chorsu bozori (yo'l bo'ylab takrorlanadi) ----
  const ZC=1500,Z0=150,ZT0=600,ZT1=860;
  const zoneAt=z=>{if(z<Z0)return 0;const u=(z-Z0)%ZC;return u<ZT0?0:u<ZT1?1:2};
  // tunnel shifti past: reaktiv ryukzak bilan uchganda shiftga urilmaslik uchun balandlik chegarasi (kirishdan 35 m oldin pasayadi)
  const rnCeil=z=>{if(z<Z0-40)return Infinity;const u=((z-Z0)%ZC+ZC)%ZC;return u>ZT0-35&&u<ZT1+4?5.5:Infinity};
  const tunK=pz=>Math.max(0,Math.ceil((pz-40-Z0-ZT1)/ZC)),tun0=k=>Z0+k*ZC+ZT0,tun1=k=>Z0+k*ZC+ZT1;
  // tunnel: marmar devorlar, naqshli gumbaz shift, devor chiroqlari, bekat ustunlari va qandillar
  const wallT=cvT(256,256,(x,w,h)=>{const g=x.createLinearGradient(0,0,0,h);g.addColorStop(0,'#efe6d6');g.addColorStop(1,'#d9cbb2');x.fillStyle=g;x.fillRect(0,0,w,h);
    x.strokeStyle='rgba(150,130,100,.35)';x.lineWidth=2;for(let i=0;i<=4;i++){x.beginPath();x.moveTo(i*64,0);x.lineTo(i*64,h);x.stroke()}
    x.fillStyle='#145f7a';x.fillRect(0,h*0.36,w,h*0.13);x.fillStyle='#e8c25a';x.fillRect(0,h*0.35,w,4);x.fillRect(0,h*0.49,w,4);
    for(let i=0;i<8;i++){const cx=i*32+16,cy=h*0.425;x.fillStyle=i%2?'#f1f1e6':'#36b0c4';x.beginPath();for(let k=0;k<16;k++){const r=k%2?5:12,a=k*Math.PI/8;x.lineTo(cx+Math.cos(a)*r,cy+Math.sin(a)*r)}x.fill()}
    x.fillStyle='#6b5a44';x.fillRect(0,h*0.93,w,h*0.07)});
  const vaultT=cvT(256,256,(x,w,h)=>{x.fillStyle='#0f3f66';x.fillRect(0,0,w,h);for(let r=0;r<4;r++)for(let c=0;c<4;c++){const cx=c*64+32,cy=r*64+32;x.fillStyle='#f3efe2';x.beginPath();for(let k=0;k<16;k++){const rr=k%2?11:26,a=k*Math.PI/8;x.lineTo(cx+Math.cos(a)*rr,cy+Math.sin(a)*rr)}x.fill();x.fillStyle='#d9a93b';x.beginPath();x.arc(cx,cy,7,0,7);x.fill()}
    x.strokeStyle='rgba(217,169,59,.6)';x.lineWidth=2;for(let i=0;i<=4;i++){x.beginPath();x.moveTo(0,i*64);x.lineTo(w,i*64);x.stroke()}},2,1);
  const SEG=10,NSEG=29,TW=6,TH=6,bulbG=new T.SphereGeometry(1,8,6);
  const wallG=new T.PlaneGeometry(SEG,TH);const vaultG=new T.CylinderGeometry(TW,TW,SEG,24,1,true,-Math.PI/2,Math.PI);vaultG.rotateX(-Math.PI/2);vaultG.translate(0,TH,0);
  const wallM=ML({map:wallT,side:T.DoubleSide}),vaultM=ML({map:vaultT,side:T.DoubleSide}),tlampGM=glowMat(0xffe0a0,0.9),chandGM=glowMat(0xfff0c0,0.95);
  const colG=new T.CylinderGeometry(0.42,0.5,TH,14),colM=ML({map:cvT(64,256,(x,w,h)=>{x.fillStyle='#ede4d2';x.fillRect(0,0,w,h);x.fillStyle='#1d7f95';for(let y=20;y<h;y+=48)x.fillRect(0,y,w,10);x.fillStyle='#d9a93b';x.fillRect(0,0,w,14)})}),capG=new T.CylinderGeometry(0.75,0.45,0.6,14);
  const segs=[];for(let i=0;i<NSEG;i++){const g=new T.Group();
    for(const sg of [-1,1]){const w=new T.Mesh(wallG,wallM);w.rotation.y=-sg*Math.PI/2;w.position.set(sg*TW,TH/2,SEG/2);w.receiveShadow=true;g.add(w);
      const l=glowP(tlampGM,1.6);l.rotation.y=-sg*Math.PI/2;l.position.set(sg*(TW-0.08),4.4,SEG/2);g.add(l)}
    const v=new T.Mesh(vaultG,vaultM);v.position.z=SEG/2;g.add(v);
    const st=new T.Group();g.add(st);g.userData.st=st;
    for(const sg of [-1,1]){const c=new T.Mesh(colG,colM);c.position.set(sg*4.95,TH/2,SEG/2);st.add(c);const cp=new T.Mesh(capG,goldM);cp.position.set(sg*4.95,TH-0.1,SEG/2);st.add(cp)}
    {const ch=new T.Group();ch.position.set(0,9.6,SEG/2);st.add(ch);const ring=new T.Mesh(new T.TorusGeometry(0.9,0.07,6,20),goldM);ring.rotation.x=Math.PI/2;ch.add(ring);
     const rod=new T.Mesh(cylG,goldM);rod.scale.set(0.04,2.4,0.04);rod.position.y=1.2;ch.add(rod);
     for(let k=0;k<8;k++){const b=new T.Mesh(bulbG,lampM);b.scale.setScalar(0.13);b.position.set(Math.cos(k*Math.PI/4)*0.9,0.12,Math.sin(k*Math.PI/4)*0.9);ch.add(b)}
     const gl=glowP(chandGM,4.2);ch.add(gl)}
    g.visible=false;sc.add(g);segs.push(g)}
  // portal (tunnel kirish/chiqish) — arkali peshtoq, «METRO» yozuvi
  const portT=cvT(256,256,(x,w,h)=>{x.fillStyle='#e7d7b8';x.fillRect(0,0,w,h);x.strokeStyle='rgba(140,110,70,.4)';x.lineWidth=2;for(let y=0;y<h;y+=16){x.beginPath();x.moveTo(0,y);x.lineTo(w,y);x.stroke();for(let xx=(y/16%2)*16;xx<w;xx+=32){x.beginPath();x.moveTo(xx,y);x.lineTo(xx,y+16);x.stroke()}}},0.12,0.12);
  const signT=(txt,bg,fg)=>{const t=cvT(512,128,(x,w,h)=>{x.fillStyle=bg;x.fillRect(0,0,w,h);x.strokeStyle='#e8c25a';x.lineWidth=8;x.strokeRect(6,6,w-12,h-12);x.fillStyle=fg;let fs=74;do{x.font='bold '+fs+'px system-ui,sans-serif'}while(x.measureText(rnTx(txt)).width>w-40&&(fs-=4)>30);x.textAlign='center';x.textBaseline='middle';x.fillText(rnTx(txt),w/2,h/2+4)});t.wrapS=t.wrapT=T.ClampToEdgeWrapping;return t};
  const mkPortal=()=>{const g=new T.Group(),sh=new T.Shape();sh.moveTo(-15,0);sh.lineTo(15,0);sh.lineTo(15,16);sh.lineTo(-15,16);sh.closePath();
    const hole=new T.Path();hole.moveTo(-TW,0);hole.lineTo(TW,0);hole.lineTo(TW,TH);hole.absarc(0,TH,TW,0,Math.PI,false);hole.lineTo(-TW,0);sh.holes.push(hole);
    const eg=new T.ExtrudeGeometry(sh,{depth:2,bevelEnabled:false,curveSegments:20});const m=new T.Mesh(eg,ML({map:portT}));m.position.z=-1;g.add(m);
    const band=new T.Mesh(new T.TorusGeometry(TW+0.35,0.35,6,28,Math.PI),ML({color:0x1d7f95}));band.position.set(0,TH,-1.05);g.add(band);
    const sg=new T.Mesh(new T.PlaneGeometry(9,2.25),ML({map:signT('METRO','#16557e','#ffffff')}));sg.position.set(0,13.6,-1.06);sg.rotation.y=Math.PI;g.add(sg);
    g.traverse(o=>{if(o.isMesh)o.material.side=T.DoubleSide});sc.add(g);g.visible=false;return g};
  const portIn=mkPortal(),portOut=mkPortal();
  // Chorsu darvozasi va bayroqchalar
  const gate=new T.Group();{const pm=ML({map:portT});for(const sg of [-1,1]){const p=new T.Mesh(boxG,pm);p.scale.set(1.4,14,1.4);p.position.set(sg*7.6,7,0);gate.add(p);const d=new T.Mesh(sphG,domeM);d.scale.setScalar(1.1);d.position.set(sg*7.6,14,0);gate.add(d)}
    const b=new T.Mesh(boxG,ML({color:0x1d7f95}));b.scale.set(16.6,1.2,1.2);b.position.y=12.6;gate.add(b);
    const s1=new T.Mesh(new T.PlaneGeometry(10,2.5),ML({map:signT('CHORSU','#f3ead6','#14506f'),side:T.DoubleSide}));s1.position.set(0,12.6,-0.65);s1.rotation.y=Math.PI;gate.add(s1);gate.userData.s=s1;sc.add(gate);gate.visible=false}
  // ---- shaharlar: har metro tunnelidan keyin yangi shahar (Toshkent → Samarqand → Buxoro → Xiva → Farg'ona) ----
  const cityAt=z=>z<Z0+ZT1?0:(Math.floor((z-Z0-ZT1)/ZC)+1)%RN_CITY.length;
  const gateTx=RN_CITY.map(c=>signT(c.g,'#f3ead6','#14506f'));let gateC=0;
  const CITYP={1:[['registan','x',22,0.35],['gurem','y',15,0.4],['chinar','t',8,0.25]],2:[['kalon','y',26,0.25],['toki','x',13,0.45],['mahalla','x',11,0.3]],
    3:[['khwall','x',16,0.5],['kalta','y',11,0.25],['tut','t',7,0.25]],4:[['cotton','x',13,0.35],['atlasst','x',6,0.35],['tut','t',7,0.3]]};
  function makeCity(c,sg,wMax){const L=CITYP[c];if(!L||!L.every(x=>RM[x[0]]))return null;const R=Math.random;let r=R(),it=L[L.length-1];
    for(const x of L){if(r<x[3]){it=x;break}r-=x[3]}
    const g=new T.Group(),[k,ax,sz]=it,a=RM[k];
    if(ax==='t'){for(let i=0;i<2;i++){const t=mmU(k,sz*(0.85+R()*0.3));t.rotation.y=R()*6.3;t.position.set(sg*(8.5+i*2.4),0,i*4.2);g.add(t)}g.userData.w=8;return g}
    const s0=Math.min(sz/a.s[ax],(wMax+3)/a.s.x),b=mesh(k);b.scale.setScalar(s0);b.rotation.y=-sg*Math.PI/2;const wd=a.s.z*s0;b.position.x=sg*(7.2+wd/2);g.add(b);
    if(k==='atlasst'){const b2=mesh(k);b2.scale.setScalar(s0);b2.rotation.y=-sg*Math.PI/2;b2.position.set(b.position.x,0,a.s.x*s0+0.6);g.add(b2)}
    if(k==='kalon'||k==='kalta'){if(RM.tut){const t=mmU('tut',6.5);t.position.set(sg*(7.2+wd+3.5),0,3);g.add(t)}}
    return g}
  const buntG=(()=>{const P=[],C=[],cols=[[0.85,0.2,0.15],[0.95,0.75,0.1],[0.1,0.6,0.7],[0.95,0.95,0.9],[0.2,0.55,0.25]];for(let i=0;i<24;i++){const x0=-10+i*20/24,x1=x0+20/24*0.8,y=xx=>11.6-1.4*(1-(xx/10)**2);const c=cols[i%5].map(v=>Math.pow(v,2.2));
    P.push(x0,y(x0),0,x1,y(x1),0,(x0+x1)/2,y((x0+x1)/2)-0.9,0);C.push(...c,...c,...c)}const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(P,3));g.setAttribute('color',new T.Float32BufferAttribute(C,3));return g})();
  const buntM=bend(new T.MeshBasicMaterial({vertexColors:true,side:T.DoubleSide}));const bunts=[];for(let i=0;i<12;i++){const b=new T.Mesh(buntG,buntM);b.visible=false;sc.add(b);bunts.push(b)}
  // ---- bayram bezaklari ----
  const EV=rnEv(),decor=[];let snow=null,fw=[],moonS=null;
  if(EV){const flagG=(cols)=>{const P=[],C=[];for(let i=0;i<20;i++){const x0=-10+i,x1=x0+0.85,y=xx=>12.2-1.5*(1-(xx/10)**2),c=cols[i%cols.length];P.push(x0,y(x0),0,x1,y(x1),0,x0,y(x0)-1.1,0,x1,y(x1),0,x1,y(x1)-1.1,0,x0,y(x0)-1.1,0);for(let k=0;k<6;k++)C.push(...c.map(v=>Math.pow(v,2.2)))}const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(P,3));g.setAttribute('color',new T.Float32BufferAttribute(C,3));return g};
    const cols={navruz:[[0.95,0.3,0.25],[0.98,0.8,0.2],[0.3,0.75,0.35]],mustaqillik:[[0.1,0.55,0.8],[0.97,0.97,0.97],[0.15,0.62,0.3]],yangiyil:[[0.9,0.15,0.2],[0.98,0.85,0.2],[0.2,0.6,0.95],[0.2,0.8,0.4]],ramazon:[[0.95,0.8,0.35],[0.1,0.45,0.55]]}[EV.id];
    const fg=flagG(cols);for(let i=0;i<10;i++){const b=new T.Mesh(fg,buntM);b.visible=false;b.userData.flag=1;sc.add(b);decor.push(b)}
    const stemM=ML({color:0x3f8f3a}),tulM=[ML({color:0xe0302a}),ML({color:0xf2c230}),ML({color:0xe85a9a})],potM=ML({color:0x3a2a20}),archaM=ML({color:0x2f7a3a}),lanM=ML({color:0xd9a93b,emissive:0x8a5a10});
    const mk=(i)=>{const g=new T.Group(),sg=i%2?1:-1;g.userData.sg=sg;
      if(EV.id==='navruz'){if(i%5===0){const p=new T.Mesh(sphG,potM);p.scale.set(0.8,0.6,0.8);p.rotation.x=Math.PI;p.position.y=0.6;g.add(p);const st=glowP(glowMat(0xffffff,0.35),1.4);st.position.y=1.6;g.add(st)}
        else for(let k=0;k<7;k++){const x=(Math.random()-0.5)*1.4,z=(Math.random()-0.5)*2.2,st=new T.Mesh(cylG,stemM);st.scale.set(0.03,0.5,0.03);st.position.set(x,0.25,z);g.add(st);const f=new T.Mesh(icoG,tulM[k%3]);f.scale.set(0.12,0.17,0.12);f.position.set(x,0.55,z);g.add(f)}}
      else if(EV.id==='yangiyil'){for(let k=0;k<3;k++){const c=new T.Mesh(new T.ConeGeometry(1.1-k*0.3,1.3,10),archaM);c.position.y=0.9+k*0.8;g.add(c)}const st=new T.Mesh(icoG,goldM);st.scale.setScalar(0.18);st.position.y=3.3;g.add(st);
        for(let k=0;k<6;k++){const l=glowP(glowMat([0xff4040,0xffd040,0x40a0ff][k%3],0.9),0.5);const a=k*1.1;l.position.set(Math.cos(a)*0.7,1.2+k*0.3,Math.sin(a)*0.7);g.add(l)}}
      else if(EV.id==='ramazon'){const pole=new T.Mesh(cylG,poleM);pole.scale.set(0.06,3.6,0.06);pole.position.y=1.8;g.add(pole);const lan=new T.Mesh(new T.CylinderGeometry(0.22,0.28,0.55,6),lanM);lan.position.set(-sg*0.5,3.2,0);g.add(lan);const gl=glowP(glowMat(0xffc860,0.9),1.8);gl.position.set(-sg*0.5,3.2,0);g.add(gl)}
      else{const pole=new T.Mesh(cylG,poleM);pole.scale.set(0.05,4,0.05);pole.position.y=2;g.add(pole);const fl=new T.Mesh(new T.PlaneGeometry(1.2,0.75),ML({map:cvT(96,60,(x,w,h)=>{x.fillStyle='#1b8fc9';x.fillRect(0,0,w,h/3);x.fillStyle='#fff';x.fillRect(0,h/3,w,h/3);x.fillStyle='#1ea050';x.fillRect(0,2*h/3,w,h/3);x.fillStyle='#d8322a';x.fillRect(0,h/3-2,w,3);x.fillRect(0,2*h/3-1,w,3);x.fillStyle='#fff';x.beginPath();x.arc(16,10,7,0,7);x.fill();x.fillStyle='#1b8fc9';x.beginPath();x.arc(19,10,6,0,7);x.fill()}),side:T.DoubleSide}));fl.position.set(-sg*0.6,3.6,0);fl.rotation.y=Math.PI/2;g.add(fl)}
      g.visible=false;sc.add(g);decor.push(g)};
    for(let i=0;i<22;i++)mk(i);
    if(EV.id==='yangiyil'){const n=900,a=new Float32Array(n*3);for(let i=0;i<n;i++){a[i*3]=(Math.random()-0.5)*40;a[i*3+1]=Math.random()*18;a[i*3+2]=Math.random()*60-10}const g=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(a,3));
      snow=new T.Points(g,new T.PointsMaterial({color:0xffffff,size:0.14,transparent:true,opacity:0.9,depthWrite:false}));sc.add(snow);walkM.color.setHex(0xf4f8ff)}
    if(EV.id==='ramazon'){moonS=new T.Sprite(new T.SpriteMaterial({map:cvT(128,128,(x)=>{x.fillStyle='#fff6d8';x.beginPath();x.arc(64,64,50,0,7);x.fill();x.globalCompositeOperation='destination-out';x.beginPath();x.arc(84,52,44,0,7);x.fill()}),fog:false,transparent:true}));moonS.scale.setScalar(40);moonS.position.set(90,150,300);sc.add(moonS)}
    if(EV.id==='mustaqillik'||EV.id==='yangiyil')for(let i=0;i<5;i++){const p=new T.Points(new T.BufferGeometry().setAttribute('position',new T.BufferAttribute(new Float32Array(60*3),3)),new T.PointsMaterial({size:1.6,sizeAttenuation:false,transparent:true,opacity:0,depthWrite:false,fog:false,vertexColors:false,color:[0xff5050,0xffd040,0x50c0ff,0x60ff90,0xffffff][i]}));p.userData={t:9+i*1.3,v:[]};sc.add(p);fw.push(p)}}
  function decorFrame(pz,dt,lp){if(!EV)return;
    let fi=0,di=0;for(const d of decor){if(d.userData.flag){const zs=Math.floor(pz/30)*30+(fi++)*30+15;d.visible=zoneAt(zs)!==1;d.position.z=zs-pz}
      else{const zs=Math.floor(pz/14)*14+di*7+5,sg=di%2?1:-1;di++;d.visible=zoneAt(zs)!==1&&zoneAt(zs)!==2;d.position.set(sg*6.1,0.45,zs-pz)}}
    if(snow){const a=snow.geometry.attributes.position.array;for(let i=0;i<a.length;i+=3){a[i+1]-=dt*2.2;a[i]+=Math.sin(a[i+1]*0.7+i)*dt*0.3;if(a[i+1]<0)a[i+1]+=18}snow.geometry.attributes.position.needsUpdate=true;snow.position.z=0}
    for(const p of fw){const u=p.userData;u.t-=dt;const a=p.geometry.attributes.position.array;
      if(u.t<=0){u.t=2.5+Math.random()*3;const cx=(Math.random()-0.5)*60,cy=40+Math.random()*30,cz=120+Math.random()*80;u.v=[];for(let i=0;i<60;i++){const th=Math.random()*6.28,ph=Math.acos(2*Math.random()-1),sp=14+Math.random()*6;u.v.push(Math.sin(ph)*Math.cos(th)*sp,Math.cos(ph)*sp,Math.sin(ph)*Math.sin(th)*sp);a[i*3]=cx;a[i*3+1]=cy;a[i*3+2]=cz}u.age=0}
      if(u.v.length){u.age+=dt;for(let i=0;i<60;i++){a[i*3]+=u.v[i*3]*dt;a[i*3+1]+=(u.v[i*3+1]-u.age*9)*dt;a[i*3+2]+=u.v[i*3+2]*dt}p.geometry.attributes.position.needsUpdate=true;p.material.opacity=Math.max(0,(1-u.age/1.6))*Math.max(0.25,lp)}}
  }
  const fogC=new T.Color(),TUNF=new T.Color(0x16120e),TUNH=new T.Color(0xffe2b8);
  function world(pz){
    for(let i=0;i<NSEG;i++){const g=segs[i],zs=Math.floor((pz-20)/SEG)*SEG+i*SEG,on=zoneAt(zs+SEG/2)===1;g.visible=on;if(on){g.position.z=zs-pz;g.userData.st.visible=Math.round(zs/SEG)%6===0}}
    const k=tunK(pz),a=tun0(k),b=tun1(k);portIn.visible=a-pz<300;portIn.position.z=a-pz;portOut.visible=b-pz<300&&b-pz>-30;portOut.position.z=b-pz;portOut.rotation.y=Math.PI;
    const gz=b+30;gate.visible=gz-pz<300&&gz-pz>-20;gate.position.z=gz-pz;{const gc=cityAt(gz);if(gc!==gateC){gateC=gc;gate.userData.s.material.map=gateTx[gc];gate.userData.s.material.needsUpdate=true}}
    for(let i=0;i<bunts.length;i++){const zs=Math.floor(pz/22)*22+i*22,on=zoneAt(zs)===2&&zs>b+50;bunts[i].visible=on;bunts[i].position.z=zs-pz}
    // tunnel ichida yorug'lik: quyosh so'nadi, chiroqlar, qorong'i tuman
    const d=Math.min(pz-a,b-pz),tf=Math.max(0,Math.min(1,(d+3)/14));
    if(tf>0){sun.intensity*=1-tf*0.92;hemi.intensity+=(0.62-hemi.intensity)*tf;hemi.color.lerp(TUNH,tf);sc.fog.color.lerp(TUNF,tf);starM.opacity*=1-tf;rd.toneMappingExposure+=(1.2-rd.toneMappingExposure)*tf;if(bloom)bloom.strength=Math.max(bloom.strength,0.75*tf)}
    sc.fog.near=70-45*tf;sc.fog.far=230-90*tf;return tf}
  // ---- poyezd, rampa, to'siqlar ----
  const trainCol=[[0x2f6fb5,0xf2f2f2],[0xc8382f,0xf3efe6],[0x2f9a6b,0xf2f2f2],[0xe0a21f,0x2d2d2d]];
  // vagon yon tomoni: derazalar, eshiklar, chiziq
  const sideTr=cvT(512,128,(x,w,h)=>{x.fillStyle='#000';x.fillRect(0,0,w,h);x.clearRect(0,0,w,h);
    for(let i=0;i<4;i++){const ox=i*128;x.fillStyle='rgba(20,32,44,.95)';x.fillRect(ox+14,26,46,42);x.fillRect(ox+70,26,46,42);x.fillStyle='rgba(255,255,255,.28)';x.fillRect(ox+18,30,12,34);x.fillRect(ox+74,30,12,34)}
    for(const dx of [0,256]){x.fillStyle='rgba(30,40,52,.9)';x.fillRect(dx+122,18,14,96);x.fillStyle='rgba(255,255,255,.35)';x.fillRect(dx+128,18,2,96)}});
  const faceT=cvT(256,256,(x,w,h)=>{x.clearRect(0,0,w,h);x.fillStyle='rgba(18,30,42,.96)';x.beginPath();x.moveTo(30,40);x.lineTo(226,40);x.lineTo(214,130);x.lineTo(42,130);x.closePath();x.fill();
    x.fillStyle='rgba(255,255,255,.32)';x.beginPath();x.moveTo(44,48);x.lineTo(90,48);x.lineTo(70,122);x.lineTo(50,122);x.closePath();x.fill();
    x.fillStyle='#222';x.fillRect(96,150,64,58);x.fillStyle='#ffde59';x.fillRect(104,158,48,12);});
  const blackM=ML({color:0x23262b}),steelM=MS({color:0xa9b1ba,metalness:0.6,roughness:0.4}),sideMat=ML({map:sideTr,transparent:true}),faceM=ML({map:faceT,transparent:true}),glow=bend(new T.MeshBasicMaterial({color:0xfff6c0})),redL=bend(new T.MeshBasicMaterial({color:0xff4a3a}));
  const wheelG=new T.CylinderGeometry(0.36,0.36,0.18,16);wheelG.rotateZ(Math.PI/2);
  function trainK(o){const g=new T.Group(),L=o.z1-o.z0,seg=2.6,sy=RN.trainH/1.5712,sx=1.95/1.1,n=Math.max(2,Math.round(L/(seg*sy))),sz=L/(n*seg);
    const set=o.id%2?['train-electric-subway-a','train-electric-subway-b','train-electric-subway-c']:['train-electric-city-a','train-electric-city-b','train-electric-city-c'];
    for(let i=0;i<n;i++){const k=i===0?set[0]:i===n-1?set[2]:set[1];const m=new T.Mesh(RNA.t.G[k],KT_);m.scale.set(sx,sy,sz);m.position.z=(i+0.5)*seg*sz;if(i===0)m.rotation.y=RN_FROT;if(i===n-1&&n>1)m.rotation.y=RN_FROT+Math.PI;g.add(m)}
    if(o.type==='mtrain')for(const sg of [-1,1]){const l=new T.Mesh(new T.CircleGeometry(0.16,14),glow);l.position.set(sg*0.6,1.0,-0.05);l.rotation.y=Math.PI;g.add(l)}
    return shadowy(g)}
  function trainM(o){const g=new T.Group(),L=o.z1-o.z0,n=Math.max(1,Math.round(L/10.5)),cl=L/n;
    for(let i=0;i<n;i++){const end=i===0||i===n-1,m=mm(end?'cab':'car',1.98,RN.trainH,cl-0.3);m.position.z=i*cl+cl/2;if(i===n-1&&n>1)m.rotation.y=Math.PI;g.add(m)}
    if(o.type==='mtrain')for(const sg of [-1,1]){const l=new T.Mesh(new T.CircleGeometry(0.17,14),glow);l.position.set(sg*0.62,1.0,-0.08);l.rotation.y=Math.PI;g.add(l)}
    shadowy(g);for(const sg of [-1,1]){const h=glowP(headGM,o.type==='mtrain'?2.2:1.4);h.position.set(sg*0.55,1.05,-0.2);g.add(h)}
    return g}
  function trainMesh(o){if(RM.cab&&RM.car)return trainM(o);if(RNA&&RNA.t.G['train-electric-city-a'])return trainK(o);const g=new T.Group(),[c1,c2]=trainCol[o.id%trainCol.length],L=o.z1-o.z0,cars=Math.max(1,Math.round(L/RN.car)),cl=L/cars;
    const bodyM=MS({color:c1,roughness:0.45,metalness:0.15}),strM=MS({color:c2,roughness:0.5});
    for(let i=0;i<cars;i++){const cz=i*cl+cl/2,len=cl-0.45;
      const b=new T.Mesh(rbx(1.94,2.9,len,0.32),bodyM);b.position.set(0,2.05,cz);g.add(b);
      const st=new T.Mesh(rbx(1.97,0.62,len-0.3,0.12),strM);st.position.set(0,1.25,cz);g.add(st);
      const rf=new T.Mesh(rbx(1.6,0.25,len-0.8,0.1),MS({color:0xc9cfd6,roughness:0.5}));rf.position.set(0,RN.trainH-0.12,cz);g.add(rf);
      const ac=new T.Mesh(rbx(1.0,0.28,2.2,0.1),steelM);ac.position.set(0,RN.trainH,cz+len*0.25);g.add(ac);
      for(const sg of [-1,1]){const w=new T.Mesh(new T.PlaneGeometry(len-0.8,1.5),sideMat);sideTr.repeat.set(1,1);w.position.set(sg*0.985,2.35,cz);w.rotation.y=sg*Math.PI/2;g.add(w)}
      for(const bz of [-len*0.32,len*0.32]){const bg=new T.Mesh(rbx(1.5,0.5,2.4,0.1),blackM);bg.position.set(0,0.42,cz+bz);g.add(bg);
        for(const wz of [-0.7,0.7])for(const sg of [-1,1]){const wh=new T.Mesh(wheelG,steelM);wh.position.set(sg*0.78,0.36,cz+bz+wz);g.add(wh)}}
      if(i<cars-1){const cn=new T.Mesh(rbx(1.3,2.2,0.7,0.1),blackM);cn.position.set(0,1.9,cz+cl/2);g.add(cn)}}
    // old tomon (o'yinchiga qaragan): oyna, faralar
    const nose=new T.Mesh(rbx(1.94,2.9,0.6,0.3),bodyM);nose.position.set(0,2.05,0.25);g.add(nose);
    const f=new T.Mesh(new T.PlaneGeometry(1.8,1.8),faceM);f.position.set(0,2.35,-0.06);f.rotation.y=Math.PI;g.add(f);
    for(const sg of [-1,1]){const l=new T.Mesh(new T.CircleGeometry(0.13,14),o.type==='mtrain'?glow:redL);l.position.set(sg*0.62,1.15,-0.07);l.rotation.y=Math.PI;g.add(l)}
    return shadowy(g)}
  const rampT=cvT(64,256,(x,w,h)=>{x.fillStyle='#d9a21a';x.fillRect(0,0,w,h);x.fillStyle='#2b2b2b';for(let y=0;y<h;y+=32)x.fillRect(0,y,w,12)});
  function rampMesh(o){const L=o.z1-o.z0,a=Math.atan2(RN.trainH,L),g=new T.Group();
    if(RM.ramp){const m=mm('ramp',1.95,RN.trainH,L);m.position.z=L/2;g.add(m);return shadowy(g)}
    const m=new T.Mesh(boxG,ML({map:rampT}));m.scale.set(1.9,0.2,Math.hypot(L,RN.trainH));m.rotation.x=-a;m.position.set(0,RN.trainH/2,L/2);g.add(m);
    const s=new T.Mesh(new T.BufferGeometry(),ML({color:0x7a6a4a}));const sh=new T.Shape();sh.moveTo(0,0);sh.lineTo(L,0);sh.lineTo(L,RN.trainH);sh.closePath();
    const eg=new T.ExtrudeGeometry(sh,{depth:1.7,bevelEnabled:false});eg.rotateY(-Math.PI/2);eg.translate(0.85,0,0);s.geometry=eg;g.add(s);return shadowy(g)}
  const stripeT=cvT(128,32,(x,w,h)=>{for(let i=0;i<8;i++){x.fillStyle=i%2?'#ffffff':'#e03a2f';x.beginPath();x.moveTo(i*16,0);x.lineTo(i*16+16,0);x.lineTo(i*16,h);x.lineTo(i*16-16,h);x.fill()}x.fillStyle='#e03a2f';x.fillRect(0,0,6,h)});
  const stripeM=ML({map:stripeT}),postM=ML({color:0xdedede});
  function barMesh(o){const g=new T.Group();
    if(o.type==='low'&&RM.low){g.add(mm('low',1.98,1.05,0.6));return shadowy(g)}
    if(o.type==='high'&&RM.high){g.add(mm('high',2.08,2.45,0.35));return shadowy(g)}
    if(o.type==='block'&&RM.block){g.add(mm('block',1.98,RN.blockH,0.95));return shadowy(g)}
    if(o.type==='low'){const b=new T.Mesh(boxG,stripeM);b.scale.set(1.9,0.45,0.18);b.position.y=RN.low-0.25;g.add(b);
      for(const sg of [-1,1]){const p=new T.Mesh(boxG,postM);p.scale.set(0.12,RN.low,0.12);p.position.set(sg*0.85,RN.low/2,0);g.add(p);const ft=new T.Mesh(boxG,postM);ft.scale.set(0.15,0.08,0.7);ft.position.set(sg*0.85,0.04,0);g.add(ft)}}
    else if(o.type==='high'){const b=new T.Mesh(boxG,stripeM);b.scale.set(1.95,0.55,0.2);b.position.y=RN.highY+0.32;g.add(b);
      const sgn=new T.Mesh(boxG,ML({color:0xf2c230}));sgn.scale.set(0.9,0.6,0.08);sgn.position.y=RN.highY+1.0;g.add(sgn);
      for(const sg of [-1,1]){const p=new T.Mesh(boxG,postM);p.scale.set(0.14,RN.highTop,0.14);p.position.set(sg*0.92,RN.highTop/2,0);g.add(p)}}
    else{const b=new T.Mesh(boxG,ML({color:0x9aa1a8}));b.scale.set(1.95,RN.blockH-0.4,0.9);b.position.y=(RN.blockH-0.4)/2;g.add(b);
      const t=new T.Mesh(boxG,stripeM);t.scale.set(1.97,0.4,0.95);t.position.y=RN.blockH-0.2;g.add(t);
      const sg=new T.Mesh(new T.CircleGeometry(0.45,20),ML({color:0xd8322a}));sg.position.set(0,1.5,-0.46);sg.rotation.y=Math.PI;g.add(sg);
      const wb=new T.Mesh(boxG,ML({color:0xffffff}));wb.scale.set(0.6,0.14,0.02);wb.position.set(0,1.5,-0.48);g.add(wb)}
    return shadowy(g)}
  const OM=new Map();
  function objMesh(o){let m=OM.get(o.id);if(m)return m;m=o.type==='train'||o.type==='mtrain'?trainMesh(o):o.type==='ramp'?rampMesh(o):barMesh(o);m.position.x=RN.lanes[o.lane];sc.add(m);OM.set(o.id,m);return m}
  // tangalar (hovuz)
  const coinG=new T.CylinderGeometry(0.42,0.42,0.09,22);coinG.rotateZ(Math.PI/2);
  const coinM=MS({color:0xffcf2e,metalness:0.3,roughness:0.35,emissive:0xb07a00,emissiveIntensity:0.55});const coinRim=ML({color:0xffe680,emissive:0x8a5a00});
  const coinPool=[];let coinIM=null,coinLo=null;const cO=new T.Object3D();
  if(RM.coin){coinIM=new T.InstancedMesh(RM.coin.geo,mMat('coin',{emissive:0x8a6c00}),180);coinIM.count=0;coinIM.frustumCulled=false;sc.add(coinIM);
    if(RM.coin_lo){coinLo=new T.InstancedMesh(RM.coin_lo.geo,ML({vertexColors:true,emissive:0x8a6c00}),180);coinLo.count=0;coinLo.frustumCulled=false;sc.add(coinLo)}}
  else for(let i=0;i<180;i++){const m=new T.Mesh(coinG,coinM);m.visible=false;sc.add(m);coinPool.push(m)}
  const coinSc=RM.coin?0.9/RM.coin.s.x:1;
  // bonuslar: 3D model + porlash
  const itemGM=glowMat(0xffc860,0.85);
  const glowT=cvT(128,128,(x)=>{const g=x.createRadialGradient(64,64,6,64,64,62);g.addColorStop(0,'rgba(255,246,200,.95)');g.addColorStop(0.55,'rgba(255,190,60,.55)');g.addColorStop(1,'rgba(255,140,0,0)');x.fillStyle=g;x.fillRect(0,0,128,128)});
  const itemMesh=k=>{const key={magnet:'magnet',jet:'jet',shoe:'shoe',shield:'shield'}[k];if(!key||!RM[key])return null;const g=new T.Group(),a=RM[key],m=new T.Mesh(a.geo,mMat(key,{emissive:0x222222}));
    m.scale.setScalar(1.15/Math.max(a.s.x,a.s.y,a.s.z));if(key==='magnet')m.rotation.x=Math.PI/2;g.add(m);
    const gl=glowP(itemGM,2.1);gl.position.z=0.35;g.add(gl);return g};
  // bonus belgilari
  const itemT={};for(const k of Object.keys(RN_PW))itemT[k]=cvT(128,128,(x,w,h)=>{const g=x.createRadialGradient(64,64,10,64,64,62);g.addColorStop(0,'#fff6c8');g.addColorStop(0.7,'#ffb52e');g.addColorStop(1,'rgba(255,140,0,0)');x.fillStyle=g;x.beginPath();x.arc(64,64,62,0,7);x.fill();
    x.font='bold 64px system-ui,Apple Color Emoji,Segoe UI Emoji';x.textAlign='center';x.textBaseline='middle';x.fillStyle='#3b2400';x.fillText(RN_PW[k][0],64,68)});
  const IM=new Map();
  // ---- qahramon ----
  const hero=new T.Group(),body=new T.Group();hero.add(body);sc.add(hero);
  const skin=ML({color:0xe2a87a}),hood=ML({color:0x17a8a0}),pants=ML({color:0x2d3a5a}),shoe=ML({color:0xffffff}),sole=ML({color:0xf26a1b}),capM=ML({map:cvT(256,64,(x,w,h)=>{x.fillStyle='#111';x.fillRect(0,0,w,h);x.fillStyle='#f4f1ea';for(let i=0;i<4;i++){const cx=i*64+32;x.beginPath();x.moveTo(cx-18,h*0.7);x.quadraticCurveTo(cx-14,h*0.1,cx+4,h*0.2);x.quadraticCurveTo(cx+18,h*0.45,cx-18,h*0.7);x.fill()}x.fillStyle='#f4f1ea';x.fillRect(0,h-6,w,3)})}),bagM=ML({color:0xf2a23a}),hairM=ML({color:0x1c120c});
  const part=(geo,m,sx,sy,sz,x,y,z,par=body)=>{const o=new T.Mesh(geo,m);o.scale.set(sx,sy,sz);o.position.set(x,y,z);par.add(o);return o};
  const sph=new T.SphereGeometry(1,14,10),rbox=new T.BoxGeometry(1,1,1,1,1,1);
  const cap=(r,l)=>new T.CapsuleGeometry(r,l,4,10);
  // tana: kapyushonli kofta, yumaloq shakllar
  part(rbx(0.58,0.64,0.36,0.14),hood,1,1,1,0,1.17,0);
  part(rbx(0.5,0.12,0.32,0.05),ML({color:0x0f7f79}),1,1,1,0,0.86,0);
  part(new T.TorusGeometry(0.17,0.07,8,16),ML({color:0x0f8f88}),1,1,1,0,1.5,-0.1).rotation.x=1.2;
  part(rbx(0.34,0.3,0.06,0.03),ML({color:0x0f8f88}),1,1,1,0,1.05,0.18);
  part(rbx(0.46,0.54,0.24,0.1),bagM,1,1,1,0,1.2,-0.29);part(rbx(0.34,0.2,0.1,0.05),ML({color:0xd9861f}),1,1,1,0,1.06,-0.42);
  for(const sg of [-1,1])part(rbx(0.05,0.55,0.05,0.02),ML({color:0x7a4a12}),1,1,1,sg*0.17,1.22,-0.16);
  const head=new T.Group();head.position.set(0,1.68,0.02);body.add(head);
  part(sph,skin,0.235,0.255,0.235,0,0,0,head);part(sph,hairM,0.245,0.19,0.245,0,0.07,-0.03,head);
  {const cg=new T.CylinderGeometry(0.9,1,1,4);cg.rotateY(Math.PI/4);part(cg,capM,0.27,0.15,0.27,0,0.2,0,head)}
  part(sph,skin,0.05,0.065,0.04,0.225,0,0,head);part(sph,skin,0.05,0.065,0.04,-0.225,0,0,head);
  part(sph,ML({color:0x1a1a1a}),0.03,0.04,0.02,0.08,0.03,0.22,head);part(sph,ML({color:0x1a1a1a}),0.03,0.04,0.02,-0.08,0.03,0.22,head);
  const limb=(x,y,len,m,w,isLeg)=>{const p=new T.Group();p.position.set(x,y,0);body.add(p);part(cap(w*0.5,len*0.75),m,1,1,1,0,-len/2,0,p);
    const k=new T.Group();k.position.y=-len;p.add(k);part(cap(w*0.45,len*0.75),isLeg?pants:hood,1,1,1,0,-len/2,0,k);
    if(isLeg){part(rbx(w*1.15,0.16,w*2.0,0.06),shoe,1,1,1,0,-len-0.04,0.07,k);part(rbx(w*1.2,0.06,w*2.05,0.03),sole,1,1,1,0,-len-0.12,0.07,k)}
    else part(sph,skin,w*0.55,w*0.6,w*0.55,0,-len-0.06,0,k);
    return {p,k}};
  const legL=limb(-0.15,0.86,0.42,pants,0.2,true),legR=limb(0.15,0.86,0.42,pants,0.2,true),armL=limb(-0.37,1.44,0.3,hood,0.16,false),armR=limb(0.37,1.44,0.3,hood,0.16,false);
  shadowy(hero,false);
  const jet=new T.Group();jet.position.set(0,1.15,-0.38);body.add(jet);part(new T.CylinderGeometry(1,1,1,10),ML({color:0x9aa3ad}),0.11,0.5,0.11,-0.13,0,0,jet);part(new T.CylinderGeometry(1,1,1,10),ML({color:0x9aa3ad}),0.11,0.5,0.11,0.13,0,0,jet);
  const flameM=bend(new T.MeshBasicMaterial({color:0xffa22e,transparent:true,opacity:0.9}));const flames=[-0.13,0.13].map(x=>{const f=new T.Mesh(new T.ConeGeometry(0.1,0.5,8),flameM);f.rotation.x=Math.PI;f.position.set(x,-0.5,0);jet.add(f);return f});jet.visible=false;
  const magG=new T.Group();{const mr=ML({color:0xd8322a}),mt=ML({color:0xdfe4ea});const u=new T.Mesh(new T.TorusGeometry(0.16,0.065,8,18,Math.PI),mr);u.rotation.z=Math.PI;magG.add(u);
    for(const sg of [-1,1]){const t=new T.Mesh(rbox,mt);t.scale.set(0.13,0.12,0.13);t.position.set(sg*0.16,0.05,0);magG.add(t)}}
  magG.position.set(0,-0.42,0.12);magG.rotation.x=-1.2;armR.k.add(magG);magG.visible=false;
  const waveM=bend(new T.MeshBasicMaterial({color:0xff5a4a,transparent:true,opacity:0.5,depthWrite:false,side:T.DoubleSide}));
  const waves=[0,1,2].map(i=>{const w=new T.Mesh(new T.RingGeometry(0.9,1.0,32),waveM.clone());w.rotation.x=-Math.PI/2;w.position.y=0.15;hero.add(w);return w});
  const bubble=new T.Mesh(new T.SphereGeometry(1.15,20,14),bend(new T.MeshBasicMaterial({color:0x6fe0ff,transparent:true,opacity:0.18,depthWrite:false})));bubble.position.y=0.95;hero.add(bubble);
  let mixer=null,acts={},curA='',heroM=null,aT=0;const SK=window.THREE_SkeletonUtils;
  const KID=!!(RNA&&RNA.hero&&RNA.hero.kid);let SKR=null,skT=0,skOn=false;
  const AN=KID?{run:'RunFast',idle:'Running',jump:'Regular_Jump',roll:'slide_light',death:'Dead'}:{run:'Sprint_Loop',idle:'Idle_Loop',jump:'Jump_Start',jumpL:'Jump_Loop',land:'Jump_Land',roll:'Roll',death:'Death01',hit:'Hit_Chest'};
  if(RNA&&RNA.hero&&KID){
    // Meshy qahramoni: tayyor tekstura, doppi va ryukzak modelning o'zida
    heroM=SK?SK.clone(RNA.hero.scene):RNA.hero.scene;let skel=null;SKR=null;
    heroM.traverse(o=>{if(!o.isMesh)return;if(o.skeleton)skel=o.skeleton;o.frustumCulled=false;const mp=o.material.map;o.material=ML({map:mp||null,color:mp?0xffffff:0xcccccc});o.castShadow=true;o.customDepthMaterial=depthB});
    heroM.rotation.y=RN_HROT;body.children.forEach(c=>{if(c!==jet)c.visible=false});body.add(heroM);heroM.updateMatrixWorld(true);
    const hr=skel&&skel.bones.find(b=>/RightHand$/.test(b.name));if(hr)hr.attach(magG);
    if(skel){try{skel.pose();SKR=rnSkateRig(skel,T)}catch(e){SKR=null}heroM.userData.y0=heroM.position.y}
  }else if(RNA&&RNA.hero){
    heroM=SK?SK.clone(RNA.hero.scene):RNA.hero.scene;
    const boneCol=n=>/head|neck/.test(n)?0xe2a87a:/hand|f_|thumb/.test(n)?0xe2a87a:/spine|shoulder|upper_arm|forearm/.test(n)?0x17a8a0:/foot|toe/.test(n)?0xf4f4f4:0x2d3a5a;
    let skel=null;
    heroM.traverse(o=>{if(!o.isSkinnedMesh)return;skel=o.skeleton;o.frustumCulled=false;const g=o.geometry=o.geometry.clone(),si=g.attributes.skinIndex,sw=g.attributes.skinWeight,n=si.count,col=new Float32Array(n*3),c=new T.Color();
      const dark=/Joint/i.test(o.material.name);
      for(let i=0;i<n;i++){let bi=0,bw=-1;const gc=(at,i,k)=>k===0?at.getX(i):k===1?at.getY(i):k===2?at.getZ(i):at.getW(i);for(let k=0;k<4;k++){const w=gc(sw,i,k);if(w>bw){bw=w;bi=gc(si,i,k)}}c.setHex(boneCol(o.skeleton.bones[bi].name));if(dark)c.multiplyScalar(0.7);col[i*3]=c.r;col[i*3+1]=c.g;col[i*3+2]=c.b}
      g.setAttribute('color',new T.BufferAttribute(col,3));o.material=ML({vertexColors:true});o.castShadow=true;o.customDepthMaterial=depthB});
    heroM.updateMatrixWorld(true);
    const B=nm=>skel&&skel.bones.find(b=>b.name===nm||b.name===T.PropertyBinding.sanitizeNodeName(nm)),hb=B('DEF-head'),v3=new T.Vector3();
    const headY=hb?hb.getWorldPosition(v3).y:1.6;heroM.scale.setScalar(1.6/Math.max(0.3,headY));heroM.rotation.y=RN_HROT;
    body.children.forEach(c=>{if(c!==jet)c.visible=false});body.add(heroM);heroM.updateMatrixWorld(true);
    // doppi va ryukzak — suyaklarga biriktiriladi
    if(hb){const hp=hb.getWorldPosition(new T.Vector3());const cg=new T.CylinderGeometry(0.9,1,1,4);cg.rotateY(Math.PI/4);const dp=new T.Mesh(cg,capM);dp.scale.set(0.135,0.085,0.135);dp.position.set(hp.x,hp.y+0.25,hp.z-0.01);body.add(dp);hb.attach(dp);dp.castShadow=true;const hr0=new T.Mesh(sph,hairM);hr0.scale.set(0.125,0.1,0.13);hr0.position.set(hp.x,hp.y+0.19,hp.z-0.03);body.add(hr0);hb.attach(hr0)}
    const sp=B('DEF-spine.003');if(sp){const p=sp.getWorldPosition(new T.Vector3());const bp=new T.Mesh(rbx(0.42,0.5,0.22,0.09),bagM);bp.position.set(p.x,p.y-0.1,p.z-0.27*RN_HBACK);body.add(bp);sp.attach(bp);bp.castShadow=true;bp.customDepthMaterial=depthB}
    const hr=B('DEF-hand.R');if(hr){hr.attach(magG)}
  }
  if(heroM){mixer=new T.AnimationMixer(heroM);
    // joyida bajariladigan qilish: sirpanish/dumalashdagi oldinga siljishni (root motion) olib tashlash
    for(const c of RNA.hero.animations){if(KID&&/slide|Roll|Dive|Dead/.test(c.name))for(const t of c.tracks)if(/Hips\.position$/.test(t.name)){const v=t.values,x0=v[0],z0=v[2];for(let i=0;i<v.length;i+=3){v[i]=x0;v[i+2]=z0}}
      acts[c.name]=mixer.clipAction(c)}}
  const play=(n,fade=0.12,once=false)=>{if(!mixer||curA===n||!acts[n])return;const a=acts[n];a.reset();a.setLoop(once?T.LoopOnce:T.LoopRepeat);a.clampWhenFinished=once;a.enabled=true;
    if(curA&&acts[curA])a.crossFadeFrom(acts[curA],fade,false);a.play();curA=n;aT=0};
  // skeyt (oyoq ostida)
  const boardG=new T.Group();hero.add(boardG);boardG.visible=false;
  if(RM.board){const a=RM.board,long=a.s.x>a.s.z,m=new T.Mesh(a.geo,mMat('board',{emissive:0x111111}));m.scale.setScalar(1.25/Math.max(a.s.x,a.s.z));if(long)m.rotation.y=Math.PI/2;boardG.add(m);shadowy(boardG,false)}
  else{const d=new T.Mesh(rbx(0.5,0.08,1.25,0.04),ML({color:0x1fa7b8}));d.position.y=0.12;boardG.add(d);for(const z of [-0.4,0.4])for(const x of [-0.2,0.2]){const w=new T.Mesh(new T.CylinderGeometry(0.07,0.07,0.06,10),ML({color:0xf26a1b}));w.rotation.z=Math.PI/2;w.position.set(x,0.06,z);boardG.add(w)}}
  const blob=new T.Mesh(new T.CircleGeometry(0.5,20),bend(new T.MeshBasicMaterial({color:0x000000,transparent:true,opacity:0.3,depthWrite:false})));blob.rotation.x=-Math.PI/2;sc.add(blob);
  // qorovul
  const guard=new T.Group();sc.add(guard);{const uni=ML({color:0x2b4a7a}),cap=ML({color:0x1b2a44});
    const gp=(m,sx,sy,sz,x,y,z)=>{const o=new T.Mesh(rbox,m);o.scale.set(sx,sy,sz);o.position.set(x,y,z);guard.add(o);return o};
    gp(uni,0.64,0.7,0.4,0,1.2,0);gp(ML({color:0x23262b}),0.5,0.85,0.3,0,0.45,0);const hd=new T.Mesh(sph,skin);hd.scale.setScalar(0.25);hd.position.y=1.8;guard.add(hd);gp(cap,0.5,0.12,0.5,0,2.02,0.04);gp(ML({color:0xf2c230}),0.12,0.12,0.04,0.16,1.38,0.21);
    const dog=new T.Group();dog.position.set(0.9,0,0.4);guard.add(dog);const dm=ML({color:0x8a5a2b});const d1=new T.Mesh(sph,dm);d1.scale.set(0.2,0.2,0.4);d1.position.y=0.42;dog.add(d1);const d2=new T.Mesh(sph,dm);d2.scale.setScalar(0.16);d2.position.set(0,0.6,0.38);dog.add(d2)}
  shadowy(guard,false);
  let gZ=-14,gMix=null,dMix=null;
  const skinned=(src,s0)=>{const m=SK?SK.clone(src.scene):src.scene;m.traverse(o=>{if(!o.isMesh)return;o.frustumCulled=false;const mp=o.material.map;o.material=ML({map:mp||null,color:mp?0xffffff:0xbbbbbb});o.castShadow=true;o.customDepthMaterial=depthB});m.scale.setScalar(s0);return m};
  if(RNA&&RNA.guard){guard.children.forEach(c=>c.visible=false);const gm=skinned(RNA.guard,1.12);guard.add(gm);gMix=new T.AnimationMixer(gm);
    const cl=RNA.guard.animations.find(c=>c.name==='RunFast')||RNA.guard.animations[0];if(cl)gMix.clipAction(cl).play()}
  if(RNA&&RNA.dog){const dm=skinned(RNA.dog,1);const b=new T.Box3().setFromObject(dm),sz=b.getSize(new T.Vector3());dm.scale.setScalar(0.85/Math.max(0.01,sz.y));
    // it yon tomonga qarab yaratilgan: oldinga (+z) buriladi
    dm.rotation.y=sz.x>sz.z?Math.PI/2:0;const dg=new T.Group();dg.add(dm);dg.position.set(1.0,0,0.5);guard.add(dg);dMix=new T.AnimationMixer(dm);const cl=RNA.dog.animations[0];if(cl){const a=dMix.clipAction(cl);a.timeScale=2.2;a.play()}}
  // effektlar: tanga uchqunlari, chang
  const sparkT=cvT(64,64,(x)=>{const g=x.createRadialGradient(32,32,1,32,32,30);g.addColorStop(0,'rgba(255,250,200,1)');g.addColorStop(1,'rgba(255,200,40,0)');x.fillStyle=g;x.fillRect(0,0,64,64)});
  const fxL=[];
  const spark=(x,y,z,n=4,col=0xffe27a,sz=0.5)=>{for(let i=0;i<n;i++){const s=new T.Sprite(new T.SpriteMaterial({map:sparkT,color:col,transparent:true,depthWrite:false}));s.position.set(x,y,z);s.scale.setScalar(sz);s.userData={v:[(Math.random()-0.5)*3,1+Math.random()*2.5,(Math.random()-0.2)*3],t:0};sc.add(s);fxL.push(s)}};
  let squash=0,lean=0,phase=0;
  function fx(e){const s=RNS;
    if(e.k==='coin')spark(s.x,s.y+1.0,0.8,3);
    else if(e.k==='land'){squash=0.25;spark(s.x,s.y+0.1,0,5,0xcab89a,0.7)}
    else if(e.k==='jump')squash=-0.2;
    else if(e.k==='item')spark(s.x,s.y+1.2,0.5,10,0xffd060,0.8);
    else if(e.k==='boardBreak'){spark(s.x,s.y+0.4,0.4,16,0x6fe0ff,0.8);const m=OM.get(e.id);if(m)m.visible=false}
    else if(e.k==='board')spark(s.x,s.y+0.3,0.2,10,0x6fe0ff,0.6);
    else if(e.k==='shield'){spark(s.x,s.y+1,1.2,14,0x8fe8ff,0.9);const m=OM.get(e.id);if(m)m.visible=false}
    else if(e.k==='stumble')spark(s.x,s.y+1,0.3,6,0xffffff,0.6);
  }
  // ---- kun vaqti: tong → kunduz → oqshom → tun, yo'l davomida asta almashadi ----
  const TOD=[
    {top:0x6aa8e8,hor:0xffd9b0,fog:0xf0d4bf,hs:0xffe8d0,hg:0x6a5a4a,hi:0.9,sc:0xffd2a0,si:1.9,sp:[11,8,-3],ex:1.05,lamp:0.1,star:0,bl:0.3,sunc:0xfff0c0},
    {top:0x4f9be0,hor:0xbfdcf0,fog:0xbfdcf0,hs:0xd8ecff,hg:0x7a6a52,hi:0.95,sc:0xfff0d0,si:2.1,sp:[-9,18,-4],ex:1.1,lamp:0,star:0,bl:0.22,sunc:0xfff6dc},
    {top:0x2f4a8a,hor:0xffa165,fog:0xe5a07a,hs:0xffcfa0,hg:0x5a4038,hi:0.78,sc:0xff9a4a,si:2.4,sp:[-11,5,13],ex:1.05,lamp:0.65,star:0.1,bl:0.6,sunc:0xffb060},
    {top:0x081128,hor:0x26386a,fog:0x1c2850,hs:0x7088d0,hg:0x1c1c2c,hi:0.62,sc:0xaabcff,si:0.85,sp:[7,15,8],ex:1.0,lamp:1,star:1,bl:0.95,sunc:0xdfe8ff}];
  const hr=new Date().getHours(),tod0=window.RN_TOD!=null?window.RN_TOD:EV&&EV.id==='ramazon'?2:hr>=6&&hr<10?0:hr>=10&&hr<17?1:hr>=17&&hr<20?2:3;
  const cA=new T.Color(),cB=new T.Color(),v3a=new T.Vector3(),TODL=900,TODT=160;
  const mixC=(o,ka,kb,t)=>o.copy(cA.setHex(ka)).lerp(cB.setHex(kb),t);
  const QSET=store.get('rn_qset','auto');let bloom=null,comp=null,QL=QSET==='auto'?store.get('rn_q',2):+QSET,fpsN=0,fpsT=0;
  function tod(pz){const u=Math.max(0,pz)/TODL,k=Math.floor(u),f=u-k,a=TOD[(tod0+k)%4],b=TOD[(tod0+k+1)%4],e=(f-(1-TODT/TODL))/(TODT/TODL),t=e<=0?0:e*e*(3-2*e),L=(x,y)=>x+(y-x)*t;
    mixC(skyU.top.value,a.top,b.top,t);mixC(skyU.hor.value,a.hor,b.hor,t);mixC(sc.fog.color,a.fog,b.fog,t);mixC(skyU.sunC.value,a.sunc,b.sunc,t);
    mixC(hemi.color,a.hs,b.hs,t);mixC(hemi.groundColor,a.hg,b.hg,t);hemi.intensity=L(a.hi,b.hi);mixC(sun.color,a.sc,b.sc,t);sun.intensity=L(a.si,b.si);
    v3a.set(L(a.sp[0],b.sp[0]),L(a.sp[1],b.sp[1]),L(a.sp[2],b.sp[2]));sun.position.copy(sun.target.position).add(v3a);skyU.sunDir.value.copy(v3a).normalize();
    rd.toneMappingExposure=L(a.ex,b.ex);const lp=L(a.lamp,b.lamp);lampGM.opacity=lp*0.95;headGM.opacity=0.15+lp*0.85;starM.opacity=L(a.star,b.star)*0.9;
    if(bloom)bloom.strength=L(a.bl,b.bl)}
  // porlash (bloom): faqat kuchli qurilmalarda; FPS past bo'lsa o'zi o'chadi
  const mkBloom=()=>{const P=window.THREE_POST;if(!P||QL<2||comp)return;try{comp=new P.EffectComposer(rd);comp.addPass(new P.RenderPass(sc,cam));bloom=new P.UnrealBloomPass(new T.Vector2(W(),H()),0.3,0.45,0.82);comp.addPass(bloom);comp.addPass(new P.OutputPass());comp.setSize(W(),H())}catch(e){console.warn('bloom',e);comp=null;bloom=null}};
  mkBloom();
  if(QL<1){rd.shadowMap.enabled=false;sun.castShadow=false;rd.setPixelRatio(1)}else if(QL<2)rd.setPixelRatio(Math.min(1.5,devicePixelRatio||1));
  const quality=dt=>{if(fpsT>=0){fpsT+=dt;fpsN++;if(fpsT>5){const fps=fpsN/fpsT;fpsT=-1;
    // anonim statistika: qurilmalarda o'yin qanchalik silliq (kuniga bir marta)
    try{if(!rnPerfSent){rnPerfSent=1;statSec('p-rn'+(fps<20?'00':fps<30?'20':fps<40?'30':fps<50?'40':'50')+'q'+QL);if(rnLoadMs)statSec('p-ld'+Math.min(30,Math.round(rnLoadMs/1000)))}}catch(e){}
    if(QSET!=='auto')return;
    if(fps>56&&QL<2){store.set('rn_q',QL+1);return} // keyingi safar sifatni bir pog'ona oshiramiz
    if(fps<40&&QL>=2){QL=1;comp=null;bloom=null;rd.setPixelRatio(Math.min(1.5,devicePixelRatio||1));rd.setSize(W(),H())}if(fps<27&&QL>=1){QL=0;rd.shadowMap.enabled=false;sun.castShadow=false;rd.setPixelRatio(1);rd.setSize(W(),H())}store.set('rn_q',QL)}}};
  const camP=new T.Vector3(0,4.3,-7.2),look=new T.Vector3(0,1.5,12),lookT=new T.Vector3(0,1.5,12);
  let curCity=-1;
  function frame(dt,live,ex=0){if(RNS&&RNS.ceil!==rnCeil)RNS.ceil=rnCeil;
    // fizika 120 Hz; kadrlar orasini silliqlash uchun qolgan vaqtga oldinga suriladi
    const s=RNS,pz=s.z+s.v*ex,hx=s.x+(s.vx||0)*ex,hy=Math.max(rnSurf(s,s.x,s.z),s.y+s.vy*ex);U.uCZ.value=-7;
    // egilish: yo'l uzoqda yon tomonga ham sekin buriladi
    U.uBX.value=Math.sin(pz/260)*0.0012;tod(pz);if(live&&s.alive)quality(dt);
    trackT.offset.y=(pz/TL)%1;if(rails)rails.position.z=-(pz%TK);sideT.offset.y=(pz/6)%1;
    world(pz);decorFrame(pz,dt,lampGM.opacity);
    for(const g of pool){const u=g.userData;let z=u.z-pz;while(z<-30){u.z+=propSpan;z+=propSpan}g.position.z=z;const zn=zoneAt(u.z),k=tunK(u.z-20);
      g.visible=zn!==1&&!(u.z+u.w>tun0(k)-8&&u.z<tun1(k)+8);u.b.visible=zn===2;
      const ct=zn===0?cityAt(u.z):0;let cc=null;if(ct){u.c=u.c||{};cc=u.c[ct];if(!cc){cc=makeCity(ct,u.sg,u.w);if(cc){u.c[ct]=cc;g.add(cc)}}}
      if(u.c)for(const key in u.c)u.c[key].visible=u.c[key]===cc;u.a.visible=zn!==2&&!cc}
    {const cn=cityAt(pz+40);if(cn!==curCity){if(curCity>=0&&live&&s.alive){const C=RN_CITY[cn];rnToastG('🏙 '+KT(C.n+'ga xush kelibsiz!','Добро пожаловать в '+C.r+'!','Welcome to '+C.e+'!'))}curCity=cn}}
    // to'siqlar
    const alive=new Set();
    for(const o of s.obs){if(o.dead||o.z1-pz<-20||o.z0-pz>240)continue;alive.add(o.id);const m=objMesh(o);m.position.z=o.z0-pz}
    for(const [id,m] of OM)if(!alive.has(id)&&!(s.obs.find(o=>o.id===id&&!o.dead&&o.z0-pz>240))){sc.remove(m);OM.delete(id)}
    // tangalar
    let ci=0,cl=0;const spin=performance.now()/1000*3,cap=coinIM?180:coinPool.length;
    for(const c of s.coinsL){if(c.got||c.z-pz>150||c.z-pz<-5)continue;if(ci>=cap)break;const far=coinLo&&!c.fly&&c.z-pz>28;if(far&&cl>=180)continue;const m=coinIM?cO:coinPool[ci];if(!far)ci++;m.visible=true;
      if(c.fly){m.position.set(c.fx,c.y,c.z-pz);m.rotation.y=spin*4;m.scale.setScalar(0.85*coinSc);if(Math.random()<0.35)spark(c.fx,c.y,c.z-pz,1,0xffe27a,0.35)}else{m.position.set(RN.lanes[c.lane],c.y,c.z-pz);m.rotation.y=spin+c.z*0.3;m.scale.setScalar(coinSc)}
      if(coinIM){cO.updateMatrix();if(far)coinLo.setMatrixAt(cl++,cO.matrix);else coinIM.setMatrixAt(ci-1,cO.matrix)}}
    if(coinLo){coinLo.count=cl;coinLo.instanceMatrix.needsUpdate=true}
    if(coinIM){coinIM.count=ci;coinIM.instanceMatrix.needsUpdate=true}else for(;ci<coinPool.length;ci++)coinPool[ci].visible=false;
    // bonuslar
    const seen=new Set();
    for(const it of s.items){if(it.got)continue;seen.add(it.id);let m=IM.get(it.id);if(!m){m=itemMesh(it.kind)||new T.Sprite(new T.SpriteMaterial({map:itemT[it.kind],transparent:true}));if(m.isSprite)m.scale.setScalar(1.3);sc.add(m);IM.set(it.id,m)}
      m.position.set(RN.lanes[it.lane],1.1+Math.sin(spin*1.3)*0.15,it.z-pz);if(!m.isSprite){m.children[0].rotation.y=spin*0.9;m.children[1].scale.setScalar(2.1+Math.sin(spin*2)*0.2)}}
    for(const [id,m] of IM)if(!seen.has(id)){sc.remove(m);IM.delete(id)}
    // qahramon
    const air=s.y>rnSurf(s,s.x,s.z)+0.05||s.pw.jet>0;
    hero.position.set(hx,hy,0);hero.rotation.y+=((s.vx||0)*0.02-hero.rotation.y)*Math.min(1,dt*12);
    lean+=((RN.lanes[s.lane]-s.x)*0.16-lean)*Math.min(1,dt*14);body.rotation.z=lean;
    squash+=(0-squash)*Math.min(1,dt*9);body.scale.set(1+squash*0.4,1-squash,1+squash*0.4);
    if(heroM){body.rotation.x=0;body.position.y=0}
    else if(s.roll>0&&!s.pw.jet){body.rotation.x=(1-s.roll/RN.roll)*Math.PI*2;body.position.y=0.15;body.scale.multiplyScalar(0.72)}
    else{body.rotation.x=air?-0.12:0.12;body.position.y=0}
    if(live&&s.alive)phase+=dt*s.v*0.55;
    const a=air?0:Math.sin(phase),k=0.9;
    if(air&&!s.pw.jet){legL.p.rotation.x=-0.9;legL.k.rotation.x=1.4;legR.p.rotation.x=0.3;legR.k.rotation.x=0.9;armL.p.rotation.x=-2.4;armR.p.rotation.x=-2.2;armL.k.rotation.x=0;armR.k.rotation.x=0}
    else if(s.pw.jet>0){legL.p.rotation.x=0.2;legR.p.rotation.x=0.3;legL.k.rotation.x=0.5;legR.k.rotation.x=0.4;armL.p.rotation.x=-0.6;armR.p.rotation.x=-0.6}
    else{legL.p.rotation.x=-a*k;legR.p.rotation.x=a*k;legL.k.rotation.x=Math.max(0,a)*1.3+0.1;legR.k.rotation.x=Math.max(0,-a)*1.3+0.1;
      armL.p.rotation.x=a*0.9;armR.p.rotation.x=-a*0.9;armL.k.rotation.x=-0.9;armR.k.rotation.x=-0.9;body.position.y+=Math.abs(Math.cos(phase))*0.06}
    if(!s.alive&&s.crash!=='caught'&&!heroM){body.rotation.x=-1.2;body.position.y=0.3}
    if(heroM){ // skelet animatsiyasi: holatga qarab harakat tanlanadi
      aT+=dt;const A=acts,N=AN;
      if(!s.alive)play(N.death,0.1,true);
      else if(!live){play(N.idle,0.2);if(KID&&A[N.idle])A[N.idle].timeScale=0.15}
      else if(s.pw.jet>0){if(KID){if(curA!==N.jump){play(N.jump,0.2,true);A[N.jump].time=0.75}A[N.jump].timeScale=0}else play(N.jumpL,0.2)}
      else if(s.roll>0){play(N.roll,0.06,true);if(A[N.roll])A[N.roll].timeScale=A[N.roll].getClip().duration/(RN.roll+0.2)}
      else if(air){if(KID){if(curA!==N.jump){play(N.jump,0.06,true);A[N.jump].time=0.45;A[N.jump].timeScale=1.15}}
        else if(curA!==N.jump&&curA!==N.jumpL)play(N.jump,0.06,true);else if(curA===N.jump&&aT>A[N.jump].getClip().duration*0.75)play(N.jumpL,0.15)}
      else if(N.hit&&s.guard>7.4)play(N.hit,0.05,true);
      else{if(N.land&&(curA===N.jumpL||curA===N.jump))play(N.land,0.05,true);else if(curA!==N.land||aT>0.18)play(N.run,0.1)}
      if(A[N.run])A[N.run].timeScale=Math.min(1.35,Math.max(0.8,s.v/(KID?18:16)));
      mixer.update(live||!s.alive?dt:dt);
    }
    {const on=s.pw.board>0&&s.pw.jet<=0;boardG.visible=on&&(s.pw.board>3||Math.sin(spin*9)>-0.3);if(on){body.position.y+=0.3;boardG.rotation.z=-lean*0.6;boardG.rotation.x=s.vy>0.5?-0.25:air&&s.vy<-2?0.12:0}
      // skeytda haqiqiy skeytchidek turadi: yonlama, tizzalar bukilgan, vaqti-vaqti bilan oyoq bilan itaradi; sakrashda — ollie
      const ride=on&&SKR&&s.alive&&live;
      if(ride){skT+=dt;const sl=s.roll>0,ph=air||sl?0:rnSkatePush(skT);boardG.rotation.y=Math.sin(skT*1.6)*0.05;
        rnSkatePose(SKR,skT,ph,air?1:sl?0.8:0);heroM.rotation.set(0,RN_HROT-1.45+boardG.rotation.y,-lean*0.4);heroM.position.y=heroM.userData.y0;
        body.rotation.x=0;body.scale.setScalar(1);rnSkateGround(SKR,heroM,boardG.getWorldPosition(SKR.w).y+0.2,ph);skOn=true}
      else if(skOn){skOn=false;skT=0;heroM.rotation.set(0,RN_HROT,0);heroM.position.y=heroM.userData.y0;boardG.rotation.y=0}}
    jet.visible=s.pw.jet>0;const mgOn=s.pw.magnet>0;magG.visible=mgOn;if(mgOn){armR.p.rotation.x=-1.3;armR.k.rotation.x=-0.2}
    waves.forEach((w,i)=>{w.visible=mgOn;const k=((spin*0.45+i/3)%1);w.scale.setScalar(0.6+k*4.5);w.material.opacity=0.45*(1-k)*(s.pw.magnet<2?(Math.sin(spin*8)>0?1:0.2):1)});flames.forEach(f=>f.scale.set(1,0.8+Math.random()*0.6,1));
    bubble.visible=!!s.pw.shield||s.inv>0;bubble.material.opacity=s.inv>0?0.1+0.15*Math.abs(Math.sin(spin*6)):0.18;
    blob.position.set(hx,rnSurf(s,s.x,s.z)+0.02,0);blob.scale.setScalar(Math.max(0.3,1-(s.y-rnSurf(s,s.x,s.z))*0.12));
    // qorovul
    const gt=!s.alive&&s.crash==='caught'?-1.1:s.guard>0?-2.5-(8-s.guard)*0.3:-16;gZ+=(gt-gZ)*Math.min(1,dt*(s.guard>0?2.5:1));guard.position.set(s.x*0.9,rnSurf(s,s.x,s.z+gZ),gZ);guard.visible=gZ>-15;
    guard.children[1].rotation.x=Math.sin(phase*1.1)*0.3;if(guard.visible){if(gMix)gMix.update(dt*(s.alive?1.05:0.5));if(dMix)dMix.update(dt*(s.alive?1:0.5))}
    // kamera
    const top=Math.min(s.y,RN.trainH+0.5);
    camP.set(hx*0.7,4.3+top*0.85+(s.pw.jet>0?1.5:0),-7.2);lookT.set(hx*0.8,1.0+top*0.8,12);
    if(s.pw.jet>0){camP.y=s.y+3.6;camP.z=-8;lookT.y=s.y-3}look.x+=(lookT.x-look.x)*Math.min(1,dt*12);look.y+=(lookT.y-look.y)*Math.min(1,dt*6);look.z=lookT.z;
    cam.position.x+=(camP.x-cam.position.x)*Math.min(1,dt*11);cam.position.y+=(camP.y-cam.position.y)*Math.min(1,dt*6);cam.position.z+=(camP.z-cam.position.z)*Math.min(1,dt*6);
    const sh=rnTrauma*rnTrauma,tt=performance.now()/1000;cam.position.x+=sh*0.35*Math.sin(tt*37);cam.position.y+=sh*0.25*Math.sin(tt*29+1);
    cam.lookAt(look);cam.fov=62+Math.min(10,(s.v-11)*0.6);cam.aspect=W()/H();cam.updateProjectionMatrix();
    // effektlar
    for(let i=fxL.length-1;i>=0;i--){const p=fxL[i],u=p.userData;u.t+=dt;p.position.x+=u.v[0]*dt;p.position.y+=u.v[1]*dt;p.position.z+=u.v[2]*dt-s.v*dt*0.0;u.v[1]-=6*dt;p.material.opacity=Math.max(0,1-u.t/0.6);if(u.t>0.6){sc.remove(p);p.material.dispose();fxL.splice(i,1)}}
    if(comp)comp.render(dt);else rd.render(sc,cam);
  }
  const onR=()=>{rd.setSize(W(),H());if(comp)comp.setSize(W(),H())};addEventListener('resize',onR);
  return {frame,fx,get heroM(){return heroM},get guard(){return guard},get info(){return {calls:rd.info.render.calls,tris:rd.info.render.triangles,geos:rd.info.memory.geometries,tex:rd.info.memory.textures,q:QL,bloom:!!comp}},dispose(){removeEventListener('resize',onR);rd.dispose();try{rd.forceContextLoss()}catch(e){}rd.domElement.remove()}};
}
// ---------------- o'zbekcha fon musiqasi: doira usuli + dutor ohangi (WebAudio, fayl yuklanmaydi) ----------------
let rnMus=null;
function rnMusic(on,speed=0){
  if(!on){if(rnMus){clearInterval(rnMus.iv);try{rnMus.g.gain.setTargetAtTime(0,rnMus.a.currentTime,0.15)}catch(e){}const m=rnMus;setTimeout(()=>{try{m.g.disconnect()}catch(e){}},600);rnMus=null}return}
  if(rnMus){rnMus.spd=speed;return}
  if(!store.get('rn_mus',true))return;let a=null;try{rnAud=rnAud||new (window.AudioContext||window.webkitAudioContext)();if(rnAud.state==='suspended')rnAud.resume();a=rnAud}catch(e){}if(!a)return;
  const g=a.createGain();g.gain.value=0;g.gain.setTargetAtTime(0.22,a.currentTime,0.4);g.connect(a.destination);
  const rev=a.createDelay(0.5);rev.delayTime.value=0.19;const fb=a.createGain();fb.gain.value=0.22;const rlp=a.createBiquadFilter();rlp.frequency.value=2200;rev.connect(rlp);rlp.connect(fb);fb.connect(rev);rlp.connect(g);
  const noiseB=(()=>{const n=a.sampleRate*0.4,b=a.createBuffer(1,n,a.sampleRate),d=b.getChannelData(0);for(let i=0;i<n;i++)d[i]=Math.random()*2-1;return b})();
  const nz=(t,dur,type,f,q,gain)=>{const s=a.createBufferSource();s.buffer=noiseB;const fl=a.createBiquadFilter();fl.type=type;fl.frequency.value=f;fl.Q.value=q;const v=a.createGain();v.gain.setValueAtTime(gain,t);v.gain.exponentialRampToValueAtTime(0.001,t+dur);s.connect(fl);fl.connect(v);v.connect(g);s.start(t);s.stop(t+dur+0.02)};
  const bum=(t,k=1)=>{const o=a.createOscillator(),v=a.createGain();o.frequency.setValueAtTime(120,t);o.frequency.exponentialRampToValueAtTime(48,t+0.18);v.gain.setValueAtTime(0.9*k,t);v.gain.exponentialRampToValueAtTime(0.001,t+0.32);o.connect(v);v.connect(g);o.start(t);o.stop(t+0.35);nz(t,0.06,'lowpass',600,0.7,0.25*k)};
  const tak=(t,k=1)=>{nz(t,0.07,'bandpass',2600,1.2,0.55*k);nz(t,0.22,'highpass',7000,0.5,0.12*k)}; // doira halqalari jaranglashi
  const pluck=(t,f,dur,k=1)=>{for(const [m,det] of [[1,0],[2,4]]){const o=a.createOscillator(),fl=a.createBiquadFilter(),v=a.createGain();o.type='sawtooth';o.frequency.value=f*m;o.detune.value=det;
      fl.type='lowpass';fl.frequency.setValueAtTime(f*6,t);fl.frequency.exponentialRampToValueAtTime(f*1.2,t+dur);v.gain.setValueAtTime(0.0001,t);v.gain.exponentialRampToValueAtTime((m===1?0.16:0.05)*k,t+0.006);v.gain.exponentialRampToValueAtTime(0.0008,t+dur);
      o.connect(fl);fl.connect(v);v.connect(g);v.connect(rev);o.start(t);o.stop(t+dur+0.05)}};
  // lad: D Eb F# G A Bb C (hijoz uslubi) — dutor ohangiga yaqin
  const SC=[146.83,155.56,185,196,220,233.08,261.63,293.66,311.13,369.99,392];
  const MEL=[[0,2,3,4,3,2,1,0, 3,4,5,4,3,2,3,-1],[4,5,7,5,4,3,4,2, 3,2,1,0,1,2,0,-1],[7,8,9,8,7,5,4,5, 4,3,2,3,4,2,1,0],[0,0,2,3,4,4,5,4, 3,2,3,1,2,1,0,-1]];
  const USUL='B.t.tB.tB.t.t.tt'; // 16 qadam
  const DRONE=73.42;
  const m={a,g,iv:0,spd:speed,step:0,bar:0,next:a.currentTime+0.15};rnMus=m;
  const sched=()=>{if(rnMus!==m)return;const bpm=104+Math.min(26,m.spd*1.2),st=60/bpm/4;
    while(m.next<a.currentTime+0.12){const t=m.next,i=m.step%16,ch=USUL[i];
      if(ch==='B')bum(t,i===0?1:0.75);else if(ch==='t')tak(t,i%4===2?1:0.7);
      const ph=MEL[(m.bar>>1)%MEL.length];if(i%2===0){const d=ph[(i>>1)+((m.bar&1)?8:0)];if(d>=0)pluck(t,SC[d],st*3.2,1)}
      if(i===0&&m.bar%2===0){const o=a.createOscillator(),v=a.createGain();o.type='triangle';o.frequency.value=DRONE;v.gain.setValueAtTime(0.0001,t);v.gain.exponentialRampToValueAtTime(0.07,t+0.3);v.gain.exponentialRampToValueAtTime(0.0005,t+st*30);o.connect(v);v.connect(g);o.start(t);o.stop(t+st*31)}
      m.next+=st;m.step++;if(m.step%16===0)m.bar++}};
  m.iv=setInterval(sched,25);sched();
}
// qorovul hushtagi
function rnWhistle(){const a=rnCtx();if(!a)return;const t=a.currentTime;for(const [t0,d] of [[0,0.18],[0.24,0.42]]){const o=a.createOscillator(),l=a.createOscillator(),lg=a.createGain(),v=a.createGain();o.type='sine';o.frequency.value=2650;l.frequency.value=28;lg.gain.value=90;l.connect(lg);lg.connect(o.frequency);
  v.gain.setValueAtTime(0.0001,t+t0);v.gain.exponentialRampToValueAtTime(0.16,t+t0+0.02);v.gain.setValueAtTime(0.16,t+t0+d-0.04);v.gain.exponentialRampToValueAtTime(0.0001,t+t0+d);o.connect(v);v.connect(a.destination);o.start(t+t0);l.start(t+t0);o.stop(t+t0+d+0.02);l.stop(t+t0+d+0.02)}}
// ---------------- ovoz ----------------
function rnCtx(){if(!store.get('rn_snd',true))return null;try{rnAud=rnAud||new (window.AudioContext||window.webkitAudioContext)();if(rnAud.state==='suspended')rnAud.resume();return rnAud}catch(e){return null}}
function rnSnd(k,n=0){
  const a=rnCtx();if(!a)return;const t=a.currentTime;
  const tone=(t0,f0,f1,dur,g,type='sine')=>{const o=a.createOscillator(),gn=a.createGain();o.type=type;o.frequency.setValueAtTime(f0,t0);o.frequency.exponentialRampToValueAtTime(f1,t0+dur);gn.gain.setValueAtTime(g,t0);gn.gain.exponentialRampToValueAtTime(0.001,t0+dur);o.connect(gn);gn.connect(a.destination);o.start(t0);o.stop(t0+dur+0.02)};
  const noise=(t0,dur,f,g)=>{const n=Math.floor(a.sampleRate*dur),b=a.createBuffer(1,n,a.sampleRate),d=b.getChannelData(0);for(let i=0;i<n;i++)d[i]=Math.random()*2-1;const s=a.createBufferSource();s.buffer=b;const fl=a.createBiquadFilter();fl.type='lowpass';fl.frequency.value=f;const gn=a.createGain();gn.gain.setValueAtTime(g,t0);gn.gain.exponentialRampToValueAtTime(0.001,t0+dur);s.connect(fl);fl.connect(gn);gn.connect(a.destination);s.start(t0)};
  if(k==='coin'){const f=Math.pow(2,n/12);tone(t,1320*f,1320*f,0.06,0.1,'square');tone(t+0.05,1980*f,1980*f,0.1,0.08,'square')}
  else if(k==='jump')tone(t,320,760,0.18,0.18,'triangle');
  else if(k==='roll')noise(t,0.22,900,0.22);
  else if(k==='land')noise(t,0.08,400,0.25);
  else if(k==='item'){[660,880,1100,1320].forEach((f,i)=>tone(t+i*0.06,f,f,0.12,0.12,'square'))}
  else if(k==='stumble'){tone(t,220,110,0.25,0.25,'sawtooth');noise(t,0.2,700,0.3)}
  else if(k==='shield'){tone(t,900,300,0.3,0.2,'triangle');noise(t,0.3,2000,0.25)}
  else if(k==='crash'){noise(t,0.6,600,0.6);tone(t,120,40,0.5,0.5,'sawtooth')}
  else if(k==='go'){tone(t,523,523,0.1,0.15,'square');tone(t+0.1,784,784,0.16,0.15,'square')}
}
