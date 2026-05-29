import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Providers } from "@/components/providers";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});


export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "NovelBase | Myanmar NovelBase - မြန်မာ ဝတ္ထု စာအုပ် အချက်အလက်များ",
    template: "%s | NovelBase",
  },
  description:
    "Browse Myanmar novels with English & Myanmar titles, author info, genres, and social links. မြန်မာ ဝတ္ထု၊ ဘာသာပြန် novel များကို ရှာဖွေပါ။",
  keywords: [
    "myanmar novel",
    "မြန်မာ ဝတ္ထု",
    "novel",
    "ဘာသာပြန်",
    "myanmar book",
    "မြန်မာ စာအုပ်",
    "novelbase",
    "web novel",
    "light novel",
    "wuxia",
    "xianxia",
    "ကျန်းကျီ",
    "ရှန်းရှ",
    "myanmar translation",
    "မြန်မာ ဘာသာပြန်",
  ],
  authors: [{ name: "NovelBase" }],
  creator: "NovelBase",
  openGraph: {
    type: "website",
    locale: "en_US",
    alternateLocale: "my_MM",
    url: SITE_URL,
    siteName: "NovelBase",
    title: "NovelBase | Myanmar NovelBase",
    description:
      "Browse Myanmar novels with English & Myanmar titles, author info, genres, and social links.",
  },
  twitter: {
    card: "summary_large_image",
    title: "NovelBase | Myanmar NovelBase",
    description:
      "Browse Myanmar novels with English & Myanmar titles, author info, genres, and social links.",
  },
  alternates: {
    canonical: SITE_URL,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <Providers>
          {children}
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
