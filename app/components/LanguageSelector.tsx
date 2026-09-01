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
      <label htmlFor="rp-language">Langue</label>
      <select
        id="rp-language"
        value={current}
        onChange={(event) => changeLocale(event.target.value as Locale)}
        aria-label="Choisir la langue"
      >
        {SUPPORTED_LOCALES.map((locale) => (
          <option key={locale} value={locale}>{LOCALE_LABELS[locale]}</option>
        ))}
      </select>
    </div>
  );
}
