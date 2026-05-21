"use client";

import { motion } from "framer-motion";
import Link from "next/link";

const sections = [
  {
    id: "trioz",
    title: 'Проекты Т.Р.И.О."Z"',
    subtitle: "Игры, карты, онлайн",
    description: "Глобальная MMORPG с элементами стратегии и полной внутренней социальной сферой",
    href: "/projects",
    gradient: "from-red-900/60 via-red-800/40 to-dark-900",
    accent: "text-fantasy-red",
    borderColor: "hover:border-fantasy-red/40",
    glowColor: "hover:shadow-[0_0_40px_rgba(255,68,68,0.3)]",
    icon: (
      <svg className="w-12 h-12" viewBox="0 0 48 48" fill="none">
        <path d="M24 4L6 14v20l18 10 18-10V14L24 4z" stroke="currentColor" strokeWidth="2" fill="none" />
        <path d="M24 4v40M6 14l18 10 18-10" stroke="currentColor" strokeWidth="2" />
        <circle cx="24" cy="24" r="6" fill="currentColor" opacity="0.3" />
      </svg>
    ),
  },
  {
    id: "pero",
    title: "Перо Измерений",
    subtitle: "Настольные игры, книги, офлайн",
    description: "Развлекательные товары направленные на развитие мышления",
    href: "/pero",
    gradient: "from-purple-900/60 via-indigo-900/40 to-dark-900",
    accent: "text-fantasy-purple",
    borderColor: "hover:border-fantasy-purple/40",
    glowColor: "hover:shadow-[0_0_40px_rgba(139,92,246,0.3)]",
    icon: (
      <svg className="w-12 h-12" viewBox="0 0 48 48" fill="none">
        <path d="M12 40L36 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="M36 8l-4-2 2 6-2 2" stroke="currentColor" strokeWidth="2" fill="none" />
        <path d="M12 40c0 0-2-4 0-6s4-2 4-2" stroke="currentColor" strokeWidth="2" />
        <circle cx="30" cy="14" r="3" fill="currentColor" opacity="0.3" />
      </svg>
    ),
  },
  {
    id: "connect",
    title: "TZ.Connect",
    subtitle: "Связь, услуги",
    description: "Коммуникационная платформа и IT-услуги для бизнеса",
    href: "/connect",
    gradient: "from-cyan-900/60 via-teal-900/40 to-dark-900",
    accent: "text-cyan-400",
    borderColor: "hover:border-cyan-400/40",
    glowColor: "hover:shadow-[0_0_40px_rgba(0,240,255,0.3)]",
    icon: (
      <svg className="w-12 h-12" viewBox="0 0 48 48" fill="none">
        <circle cx="24" cy="14" r="6" stroke="currentColor" strokeWidth="2" fill="none" />
        <circle cx="14" cy="34" r="5" stroke="currentColor" strokeWidth="2" fill="none" />
        <circle cx="34" cy="34" r="5" stroke="currentColor" strokeWidth="2" fill="none" />
        <line x1="24" y1="20" x2="14" y2="29" stroke="currentColor" strokeWidth="2" />
        <line x1="24" y1="20" x2="34" y2="29" stroke="currentColor" strokeWidth="2" />
        <line x1="19" y1="34" x2="29" y2="34" stroke="currentColor" strokeWidth="2" />
      </svg>
    ),
  },
  {
    id: "library",
    title: "TZ.Library",
    subtitle: "Статьи, история",
    description: "Хранилище знаний и лора вселенной T.Р.И.О.Z",
    href: "/library",
    gradient: "from-emerald-900/60 via-green-900/40 to-dark-900",
    accent: "text-fantasy-emerald",
    borderColor: "hover:border-fantasy-emerald/40",
    glowColor: "hover:shadow-[0_0_40px_rgba(16,185,129,0.3)]",
    icon: (
      <svg className="w-12 h-12" viewBox="0 0 48 48" fill="none">
        <rect x="8" y="8" width="32" height="36" rx="2" stroke="currentColor" strokeWidth="2" fill="none" />
        <path d="M14 8v36M8 18h6M8 28h6" stroke="currentColor" strokeWidth="2" />
        <path d="M20 16h14M20 22h14M20 28h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.5" />
      </svg>
    ),
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.15, delayChildren: 0.3 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 40, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.8, ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number] },
  },
};

