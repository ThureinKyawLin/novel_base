"use client";

import Link from "next/link";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { LanguageSwitch } from "@/components/language-switch";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/components/language-context";

interface SiteHeaderProps {
  /** Highlight the active nav item */
  active?: "home" | "browse" | "submit" | "api";
  /** Show the Admin button (only on home page) */
  showAdmin?: boolean;
}

export function SiteHeader({ active, showAdmin }: SiteHeaderProps) {
  const { t } = useLanguage();

  return (
    <header className="sticky top-0 z-50 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <div className="container mx-auto flex h-14 items-center justify-between px-4">
        <Link href="/">
          <Logo size={28} />
        </Link>
        <nav className="flex items-center gap-2 sm:gap-4">
          <Link
            href="/novels"
            className={`text-sm transition-colors ${
              active === "browse"
                ? "font-medium text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.common.browse}
          </Link>
          <Link
            href="/submit"
            className={`text-sm transition-colors hidden sm:inline ${
              active === "submit"
                ? "font-medium text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.common.submit}
          </Link>
          <Link
            href="/api-docs"
            className={`text-sm transition-colors hidden sm:inline ${
              active === "api"
                ? "font-medium text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.common.api}
          </Link>
          <LanguageSwitch />
          <ThemeToggle />
          {showAdmin && (
            <Button
              variant="outline"
              size="sm"
              render={<Link href="/login" />}
            >
              {t.common.admin}
            </Button>
          )}
        </nav>
      </div>
    </header>
  );
}
