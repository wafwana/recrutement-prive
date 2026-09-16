"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { DEFAULT_LOCALE, Locale, RTL_LOCALES, SUPPORTED_LOCALES } from "./config";
import { getTranslation } from "./dictionaries";

type I18nContextType = {
  locale: Locale;
  setLocale: (loc: Locale) => void;
  t: (key: string) => string;
  isRtl: boolean;
};

const I18nContext = createContext<I18nContextType>({
  locale: DEFAULT_LOCALE,
  setLocale: () => {},
  t: (key: string) => key,
  isRtl: false,
});

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);

  useEffect(() => {
    const saved = localStorage.getItem("rp_lang") || getCookie("rp_lang");
    if (saved && (SUPPORTED_LOCALES as readonly string[]).includes(saved)) {
      setLocaleState(saved as Locale);
    }
  }, []);

  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale);
    localStorage.setItem("rp_lang", newLocale);
    document.cookie = `rp_lang=${newLocale}; path=/; max-age=31536000`;

    const isRtl = RTL_LOCALES.has(newLocale);
    document.documentElement.lang = newLocale;
    document.documentElement.dir = isRtl ? "rtl" : "ltr";
  };

  const isRtl = RTL_LOCALES.has(locale);

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = isRtl ? "rtl" : "ltr";
  }, [locale, isRtl]);

  const t = (key: string) => getTranslation(locale, key);

  return (
    <I18nContext.Provider value={{ locale, setLocale, t, isRtl }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}

function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
  return match ? match[2] : null;
}
