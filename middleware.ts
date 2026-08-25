import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

// Production is now the functional platform. Maintenance can be re-enabled
// explicitly through Vercel without changing application code.
const MAINTENANCE_MODE = process.env.MAINTENANCE_MODE === "true";

export async function middleware(request: NextRequest) {
  const host = request.headers.get("host")?.split(":")[0] ?? "";
  const deploymentHost = process.env.VERCEL_URL?.split(":")[0] ?? "";
  const isCurrentVercelDeployment = Boolean(deploymentHost) && host === deploymentHost;

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
