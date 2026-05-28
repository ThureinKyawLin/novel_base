import { createClient } from "@/lib/supabase/server";
import type { MetadataRoute } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = await createClient();

  const { data: novels } = await supabase
    .from("novels")
    .select("id, updated_at")
    .order("updated_at", { ascending: false });

  const novelUrls: MetadataRoute.Sitemap = (novels ?? []).map((novel) => ({
    url: `${SITE_URL}/novels/${novel.id}`,
    lastModified: novel.updated_at,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  return [
    {
      url: SITE_URL,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${SITE_URL}/novels`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/submit`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${SITE_URL}/api-docs`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.3,
    },
    ...novelUrls,
  ];
}
