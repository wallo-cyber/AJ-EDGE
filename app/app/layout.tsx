import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "ALGAEU Business Development Platform",
    template: "%s | ALGAEU",
  },
  description: "منصة ALGAEU العربية لتطوير الأعمال وإدارة علاقات العملاء والوكلاء الداخليين.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="ar"
      dir="rtl"
      className="h-full antialiased"
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
