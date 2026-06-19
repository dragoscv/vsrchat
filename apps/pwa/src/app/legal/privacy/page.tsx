export const metadata = { title: 'Privacy Policy · VS Remote Chat' };

export default function PrivacyPage() {
  return (
    <>
      <h1>Privacy Policy</h1>
      <p className="updated">Last updated: {new Date().toISOString().slice(0, 10)}</p>

      <h2>Our approach</h2>
      <p>
        VS Remote Chat is built privacy-first. Your chat messages are end-to-end encrypted: they
        are encrypted on your PC and only decrypted on your paired device (and vice versa). The
        relay server only ever sees ciphertext and stores no message history.
      </p>

      <h2>Data we process</h2>
      <ul>
        <li>
          <strong>Authentication:</strong> we use GitHub OAuth to verify your identity. We store
          your GitHub user id and login to lock the Service to your account.
        </li>
        <li>
          <strong>Push subscriptions:</strong> if you enable notifications, we store the push
          endpoint provided by your browser to deliver content-free alerts.
        </li>
        <li>
          <strong>Optional analytics:</strong> only if you consent, we collect anonymous usage
          metrics to improve the app. You can withdraw consent anytime in Account settings.
        </li>
        <li>
          <strong>Message content:</strong> never accessible to us — it is end-to-end encrypted.
        </li>
      </ul>

      <h2>Local storage on your device</h2>
      <p>
        The PWA stores your encryption keys and an encrypted cache of recently seen sessions in
        your browser (localStorage and IndexedDB). This never leaves your device unencrypted.
      </p>

      <h2>Your rights (GDPR)</h2>
      <p>
        You may access, export, or delete your data at any time. Unpairing a device and signing
        out removes local data; deleting your account removes server-side push subscriptions.
      </p>

      <h2>Contact</h2>
      <p>
        Data requests: <a href="https://github.com/dragoscv/vsrchat/issues">GitHub Issues</a> or{' '}
        <a href="https://dragoscatalin.ro">dragoscatalin.ro</a>.
      </p>
    </>
  );
}
