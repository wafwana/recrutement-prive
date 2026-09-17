import type { NextAuthConfig } from "next-auth";

const authConfig = {
  pages: { signIn: "/connexion" },
  callbacks: {
    authorized({ auth, request }) {
      if (!request.nextUrl.pathname.startsWith("/espace")) return true;
      return Boolean(auth?.user);
    },
  },
} satisfies NextAuthConfig;

export default authConfig;
