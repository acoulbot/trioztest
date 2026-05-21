import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import Providers from "@/components/Providers";
import ConditionalNavbar from "@/components/ui/ConditionalNavbar";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "TrioZ — Экосистема проектов",
  description: "T.Р.И.О.Z — масштабная экосистема проектов. Игры, книги, коммуникации, IT-услуги для бизнеса.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" className="dark">
      <body className={`${geistSans.variable} antialiased bg-dark-900 text-foreground min-h-screen`}>
        <Providers>
          <ConditionalNavbar />
          <main>{children}</main>
        </Providers>
      </body>
    </html>
  );
}
