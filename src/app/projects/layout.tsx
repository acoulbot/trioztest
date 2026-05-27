import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Проекты — T.Р.И.О.Z",
  description: "Проекты вселенной T.Р.И.О.Z: MMORPG «Осколок Измерений», стратегии, онлайн-игры.",
  openGraph: {
    title: "Проекты — T.Р.И.О.Z",
    description: "Проекты вселенной T.Р.И.О.Z: MMORPG, стратегии, онлайн-игры",
  },
};

export default function ProjectsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
