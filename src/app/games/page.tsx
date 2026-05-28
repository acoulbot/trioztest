"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";

const games = [
  {
    id: "velderan",
    title: "Перо Измерений: Вельд'Эран",
    description: "Стратегическая настольная игра в мире тёмного фэнтези. Управляйте фракциями, ведите армии, призывайте богов и завоёвывайте континенты.",
    players: "2-10 игроков",
    status: "Доступна",
    image: "/games/velderan/map.png",
    tags: ["Стратегия", "PvP", "Настольная", "Фэнтези"],
  },
];

export default function GamesPage() {
  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 py-12 max-md:py-6 px-4 max-md:px-3">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-red-500/5 dark:bg-red-900/10 rounded-full blur-[200px]" />
        <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-amber-500/5 dark:bg-amber-900/10 rounded-full blur-[150px]" />
      </div>

      <div className="max-w-5xl mx-auto relative">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-16"
        >
          <h1 className="text-4xl md:text-5xl font-display font-bold mb-4">
            <span className="bg-gradient-to-r from-red-500 via-amber-500 to-red-400 bg-clip-text text-transparent">
              Игры
            </span>
          </h1>
          <p className="text-neutral-500 dark:text-gray-400 max-w-2xl mx-auto text-lg">
            Стратегические онлайн-игры во вселенной T.Р.И.О.Z
          </p>
        </motion.div>

        <div className="space-y-8">
          {games.map((game, i) => (
            <motion.div
              key={game.id}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.2, duration: 0.8 }}
            >
              <Link href={`/games/${game.id}`}>
                <div className="group relative overflow-hidden rounded-2xl border border-neutral-200 dark:border-white/10 bg-white dark:bg-neutral-900 hover:border-red-500/30 dark:hover:border-red-500/30 transition-all duration-500 hover:shadow-xl hover:shadow-red-500/5">
                  {/* Map preview */}
                  <div className="relative h-64 overflow-hidden">
                    <Image
                      src={game.image}
                      alt={game.title}
                      fill
                      className="object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                    <div className="absolute bottom-4 left-6 right-6">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded-lg font-medium backdrop-blur-sm">
                          {game.status}
                        </span>
                        <span className="px-2 py-0.5 bg-white/10 text-white/80 text-xs rounded-lg backdrop-blur-sm">
                          {game.players}
                        </span>
                      </div>
                      <h2 className="text-2xl font-display font-bold text-white">{game.title}</h2>
                    </div>
                  </div>

                  {/* Info */}
                  <div className="p-6">
                    <p className="text-neutral-600 dark:text-gray-400 mb-4 leading-relaxed">{game.description}</p>
                    <div className="flex flex-wrap gap-2">
                      {game.tags.map((tag) => (
                        <span key={tag} className="px-3 py-1 bg-neutral-100 dark:bg-white/5 text-neutral-600 dark:text-gray-400 text-sm rounded-lg">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
