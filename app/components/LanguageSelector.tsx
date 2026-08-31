"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { resolveLocale, LOCALE_LABELS, SUPPORTED_LOCALES, type Locale } from "../../lib/i18n/config";

export default function LanguageSelector() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const current = resolveLocale(searchParams.get("lang"));

  function changeLocale(next: Locale) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("lang", next);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  return (
    <div className="rp-language-selector">
      <label htmlFor="rp-language" className="sr-only">Langue</label>
      <select
        id="rp-language"
        value={current}
        onChange={(event) => changeLocale(event.target.value as Locale)}
        aria-label="Choisir la langue"
        className="px-2 py-1 text-xs border rounded bg-slate-950 text-slate-100 border-slate-700 focus:outline-none focus:ring-1 focus:ring-amber-400"
      >
        {SUPPORTED_LOCALES.map((locale) => (
          <option key={locale} value={locale}>{LOCALE_LABELS[locale]}</option>
        ))}
      </select>
    </div>
  );
}
