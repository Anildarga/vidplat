import { DefaultSession } from 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      role: string;
      username: string | null;
      identityId: string;
      emailVerified: Date | null;
      onboardingCompleted: boolean;
    } & DefaultSession['user'];
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    role: string;
    username: string | null;
    identityId: string;
    emailVerified: Date | null;
    onboardingCompleted: boolean;
    isActive: boolean;
  }
}
