export const metadata = { title: 'Cookies Policy · VS Remote Chat' };

export default function CookiesPage() {
  return (
    <>
      <h1>Cookies Policy</h1>
      <p className="updated">Last updated: {new Date().toISOString().slice(0, 10)}</p>

      <h2>What we use</h2>
      <ul>
        <li>
          <strong>Necessary cookies:</strong> required for authentication (keeping you signed in).
          These are always on and cannot be disabled.
        </li>
        <li>
          <strong>Analytics (optional):</strong> only set if you consent. Used to understand
          aggregate usage and improve the app.
        </li>
      </ul>

      <h2>Local storage</h2>
      <p>
        We also use your browser’s localStorage and IndexedDB to store encryption keys and an
        encrypted session cache. These are technical necessities for the app to function and never
        leave your device unencrypted.
      </p>

      <h2>Managing your choices</h2>
      <p>
        You can change your analytics preference anytime via the cookie banner or in your{' '}
        <a href="/account">Account settings</a>.
      </p>
    </>
  );
}
