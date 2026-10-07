"use client";

import { usePathname } from "next/navigation";
import BackButton from "./BackButton";

const ROOT_SPACES = new Set(["/espace","/espace/owner","/espace/admin","/espace/candidat","/espace/entreprise","/espace/consultant"]);

export default function ContextBackButton() {
  const pathname = usePathname();
  if (!pathname.startsWith("/espace") || ROOT_SPACES.has(pathname)) return null;
  const segments = pathname.split("/").filter(Boolean);
  const parent = segments.length > 2 ? "/" + segments.slice(0, -1).join("/") : "/espace";
  return <div className="mx-auto w-[min(1180px,calc(100%-40px))] pt-8 md:w-[min(1180px,calc(100%-72px))]"><BackButton fallback={parent} /></div>;
}
