import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { getCopy } from "@/lib/copy";
import { getDirection, getUserLocale } from "@/lib/preferences";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "FizZion",
  description: "Media intelligence and advertising monitoring platform for the Iraqi market.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const localePromise = getUserLocale();

  return <RootLayoutInner localePromise={localePromise}>{children}</RootLayoutInner>;
}

async function RootLayoutInner({
  children,
  localePromise,
}: Readonly<{
  children: React.ReactNode;
  localePromise: ReturnType<typeof getUserLocale>;
}>) {
  const locale = await localePromise;
  const copy = getCopy(locale);

  return (
    <html
      dir={getDirection(locale)}
      lang={locale}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-background font-sans text-foreground">
        <a
          className="sr-only focus:not-sr-only focus:absolute focus:start-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-brand-red focus:px-4 focus:py-2 focus:text-white"
          href="#main-content"
        >
          Skip to main content
        </a>
        {children}
        <span className="sr-only">{copy.appName}</span>
      </body>
    </html>
  );
}
