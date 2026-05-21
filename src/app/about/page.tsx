"use client";

import { motion } from "framer-motion";
import Link from "next/link";

const sections = [
  {
    key: "trioz",
    title: 'Проекты Т.Р.И.О."Z"',
    description:
      "Глобальная MMORPG с элементами стратегии, полной социальной сферой и бесконечным миром для исследования. Мир тёмного фэнтези с уникальной лор-системой.",
    color: "#ff4444",
    href: "/projects",
  },
  {
    key: "pero",
    title: "Перо Измерений",
    description:
      "Развлекательные товары направленные на развитие мышления — от книг до уникальных настольных игр. Погружение в лор вселенной через физические носители.",
    color: "#8b5cf6",
    href: "/pero",
  },
  {
    key: "connect",
    title: "TZ.Connect",
    description:
      "Коммуникационная платформа и комплексные IT-решения для современного бизнеса. Мессенджер, голосовая связь, IT-услуги.",
    color: "#00f0ff",
    href: "/connect",
  },
  {
    key: "library",
    title: "TZ.Library",
    description:
      "Хранилище знаний и лора вселенной — от древних легенд до новейших открытий. Вики, база знаний, история мира.",
    color: "#10b981",
    href: "/library",
  },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-dark-900 relative overflow-x-hidden">
      {/* Ambient background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-cyan-400/[0.02] rounded-full blur-[150px]" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-fantasy-purple/[0.02] rounded-full blur-[150px]" />
      </div>

      {/* Back button */}
      <div className="fixed top-4 left-4 z-50">
        <Link href="/">
          <motion.button
            className="px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300
              border border-white/10 text-gray-300 hover:text-cyan-400 hover:border-cyan-400/40
              backdrop-blur-xl bg-black/30 flex items-center gap-2"
            whileHover={{ scale: 1.05, x: -2 }}
            whileTap={{ scale: 0.95 }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Назад
          </motion.button>
        </Link>
      </div>

      {/* Content */}
      <div className="relative max-w-4xl mx-auto px-4 py-20">
        {/* Logo + Title */}
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1 }}
          className="text-center mb-16"
        >
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="text-5xl md:text-7xl font-bold mb-4"
          >
            <span className="bg-gradient-to-r from-cyan-400 via-white to-fantasy-purple bg-clip-text text-transparent">
              Trio
            </span>
            <span className="text-cyan-400 glow-text">Z</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="text-lg text-gray-400 max-w-2xl mx-auto leading-relaxed"
          >
            Масштабная экосистема проектов в стиле dark fantasy и cyberpunk.
            Один мир. Множество измерений. Игры, книги, коммуникации, технологии.
          </motion.p>
        </motion.div>

        {/* Sections */}
        <div className="space-y-6">
          {sections.map((section, i) => (
            <motion.div
              key={section.key}
              initial={{ opacity: 0, x: i % 2 === 0 ? -40 : 40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.7, delay: 0.3 + i * 0.15 }}
            >
              <Link href={section.href}>
                <div className="glass-card-hover p-6 md:p-8 group relative overflow-hidden">
                  {/* Accent line */}
                  <div
                    className="absolute left-0 top-0 bottom-0 w-1 transition-all duration-500 group-hover:w-1.5"
                    style={{ backgroundColor: section.color }}
                  />

                  <div className="pl-4">
                    <div className="flex items-center gap-3 mb-3">
                      <div
                        className="w-3 h-3 rounded-full animate-pulse"
                        style={{ backgroundColor: section.color, boxShadow: `0 0 10px ${section.color}50` }}
                      />
                      <h2 className="text-xl md:text-2xl font-bold text-white group-hover:translate-x-1 transition-transform duration-300">
                        {section.title}
                      </h2>
                    </div>

                    <p className="text-gray-400 leading-relaxed text-sm md:text-base">
                      {section.description}
                    </p>

                    <div className="flex items-center gap-2 mt-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <span className="text-sm font-medium" style={{ color: section.color }}>
                        Перейти в раздел
                      </span>
                      <svg className="w-4 h-4" style={{ color: section.color }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                      </svg>
                    </div>
                  </div>

                  {/* Glow on hover */}
                  <div
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                    style={{
                      background: `radial-gradient(ellipse at center, ${section.color}05 0%, transparent 70%)`,
                    }}
                  />
                </div>
              </Link>
            </motion.div>
          ))}
        </div>

        {/* Footer info */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
          className="text-center mt-16 text-gray-600 text-sm"
        >
          <p>&copy; 2024 T.Р.И.О.Z — Экосистема проектов</p>
        </motion.div>
      </div>
    </div>
  );
}