export default function HomePage() {
  return (
    <div className="min-h-screen bg-dark-900 relative overflow-hidden">
      {/* Ambient background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-400/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-fantasy-purple/5 rounded-full blur-[120px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-fantasy-red/3 rounded-full blur-[150px]" />
      </div>

      {/* Hero Section */}
      <section className="relative min-h-[60vh] flex flex-col items-center justify-center px-4 py-20">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: "easeOut" }}
          className="text-center mb-16"
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="inline-flex items-center gap-3 mb-6"
          >
            <div className="w-16 h-16 bg-gradient-to-br from-cyan-400 via-fantasy-purple to-fantasy-red rounded-2xl flex items-center justify-center shadow-[0_0_40px_rgba(0,240,255,0.3)] animate-glow-pulse">
              <span className="text-white font-bold text-2xl">TZ</span>
            </div>
          </motion.div>
          <h1 className="text-5xl md:text-7xl font-bold mb-4">
            <span className="bg-gradient-to-r from-cyan-400 via-white to-fantasy-purple bg-clip-text text-transparent">
              Trio
            </span>
            <span className="text-cyan-400 glow-text">Z</span>
          </h1>
          <p className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed">
            Экосистема проектов — от глобальной MMORPG до IT-услуг для бизнеса.
            <br />
            <span className="text-gray-500">Один мир. Множество измерений.</span>
          </p>
        </motion.div>

        {/* 4 Section Cards */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl w-full px-4"
        >
          {sections.map((section) => (
            <motion.div key={section.id} variants={itemVariants}>
              <Link href={section.href}>
                <div
                  className={`group relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br ${section.gradient}
                    p-8 min-h-[220px] flex flex-col justify-between cursor-pointer
                    transition-all duration-700 ${section.borderColor} ${section.glowColor}`}
                >
                  {/* Decorative grid */}
                  <div className="absolute inset-0 opacity-5 group-hover:opacity-10 transition-opacity duration-700"
                    style={{
                      backgroundImage: "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
                      backgroundSize: "40px 40px",
                    }}
                  />

                  {/* Icon */}
                  <div className={`${section.accent} opacity-60 group-hover:opacity-100 transition-all duration-500 group-hover:scale-110 transform`}>
                    {section.icon}
                  </div>

                  <div className="relative z-10 mt-4">
                    <h3 className="text-2xl font-bold text-white mb-1 group-hover:translate-x-1 transition-transform duration-500">
                      {section.title}
                    </h3>
                    <p className={`text-sm ${section.accent} opacity-80 mb-3`}>{section.subtitle}</p>
                    <p className="text-gray-400 text-sm leading-relaxed opacity-0 group-hover:opacity-100 transition-all duration-500 transform translate-y-2 group-hover:translate-y-0">
                      {section.description}
                    </p>
                  </div>

                  {/* Arrow */}
                  <div className="absolute bottom-6 right-6 opacity-0 group-hover:opacity-100 transition-all duration-500 transform translate-x-4 group-hover:translate-x-0">
                    <svg className={`w-6 h-6 ${section.accent}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* Services Preview */}
      <section className="relative py-24 px-4">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="section-title mb-4">Наши услуги</h2>
            <p className="text-gray-400 max-w-xl mx-auto">
              Комплексные IT-решения для вашего бизнеса от команды TrioZ
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            {[
              { icon: "✅", title: "Честный Знак" },
              { icon: "📊", title: "CRM Интеграция" },
              { icon: "🤖", title: "ИИ-Помощники" },
              { icon: "⚡", title: "ИИ-Автоматизация" },
              { icon: "☁️", title: "Облачные хранилища" },
              { icon: "🌐", title: "Создание сайтов" },
              { icon: "👤", title: "Сопровождение TZ.Ent" },
              { icon: "🔧", title: "Обслуживание сайтов" },
              { icon: "⚙️", title: "Настройка систем" },
              { icon: "📣", title: "Рекламные кампании" },
              { icon: "💬", title: "Телеграм-боты" },
            ].map((service, i) => (
              <motion.div
                key={service.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05, duration: 0.5 }}
                className="glass-card-hover p-5 flex items-center gap-4"
              >
                <span className="text-2xl">{service.icon}</span>
                <span className="text-white font-medium">{service.title}</span>
              </motion.div>
            ))}
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mt-10"
          >
            <Link href="/connect/services" className="btn-primary inline-block">
              Подробнее об услугах
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative border-t border-white/5 py-12 px-4">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-cyan-400 to-fantasy-purple rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">TZ</span>
            </div>
            <span className="text-gray-400">TrioZ Ecosystem</span>
          </div>
          <div className="flex gap-6 text-sm text-gray-500">
            <Link href="/projects" className="hover:text-cyan-400 transition-colors">Проекты</Link>
            <Link href="/connect" className="hover:text-cyan-400 transition-colors">Связь</Link>
            <Link href="/library" className="hover:text-cyan-400 transition-colors">Библиотека</Link>
          </div>
          <p className="text-gray-600 text-sm">&copy; 2024 TrioZ. Все права защищены.</p>
        </div>
      </footer>
    </div>
  );
}
