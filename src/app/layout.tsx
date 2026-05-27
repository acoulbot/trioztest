import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";
import Providers from "@/components/Providers";
import ConditionalNavbar from "@/components/ui/ConditionalNavbar";

const inter = Inter({
  subsets: ["latin", "cyrillic"],
  variable: "--font-inter",
});

const playfair = Playfair_Display({
  subsets: ["latin", "cyrillic"],
  variable: "--font-playfair",
  weight: ["400", "500", "600", "700", "800", "900"],
});

export const metadata: Metadata = {
  title: "TrioZ — Экосистема проектов",
  description: "T.Р.И.О.Z — масштабная экосистема проектов. Игры, книги, коммуникации, IT-услуги для бизнеса.",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "48x48" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" className="dark" suppressHydrationWarning>
      <head>
        {/* Anti-flash: apply saved theme before first paint */}
        <script dangerouslySetInnerHTML={{ __html: `
          (function(){
            var t = localStorage.getItem('trioz-theme') || 'dark';
            document.documentElement.classList.toggle('dark', t === 'dark');
            document.documentElement.classList.toggle('light', t === 'light');
          })();
        `}} />
      </head>
      <body className={`${inter.variable} ${playfair.variable} font-sans antialiased
        bg-white dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 min-h-screen transition-colors duration-300`}>
        <Providers>
          <ConditionalNavbar />
          <main>{children}</main>
        </Providers>
      </body>
    </html>
  );
}
