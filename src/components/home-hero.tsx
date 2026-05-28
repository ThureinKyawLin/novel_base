"use client";

import Link from "next/link";
import { Search, PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/components/language-context";

export function HomeHero({ totalNovels }: { totalNovels: number }) {
  const { t, locale } = useLanguage();

  const subtitle =
    totalNovels > 0
      ? t.hero.subtitle.replace("{count}", totalNovels.toLocaleString())
      : t.hero.subtitleEmpty;

  return (
    <section className="border-b bg-gradient-to-b from-primary/5 to-background">
      <div className="container mx-auto px-4 py-12 sm:py-20 text-center">
        <h1
          className={`text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight ${
            locale === "mm" ? "font-[var(--font-mm)]" : ""
          }`}
        >
          {t.hero.title}
        </h1>
        <p className="mt-4 text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto">
          {subtitle}
        </p>
        <form
          action="/novels"
          className="mt-8 flex max-w-md mx-auto gap-2"
        >
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              name="q"
              placeholder={t.hero.searchPlaceholder}
              className="pl-10"
            />
          </div>
          <Button type="submit">{t.common.search}</Button>
        </form>
        <div className="mt-4">
          <Button
            variant="link"
            className="text-muted-foreground"
            render={<Link href="/submit" />}
          >
            <PlusCircle className="mr-1.5 h-4 w-4" />
            {t.hero.submitLink}
          </Button>
        </div>
      </div>
    </section>
  );
}
