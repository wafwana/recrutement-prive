import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

// Production is now the functional platform. Maintenance can be re-enabled
// explicitly through Vercel without changing application code.
const MAINTENANCE_MODE = process.env.MAINTENANCE_MODE === "true";
const PUBLIC_PATHS = new Set(["/", "/connexion", "/maintenance"]);

export async function middleware(request: NextRequest) {
  const host = request.headers.get("host")?.split(":")[0] ?? "";
  const deploymentHost = process.env.VERCEL_URL?.split(":")[0] ?? "";
  const isCurrentVercelDeployment = Boolean(deploymentHost) && host === deploymentHost;
  const { pathname } = request.nextUrl;

  if (MAINTENANCE_MODE && !isCurrentVercelDeployment) {
    if (pathname !== "/maintenance" && !pathname.startsWith("/_next/") && !pathname.startsWith("/api/")) {
      return NextResponse.rewrite(new URL("/maintenance", request.url));
    }

    return NextResponse.next();
  }

  if (isCurrentVercelDeployment || PUBLIC_PATHS.has(pathname) || pathname.startsWith("/_next/")) {
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
