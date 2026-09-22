"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

export default function BackButton() {
  const router = useRouter();
  const pathname = usePathname();
  const [canGoBack, setCanGoBack] = useState(false);

  useEffect(() => {
    setCanGoBack(window.history.length > 1);
  }, [pathname]);

  if (!canGoBack || pathname === "/" || pathname === "/maintenance") {
    return null;
  }

  return (
    <button
      type="button"
      onClick={() => router.back()}
      aria-label="Retour à la page précédente"
      title="Retour à la page précédente"
      className="fixed left-4 top-4 z-[100] inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white/95 text-xl font-semibold text-[#081625] shadow-md backdrop-blur transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-2"
    >
      <span aria-hidden="true">←</span>
    </button>
  );
}
