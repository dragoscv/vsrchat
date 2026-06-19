# Changelog — vsrchat PWA

This project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
