import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

const MAINTENANCE_MODE = true;

export async function middleware(request: NextRequest) {
  const host = request.headers.get("host")?.split(":")[0] ?? "";
  const deploymentHost = process.env.VERCEL_URL?.split(":")[0] ?? "";
  const isCurrentVercelDeployment = Boolean(deploymentHost) && host === deploymentHost;

  // Keep the public custom domains in maintenance mode while the site is
  // being completed. The unique Vercel deployment URL remains available as
  // the private functional test surface for ongoing development.
  if (MAINTENANCE_MODE && !isCurrentVercelDeployment) {
    const { pathname } = request.nextUrl;

    if (pathname !== "/maintenance" && !pathname.startsWith("/_next/")) {
      return NextResponse.rewrite(new URL("/maintenance", request.url));
    }

    return NextResponse.next();
  }

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
