import * as vscode from 'vscode';
import * as QRCode from 'qrcode';
import type { PairingPayload } from '@vsrchat/protocol';

/**
 * Shows a beautiful dark webview with the pairing QR code, the short code,
 * and a deep link to open the PWA pre-filled. Matches the app's glass-morphism
 * aesthetic.
 */
export async function showPairingPanel(
  payload: PairingPayload,
  pwaBaseUrl: string,
  shortCode: string,
): Promise<vscode.WebviewPanel> {
  const panel = vscode.window.createWebviewPanel(
    'vsrchat.pairing',
    'VS Remote Chat — Pair your phone',
    vscode.ViewColumn.Active,
    { enableScripts: true, retainContextWhenHidden: true },
  );

  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const deepLink = `${pwaBaseUrl}/pair#${encoded}`;
  const qrDataUrl = await QRCode.toDataURL(deepLink, {
    margin: 1,
    width: 320,
    color: { dark: '#e7e7ff', light: '#00000000' },
  });

  panel.webview.html = render(qrDataUrl, payload, shortCode);
  return panel;
}

function render(qr: string, payload: PairingPayload, shortCode: string): string {
  const lockedTo = payload.login ?? 'your account';
  return /* html */ `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<style>
  :root { color-scheme: dark; }
  * { box-sizing: border-box; }
  body {
    margin: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;
    background: radial-gradient(1200px 800px at 20% -10%, #1b1140 0%, transparent 55%),
                radial-gradient(1000px 700px at 110% 10%, #08203a 0%, transparent 50%),
                #06060b;
    color: #e7e7ff; min-height: 100vh; display: grid; place-items: center; padding: 32px;
  }
  .card {
    width: min(420px, 92vw); padding: 28px; border-radius: 24px;
    background: rgba(20, 20, 32, 0.55); backdrop-filter: blur(22px);
    border: 1px solid rgba(140, 130, 255, 0.18);
    box-shadow: 0 30px 80px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.06);
    text-align: center; animation: rise .5s cubic-bezier(.2,.8,.2,1);
  }
  @keyframes rise { from { opacity:0; transform: translateY(14px) scale(.98);} to {opacity:1; transform:none;} }
  h1 { font-size: 18px; margin: 0 0 4px; letter-spacing: .2px; }
  p.sub { margin: 0 0 22px; color: #a7a7c8; font-size: 13px; }
  .qr { padding: 16px; border-radius: 18px; background: rgba(255,255,255,0.03);
        border: 1px solid rgba(140,130,255,0.14); display: inline-block; }
  .qr img { display:block; width: 280px; height: 280px; }
  .code { margin: 22px 0 6px; font: 600 26px/1 ui-monospace, "SF Mono", Menlo, monospace;
          letter-spacing: 6px; color: #c9c4ff; }
  .codelabel { font-size: 11px; text-transform: uppercase; letter-spacing: 2px; color: #7d7da0; }
  .hint { margin-top: 22px; font-size: 12px; color: #8f8fb3; line-height: 1.5; }
  .pill { display:inline-block; margin-top: 14px; padding: 7px 14px; border-radius: 999px;
          font-size: 12px; color:#bdb8ff; background: rgba(124, 92, 255, .12);
          border: 1px solid rgba(124,92,255,.3); }
</style>
</head>
<body>
  <div class="card">
    <h1>🛰️ Pair your phone</h1>
    <p class="sub">Scan with the VS Remote Chat PWA on your phone</p>
    <div class="qr"><img src="${qr}" alt="Pairing QR code" /></div>
    <div class="code">${escapeHtml(shortCode)}</div>
    <div class="codelabel">or enter this pairing code manually</div>
    <div class="pill">🔒 Locked to ${escapeHtml(lockedTo)}</div>
    <p class="hint">This QR contains your relay address and an end-to-end encryption key.
       It expires in 10 minutes. The relay never sees your messages in plaintext.</p>
  </div>
</body>
</html>`;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string,
  );
}
