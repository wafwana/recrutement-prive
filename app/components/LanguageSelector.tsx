"use client";

import React from "react";
import { useI18n } from "@/lib/i18n/context";
import { LOCALE_LABELS, Locale, SUPPORTED_LOCALES } from "@/lib/i18n/config";

export default function LanguageSelector() {
  const { locale, setLocale } = useI18n();

  return (
    <div className="relative inline-flex items-center">
      <select
        value={locale}
        onChange={(e) => setLocale(e.target.value as Locale)}
        aria-label="Sélectionner la langue"
        className="appearance-none border border-white/20 bg-black/60 px-3 py-1.5 pr-8 text-xs text-white outline-none cursor-pointer hover:border-[#c7a15a] transition"
      >
        {SUPPORTED_LOCALES.map((loc) => (
          <option key={loc} value={loc} className="bg-[#111] text-white">
            {LOCALE_LABELS[loc].flag} {LOCALE_LABELS[loc].name}
          </option>
        ))}
      </select>
      <span className="pointer-events-none stroke-white absolute right-2 text-[10px] text-white/50">▼</span>
    </div>
  );
}
