/**
 * Returns the absolute base URL of the application.
 * In production mode, defaults to https://recrutement-prive.com if environment variables are unset.
 */
export function getAppBaseUrl(): string {
  if (process.env.NEXTAUTH_URL) return process.env.NEXTAUTH_URL.replace(/\/+$/, "");
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/+$/, "");
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;

  if (process.env.NODE_ENV === "production") {
    return "https://recrutement-prive.com";
  }

  return "http://localhost:3000";
}
