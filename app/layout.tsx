import type { Metadata } from "next";
import { Tajawal } from "next/font/google";
import "./globals.css";

const tajawal = Tajawal({ 
  subsets: ["arabic"],
  weight: ["300", "400", "500", "700"],
  variable: '--font-tajawal',
});

export const metadata: Metadata = {
  title: "NOVAWERK | نوفاويرك للمقاولات العامة",
  description: "نبني الجودة برؤية احترافية",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl">
      <body className={`${tajawal.className} bg-[#0A1622]`}>{children}</body>
    </html>
  );
}