import NextAuth from 'next-auth';
import GitHub from 'next-auth/providers/github';

/**
 * Auth.js v5 — GitHub sign-in so the PWA identity matches the extension.
 * We persist the GitHub access token so the browser relay client can
 * authenticate to the relay (single-user allowlist).
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    GitHub({
      authorization: { params: { scope: 'read:user' } },
    }),
  ],
  callbacks: {
    async jwt({ token, account, profile }) {
      if (account?.access_token) token.ghToken = account.access_token;
      if (profile?.id != null) token.ghId = String(profile.id);
      if (profile?.login) token.ghLogin = profile.login as string;
      return token;
    },
    async session({ session, token }) {
      session.ghToken = token.ghToken as string | undefined;
      session.ghId = token.ghId as string | undefined;
      session.ghLogin = token.ghLogin as string | undefined;
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
});
