import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "TZ.Connect — Мессенджер T.Р.И.О.Z",
  description: "Коммуникационная платформа T.Р.И.О.Z: групповые чаты, голосовые каналы, IT-услуги для бизнеса.",
  openGraph: {
    title: "TZ.Connect — Мессенджер T.Р.И.О.Z",
    description: "Мессенджер с голосовыми каналами и IT-услугами",
  },
};

export default function ConnectLayout({ children }: { children: React.ReactNode }) {
  return children;
}
