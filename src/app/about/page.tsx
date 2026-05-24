"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import EditableText from "@/components/EditableText";

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
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 relative overflow-x-hidden">
      {/* Ambient background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-violet-400/[0.03] dark:bg-cyan-400/[0.02] rounded-full blur-[150px]" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-indigo-400/[0.03] dark:bg-fantasy-purple/[0.02] rounded-full blur-[150px]" />
      </div>

      {/* Back button */}
      <div className="fixed top-4 left-4 z-50">
        <Link href="/">
          <motion.button
            className="px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300
              border border-neutral-300 dark:border-white/10 text-neutral-600 dark:text-gray-300 hover:text-violet-600 dark:hover:text-cyan-400 hover:border-violet-300 dark:hover:border-cyan-400/40
              backdrop-blur-xl bg-white/80 dark:bg-black/30 flex items-center gap-2"
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
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="inline-flex items-center gap-3 mb-5"
          >
            <span className="h-px w-10 bg-violet-400/40 dark:bg-cyan-400/30" />
            <span className="text-xs font-medium tracking-widest uppercase text-violet-500 dark:text-cyan-400/80">Экосистема</span>
            <span className="h-px w-10 bg-violet-400/40 dark:bg-cyan-400/30" />
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="text-5xl md:text-7xl font-display font-bold mb-6 leading-[1.1]"
          >
            <EditableText
              contentKey="about.title"
              defaultValue="TrioZ"
              tag="span"
              className="bg-gradient-to-r from-violet-600 via-neutral-900 to-indigo-600 dark:from-cyan-400 dark:via-white dark:to-fantasy-purple bg-clip-text text-transparent"
            />
          </motion.h1>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            <EditableText
              contentKey="about.subtitle"
              defaultValue="Масштабная экосистема проектов в стиле dark fantasy и cyberpunk. Один мир. Множество измерений. Игры, книги, коммуникации, технологии."
              tag="p"
              className="text-lg text-neutral-500 dark:text-gray-400 max-w-2xl mx-auto leading-relaxed"
              multiline
            />
          </motion.div>
        </motion.div>

        {/* Sections */}
        <div className="space-y-4">
          {sections.map((section, i) => (
            <motion.div
              key={section.key}
              initial={{ opacity: 0, x: i % 2 === 0 ? -30 : 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.3 + i * 0.12, ease: [0.25, 0.1, 0.25, 1] }}
            >
              <Link href={section.href}>
                <div className="relative rounded-2xl overflow-hidden group
                  border border-neutral-200/80 dark:border-white/[0.07]
                  hover:border-neutral-300 dark:hover:border-white/[0.13]
                  bg-white dark:bg-white/[0.025]
                  transition-all duration-400
                  hover:shadow-lg dark:hover:shadow-none"
                >
                  {/* Top accent line */}
                  <div
                    className="absolute top-0 left-0 right-0 h-[1.5px] opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                    style={{ background: `linear-gradient(90deg, transparent, ${section.color}80, transparent)` }}
                  />
                  {/* Left bar */}
                  <div
                    className="absolute left-0 top-0 bottom-0 w-[3px] opacity-30 group-hover:opacity-70 transition-all duration-400 group-hover:w-[4px]"
                    style={{ backgroundColor: section.color }}
                  />
                  {/* Subtle radial glow on hover */}
                  <div
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                    style={{ background: `radial-gradient(ellipse at 0% 50%, ${section.color}06 0%, transparent 60%)` }}
                  />

                  <div className="relative p-6 md:p-8 pl-8 md:pl-10">
                    <div className="flex items-center gap-3 mb-3">
                      <div
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0 transition-all duration-300 group-hover:scale-125"
                        style={{ backgroundColor: section.color, boxShadow: `0 0 8px ${section.color}60` }}
                      />
                      <h2 className="text-lg md:text-xl font-display font-bold text-neutral-900 dark:text-white group-hover:translate-x-0.5 transition-transform duration-300">
                        {section.title}
                      </h2>
                    </div>

                    <EditableText
                      contentKey={`about.section.${section.key}`}
                      defaultValue={section.description}
                      tag="p"
                      className="text-neutral-500 dark:text-gray-400 leading-relaxed text-sm md:text-base ml-[22px]"
                      multiline
                    />

                    <div className="flex items-center gap-2 mt-4 ml-[22px] opacity-0 group-hover:opacity-100 translate-x-0 group-hover:translate-x-1 transition-all duration-300">
                      <span className="text-sm font-medium" style={{ color: section.color }}>
                        Перейти в раздел
                      </span>
                      <svg className="w-4 h-4" style={{ color: section.color }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                      </svg>
                    </div>
                  </div>
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
          className="text-center mt-16 text-neutral-400 dark:text-gray-600 text-sm"
        >
          <EditableText contentKey="about.footer" defaultValue="&copy; 2024 T.Р.И.О.Z — Экосистема проектов" tag="p" />
        </motion.div>
      </div>
    </div>
  );
}
