# Changelog — vsrchat PWA

This project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed

- **Fluid pairing**: scanning the QR now authorizes the phone via a pairing
  proof — no GitHub login required on the phone, so there's no account mismatch.
  `/pair` and `/app` no longer force a sign-in; GitHub login remains a fallback
  for direct web visits. Added a "Pair this device" prompt when unpaired.

### Fixed

- Relay errors (e.g. `unauthorized`, `room-full`) are now surfaced as clear
  toasts instead of leaving the app stuck on "Connecting…". The client also
  stops its reconnect loop on fatal errors.

### Added

- Sessions are **grouped by workspace** in the list (active workspace first,
  collapsible groups, session counts) and the conversation header shows which
  workspace a chat belongs to.

### Fixed

- Use the correct canonical domain `https://vsrchat.dragoscatalin.ro` (default
  VAPID subject, links). The `*.vercel.app` URL now redirects to it.

### Changed

- Upgraded to latest stable dependencies: Next.js 16, React 19.2, Motion 12,
  Zod 4, next-auth beta.31, Tailwind CSS 4.3, sonner 2, zustand 5.0.14,
  TypeScript 6, vitest 4. Migrated ESLint to the Next 16 native flat config
  (`eslint .`) and `@noble` v2 import paths.

### Fixed

- Send the `kx` public-key frame only after the relay accepts the join, so the
  end-to-end key exchange completes reliably.

### Added

- Dark glass-morphism PWA: landing, GitHub login, pairing, app shell with
  session list + streaming conversation + composer, model picker, voice input,
  remote tool approvals.
- End-to-end-encrypted relay client with auto-reconnect and offline IndexedDB
  cache.
- Web push (VAPID), installable manifest, offline service worker.
- Account page, legal pages (Terms/Privacy/Cookies), GDPR cookie consent.
