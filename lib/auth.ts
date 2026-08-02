import { type NextAuthOptions } from 'next-auth';
import { PrismaAdapter } from '@next-auth/prisma-adapter';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import GitHubProvider from 'next-auth/providers/github';
import bcrypt from 'bcryptjs';
import prisma from './prisma';

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: { strategy: 'jwt' },
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

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user || !user.password) {
          throw new Error('No account found with this email');
        }

        const isValid = await bcrypt.compare(
          credentials.password,
          user.password
        );

        if (!isValid) {
          throw new Error('Incorrect password');
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
      if ((account?.provider === 'google' || account?.provider === 'github') && profile) {
        const providerAccountId = account.providerAccountId as string;
        const provider = account.provider as string;
        const access_token = account.access_token as string | null;
        const refresh_token = account.refresh_token as string | null;
        const expires_at = account.expires_at as number | null;
        const token_type = account.token_type as string | null;
        const scope = account.scope as string | null;
        const id_token = account.id_token as string | null;
        const session_state = account.session_state as string | null;

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
          user.id = existingAccount.user.id;
          (user as { role?: string }).role = existingAccount.user.role;
          return true;
        }

        const email = (profile as { email?: string }).email as string;
        const existingUser = await prisma.user.findUnique({
          where: { email },
        });

        if (existingUser) {
          await prisma.account.create({
            data: {
              userId: existingUser.id,
              type: account.type,
              provider,
              providerAccountId,
              access_token: access_token,
              refresh_token: refresh_token,
              expires_at: expires_at,
              token_type: token_type,
              scope,
              id_token,
              session_state,
            },
          });

          user.id = existingUser.id;
          (user as { role?: string }).role = existingUser.role;
          return true;
        }

        // Handle different profile structures for Google vs GitHub
        const profileName = (profile as { name?: string }).name as string;
        let profileImage: string | null = null;
        
        if (account.provider === 'google') {
          profileImage = (profile as { picture?: string }).picture as string | null;
        } else if (account.provider === 'github') {
          profileImage = (profile as { avatar_url?: string }).avatar_url as string | null;
        }

        const newUser = await prisma.user.create({
          data: {
            email,
            name: profileName,
            image: profileImage,
            emailVerified: new Date(),
            onboardingCompleted: true,
            role: 'STUDENT',
            accounts: {
              create: {
                type: account.type,
                provider,
                providerAccountId,
                access_token: access_token,
                refresh_token: refresh_token,
                expires_at: expires_at,
                token_type: token_type,
                scope,
                id_token,
                session_state,
              },
            },
          },
        });

        user.id = newUser.id;
        (user as { role?: string }).role = newUser.role;

        // New OAuth sign-up — send welcome email (fire and forget)
        import('./email').then(({ sendWelcomeEmail }) => {
          sendWelcomeEmail(email, profileName || 'there').catch((err) =>
            console.error('Failed to send welcome email:', err)
          );
        });
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: string }).role ?? 'STUDENT';
        token.emailVerified = (user as { emailVerified?: Date | null }).emailVerified ?? null;
        token.onboardingCompleted = (user as { onboardingCompleted?: boolean }).onboardingCompleted ?? false;
      }
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
