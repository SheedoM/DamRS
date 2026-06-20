import type { Metadata, Viewport } from "next";
import { Cairo } from "next/font/google";
import "./globals.css";

const cairo = Cairo({
  variable: "--font-geist-sans",
  subsets: ["arabic", "latin"],
});

export const metadata: Metadata = {
  title: {
    default: "DamRS - Damietta Review System | نظام دمياط لمراجعة المشاريع",
    template: "%s | DamRS",
  },
  description:
    "Damietta Review System (DamRS) - نظام دمياط لمراجعة المشاريع بكلية الحاسبات والمعلومات.",
  manifest: "/manifest.webmanifest",
  applicationName: "DamRS",
};

export const viewport: Viewport = {
  themeColor: "#123459",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ar"
      dir="rtl"
      className={`${cairo.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
