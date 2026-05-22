import VeldEranGame from "@/components/games/veld-eran/VeldEranGame";

export const metadata = {
  title: "Перо Измерений: Мир Вельд'Эран — TrioZ",
  description: "Браузерная адаптация настольной стратегии Перо Измерений для 2–10 игроков.",
};

export default function Page() {
  return <VeldEranGame />;
}
