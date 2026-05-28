"use client";

import { useLanguage } from "@/components/language-context";
import { Button } from "@/components/ui/button";
import { Languages } from "lucide-react";

export function LanguageSwitch() {
  const { locale, setLocale } = useLanguage();

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => setLocale(locale === "en" ? "mm" : "en")}
      className="gap-1.5 text-xs font-medium px-2"
      aria-label={locale === "en" ? "Switch to Myanmar" : "Switch to English"}
    >
      <Languages className="h-4 w-4" />
      <span>{locale === "en" ? "MM" : "EN"}</span>
    </Button>
  );
}
