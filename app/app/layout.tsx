import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Noto_Sans_Arabic } from "next/font/google";
import "./globals.css";
import { getSiteUrl } from "../lib/site-url";

const arabicFont = Noto_Sans_Arabic({
  subsets: ["arabic"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
  variable: "--font-arabic",
});

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: {
    default: "ALGAEU Business Development Platform",
    template: "%s | ALGAEU",
  },
  description: "منصة ALGAEU العربية لتطوير الأعمال وإدارة علاقات العملاء والوكلاء الداخليين.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="ar"
      dir="rtl"
      className={`${arabicFont.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
