import { type NextAuthOptions } from 'next-auth';
import { PrismaAdapter } from '@next-auth/prisma-adapter';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import GitHubProvider from 'next-auth/providers/github';
import bcrypt from 'bcryptjs';
import prisma from './prisma';
import { buildDisplayName, ensureUserIdentityId, generateUniqueIdentityId, generateUniqueUsername } from './user-identity';

type OAuthProfile = Record<string, unknown>;

async function getTrustedOAuthEmail(provider: string, profile: OAuthProfile, accessToken: string | null): Promise<string | null> {
  if (provider === 'google') {
    const email = typeof profile.email === 'string' ? profile.email.trim().toLowerCase() : null;
    return email && profile.email_verified === true ? email : null;
  }

  if (provider === 'github' && accessToken) {
    try {
      const response = await fetch('https://api.github.com/user/emails', {
        headers: {
          Authorization: 'Bearer ' + accessToken,
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
        },
        cache: 'no-store',
      });
      if (!response.ok) return null;
      const emails = await response.json() as Array<{ email?: string; primary?: boolean; verified?: boolean }>;
      const verified = emails.filter((item) => item.verified === true && typeof item.email === 'string')
        .map((item) => ({ email: item.email!.trim().toLowerCase(), primary: item.primary === true }));
      const profileEmail = typeof profile.email === 'string' ? profile.email.trim().toLowerCase() : null;
      return (profileEmail && verified.find((item) => item.email === profileEmail)?.email)
        ?? verified.find((item) => item.primary)?.email
        ?? verified[0]?.email
        ?? null;
    } catch (error) {
      console.error('Failed to verify GitHub email:', error instanceof Error ? error.message : error);
      return null;
    }
  }

  return null;
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: { strategy: 'jwt' },
  pages: { signIn: '/login' },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: { params: { scope: 'openid email profile' } },
    }),
    GitHubProvider({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
      authorization: { params: { scope: 'read:user user:email' } },
    }),
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        username: { label: 'Username', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const username = typeof credentials?.username === 'string' ? credentials.username.trim().toLowerCase() : '';
        const password = typeof credentials?.password === 'string' ? credentials.password : '';

        if (!username || !password) throw new Error('Username and password required');

        const user = await prisma.user.findUnique({ where: { username } });
        if (!user || !user.password) throw new Error('Invalid username or password');
        if (!user.isActive) throw new Error('This account has been disabled');

        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) throw new Error('Invalid username or password');

        const identityId = await ensureUserIdentityId(user.id, user.role);
        const displayName = user.name || buildDisplayName(user.firstName, user.lastName) || username;

        return {
          id: user.id,
          email: user.email ?? undefined,
          name: displayName,
          role: user.role,
          username: user.username,
          identityId,
          firstName: user.firstName,
          lastName: user.lastName,
          emailVerified: new Date(),
          onboardingCompleted: true,
          isActive: true,
        } as any;
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider !== 'google' && account?.provider !== 'github') return true;

      const provider = account.provider;
      const providerAccountId = account.providerAccountId;
      const existingAccount = await prisma.account.findUnique({
        where: { provider_providerAccountId: { provider, providerAccountId } },
        include: { user: true },
      });

      if (existingAccount) {
        if (!existingAccount.user.isActive) return false;
        const identityId = await ensureUserIdentityId(existingAccount.user.id, existingAccount.user.role);
        user.id = existingAccount.user.id;
        (user as any).role = existingAccount.user.role;
        (user as any).username = existingAccount.user.username;
        (user as any).identityId = identityId;
        (user as any).emailVerified = existingAccount.user.emailVerified;
        (user as any).onboardingCompleted = existingAccount.user.onboardingCompleted;
        return true;
      }

      const trustedEmail = await getTrustedOAuthEmail(provider, (profile ?? {}) as OAuthProfile, (account.access_token as string | null) ?? null);
      if (!trustedEmail) return false;

      const existingUser = await prisma.user.findUnique({ where: { email: trustedEmail } });
      if (existingUser) {
        if (!existingUser.isActive) return false;

        await prisma.account.create({
          data: {
            userId: existingUser.id,
            type: account.type,
            provider,
            providerAccountId,
            access_token: (account.access_token as string | null) ?? null,
            refresh_token: (account.refresh_token as string | null) ?? null,
            expires_at: (account.expires_at as number | null) ?? null,
            token_type: (account.token_type as string | null) ?? null,
            scope: (account.scope as string | null) ?? null,
            id_token: (account.id_token as string | null) ?? null,
            session_state: (account.session_state as string | null) ?? null,
          },
        });

        const identityId = await ensureUserIdentityId(existingUser.id, existingUser.role);
        user.id = existingUser.id;
        (user as any).role = existingUser.role;
        (user as any).username = existingUser.username;
        (user as any).identityId = identityId;
        (user as any).emailVerified = existingUser.emailVerified ?? new Date();
        (user as any).onboardingCompleted = true;
        return true;
      }

      const firstName = typeof profile?.given_name === 'string'
        ? profile.given_name
        : typeof profile?.name === 'string' ? profile.name.split(' ')[0] : 'User';
      const lastName = typeof profile?.family_name === 'string' ? profile.family_name : null;
      const profileName = typeof profile?.name === 'string' ? profile.name : buildDisplayName(firstName, lastName);
      const baseUsername = provider === 'github' && typeof profile?.login === 'string'
        ? profile.login
        : trustedEmail.split('@')[0];
      const username = await generateUniqueUsername(baseUsername);
      const identityId = await generateUniqueIdentityId('STUDENT');

      const access_token = (account.access_token as string | null) ?? null;
      const refresh_token = (account.refresh_token as string | null) ?? null;
      const expires_at = (account.expires_at as number | null) ?? null;
      const token_type = (account.token_type as string | null) ?? null;
      const scope = (account.scope as string | null) ?? null;
      const id_token = (account.id_token as string | null) ?? null;
      const session_state = (account.session_state as string | null) ?? null;
      const image = typeof profile?.picture === 'string' ? profile.picture : typeof profile?.avatar_url === 'string' ? profile.avatar_url : null;

      const newUser = await prisma.user.create({
        data: {
          firstName,
          lastName,
          name: profileName,
          email: trustedEmail,
          username,
          identityId,
          image,
          role: 'STUDENT',
          emailVerified: new Date(),
          isEmailVerified: true,
          onboardingCompleted: true,
          accounts: {
            create: {
              type: account.type,
              provider,
              providerAccountId,
              access_token,
              refresh_token,
              expires_at,
              token_type,
              scope,
              id_token,
              session_state,
            },
          },
        },
      });

      user.id = newUser.id;
      (user as any).role = newUser.role;
      (user as any).username = newUser.username;
      (user as any).identityId = newUser.identityId;
      (user as any).emailVerified = newUser.emailVerified;
      (user as any).onboardingCompleted = true;
      return true;
    },

    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role ?? 'STUDENT';
        token.username = (user as any).username ?? null;
        token.identityId = (user as any).identityId ?? null;
        token.emailVerified = (user as any).emailVerified ?? null;
        token.onboardingCompleted = (user as any).onboardingCompleted ?? true;
        token.isActive = true;
      }

      if (!token.id) return token;

      const currentUser = await prisma.user.findUnique({
        where: { id: token.id as string },
        select: {
          role: true,
          username: true,
          identityId: true,
          emailVerified: true,
          onboardingCompleted: true,
          isActive: true,
          firstName: true,
          lastName: true,
          email: true,
          name: true,
        },
      });

      if (!currentUser || !currentUser.isActive) return null;

      const identityId = currentUser.identityId ?? await ensureUserIdentityId(token.id as string, currentUser.role);
      token.role = currentUser.role;
      token.username = currentUser.username;
      token.identityId = identityId;
      token.emailVerified = currentUser.emailVerified;
      token.onboardingCompleted = currentUser.onboardingCompleted;
      token.isActive = currentUser.isActive;
      token.name = currentUser.name || buildDisplayName(currentUser.firstName, currentUser.lastName) || currentUser.username || undefined;
      token.email = currentUser.email ?? undefined;

      return token;
    },

    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.username = token.username as string | null;
        session.user.identityId = token.identityId as string;
        session.user.emailVerified = token.emailVerified as Date | null;
        session.user.onboardingCompleted = token.onboardingCompleted as boolean;
      }
      return session;
    },
  },
};
