// Shaxmat/shashka onlayn xonasi (/bg/room): haqiqiy bot kodi (bot.txt), xotiradagi D1.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { makeD1, initData, TOKEN } from './helpers.mjs';

const tmp = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'hbot-')), 'bot.mjs');
fs.copyFileSync(new URL('../../bot.txt', import.meta.url), tmp);
const worker = (await import(tmp)).default;

const A = { id: 1, first_name: 'Ali' }, B = { id: 2, first_name: 'Bek' }, C = { id: 3, first_name: 'Vali' };
const DB = makeD1(); // bot sxemani jarayonda bir marta yaratadi, shuning uchun baza bitta
function world() {
  const call = async (user, fields) => {
    const fd = new FormData(); fd.append('initData', await initData(user));
    for (const k in fields) fd.append(k, String(fields[k]));
    const r = await worker.fetch(new Request('https://bot.test/bg/room', { method: 'POST', body: fd }), { BOT_TOKEN: TOKEN, DB });
    return r.json();
  };
  return { DB, call };
}
async function started(g = 'ch') {
  const w = world(), c = await w.call(A, { op: 'create', g, col: 'w' });
  await w.call(B, { op: 'join', room: c.room });
  return { ...w, room: c.room };
}

test('xona ochgan o\'yinchi tanlagan rangini oladi va raqibni kutadi', async () => {
  const { call } = world(), r = await call(A, { op: 'create', g: 'ch', col: 'b' });
  assert.equal(r.ok, true); assert.match(r.room, /^[A-Z2-9]{5}$/);
  assert.equal(r.side, 'b'); assert.equal(r.ready, false); assert.equal(r.g, 'ch');
});
test('noma\'lum o\'yin turi bilan xona ochilmaydi', async () => {
  const { call } = world(); assert.equal((await call(A, { op: 'create', g: 'xx', col: 'w' })).ok, false);
});
test('imzosiz so\'rov rad etiladi', async () => {
  const fd = new FormData(); fd.append('initData', 'user=%7B%22id%22%3A1%7D&hash=00'); fd.append('op', 'create'); fd.append('g', 'ch');
  const r = await worker.fetch(new Request('https://bot.test/bg/room', { method: 'POST', body: fd }), { BOT_TOKEN: TOKEN, DB });
  assert.equal(r.status, 403);
});
test('ikkinchi o\'yinchi qolgan rangni oladi, ikkalasi bir-birining ismini ko\'radi', async () => {
  const { call } = world(), c = await call(A, { op: 'create', g: 'dk', col: 'w' });
  const j = await call(B, { op: 'join', room: c.room.toLowerCase() });
  assert.equal(j.side, 'b'); assert.equal(j.ready, true); assert.equal(j.opp, 'Ali'); assert.equal(j.g, 'dk');
  const p = await call(A, { op: 'poll', room: c.room, n: 0 });
  assert.equal(p.ready, true); assert.equal(p.opp, 'Bek'); assert.equal(p.side, 'w');
});
test('uchinchi odam to\'la xonaga kira olmaydi, a\'zo esa qayta kirsa o\'z joyiga qaytadi', async () => {
  const { call, room } = await started();
  assert.deepEqual(await call(C, { op: 'join', room }), { ok: false, full: true });
  assert.equal((await call(B, { op: 'join', room })).side, 'b');
  assert.equal((await call(C, { op: 'poll', room, n: 0 })).ok, false);
});
test('yo\'q xona haqida "gone" qaytadi', async () => {
  const { call } = world(); assert.deepEqual(await call(A, { op: 'join', room: 'ZZZZZ' }), { ok: false, gone: true });
});
test('yurishlar navbat bilan qabul qilinadi va raqibga yetib boradi', async () => {
  const { call, room } = await started();
  assert.equal((await call(B, { op: 'move', room, n: 0, mv: 'e7e5' })).ok, false, 'qora birinchi yura olmaydi');
  assert.equal((await call(A, { op: 'move', room, n: 0, mv: 'e2e4' })).ok, true);
  assert.equal((await call(A, { op: 'move', room, n: 1, mv: 'd2d4' })).ok, false, 'oq ketma-ket ikki marta yura olmaydi');
  const p = await call(B, { op: 'poll', room, n: 0 });
  assert.deepEqual(p.moves, ['e2e4']); assert.equal(p.n, 1);
  assert.equal((await call(B, { op: 'move', room, n: 1, mv: 'e7e5' })).ok, true);
  assert.deepEqual((await call(A, { op: 'poll', room, n: 1 })).moves, ['e7e5']);
  assert.deepEqual((await call(A, { op: 'poll', room, n: 2 })).moves, []);
});
test('bir yurish qayta yuborilsa ikki marta yozilmaydi, eskirgan raqam esa rad etiladi', async () => {
  const { call, room } = await started();
  await call(A, { op: 'move', room, n: 0, mv: 'e2e4' });
  const again = await call(A, { op: 'move', room, n: 0, mv: 'e2e4' });
  assert.equal(again.ok, true); assert.equal(again.n, 1);
  assert.equal((await call(A, { op: 'move', room, n: 0, mv: 'd2d4' })).ok, false);
  assert.equal((await call(B, { op: 'move', room, n: 5, mv: 'e7e5' })).ok, false);
});
test('raqib kirmaguncha va noto\'g\'ri yozuv bilan yurib bo\'lmaydi', async () => {
  const { call } = world(), c = await call(A, { op: 'create', g: 'ch', col: 'w' });
  assert.equal((await call(A, { op: 'move', room: c.room, n: 0, mv: 'e2e4' })).ok, false);
  await call(B, { op: 'join', room: c.room });
  for (const mv of ['', 'e2 e4', 'x'.repeat(40), '<b>'])
    assert.equal((await call(A, { op: 'move', room: c.room, n: 0, mv })).ok, false, mv);
});
test('taslim bo\'lish raqibga g\'alaba beradi va o\'yinni yopadi', async () => {
  const { call, room } = await started();
  await call(A, { op: 'move', room, n: 0, mv: 'e2e4' });
  assert.equal((await call(B, { op: 'resign', room })).res, 'w resign');
  assert.equal((await call(A, { op: 'poll', room, n: 1 })).res, 'w resign');
  assert.equal((await call(A, { op: 'move', room, n: 1, mv: 'd2d4' })).ok, false);
  assert.equal((await call(A, { op: 'resign', room })).res, 'w resign', 'natija o\'zgarmaydi');
});
test('durang taklifi: qabul qilinsa durang, rad etilsa o\'yin davom etadi', async () => {
  const { call, room } = await started();
  assert.equal((await call(A, { op: 'draw', room, v: 'offer' })).dr, 'w');
  assert.equal((await call(A, { op: 'draw', room, v: 'yes' })).res, null, 'o\'z taklifini o\'zi qabul qila olmaydi');
  assert.equal((await call(B, { op: 'draw', room, v: 'no' })).dr, null);
  await call(B, { op: 'draw', room, v: 'offer' });
  const r = await call(A, { op: 'draw', room, v: 'yes' });
  assert.equal(r.res, 'd agree'); assert.equal(r.dr, null);
});
test('yurish qilinsa ochiq durang taklifi bekor bo\'ladi', async () => {
  const { call, room } = await started();
  await call(B, { op: 'draw', room, v: 'offer' });
  assert.equal((await call(A, { op: 'move', room, n: 0, mv: 'e2e4' })).dr, null);
});
test('ikkalasi ham "yana" desa yangi o\'yin boshlanadi va ranglar almashadi', async () => {
  const { call, room } = await started();
  await call(A, { op: 'move', room, n: 0, mv: 'e2e4' }); await call(B, { op: 'resign', room });
  const a = await call(A, { op: 'again', room });
  assert.equal(a.rm, 'w'); assert.equal(a.gn, 0);
  assert.equal((await call(A, { op: 'again', room })).gn, 0, 'bir kishining ikki so\'rovi yetarli emas');
  const b = await call(B, { op: 'again', room });
  assert.equal(b.gn, 1); assert.equal(b.side, 'w'); assert.equal(b.n, 0); assert.equal(b.res, null); assert.equal(b.rm, null);
  const p = await call(A, { op: 'poll', room, n: 0 });
  assert.equal(p.side, 'b'); assert.equal(p.gn, 1); assert.deepEqual(p.moves, []);
  assert.equal((await call(B, { op: 'move', room, n: 0, mv: 'd2d4' })).ok, true);
});
test('o\'yin tugamagan bo\'lsa "yana" so\'rovi qabul qilinmaydi', async () => {
  const { call, room } = await started();
  assert.equal((await call(A, { op: 'again', room })).rm, null);
  assert.equal((await call(A, { op: 'again', room, over: 1 })).rm, 'w', 'mat kabi mijoz aniqlagan yakun');
});
test('raqib yaqinda so\'rov yuborgan bo\'lsa onlayn, uzoq jim bo\'lsa oflayn ko\'rinadi', async () => {
  const { call, room, DB } = await started();
  await call(B, { op: 'poll', room, n: 0, hb: 1 });
  assert.equal((await call(A, { op: 'poll', room, n: 0 })).on, true);
  DB.raw.prepare('UPDATE bg_room SET bs=? WHERE room=?').run(Date.now() - 60000, room);
  assert.equal((await call(A, { op: 'poll', room, n: 0 })).on, false);
});
test('bir kunlik eski xona yo\'q hisoblanadi', async () => {
  const { call, room, DB } = await started();
  DB.raw.prepare('UPDATE bg_room SET t=? WHERE room=?').run(Date.now() - 25 * 3600e3, room);
  assert.deepEqual(await call(A, { op: 'poll', room, n: 0 }), { ok: false, gone: true });
});
