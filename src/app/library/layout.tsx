import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "TZ.Library — База знаний T.Р.И.О.Z",
  description: "Хранилище знаний и лора вселенной T.Р.И.О.Z. Статьи, история, мифология.",
  openGraph: {
    title: "TZ.Library — База знаний T.Р.И.О.Z",
    description: "Хранилище знаний и лора вселенной T.Р.И.О.Z",
  },
};

export default function LibraryLayout({ children }: { children: React.ReactNode }) {
  return children;
}
