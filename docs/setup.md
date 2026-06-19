# Setup guide

This walks you through running vsrchat end to end.

## 1. Deploy your relay

You need a relay your phone and PC can both reach. The easiest is Cloud Run.

```bash
cd infra/terraform
cp terraform.tfvars.example terraform.tfvars
# edit allowed_github_ids / allowed_github_logins to YOUR github account
terraform init
terraform apply
```

Note the `relay_ws_url` output, e.g. `wss://vsrchat-relay-xxxx.run.app/ws`.

> See [deploy-relay.md](deploy-relay.md) for the manual gcloud path.

## 2. Install the extension

- From the Marketplace: search **VS Remote Chat**, or
- Locally: `pnpm --filter vsrchat package` then install `apps/extension/vsrchat.vsix`.

Set `vsrchat.relayUrl` to your relay URL in VS Code settings.

## 3. Deploy / open the PWA

- Hosted: open `https://vsrchat.dragoscatalin.ro` on your phone and **Add to Home Screen**.
- Self-host: deploy `apps/pwa` to Vercel; set env from `.env.example`
  (`NEXT_PUBLIC_RELAY_URL`, `AUTH_*`, VAPID keys).

## 4. Pair

1. In VS Code, run **“VS Remote Chat: Pair a phone…”** (Command Palette).
2. Sign in with GitHub when prompted.
3. On your phone, open the PWA, sign in with the **same** GitHub account.
4. Scan the QR (or open the pairing link). You'll land in the app, paired.

## 5. Use it

- Tap a session to view it; messages stream live.
- Type in the composer to send a prompt (managed `vscode.lm` by default).
- Approve/deny tool calls from the floating cards.
- Enable push in **Account** to get alerts when responses finish.

## Keeping your PC reachable

Your PC must be awake and VS Code running to respond. Either:

- adjust your OS power settings so it doesn't sleep, or
- enable `vsrchat.keepAwakeWhilePaired` in settings.
