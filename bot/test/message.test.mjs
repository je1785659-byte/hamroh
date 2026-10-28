// Behaviour of bot commands sent to the Telegram webhook, judged by the Telegram API calls the bot makes.
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { makeD1, webhook, world, resetWorld, makeAdmin } from './helpers.mjs';

const DB = makeD1();
let mid = 1;
const msg = (text, chat = { id: 5, type: 'private' }) => ({ update_id: mid, message: { message_id: mid++, chat, from: { id: 5, first_name: 'Ali' }, text } });
const sent = () => world.tg.filter(c => ['sendMessage', 'sendPhoto'].includes(c.method));
const lastText = () => { const s = sent().at(-1); return s && (s.body.text || s.body.caption); };
beforeEach(() => { resetWorld(); try { DB.raw.exec('DELETE FROM meta;'); } catch (e) {} });

test('/start sends the cover photo with the welcome text and pins it in private chats', async () => {
  await webhook(msg('/start'), { DB });
  const photo = world.tg.find(c => c.method === 'sendPhoto');
  assert.match(photo.body.caption, /Hamroh/);
  assert.ok(world.tg.some(c => c.method === 'pinChatMessage' && c.body.message_id === 777));
});

test('in a group, plain messages are ignored', async () => {
  await webhook(msg('salom', { id: -100, type: 'group' }), { DB });
  assert.equal(sent().length, 0);
});

test('/namoz answers with prayer times and a region keyboard', async () => {
  await webhook(msg('/namoz'), { DB });
  const m = sent().at(-1);
  assert.match(m.body.text, /Hududni tanlang/);
  assert.ok(m.body.reply_markup.inline_keyboard.flat().some(b => String(b.callback_data).startsWith('nm:')));
});

test('/kurs shows Central Bank rates', async () => {
  world.cbu = ['USD', 'EUR', 'RUB'].map((c, i) => ({ Ccy: c, Rate: String(12000 + i), Diff: i ? '-1.5' : '2', Date: '28.10.2026' }));
  await webhook(msg('/kurs'), { DB });
  assert.match(lastText(), /USD<\/b> — 12[\s ]000 so‘m 🔺2/);
  assert.match(lastText(), /EUR<\/b> .*🔻1.5/);
});

test('/kurs explains when the bank is unreachable', async () => {
  await webhook(msg('/kurs'), { DB });
  assert.match(lastText(), /Kursni olib bo‘lmadi/);
});

test('/taom suggests a dish with a recipe link and a "another dish" button', async () => {
  await webhook(msg('/taom'), { DB });
  const kb = sent().at(-1).body.reply_markup.inline_keyboard.flat();
  assert.ok(kb.some(b => b.web_app && b.web_app.url.includes('?r=')));
  assert.ok(kb.some(b => b.callback_data === 'taom'));
});

test('/hujjat and /yordam (and /help) describe features', async () => {
  await webhook(msg('/hujjat'), { DB }); assert.match(lastText(), /Hujjatlar bilan ishlash/);
  await webhook(msg('/yordam'), { DB }); assert.match(lastText(), /Hamroh bot buyruqlari/);
  await webhook(msg('/help'), { DB }); assert.match(lastText(), /Hamroh bot buyruqlari/);
});

test('commands work with the @botname suffix used in groups', async () => {
  await webhook(msg('/yordam@Hamronilovabot', { id: -100, type: 'group' }), { DB });
  assert.match(lastText(), /Hamroh bot buyruqlari/);
});

test('an unknown private message gets the open-the-app hint', async () => {
  await webhook(msg('salom'), { DB });
  assert.match(sent().at(-1).body.text, /ilovani oching/);
});

test('/stats without a database says so', async () => {
  await webhook(msg('/stats'), {});
  assert.match(lastText(), /Statistika bazasi hali ulanmagan/);
});

test('/admin with a wrong code deletes the message and refuses', async () => {
  await webhook(msg('/admin 0000'), { DB });
  assert.ok(world.tg.some(c => c.method === 'deleteMessage'));
  assert.equal(lastText(), 'Kod noto‘g‘ri.');
});

test('/stats from a non-admin falls through to the generic hint', async () => {
  await webhook(msg('/stats'), { DB });
  assert.match(lastText(), /ilovani oching/);
});

test('/stats from an admin sends the statistics with an admin-panel button', async () => {
  await webhook(msg('/yordam'), { DB }); // make sure the schema exists
  makeAdmin(DB, 5);
  await webhook(msg('/stats'), { DB });
  const m = sent().at(-1);
  assert.match(m.body.text, /Hamroh statistikasi/);
  assert.ok(m.body.reply_markup.inline_keyboard.flat().some(b => b.web_app && b.web_app.url.includes('t=admin')));
});

test('after any private message, the welcome is re-sent and pinned if the chat has no pinned message', async () => {
  world.pinned = false;
  await webhook(msg('salom'), { DB });
  assert.ok(world.tg.some(c => c.method === 'sendPhoto'));
  assert.ok(world.tg.some(c => c.method === 'pinChatMessage'));
});

test('/admin with the right code makes the sender an admin and sends statistics', async () => {
  const hash = [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode('test-code')))].map(x => x.toString(16).padStart(2, '0')).join('');
  await webhook(msg('/admin test-code'), { DB, ADMIN_HASH: hash });
  assert.ok(world.tg.some(c => c.method === 'deleteMessage'), 'the code message is deleted');
  assert.match(lastText(), /^✅ Siz admin bo‘ldingiz/);
  resetWorld();
  await webhook(msg('/stats'), { DB });
  assert.match(lastText(), /Hamroh statistikasi/);
});

test('/admin in a group is not handled', async () => {
  await webhook(msg('/admin 0000', { id: -100, type: 'group' }), { DB });
  assert.equal(sent().length, 0);
});

test('/taom picks the dish at random', async () => {
  const real = Math.random; const names = [];
  for (const v of [0, 0.999]) { Math.random = () => v; resetWorld(); await webhook(msg('/taom'), { DB }); names.push(lastText()); }
  Math.random = real;
  assert.notEqual(names[0], names[1]);
});
