import { redirect } from "next/navigation";

/**
 * Backward-compatible entry point for links that still target /owner.
 * Keep /owner/permissions and other /owner/* routes handled by their own pages.
 */
export default function OwnerCompatibilityPage(): never {
  redirect("/espace/owner");
}
