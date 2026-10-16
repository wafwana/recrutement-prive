const HIDDEN_PATHS = new Set(["/", "/maintenance", "/owner/initialisation"]);

export function shouldShowGlobalBackButton(
  pathname: string | null | undefined,
  historyLength: number,
  hasSameOriginReferrer: boolean,
  hasInternalNavigation: boolean,
): boolean {
  if (!pathname || HIDDEN_PATHS.has(pathname) || pathname.startsWith("/inscription")) return false;
  if (historyLength <= 1) return false;
  return hasSameOriginReferrer || hasInternalNavigation;
}
