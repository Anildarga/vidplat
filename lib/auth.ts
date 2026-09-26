import { type NextAuthOptions } from 'next-auth';
import { PrismaAdapter } from '@next-auth/prisma-adapter';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import GitHubProvider from 'next-auth/providers/github';
import bcrypt from 'bcryptjs';
import prisma from './prisma';

type OAuthProfile = Record<string, unknown>;

async function getTrustedOAuthEmail(
  provider: string,
  profile: OAuthProfile,
  accessToken: string | null
): Promise<string | null> {
  if (provider === 'google') {
    const email = typeof profile.email === 'string'
      ? profile.email.trim().toLowerCase()
      : null;

    if (!email || profile.email_verified !== true) {
      return null;
    }

    return email;
  }

  if (provider === 'github') {
    if (!accessToken) {
      return null;
    }

    try {
      const response = await fetch('https://api.github.com/user/emails', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
        },
        cache: 'no-store',
      });

      if (!response.ok) {
        return null;
      }

      const emails = await response.json() as Array<{
        email?: string;
        primary?: boolean;
        verified?: boolean;
      }>;

      const verifiedEmails = emails
        .filter((item) => item.verified === true && typeof item.email === 'string')
        .map((item) => ({
          email: item.email!.trim().toLowerCase(),
          primary: item.primary === true,
        }));

      const profileEmail = typeof profile.email === 'string'
        ? profile.email.trim().toLowerCase()
        : null;

      const matchingEmail = profileEmail
        ? verifiedEmails.find((item) => item.email === profileEmail)
        : undefined;

      return matchingEmail?.email
        ?? verifiedEmails.find((item) => item.primary)?.email
        ?? verifiedEmails[0]?.email
        ?? null;
    } catch (error) {
      console.error('Failed to verify GitHub email:', error);
      return null;
    }
  }

  return null;
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: 'jwt',
  },
  pages: {
    signIn: '/login',
  },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: 'openid email profile',
        },
      },
    }),
    GitHubProvider({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: 'read:user user:email',
        },
      },
    }),
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Email and password required');
        }

        const email = String(credentials.email).trim().toLowerCase();

        const user = await prisma.user.findUnique({
          where: { email },
        });

        if (!user || !user.password) {
          throw new Error('Invalid email or password');
        }

        if (!user.isActive) {
          throw new Error('This account has been disabled');
        }

        if (!user.emailVerified || !user.isEmailVerified) {
          throw new Error('Please verify your email before signing in');
        }

        const isValid = await bcrypt.compare(
          credentials.password,
          user.password
        );

        if (!isValid) {
          throw new Error('Invalid email or password');
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          emailVerified: user.emailVerified,
          onboardingCompleted: user.onboardingCompleted,
        };
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === 'google' || account?.provider === 'github') {
        const providerAccountId = account.providerAccountId as string;
        const provider = account.provider as string;

        const existingAccount = await prisma.account.findUnique({
          where: {
            provider_providerAccountId: {
              provider,
              providerAccountId,
            },
          },
          include: {
            user: true,
          },
        });

        if (existingAccount) {
          if (!existingAccount.user.isActive) {
            return false;
          }

          user.id = existingAccount.user.id;
          (user as { role?: string }).role = existingAccount.user.role;
          (user as { emailVerified?: Date | null }).emailVerified = existingAccount.user.emailVerified;
          (user as { onboardingCompleted?: boolean }).onboardingCompleted = existingAccount.user.onboardingCompleted;
          return true;
        }

        const trustedEmail = await getTrustedOAuthEmail(
          provider,
          (profile ?? {}) as OAuthProfile,
          (account.access_token as string | null) ?? null
        );

        if (!trustedEmail) {
          return false;
        }

        const access_token = account.access_token as string | null;
        const refresh_token = account.refresh_token as string | null;
        const expires_at = account.expires_at as number | null;
        const token_type = account.token_type as string | null;
        const scope = account.scope as string | null;
        const id_token = account.id_token as string | null;
        const session_state = account.session_state as string | null;

        const existingUser = await prisma.user.findUnique({
          where: { email: trustedEmail },
        });

        if (existingUser) {
          if (!existingUser.isActive) {
            return false;
          }

          await prisma.account.create({
            data: {
              userId: existingUser.id,
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
          });

          await prisma.user.update({
            where: { id: existingUser.id },
            data: {
              emailVerified: existingUser.emailVerified ?? new Date(),
              isEmailVerified: true,
            },
          });

          user.id = existingUser.id;
          (user as { role?: string }).role = existingUser.role;
          (user as { emailVerified?: Date | null }).emailVerified = existingUser.emailVerified ?? new Date();
          (user as { onboardingCompleted?: boolean }).onboardingCompleted = existingUser.onboardingCompleted;
          return true;
        }

        const profileName = typeof profile?.name === 'string'
          ? profile.name
          : 'User';

        let profileImage: string | null = null;
        if (provider === 'google' && typeof profile?.picture === 'string') {
          profileImage = profile.picture;
        } else if (provider === 'github' && typeof profile?.avatar_url === 'string') {
          profileImage = profile.avatar_url;
        }

        const newUser = await prisma.user.create({
          data: {
            email: trustedEmail,
            name: profileName,
            image: profileImage,
            emailVerified: new Date(),
            isEmailVerified: true,
            onboardingCompleted: true,
            role: 'STUDENT',
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
        (user as { role?: string }).role = newUser.role;
        (user as { emailVerified?: Date | null }).emailVerified = newUser.emailVerified;
        (user as { onboardingCompleted?: boolean }).onboardingCompleted = newUser.onboardingCompleted;

        import('./email').then(({ sendWelcomeEmail }) => {
          sendWelcomeEmail(trustedEmail, profileName || 'there').catch((err) =>
            console.error('Failed to send welcome email:', err)
          );
        });

        return true;
      }

      return true;
    },

    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: string }).role ?? 'STUDENT';
        token.emailVerified =
          (user as { emailVerified?: Date | null }).emailVerified ?? null;
        token.onboardingCompleted =
          (user as { onboardingCompleted?: boolean }).onboardingCompleted ?? false;
      }

      if (!token.id) {
        return token;
      }

      const currentUser = await prisma.user.findUnique({
        where: { id: token.id as string },
        select: {
          role: true,
          emailVerified: true,
          onboardingCompleted: true,
          isActive: true,
        },
      });

      if (!currentUser || !currentUser.isActive) {
        return null;
      }

      token.role = currentUser.role;
      token.emailVerified = currentUser.emailVerified;
      token.onboardingCompleted = currentUser.onboardingCompleted;

      return token;
    },

    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.emailVerified = token.emailVerified as Date | null;
        session.user.onboardingCompleted = token.onboardingCompleted as boolean;
      }
      return session;
    },
  },
};
