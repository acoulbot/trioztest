import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Игры — T.Р.И.О.Z",
  description: "Стратегические онлайн-игры во вселенной T.Р.И.О.Z. Вельд'Эран — настольная стратегия для 2-10 игроков.",
  openGraph: {
    title: "Игры — T.Р.И.О.Z",
    description: "Стратегические онлайн-игры во вселенной T.Р.И.О.Z",
  },
};

export default function GamesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
