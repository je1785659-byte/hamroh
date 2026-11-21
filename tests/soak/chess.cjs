// Shaxmat: rasmiy perft sonlari bilan yurish qoidalarini solishtirish + minglab tasodifiy o'yin (xato, qaytarish, holat)
const fs=require('fs'),vm=require('vm'),path=require('path');const H=fs.readFileSync(path.join(__dirname,'../../chess/index.html'),'utf8');vm.runInThisContext(H.match(/<script id="eng">([\s\S]*?)<\/script>/)[1]);
const P=[['boshlang‘ich','rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',[20,400,8902,197281]],
 ['Kiwipete (rokirovka, o‘tib urish)','r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1',[48,2039,97862]],
 ['3-pozitsiya (shoh-chiziq)','8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8 w - - 0 1',[14,191,2812,43238]],
 ['4-pozitsiya (aylantirish)','r3k2r/Pppp1ppp/1b3nbN/nP6/BBP1P3/q4N2/Pp1P2PP/R2Q1RK1 w kq - 0 1',[6,264,9467]],
 ['5-pozitsiya','rnbq1k1r/pp1Pbppp/2p5/8/2B5/8/PPP1NnPP/RNBQK2R w KQ - 1 8',[44,1486,62379]],
 ['6-pozitsiya','r4rk1/1pp1qppp/p1np1n2/2b1p1B1/2B1P1b1/P1NP1N2/1PP1QPPP/R4RK1 w - - 0 10',[46,2079,89890]]];
let bad=0;for(const [n,f,want] of P){const got=want.map((_,d)=>chPerft(chFen(f),d+1));const ok=got.every((x,i)=>x===want[i]);if(!ok)bad++;console.log((ok?'✓':'✗'),n,got.join(','),ok?'':'(kerak: '+want.join(',')+')')}
let games=0,errs=[],plies=0,ends={};const R=()=>Math.random();
for(let k=0;k<(+process.argv[2]||1000);k++){const g=chNew?chNew():chFen(CH_START);try{for(let i=0;i<400;i++){const st=chStatus(g);if(st.r!=='play'){ends[st.r]=(ends[st.r]||0)+1;break}
  const L=chLegal(g,false);const fen=chToFen(g);const m=L[Math.floor(R()*L.length)];chSan(g,m);chMake(g,m);chUnmake(g);if(chToFen(g)!==fen)throw new Error('qaytarish holatni buzdi '+fen);
  if(k%20===0&&i%15===7){const b=chBest(g,{ms:60,depth:3});if(!b||!L.some(x=>x.f===b.f&&x.t===b.t))throw new Error('kompyuter noqonuniy yurish: '+fen)}
  chMove(g,m);plies++;if(chInCheck(g,g.turn==='w'?'b':'w'))throw new Error('yurgan tomon shohi zarbda qoldi '+chToFen(g))}}catch(e){errs.push(e.message)}games++}
console.log('tasodifiy o‘yinlar:',games,'yurishlar:',plies,'tugash turlari:',JSON.stringify(ends),'xatolar:',errs.length,errs.slice(0,3));process.exit(bad||errs.length?1:0)
