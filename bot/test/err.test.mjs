// O'yin xatolari: ilova xatoni /err ga yuboradi, bot uni saqlaydi, yangi xato haqida adminga xabar beradi, /xatolar ro'yxat ko'rsatadi.
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { makeD1, initData, post, webhook, world, resetWorld, makeAdmin } from './helpers.mjs';

const ADMIN = { id: 9, first_name: 'Javohir' }, P1 = { id: 101, first_name: 'Ali' }, P2 = { id: 202, first_name: 'Vali' };
const env = { DB: makeD1() };
beforeEach(() => { resetWorld(); for (const t of ['errs', 'erru', 'errday']) try { env.DB.raw.exec('DELETE FROM ' + t); } catch (e) {} makeAdmin(env.DB, ADMIN.id); env.DB.raw.exec("DELETE FROM meta WHERE k LIKE 'errnote:%'"); });
const report = async (u, f = {}) => post('/err', env, { initData: await initData(u), g: 'bilyard', k: 'err', m: 'TypeError: b is undefined', s: 'at sub (bilyard/index.html:1:2345)', v: '20261121c', pf: 'android', ...f });
const toAdmin = () => world.tg.filter(c => c.method === 'sendMessage' && c.body.chat_id === ADMIN.id);
const cmd = (text, from = ADMIN) => webhook({ message: { message_id: 5, chat: { id: from.id, type: 'private' }, from, text } }, env);

test('only a signed-in Telegram user can report an error', async () => {
  const r = await post('/err', env, { initData: 'bad', g: 'bilyard', m: 'x' });
  assert.equal(r.status, 403);
});

test('a new error is saved and the admin is told once, with the game and the message', async () => {
  const r = await report(P1);
  assert.equal(r.body.ok, true);
  const msgs = toAdmin(); assert.equal(msgs.length, 1);
  assert.match(msgs[0].body.text, /bilyard/); assert.match(msgs[0].body.text, /b is undefined/);
});

test('the same error again (even with other numbers in it) is counted, not sent to the admin again', async () => {
  await report(P1, { m: 'Error at ball 3' }); await report(P2, { m: 'Error at ball 7' }); await report(P1, { m: 'Error at ball 3' });
  assert.equal(toAdmin().length, 1);
  const row = env.DB.raw.prepare('SELECT n,users FROM errs').get();
  assert.equal(row.n, 3); assert.equal(row.users, 2);
});

test('the same message in a different game is a different error', async () => {
  await report(P1); await report(P1, { g: 'shaxmat' });
  assert.equal(toAdmin().length, 2);
});

test('one user cannot flood: after 30 reports a day the rest are dropped', async () => {
  for (let i = 0; i < 35; i++) await report(P1, { m: 'err ' + 'abcdefghijklmnopqrstuvwxyzABCDEFGHI'[i] });
  assert.equal(env.DB.raw.prepare('SELECT count(*) c FROM errs').get().c, 30);
});

test('the admin gets at most 10 new-error messages a day', async () => {
  for (let i = 0; i < 14; i++) await report(i % 2 ? P1 : P2, { m: 'boom ' + 'abcdefghijklmn'[i] });
  assert.equal(toAdmin().length, 10);
});

test('bad input is cleaned: unknown game name becomes "boshqa", long text is cut', async () => {
  await report(P1, { g: '<script>', m: 'x'.repeat(900), s: 'y'.repeat(5000) });
  const row = env.DB.raw.prepare('SELECT g,m,s FROM errs').get();
  assert.equal(row.g, 'boshqa'); assert.ok(row.m.length <= 300); assert.ok(row.s.length <= 1200);
});

test('/xatolar shows the admin the errors, most frequent first', async () => {
  await report(P1, { m: 'rare one' }); for (let i = 0; i < 3; i++) await report(P2, { m: 'common one' });
  world.tg = []; await cmd('/xatolar');
  const t = toAdmin().map(c => c.body.text).join('\n');
  assert.ok(t.indexOf('common one') >= 0 && t.indexOf('common one') < t.indexOf('rare one'));
  assert.match(t, /3/);
});

test('/xatolar is silent for someone who is not an admin', async () => {
  await report(P1); world.tg = [];
  await cmd('/xatolar', P2);
  assert.equal(world.tg.filter(c => c.method === 'sendMessage' && /b is undefined/.test(c.body.text || '')).length, 0);
});
