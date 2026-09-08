import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { authenticateCredentials } from "@/lib/auth-credentials";
import { AsyncLocalStorage } from "node:async_hooks";

export type AuthSessionUser = { id?: string | null; role?: string | null; name?: string | null; email?: string | null };
export type AuthSession = { user?: AuthSessionUser };

const testSessionStorage = new AsyncLocalStorage<AuthSession>();

export function runWithTestSession<T>(session: AuthSession, fn: () => Promise<T>): Promise<T> {
  return testSessionStorage.run(session, fn);
}

export function getActiveSessionContext(): AuthSession | null {
  return testSessionStorage.getStore() || null;
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  pages: { signIn: "/connexion" },
  providers: [
    Credentials({
      name: "Identifiants",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Mot de passe", type: "password" },
      },
      async authorize(credentials) {
        return authenticateCredentials(credentials);
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) token.role = user.role;
      return token;
    },
    async session({ session, token }) {
      if (session.user) session.user.role = token.role as string | undefined;
      return session;
    },
    authorized({ auth, request }) {
      if (!request.nextUrl.pathname.startsWith("/espace")) return true;
      return Boolean(auth?.user);
    },
  },
});
