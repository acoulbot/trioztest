import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "О проекте — T.Р.И.О.Z",
  description: "T.Р.И.О.Z — масштабная вселенная, объединяющая игры, книги, IT-услуги и коммуникационную платформу.",
  openGraph: {
    title: "О проекте — T.Р.И.О.Z",
    description: "T.Р.И.О.Z — масштабная вселенная, объединяющая игры, книги, IT-услуги и коммуникационную платформу.",
  },
};

export default function AboutLayout({ children }: { children: React.ReactNode }) {
  return children;
}
