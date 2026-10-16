"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n/context";

export default function ReturnToSiteLink() {
  const { t } = useI18n();

  return (
    <Link
      href="/"
      className="min-h-11 inline-flex items-center px-2 text-[#c7a15a] transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f1ce8b]"
    >
      {t("ws_site_return")}
    </Link>
  );
}
