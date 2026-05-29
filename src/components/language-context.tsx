"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useMemo,
  type ReactNode,
} from "react";
import {
  type Locale,
  type Dictionary,
  DEFAULT_LOCALE,
  LOCALE_COOKIE,
  getDictionary,
  isLocale,
} from "@/lib/i18n";

interface LanguageContextValue {
  locale: Locale;
  t: Dictionary;
  setLocale: (locale: Locale) => void;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

function getCookieLocale(): Locale {
  if (typeof document === "undefined") return DEFAULT_LOCALE;
  const match = document.cookie
    .split("; ")
    .find((c) => c.startsWith(`${LOCALE_COOKIE}=`));
  const val = match?.split("=")[1];
  return val && isLocale(val) ? val : DEFAULT_LOCALE;
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  // Always start with DEFAULT_LOCALE to match server render (prevents hydration mismatch)
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);

  // Sync with cookie on mount (client-only)
  useEffect(() => {
    const cookieLocale = getCookieLocale();
    if (cookieLocale !== DEFAULT_LOCALE) {
      setLocaleState(cookieLocale);
    }
  }, []);

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    // Set cookie (1 year, SameSite=Lax, path=/)
    document.cookie = `${LOCALE_COOKIE}=${newLocale};path=/;max-age=31536000;SameSite=Lax`;
  }, []);

  const t = useMemo(() => getDictionary(locale), [locale]);

  const value = useMemo(
    () => ({ locale, t, setLocale }),
    [locale, t, setLocale]
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error("useLanguage must be used within LanguageProvider");
  }
  return ctx;
}
