// Live E2E smoke test against the deployed relay.
// Simulates the extension + phone: join, key-exchange, encrypted round-trip.
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
const base = pathToFileURL(process.cwd() + '/package.json').href;
const require = createRequire(base);
const WebSocket = require('ws');
const cryptoPath = process.cwd() + '/../../packages/crypto/dist/index.js';
const crypto = await import(pathToFileURL(cryptoPath).href);
const { generateKeyPair, deriveSharedKey, seal, open, randomSecret } = crypto;

const RELAY = process.env.RELAY || 'wss://vsrchat-relay-246756727226.europe-west1.run.app/ws';
const ROOM = 'room-smoketest-' + Math.random().toString(36).slice(2, 8);
const AUTH = process.env.GH_TOKEN;

const ext = generateKeyPair();
const pwa = generateKeyPair();
const salt = randomSecret(32);

function client(role, onMsg) {
  const ws = new WebSocket(RELAY);
  ws.on('open', () => {
    ws.send(JSON.stringify({ t: 'join', room: ROOM, role, auth: AUTH, protocol: 1 }));
  });
  ws.on('message', (raw) => onMsg(ws, JSON.parse(raw.toString())));
  ws.on('error', (e) => { console.error(role, 'ws error', e.message); process.exit(1); });
  ws.on('close', (c, r) => console.log(role, 'closed', c, r.toString()));
  return ws;
}

let extKey, pwaKey;
let pass = false;

const extWs = client('ext', async (ws, m) => {
  if (m.t === 'error') console.log('ext relay error', m);
  if (m.t === 'joined') ws.send(JSON.stringify({ t: 'kx', room: ROOM, from: 'ext', pub: ext.publicKey }));
  if (m.t === 'kx') {
    extKey = await deriveSharedKey(ext.privateKey, m.pub, salt);
  }
  if (m.t === 'sealed' && extKey) {
    const txt = await open(extKey, { nonce: m.nonce, ciphertext: m.ciphertext });
    const obj = JSON.parse(txt);
    // Echo back so the PWA can verify a round-trip.
    const reply = await seal(extKey, JSON.stringify({ k: 'hello', machine: 'ext', echo: obj.text }));
    ws.send(JSON.stringify({ t: 'sealed', room: ROOM, from: 'ext', nonce: reply.nonce, ciphertext: reply.ciphertext, seq: 1 }));
  }
});

const pwaWs = client('pwa', async (ws, m) => {
  if (m.t === 'error') console.log('pwa relay error', m);
  if (m.t === 'joined') ws.send(JSON.stringify({ t: 'kx', room: ROOM, from: 'pwa', pub: pwa.publicKey }));
  if (m.t === 'kx') {
    pwaKey = await deriveSharedKey(pwa.privateKey, m.pub, salt);
    const sealed = await seal(pwaKey, JSON.stringify({ k: 'prompt.send', text: 'ping-42' }));
    ws.send(JSON.stringify({ t: 'sealed', room: ROOM, from: 'pwa', nonce: sealed.nonce, ciphertext: sealed.ciphertext, seq: 0 }));
  }
  if (m.t === 'sealed' && pwaKey) {
    const txt = await open(pwaKey, { nonce: m.nonce, ciphertext: m.ciphertext });
    const obj = JSON.parse(txt);
    if (obj.echo === 'ping-42') { pass = true; console.log('✓ E2E round-trip OK:', obj); }
  }
});

setTimeout(() => {
  extWs.close(); pwaWs.close();
  console.log(pass ? 'SMOKE PASS' : 'SMOKE FAIL');
  process.exit(pass ? 0 : 1);
}, 6000);
