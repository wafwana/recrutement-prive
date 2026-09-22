import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import authConfig from "./auth.config";

// Production remains in construction by default. The OWNER can explicitly authorize
// the public launch by setting MAINTENANCE_MODE=false in the production environment.
const MAINTENANCE_MODE = process.env.MAINTENANCE_MODE === "true";
const PUBLIC_PATHS = new Set([
  "/",
  "/offres",
  "/connexion",
  "/maintenance",
  "/mot-de-passe-oublie",
  "/reinitialisation-mot-de-passe",
  "/owner/initialisation",
]);

const { auth } = NextAuth(authConfig);

export default auth((request) => {
  const { pathname } = request.nextUrl;
  const token = request.auth;
  const isOwner = token?.user?.role === "OWNER";
  const isOwnerInitialization = pathname === "/owner/initialisation";

  if (MAINTENANCE_MODE && !isOwner) {
    if (
      pathname !== "/maintenance" &&
      !pathname.startsWith("/_next/") &&
      !isOwnerInitialization
    ) {
      return NextResponse.rewrite(new URL("/maintenance", request.url));
    }
    return NextResponse.next();
  }

  if (
    PUBLIC_PATHS.has(pathname) ||
    pathname.startsWith("/inscription") ||
    pathname.startsWith("/_next/")
  ) {
    return NextResponse.next();
  }

  if (!token?.user) {
    return NextResponse.redirect(new URL("/connexion", request.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api/).*)"],
};
