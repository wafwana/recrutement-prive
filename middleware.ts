import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

const MAINTENANCE_MODE = true;

export async function middleware(request: NextRequest) {
  const host = request.headers.get("host")?.split(":")[0] ?? "";
  const deploymentHost = process.env.VERCEL_URL?.split(":")[0] ?? "";
  const isCurrentVercelDeployment = Boolean(deploymentHost) && host === deploymentHost;

  // Keep the public custom domains in construction mode, while allowing the
  // unique Vercel deployment URL to expose the full application for testing.
  // Vercel injects VERCEL_URL with the hostname of the current deployment.
  if (MAINTENANCE_MODE && !isCurrentVercelDeployment) {
    const { pathname } = request.nextUrl;

    if (pathname !== "/maintenance" && !pathname.startsWith("/_next/")) {
      return NextResponse.rewrite(new URL("/maintenance", request.url));
    }

    return NextResponse.next();
  }

  // The unique Vercel deployment URL is our private functional test surface
  // while the public custom domains remain on the construction page.
  if (isCurrentVercelDeployment) {
    return NextResponse.next();
  }

  const token = await getToken({
    req: request,
    secret: process.env.AUTH_SECRET,
  });

  if (!token) {
    return NextResponse.redirect(new URL("/connexion", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api/).*)"],
};
