"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";

const projectSections = [
  {
    title: "Т.Р.И.О.\"Z\"",
    subtitle: "Глобальная MMORPG",
    description: "Масштабная онлайн-игра с элементами стратегии, полной социальной сферой и бесконечным миром для исследования. Проект объединяет тысячи игроков в одном мире.",
    href: "/projects",
    accent: "from-fantasy-red/20 to-rose-900/10",
    textColor: "text-fantasy-red",
    borderColor: "border-fantasy-red/20 hover:border-fantasy-red/40",
    features: ["Открытый мир", "PvP и PvE", "Социальная сфера", "Стратегические элементы"],
  },
  {
    title: "Перо Измерений",
    subtitle: "Книги и настольные игры",
    description: "Развлекательные товары, направленные на развитие мышления — от книг, погружающих в лор вселенной, до уникальных настольных игр с инновационной механикой.",
    href: "/pero",
    accent: "from-fantasy-purple/20 to-violet-900/10",
    textColor: "text-fantasy-purple",
    borderColor: "border-fantasy-purple/20 hover:border-fantasy-purple/40",
    features: ["Серия книг", "Настольные игры", "Развитие мышления", "Лор вселенной"],
  },
  {
    title: "TZ.Connect",
    subtitle: "Связь и IT-услуги",
    description: "Коммуникационная платформа и комплексные IT-решения для современного бизнеса. Полный спектр цифровых услуг от команды профессионалов.",
    href: "/connect",
    accent: "from-cyan-400/20 to-teal-900/10",
    textColor: "text-cyan-400",
    borderColor: "border-cyan-400/20 hover:border-cyan-400/40",
    features: ["CRM интеграция", "ИИ-помощники", "Облачные решения", "Создание сайтов"],
  },
  {
    title: "TZ.Library",
    subtitle: "Хранилище знаний",
    description: "Полное хранилище знаний и лора вселенной T.Р.И.О.Z — от древних легенд до новейших открытий. Статьи, история, мифология мира.",
    href: "/library",
    accent: "from-fantasy-emerald/20 to-green-900/10",
    textColor: "text-fantasy-emerald",
    borderColor: "border-fantasy-emerald/20 hover:border-fantasy-emerald/40",
    features: ["Статьи и лор", "Вики-база", "История мира", "Мифология"],
  },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-dark-900">
      {/* Hero */}
      <section className="relative py-20 px-4 flex flex-col items-center">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="relative w-24 h-24 md:w-32 md:h-32 mx-auto mb-8"
          >
            <Image
              src="/emblem.png"
              alt="TrioZ Emblem"
              fill
              className="object-contain"
              priority
            />
            <motion.div
              className="absolute -inset-4 rounded-full border border-cyan-400/20"
              animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0, 0.3] }}
              transition={{ duration: 3, repeat: Infinity }}
            />
          </motion.div>

          <h1 className="text-4xl md:text-6xl font-bold mb-4">
            <span className="bg-gradient-to-r from-cyan-400 via-white to-fantasy-purple bg-clip-text text-transparent">
              Экосистема TrioZ
            </span>
          </h1>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto leading-relaxed">
            Один мир. Множество измерений. Масштабная экосистема проектов, объединяющая игры, книги, коммуникации и технологии.
          </p>
        </motion.div>

        {/* Project Cards */}
        <div className="max-w-5xl w-full grid grid-cols-1 md:grid-cols-2 gap-6">
          {projectSections.map((project, i) => (
            <motion.div
              key={project.title}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 + i * 0.15 }}
            >
              <Link href={project.href}>
                <div className={`glass-card p-6 md:p-8 border ${project.borderColor} bg-gradient-to-br ${project.accent} group cursor-pointer transition-all duration-500 hover:shadow-lg`}>
                  <div className="mb-4">
                    <span className={`text-xs font-medium ${project.textColor} opacity-70`}>
                      {project.subtitle}
                    </span>
                    <h2 className="text-2xl font-bold text-white mt-1 group-hover:translate-x-1 transition-transform duration-300">
                      {project.title}
                    </h2>
                  </div>

                  <p className="text-gray-400 text-sm leading-relaxed mb-6">
                    {project.description}
                  </p>

                  <div className="flex flex-wrap gap-2 mb-6">
                    {project.features.map((feature) => (
                      <span
                        key={feature}
                        className={`px-3 py-1 rounded-full text-xs ${project.textColor} bg-white/5 border border-current/10`}
                      >
                        {feature}
                      </span>
                    ))}
                  </div>

                  <div className={`flex items-center gap-2 ${project.textColor} text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-300`}>
                    <span>Перейти</span>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>

        {/* Back to main */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="mt-12"
        >
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-gray-500 hover:text-cyan-400 transition-colors text-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16l-4-4m0 0l4-4m-4 4h18" />
            </svg>
            Назад на главную
          </Link>
        </motion.div>
      </section>
    </div>
  );
}
