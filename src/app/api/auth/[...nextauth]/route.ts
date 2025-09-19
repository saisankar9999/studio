
import NextAuth, { type NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import {
  signInWithEmail,
  createUserWithEmail,
} from '@/lib/firebase/auth';

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
        isSignUp: { label: 'isSignUp', type: 'text' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials.password) {
          return null;
        }

        try {
          let user;
          if (credentials.isSignUp === 'true') {
            user = await createUserWithEmail(
              credentials.email,
              credentials.password
            );
          } else {
            user = await signInWithEmail(
              credentials.email,
              credentials.password
            );
          }

          if (user) {
            return {
              id: user.uid,
              email: user.email,
            };
          }
          return null;
        } catch (error: any) {
          // You can catch specific Firebase error codes here
          console.error("Authentication error:", error.message);
          throw new Error(error.message || 'Authentication failed');
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt',
  },
  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };

// Augment the session user type to include the ID
declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
    } & DefaultSession['user'];
  }
}
