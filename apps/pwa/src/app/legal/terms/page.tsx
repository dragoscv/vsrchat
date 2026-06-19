export const metadata = { title: 'Terms of Service · VS Remote Chat' };

export default function TermsPage() {
  return (
    <>
      <h1>Terms of Service</h1>
      <p className="updated">Last updated: {new Date().toISOString().slice(0, 10)}</p>

      <h2>1. Acceptance</h2>
      <p>
        By using VS Remote Chat (“the Service”), you agree to these Terms. If you do not agree,
        do not use the Service. The Service comprises a VS Code extension, a relay server, and a
        Progressive Web App (PWA).
      </p>

      <h2>2. What the Service does</h2>
      <p>
        VS Remote Chat lets you view and interact with your VS Code Copilot Chat from another
        device over an end-to-end-encrypted channel. The relay forwards encrypted data only and
        does not store your messages.
      </p>

      <h2>3. Your responsibilities</h2>
      <ul>
        <li>You are responsible for the security of your devices and your GitHub account.</li>
        <li>You must comply with GitHub Copilot’s terms when using Copilot through this Service.</li>
        <li>You must not use the Service for unlawful purposes.</li>
      </ul>

      <h2>4. No warranty</h2>
      <p>
        The Service is provided “as is”, without warranty of any kind. Remote execution of tools
        and terminal commands is powerful; you approve such actions at your own risk.
      </p>

      <h2>5. Limitation of liability</h2>
      <p>
        To the maximum extent permitted by law, the authors are not liable for any damages arising
        from your use of the Service.
      </p>

      <h2>6. Changes</h2>
      <p>We may update these Terms. Continued use after changes constitutes acceptance.</p>

      <h2>7. Contact</h2>
      <p>
        Questions? Reach us via <a href="https://github.com/dragoscv/vsrchat/issues">GitHub Issues</a>.
      </p>
    </>
  );
}
