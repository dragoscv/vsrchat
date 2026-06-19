import 'next-auth';

declare module 'next-auth' {
  interface Session {
    ghToken?: string;
    ghId?: string;
    ghLogin?: string;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    ghToken?: string;
    ghId?: string;
    ghLogin?: string;
  }
}
