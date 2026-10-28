// Behaviour of POST /food (photo → recognised foods), as the Mini App sees it.
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { makeD1, initData, post, IMG, aiReturning, claudeTool, world, resetWorld, makeAdmin } from './helpers.mjs';

const DB = makeD1();
const food = async (env, fields = {}) => post('/food', { DB, ...env }, { initData: await initData(), img: IMG, ...fields });
const used = () => (DB.raw.prepare("SELECT COALESCE(SUM(n),0) s FROM food").get() || { s: 0 }).s;
beforeEach(() => { resetWorld(); try { DB.raw.exec('DELETE FROM food; DELETE FROM meta;'); } catch (e) {} });

test('rejects a request without valid Telegram initData', async () => {
  const r = await post('/food', { DB, AI: aiReturning('{}') }, { initData: 'hash=bad', img: IMG });
  assert.equal(r.status, 403); assert.deepEqual(r.body, { ok: false, error: 'auth' });
});

test('says AI is not connected when there is neither a Workers AI binding nor a Claude key', async () => {
  const r = await food({});
  assert.deepEqual(r.body, { ok: false, error: 'noai' });
});

test('finds a Workers AI binding under any variable name', async () => {
  const r = await food({ AL: aiReturning('{"items":[{"id":"somsa","name":"samsa","n":2,"g":240,"kcal100":300,"conf":"high"}]}') });
  assert.equal(r.body.ok, true); assert.equal(r.body.items[0].id, 'somsa');
});

test('rejects something that is not a base64 image', async () => {
  const r = await food({ AI: aiReturning('{}') }, { img: 'data:text/html;base64,PGI+' });
  assert.equal(r.status, 400); assert.deepEqual(r.body, { ok: false, error: 'img' });
});

test('Workers AI: parses JSON wrapped in prose and code fences, keeps only catalog ids, clamps numbers', async () => {
  const text = 'Sure!\n```json\n{"seen":"plate of plov","shared":false,"items":[{"id":"osh","name":"plov","size":"medium","g":5000,"kcal100":2000,"conf":"high"},{"id":"made_up","name":"green tea","g":150,"kcal100":1,"conf":"maybe"}]}\n```';
  const r = await food({ AI: aiReturning(text) });
  assert.equal(r.body.ok, true);
  assert.deepEqual(r.body.items[0], { id: 'osh', name: 'plov', g: 3000, kcal100: 900, size: 'medium', conf: 'high' });
  assert.deepEqual(r.body.items[1], { id: null, name: 'green tea', g: 150, kcal100: 1 });
  assert.equal(r.body.shared, false);
  assert.equal('seen' in r.body, false, 'seen is only for admins');
});

test('Workers AI: accepts an object response and an OpenAI-style choices response', async () => {
  const a = await food({ AI: aiReturning({ items: [{ id: 'non', name: 'bread', n: 4, g: 300, kcal100: 265, conf: 'high' }] }) });
  assert.equal(a.body.items[0].n, 4);
  const b = await food({ AI: { async run() { return { choices: [{ message: { content: '{"items":[{"id":"choy","name":"tea","g":150,"kcal100":1}]}' } }] }; } } });
  assert.equal(b.body.items[0].id, 'choy');
});

test('reports no food as an empty list, and garbage as an AI error', async () => {
  assert.deepEqual((await food({ AI: aiReturning('{"items":[]}') })).body.items, []);
  const g = await food({ AI: aiReturning('I see a cat.') });
  assert.deepEqual(g.body, { ok: false, error: 'ai' });
});

test('Workers AI: accepts the Meta licence once, then retries', async () => {
  let n = 0; const seen = [];
  const AI = { async run(m, inp) { seen.push(inp.prompt || 'img'); if (inp.prompt === 'agree') return {}; if (n++ === 0) throw new Error('5016: Prior to using this model, you must submit the prompt agree'); return { response: '{"items":[]}' }; } };
  const r = await food({ AI });
  assert.equal(r.body.ok, true); assert.deepEqual(seen, ['img', 'agree', 'img']);
});

