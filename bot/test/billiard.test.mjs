// Onlayn bilyard: xona ochish, do'st qo'shilishi, navbat bilan zarba yuborish va kutish (polling).
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { makeD1, initData, post, world, resetWorld } from './helpers.mjs';

const HOST = { id: 101, first_name: 'Ali' }, FRIEND = { id: 202, first_name: 'Vali' }, OTHER = { id: 303, first_name: 'Sardor' };
const as = async (u, path, env, f = {}) => post(path, env, { initData: await initData(u), ...f });
// worker builds its schema once per isolate, so one database per file (rows cleared between tests)
const env = { DB: makeD1() }; beforeEach(() => { resetWorld(); try { env.DB.raw.exec('DELETE FROM blroom'); } catch (e) {} });
const open = async () => (await as(HOST, '/bl/new', env, { game: 'pyr', init: '{"balls":[1,2]}' })).body.room;

test('only a signed-in Telegram user can open a room', async () => {
  const r = await post('/bl/new', env, { initData: 'bad', game: 'pyr' });
  assert.equal(r.status, 403);
});

test('the host opens a room and is player 0; the friend joins as player 1 and sees the start position', async () => {
  const room = await open(); assert.match(room, /^[a-z0-9]{8}$/);
  const j = await as(FRIEND, '/bl/join', env, { room });
  assert.equal(j.body.ok, true); assert.equal(j.body.you, 1); assert.equal(j.body.game, 'pyr');
  assert.deepEqual(j.body.names, ['Ali', 'Vali']); assert.equal(j.body.init, '{"balls":[1,2]}');
  assert.ok(world.tg.some(c => c.method === 'sendMessage' && c.body.chat_id === HOST.id), 'host is told the friend joined');
});

test('a third person cannot take a full room, but the host can come back to it', async () => {
  const room = await open(); await as(FRIEND, '/bl/join', env, { room });
  assert.equal((await as(OTHER, '/bl/join', env, { room })).status, 409);
  const back = await as(HOST, '/bl/join', env, { room }); assert.equal(back.body.you, 0);
});

test('the host cannot join their own room as the opponent', async () => {
  const room = await open(); const r = await as(HOST, '/bl/join', env, { room });
  assert.equal(r.body.you, 0); assert.equal(r.body.names[1], null);
});

test('unknown room: 404', async () => {
  assert.equal((await as(FRIEND, '/bl/join', env, { room: 'zzzzzzzz' })).status, 404);
});

test('shots go out in order: a push must name the current sequence number, and the opponent picks it up by polling', async () => {
  const room = await open(); await as(FRIEND, '/bl/join', env, { room });
  const p1 = await as(HOST, '/bl/push', env, { room, seq: '0', data: '{"shot":1}' });
  assert.equal(p1.body.ok, true); assert.equal(p1.body.seq, 1);
  const stale = await as(HOST, '/bl/push', env, { room, seq: '0', data: '{"shot":"again"}' });
  assert.equal(stale.status, 409, 'an out-of-date push is refused');
  const got = await as(FRIEND, '/bl/poll', env, { room, since: '0' });
  assert.equal(got.body.seq, 1); assert.equal(got.body.data, '{"shot":1}');
  const none = await as(FRIEND, '/bl/poll', env, { room, since: '1' });
  assert.equal(none.body.seq, 1); assert.equal(none.body.data, undefined);
});

test('people outside the room can neither push nor poll', async () => {
  const room = await open(); await as(FRIEND, '/bl/join', env, { room });
  assert.equal((await as(OTHER, '/bl/push', env, { room, seq: '0', data: '{}' })).status, 403);
  assert.equal((await as(OTHER, '/bl/poll', env, { room, since: '0' })).status, 403);
});

test('a shot that is too big is refused', async () => {
  const room = await open(); await as(FRIEND, '/bl/join', env, { room });
  const r = await as(HOST, '/bl/push', env, { room, seq: '0', data: 'x'.repeat(130000) });
  assert.equal(r.status, 413);
});

test('the opponent gets a Telegram nudge only if they have not been watching for a while', async () => {
  const room = await open(); await as(FRIEND, '/bl/join', env, { room });
  await as(FRIEND, '/bl/poll', env, { room, since: '0' }); world.tg = [];
  await as(HOST, '/bl/push', env, { room, seq: '0', data: '{}' });
  assert.equal(world.tg.filter(c => c.body.chat_id === FRIEND.id).length, 0, 'friend is watching — no message');
  env.DB.raw.prepare('UPDATE blroom SET lp1=lp1-120000').run();
  await as(HOST, '/bl/push', env, { room, seq: '1', data: '{}' });
  assert.equal(world.tg.filter(c => c.method === 'sendMessage' && c.body.chat_id === FRIEND.id).length, 1);
});

test('the host is nudged too when the friend shoots while the host is away', async () => {
  const room = await open(); await as(FRIEND, '/bl/join', env, { room });
  await as(HOST, '/bl/push', env, { room, seq: '0', data: '{}' });
  env.DB.raw.prepare('UPDATE blroom SET lp0=lp0-120000').run(); world.tg = [];
  await as(FRIEND, '/bl/push', env, { room, seq: '1', data: '{}' });
  const m = world.tg.filter(c => c.method === 'sendMessage' && c.body.chat_id === HOST.id);
  assert.equal(m.length, 1); assert.match(m[0].body.text, /Vali/);
});

test('nobody to nudge before a friend has joined', async () => {
  const room = await open(); env.DB.raw.prepare('UPDATE blroom SET lp0=0').run(); world.tg = [];
  assert.equal((await as(HOST, '/bl/push', env, { room, seq: '0', data: '{}' })).body.ok, true);
  assert.equal(world.tg.length, 0);
});
