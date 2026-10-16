"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { shouldShowGlobalBackButton } from "@/lib/navigation/back-button-policy";

export default function GlobalBackButton() {
  const pathname = usePathname();
  const router = useRouter();
  const initialPathname = useRef(pathname);
  const hasInternalNavigation = useRef(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (pathname !== initialPathname.current) {
      hasInternalNavigation.current = true;
    }

    let hasSameOriginReferrer = false;
    try {
      hasSameOriginReferrer =
        Boolean(document.referrer) &&
        new URL(document.referrer).origin === window.location.origin;
    } catch {
      hasSameOriginReferrer = false;
    }

    setVisible(
      shouldShowGlobalBackButton(
        pathname,
        window.history.length,
        hasSameOriginReferrer,
        hasInternalNavigation.current,
      ),
    );
  }, [pathname]);

  if (!visible) return null;

  return (
    <button
      type="button"
      onClick={() => router.back()}
      aria-label="Retour à la page précédente"
      title="Retour à la page précédente"
      className="fixed bottom-5 left-5 z-[70] inline-flex items-center gap-2 border border-[#F97316]/50 bg-[#081625]/95 px-4 py-3 text-[10px] uppercase tracking-[0.16em] text-white/80 shadow-lg backdrop-blur transition hover:border-[#F97316] hover:text-[#F97316] focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-2 focus:ring-offset-[#081625]"
    >
      <span aria-hidden="true" className="text-base leading-none">←</span>
      <span>Retour</span>
    </button>
  );
}