test('Workers AI: falls back to the next model when the first rejects the input', async () => {
  const models = [];
  const AI = { async run(m) { models.push(m); if (m.includes('llama-4')) throw new Error('invalid input: image'); return { response: '{"items":[{"id":"manti","name":"manti","n":5,"g":275,"kcal100":210}]}' }; } };
  const r = await food({ AI });
  assert.equal(r.body.items[0].id, 'manti');
  assert.ok(models[0].includes('llama-4') && models.at(-1).includes('llama-3.2'));
});

test('Workers AI daily quota is reported as busy', async () => {
  const AI = { async run() { throw new Error('4006: you have used up your daily free allocation of 10,000 neurons'); } };
  assert.deepEqual((await food({ AI })).body, { ok: false, error: 'busy' });
});

test('Claude is preferred when a key is set and is asked for a forced report_foods tool call', async () => {
  world.claude = claudeTool({ seen: '1 plate of plov, 2 quail eggs', shared: true, items: [{ id: 'osh', name: 'plov', size: 'large', g: 2400, kcal100: 240, conf: 'high' }, { id: 'bedana_tuxum', name: 'quail eggs', n: 2, g: 20, kcal100: 158, conf: 'high' }] });
  const AI = aiReturning('{"items":[]}');
  const r = await food({ ANTHROPIC_API_KEY: 'k', AI });
  assert.equal(r.body.ok, true); assert.equal(r.body.shared, true); assert.equal(r.body.items.length, 2);
  assert.equal(AI.calls, 0);
  const req = world.claudeBodies[0];
  assert.deepEqual(req.tool_choice, { type: 'tool', name: 'report_foods' });
  assert.equal(req.messages[0].content[0].source.data, 'QUJD');
});

test('falls back to Workers AI when Claude fails', async () => {
  world.claude = { status: 401, body: { error: { message: 'invalid x-api-key' } } };
  const r = await food({ ANTHROPIC_API_KEY: 'bad', AI: aiReturning('{"items":[{"id":"somsa","name":"samsa","g":120,"kcal100":300}]}') });
  assert.equal(r.body.items[0].id, 'somsa');
});

test('when Claude is the only option and fails, the error is ai (not busy)', async () => {
  world.claude = { status: 500, body: { error: { message: 'overloaded' } } };
  assert.deepEqual((await food({ ANTHROPIC_API_KEY: 'k' })).body, { ok: false, error: 'ai' });
});

test('counts successful photos and stops a user at the daily limit', async () => {
  const AI = aiReturning('{"items":[]}');
  const r1 = await food({ AI, FOOD_USER_DAY: '2' });
  assert.equal(r1.body.left, 1);
  const r2 = await food({ AI, FOOD_USER_DAY: '2' });
  assert.equal(r2.body.left, 0);
  assert.deepEqual((await food({ AI, FOOD_USER_DAY: '2' })).body, { ok: false, error: 'limit', left: 0 });
  assert.equal(used(), 2);
});

test('a failed analysis is not counted against the limit', async () => {
  await food({ AI: aiReturning('nonsense') });
  assert.equal(used(), 0);
});

test('stops everyone when the shared daily cap is reached', async () => {
  const AI = aiReturning('{"items":[]}');
  await food({ AI, FOOD_ALL_DAY: '1' });
  assert.deepEqual((await food({ AI, FOOD_ALL_DAY: '1' })).body, { ok: false, error: 'busy' });
});

test('admins bypass limits and also get model, seen and failure reasons', async () => {
  const AI = aiReturning('{"seen":"a bowl","items":[]}');
  await food({ AI });
  makeAdmin(DB, 42);
  const ok = await food({ AI, FOOD_USER_DAY: '1' });
  assert.equal(ok.body.ok, true); assert.ok(ok.body.model.includes('llama')); assert.equal(ok.body.seen, 'a bowl');
  const bad = await food({ AI: aiReturning('nonsense') });
  assert.match(bad.body.why, /^llama-4-scout[^|]*javob JSON emas/);
});

