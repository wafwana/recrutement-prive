import type { NextAuthConfig } from "next-auth";

const authConfig = {
  // Credentials are configured in auth.ts (server-side). An empty provider list
  // keeps this shared config valid and lightweight for the Edge middleware.
  providers: [],
  pages: { signIn: "/connexion" },
  callbacks: {
    async jwt({ token, user }) {
      if (user?.role) token.role = user.role;
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.role = token.role as string | undefined;
      }
      return session;
    },
    authorized({ auth, request }) {
      if (!request.nextUrl.pathname.startsWith("/espace")) return true;
      return Boolean(auth?.user);
    },
  },
} satisfies NextAuthConfig;

export default authConfig;
