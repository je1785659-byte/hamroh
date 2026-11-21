// Bilyard darslari: har dars uchun kompyuter namoyishni topa oladimi (tor/keng luza, ikkala tur) va
// o'yinchi namoyishni aynan takrorlasa — dars "bajarildi" deb hisoblaydimi (namoyish va baholash bir xil fizikada).
const { chromium } = require('playwright');
(async()=>{const br=await chromium.launch();const p=await (await br.newContext({viewport:{width:390,height:780}})).newPage();const errs=[];p.on('pageerror',x=>errs.push(x.message.slice(0,200)));
 await p.goto('http://127.0.0.1:8392/bilyard/index.html');await p.waitForFunction(()=>window.__bil&&__bil.LSN);let bad=0;
 for(const pk of [1,0])for(const v of ['am','ms']){const r=await p.evaluate(([pk,v])=>{const B=__bil;B.setPk(pk);B.setVar(v);const out=[];
   for(let i=0;i<B.LSN.length;i++){B.lsStart(i);let n=0;while(B.LS.ph==='calc'&&n++<500)B.tick(1/60);const L=B.LS,ok=L.ok.filter(Boolean).length;if(L.ph==='fail'){out.push({i:i+1,ok:0});continue}
     // o'yinchi namoyishni aynan takrorlaydi
     B.lsTry();B.set({ang:L.a,pow:B.LSN[i].pow,spin:B.LSN[i].spin.slice()});B.fire();n=0;while(B.s.sim&&n++<20000)B.tick(1/60);
     out.push({i:i+1,ok,res:B.LS.res,ph:B.LS.ph})}return out},[pk,v]);
  const line=r.map(x=>x.i+':'+(x.ok?(x.ok+(x.res===''?'✓':'✗'+x.res)):'TOPILMADI')).join('  ');console.log(pk?'tor ':'keng',v,line);
  bad+=r.filter(x=>!x.ok||x.res!=='').length}
 console.log('muammo:',bad,'| JS xatolari:',errs.length,errs.slice(0,3));await br.close();process.exit(bad||errs.length?1:0)})();
