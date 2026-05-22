"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import EditableText from "@/components/EditableText";

const items = [
  {
    title: "Перо Измерений: Путь к Пустоте",
    type: "Книга",
    description: "Первая книга серии «Перо Измерений», погружающая читателя в глубины вселенной T.Р.И.О.Z. История о путешествии через измерения, где каждый мир хранит свои тайны и опасности.",
    status: "В процессе редактирования",
    icon: "📖",
    href: null as string | null,
    ctaLabel: null as string | null,
  },
  {
    title: "Перо Измерений: Вельд'Эран",
    type: "Настольная игра",
    description: "Стратегическая настольная игра во вселенной T.Р.И.О.Z. Десять фракций, карта мира с городами, святилищами и особыми локациями, бои на картах и призыв богов. 2–10 игроков.",
    status: "Браузерная демо-версия",
    icon: "🎲",
    href: "/pero/veld-eran",
    ctaLabel: "Запустить партию →",
  },
];

export default function PeroPage() {
  return (
    <div className="min-h-screen bg-dark-900 py-12 px-4">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-fantasy-purple/5 rounded-full blur-[150px]" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-indigo-900/5 rounded-full blur-[150px]" />
      </div>

      <div className="max-w-5xl mx-auto relative">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-16"
        >
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            <span className="bg-gradient-to-r from-fantasy-purple via-indigo-400 to-purple-300 bg-clip-text text-transparent">
              Перо Измерений
            </span>
          </h1>
          <EditableText contentKey="pero.subtitle" defaultValue="Настольные игры, книги и другие физические товары, направленные на развитие мышления" tag="p" className="text-gray-400 max-w-2xl mx-auto text-lg" />
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {items.map((item, i) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.2, duration: 0.8 }}
              className="glass-card p-8 border border-fantasy-purple/20 bg-gradient-to-br from-purple-900/20 to-dark-900 group hover:border-fantasy-purple/40 hover:shadow-[0_0_30px_rgba(139,92,246,0.2)] transition-all duration-500"
            >
              <div className="text-5xl mb-4 group-hover:scale-110 transition-transform duration-500">
                {item.icon}
              </div>
              <div className="flex items-center gap-2 mb-3">
                <span className="px-2 py-0.5 bg-fantasy-purple/20 text-fantasy-purple text-xs rounded-lg font-medium">
                  {item.type}
                </span>
                <span className="px-2 py-0.5 bg-dark-700 text-gray-400 text-xs rounded-lg">
                  {item.status}
                </span>
              </div>
              <h3 className="text-xl font-bold text-white mb-3 group-hover:text-fantasy-purple transition-colors">
                {item.title}
              </h3>
              <EditableText contentKey={`pero.${i}.desc`} defaultValue={item.description} tag="p" className="text-gray-400 leading-relaxed" multiline />
              {item.href && (
                <Link
                  href={item.href}
                  className="inline-block mt-4 px-4 py-2 rounded-lg bg-fantasy-purple/20 hover:bg-fantasy-purple/30 border border-fantasy-purple/40 text-fantasy-purple text-sm font-medium transition"
                >
                  {item.ctaLabel}
                </Link>
              )}
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mt-16 glass-card p-8 text-center border border-fantasy-purple/10"
        >
          <EditableText contentKey="pero.mission.title" defaultValue="Миссия" tag="h3" className="text-xl font-bold text-white mb-3" />
          <EditableText contentKey="pero.mission.text" defaultValue="Создание легкодоступных для людей развлекательных товаров, направленных на развитие мышления. Каждый продукт — это окно в мир T.Р.И.О.Z, где воображение встречается со стратегией." tag="p" className="text-gray-400 max-w-2xl mx-auto leading-relaxed" multiline />
          <div className="mt-6">
            <Link href="/library" className="btn-secondary inline-block">
              Узнать больше о лоре
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
