const fs=require('fs'),vm=require('vm'),path=require('path');const H=fs.readFileSync(path.join(__dirname,'../../shashka/index.html'),'utf8');vm.runInThisContext(H.match(/<script id="eng">([\s\S]*?)<\/script>/)[1]);
const names=g=>dkMoves(g).map(dkName).sort();let bad=0;
const T=(n,g,want,exact=true)=>{const got=names(g);const ok=exact?JSON.stringify(got)===JSON.stringify([...want].sort()):want.every(w=>got.includes(w));if(!ok)bad++;console.log(ok?'✓':'✗',n,ok?'':'bor: '+got.join(' ')+' | kerak: '+want.join(' '))};
T('urish majburiy',dkSet({w:['c3','g3'],b:['d4']}),['c3:e5']);
T('oddiy dona orqaga ham uradi',dkSet({w:['e5','a1'],b:['d4']}),['e5:c3']);
T('ketma-ket urish oxirigacha',dkSet({w:['c3'],b:['d4','f6']}),['c3:e5:g7']);
T('urish paytida damkaga chiqib, damka bo‘lib davom etadi',dkSet({w:['f6'],b:['e7','b6']}),['f6:d8:a5']);
{const g=dkSet({w:['f6'],b:['e7','b6']});const m=dkMoves(g)[0];dkMove(g,m);const ok=g.b[dkIx('a5')]==='W';if(!ok)bad++;console.log(ok?'✓':'✗','o‘sha dona damka bo‘lib qoladi')}
T('damka uzoqdan uradi, istalgan katakka tushadi',dkSet({W:['a1'],b:['d4']}),['a1:e5','a1:f6','a1:g7','a1:h8']);
T('damka davom etish mumkin bo‘lgan katakka tushishi shart',dkSet({W:['a1'],b:['c3','f4']}),['a1:e5:g3','a1:e5:h2']);
T('oddiy dona urishsiz orqaga yurmaydi',dkSet({w:['d4']}),['d4-c5','d4-e5']);
{const g=dkNew();const p=[1,2,3,4].map(d=>dkPerft(dkNew(),d));const ok=p.join()==='7,49,302,1469';if(!ok)bad++;console.log(ok?'✓':'✗','boshlang‘ich yurishlar soni (1–4 yurish):',p.join(','))}
let errs=[],plies=0,ends={};for(let k=0;k<(+process.argv[2]||1000);k++){const g=dkNew();try{for(let i=0;i<300;i++){const st=dkStatus(g);if(st.r!=='play'){ends[st.r]=(ends[st.r]||0)+1;break}
  const L=dkMoves(g),key=dkKey(g),m=L[Math.floor(Math.random()*L.length)];dkMake(g,m);dkUnmake(g);if(dkKey(g)!==key)throw new Error('qaytarish buzdi');
  if(L.some(x=>x.caps.length)&&!m.caps.length)throw new Error('urish bor ekan oddiy yurish berildi');
  if(k%20===0&&i%11===5){const b=dkBest(g,{ms:50,depth:4});if(!b||!L.some(x=>dkName(x)===dkName(b)))throw new Error('kompyuter noqonuniy yurish')}
  dkMove(g,m);plies++;const n=g.b.filter(Boolean).length;if(n>24)throw new Error('dona ko‘payib ketdi')}}catch(e){errs.push(e.message)}}
console.log('tasodifiy o‘yinlar:',(+process.argv[2]||1000),'yurishlar:',plies,'tugash:',JSON.stringify(ends),'xatolar:',errs.length,errs.slice(0,3));process.exit(bad||errs.length?1:0)
