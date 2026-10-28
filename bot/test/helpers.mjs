// Test harness: real worker module, in-memory D1 (node:sqlite), mocked outside world (Telegram, CBU, site files, Claude, Workers AI).
import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import worker from '../worker.js';

export const TOKEN = '123:test-token';
const enc = new TextEncoder();
const CATALOG = fs.readFileSync(new URL('../../kkal.json', import.meta.url), 'utf8');

export function makeD1() {
  const db = new DatabaseSync(':memory:');
  const stmt = (sql, args = []) => ({
    bind: (...a) => stmt(sql, a),
    async run() { db.prepare(sql).run(...args); return { success: true }; },
    async first() { return db.prepare(sql).get(...args) || null; },
    async all() { return { results: db.prepare(sql).all(...args) }; },
    _exec() { const p = db.prepare(sql); return /^\s*(select|with)/i.test(sql) ? { results: p.all(...args) } : (p.run(...args), { results: [] }); },
  });
  return { prepare: sql => stmt(sql), async batch(list) { return list.map(s => s._exec()); }, raw: db };
}

async function hmac(key, msg) {
  const k = await crypto.subtle.importKey('raw', typeof key === 'string' ? enc.encode(key) : key, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return new Uint8Array(await crypto.subtle.sign('HMAC', k, enc.encode(msg)));
}
export async function initData(user = { id: 42, first_name: 'Test' }, token = TOKEN) {
  const p = new URLSearchParams({ auth_date: String(Math.floor(Date.now() / 1000)), user: JSON.stringify(user) });
  const dcs = [...p.entries()].sort(([a], [b]) => (a < b ? -1 : 1)).map(([k, v]) => k + '=' + v).join('\n');
  p.set('hash', [...await hmac(await hmac('WebAppData', token), dcs)].map(x => x.toString(16).padStart(2, '0')).join(''));
  return p.toString();
}

// Outside world. Each test sets world.claude / world.cbu as needed; world.tg collects Telegram calls.
export const world = { tg: [], claude: null, claudeBodies: [], cbu: null, pinned: true };
export function resetWorld() { world.tg = []; world.claude = null; world.claudeBodies = []; world.cbu = null; world.pinned = true; }
globalThis.fetch = async (url, opts = {}) => {
  const u = String(url);
  if (u.includes('kkal.json')) return new Response(CATALOG);
  if (u.includes('bot-config.json')) return new Response('{}');
  if (u.includes('api.telegram.org')) {
    const method = u.split('/').pop();
    world.tg.push({ method, body: JSON.parse(opts.body || '{}') });
    if (method === 'getChat') return new Response(JSON.stringify({ ok: true, result: world.pinned ? { pinned_message: { message_id: 1 } } : {} }));
    return new Response(JSON.stringify({ ok: true, result: { message_id: 777 } }));
  }
  if (u.includes('api.anthropic.com')) {
    world.claudeBodies.push(JSON.parse(opts.body));
    const r = world.claude;
    if (!r) throw new Error('no claude mock');
    return new Response(JSON.stringify(r.body), { status: r.status || 200 });
  }
  if (u.includes('cbu.uz')) {
    if (!world.cbu) throw new Error('cbu down');
    return new Response(JSON.stringify(world.cbu));
  }
  throw new Error('unexpected fetch ' + u);
};

export async function post(path, env, fields = {}) {
  const fd = new FormData();
  for (const k in fields) fd.append(k, fields[k]);
  const r = await worker.fetch(new Request('https://bot.test' + path, { method: 'POST', body: fd }), { BOT_TOKEN: TOKEN, ...env });
  return { status: r.status, body: await r.json() };
}
export async function webhook(update, env = {}) {
  const r = await worker.fetch(new Request('https://bot.test/', { method: 'POST', body: JSON.stringify(update), headers: { 'content-type': 'application/json' } }), { BOT_TOKEN: TOKEN, ...env });
  return r.status;
}
export const IMG = 'data:image/jpeg;base64,QUJD';
export const aiReturning = response => ({ calls: 0, async run(model, inp) { this.calls++; return typeof response === 'function' ? response(model, inp) : { response }; } });
export const claudeTool = input => ({ body: { content: [{ type: 'tool_use', name: 'report_foods', input }] } });
export function makeAdmin(DB, id) { DB.raw.exec("CREATE TABLE IF NOT EXISTS meta(k TEXT PRIMARY KEY,v TEXT)"); DB.raw.prepare("INSERT INTO meta(k,v) VALUES('admins',?) ON CONFLICT(k) DO UPDATE SET v=excluded.v").run(String(id)); }