test('item fields: local names kept, out-of-range counts and unknown sizes dropped, empty items skipped', async () => {
  const r = await food({ AI: aiReturning({ seen: 'x'.repeat(300), shared: 'yes', items: [
    { id: null, name: 'pickled garlic', uz: 'Tuzlangan sarimsoq', ru: 'Маринованный чеснок', n: 3, size: 'huge', g: -5, kcal100: 'abc', conf: 'low' },
    { id: 'osh', name: '', n: 99 }, 'junk', null, { id: 'nope', name: '' }, { name: 'x'.repeat(60) } ] }) });
  assert.deepEqual(r.body.items, [
    { id: null, name: 'pickled garlic', g: 0, kcal100: 0, uz: 'Tuzlangan sarimsoq', ru: 'Маринованный чеснок', n: 3, conf: 'low' },
    { id: 'osh', name: '', g: 0, kcal100: 0 },
    { id: null, name: 'x'.repeat(40), g: 0, kcal100: 0 }]);
  assert.equal(r.body.shared, false, 'only literal true counts as shared');
});

test('a bare JSON array is accepted as the item list; at most 8 items', async () => {
  const many = Array.from({ length: 12 }, () => ({ id: 'olma', name: 'apple', n: 1, g: 180, kcal100: 52 }));
  const r = await food({ AI: aiReturning(many) });
  assert.equal(r.body.items.length, 8);
});

test('seen is trimmed to 240 characters for admins', async () => {
  try { DB.raw.exec('SELECT 1 FROM meta'); } catch (e) { await food({ AI: aiReturning('{"items":[]}') }); }
  makeAdmin(DB, 42);
  const r = await food({ AI: aiReturning({ seen: 's'.repeat(300), items: [] }) });
  assert.equal(r.body.seen.length, 240);
});

test('a body that is not a form, or an image over the size limit, is rejected as img', async () => {
  const { default: worker } = await import('../worker.js');
  const { TOKEN } = await import('./helpers.mjs');
  const r = await worker.fetch(new Request('https://bot.test/food', { method: 'POST', body: '{}', headers: { 'content-type': 'application/json' } }), { BOT_TOKEN: TOKEN, DB });
  assert.equal(r.status, 400); assert.deepEqual(await r.json(), { ok: false, error: 'img' });
  const big = await food({ AI: aiReturning('{}') }, { img: 'data:image/jpeg;base64,' + 'A'.repeat(1500001) });
  assert.equal(big.status, 400); assert.equal(big.body.error, 'img');
});

test('an image of exactly the maximum size is accepted', async () => {
  const p = 'data:image/jpeg;base64,';
  const r = await food({ AI: aiReturning('{"items":[]}') }, { img: p + 'A'.repeat(1500000 - p.length) });
  assert.equal(r.body.ok, true);
});

test('piece counts: 0 and over 50 are dropped, 1 and 50 are kept; empty local names are dropped', async () => {
  const r = await food({ AI: aiReturning({ items: [
    { id: 'olma', name: 'a', n: 0, uz: '' }, { id: 'olma', name: 'b', n: 1 }, { id: 'olma', name: 'c', n: 50 }, { id: 'olma', name: 'd', n: 51 }] }) });
  assert.deepEqual(r.body.items.map(x => x.n), [undefined, 1, 50, undefined]);
  assert.equal('uz' in r.body.items[0], false);
});

test('works without a database: no limits are applied and nothing is counted', async () => {
  const r = await post('/food', { AI: aiReturning('{"items":[]}'), FOOD_USER_DAY: '3' }, { initData: await initData(), img: IMG });
  assert.deepEqual(r.body, { ok: true, items: [], shared: false, left: 2 });
});
