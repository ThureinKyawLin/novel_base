"use client";

import Link from "next/link";
import { Code } from "lucide-react";
import { useLanguage } from "@/components/language-context";

export function SiteFooter() {
  const { t } = useLanguage();

  return (
    <footer className="border-t bg-card mt-auto">
      <div className="container mx-auto px-4 py-6 sm:py-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-4">
            <Link
              href="/submit"
              className="hover:text-foreground transition-colors"
            >
              {t.common.submitNovel}
            </Link>
            <Link
              href="/api-docs"
              className="flex items-center gap-1 hover:text-foreground transition-colors"
            >
              <Code className="h-3.5 w-3.5" />
              {t.common.api}
            </Link>
          </div>
          <p>{t.common.copyright} &copy; {new Date().getFullYear()}</p>
        </div>
      </div>
    </footer>
  );
}
