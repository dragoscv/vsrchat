// Reproduce the pairing ordering: extension joins & stays, phone joins later.
// Verifies the phone (2nd peer) receives a `peer online` for the extension.
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
const require = createRequire(pathToFileURL(process.cwd() + '/package.json').href);
const WebSocket = require('ws');

const RELAY = process.env.RELAY || 'wss://vsrchat-relay-246756727226.europe-west1.run.app/ws';
const ROOM = 'room-diag-' + Math.random().toString(36).slice(2, 10);
const AUTH = process.env.GH_TOKEN;

function join(role) {
  const ws = new WebSocket(RELAY);
  const seen = { joined: false, peerOnline: false };
  ws.on('open', () => ws.send(JSON.stringify({ t: 'join', room: ROOM, role, auth: AUTH, protocol: 1 })));
  ws.on('message', (raw) => {
    const m = JSON.parse(raw.toString());
    if (m.t === 'joined') { seen.joined = true; console.log(`[${role}] joined (peers=${m.peers})`); }
    if (m.t === 'peer' && m.online) { seen.peerOnline = true; console.log(`[${role}] sees peer online: ${m.role}`); }
    if (m.t === 'error') console.log(`[${role}] ERROR`, m);
  });
  ws.on('close', (c, r) => console.log(`[${role}] closed ${c} ${r}`));
  ws.on('error', (e) => console.log(`[${role}] ws error`, e.message));
  ws._seen = seen;
  return ws;
}

const ext = join('ext');
setTimeout(() => {
  const pwa = join('pwa');
  setTimeout(() => {
    console.log('\nRESULT:');
    console.log('  ext saw phone:', ext._seen.peerOnline);
    console.log('  phone saw ext:', pwa._seen.peerOnline);
    const pass = ext._seen.peerOnline && pwa._seen.peerOnline;
    console.log(pass ? 'DIAG PASS' : 'DIAG FAIL');
    ext.close(); pwa.close();
    process.exit(pass ? 0 : 1);
  }, 4000);
}, 3000);
