"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

export function CollaboratorActivityTracker() {
  const pathname = usePathname();
  const sessionKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!sessionKeyRef.current) sessionKeyRef.current = crypto.randomUUID();

    const sendHeartbeat = () => {
      if (document.visibilityState !== "visible") return;
      void fetch("/api/activity/heartbeat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionKey: sessionKeyRef.current, path: pathname }),
        keepalive: true,
      }).catch(() => undefined);
    };

    sendHeartbeat();
    const interval = window.setInterval(sendHeartbeat, 60_000);
    const onVisibility = () => {
      if (document.visibilityState === "visible") sendHeartbeat();
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [pathname]);

  return null;
}
