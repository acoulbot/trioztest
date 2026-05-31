import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Игры — T.Р.И.О.Z",
  description: "Стратегические онлайн-игры во вселенной T.Р.И.О.Z. Вельд'Эран — настольная стратегия для 2-10 игроков.",
  openGraph: {
    title: "Игры — T.Р.И.О.Z",
    description: "Стратегические онлайн-игры во вселенной T.Р.И.О.Z.",
    images: [{ url: "/api/og?page=games", width: 1200, height: 630, alt: "Игры T.Р.И.О.Z" }],
  },
  twitter: {
    card: "summary_large_image",
    images: ["/api/og?page=games"],
  },
};

export default function GamesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
