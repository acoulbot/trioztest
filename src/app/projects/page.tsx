"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import EditableText from "@/components/EditableText";

const projects = [
  {
    title: "T.Р.И.О.Z — Основной проект",
    description: "Глобальная Российская MMORPG с элементами стратегии и полной внутренней социальной сферой. Именно с этого проекта зародилось наше сообщество.",
    status: "В разработке",
    tags: ["MMORPG", "Стратегия", "Онлайн", "Социальная сеть"],
    color: "from-red-500/20 to-red-900/20",
    accent: "text-fantasy-red",
    borderColor: "border-fantasy-red/20",
  },
  {
    title: "Осколок Измерений",
    description: "Сборник проектов по созданию компьютерных и телефонных игр и дополнений к ним, напрямую связанных с вселенными T.Р.И.О.Z.",
    status: "Планирование",
    tags: ["PC", "Mobile", "Инди", "Вселенная T.Р.И.О.Z"],
    color: "from-orange-500/20 to-orange-900/20",
    accent: "text-orange-400",
    borderColor: "border-orange-400/20",
  },
];

export default function ProjectsPage() {
  return (
    <div className="min-h-screen bg-dark-900 py-12 px-4">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-0 w-[600px] h-[600px] bg-fantasy-red/5 rounded-full blur-[150px]" />
      </div>

      <div className="max-w-5xl mx-auto relative">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-16"
        >
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            <span className="bg-gradient-to-r from-fantasy-red via-orange-400 to-fantasy-gold bg-clip-text text-transparent">
              Проекты Т.Р.И.О.&quot;Z&quot;
            </span>
          </h1>
          <EditableText contentKey="projects.subtitle" defaultValue="Игры, карты, онлайн — масштабные проекты во вселенной T.Р.И.О.Z" tag="p" className="text-gray-400 max-w-2xl mx-auto text-lg" />
        </motion.div>

        <div className="space-y-8">
          {projects.map((project, i) => (
            <motion.div
              key={project.title}
              initial={{ opacity: 0, x: i % 2 === 0 ? -30 : 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.2, duration: 0.8 }}
              className={`glass-card p-8 border ${project.borderColor} bg-gradient-to-r ${project.color}`}
            >
              <div className="flex flex-col md:flex-row md:items-start gap-6">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <h2 className={`text-2xl font-bold ${project.accent}`}>{project.title}</h2>
                    <span className="px-2 py-0.5 bg-dark-700 text-gray-400 text-xs rounded-lg">
                      {project.status}
                    </span>
                  </div>
                  <EditableText contentKey={`projects.${i}.desc`} defaultValue={project.description} tag="p" className="text-gray-300 leading-relaxed mb-4" multiline />
                  <div className="flex flex-wrap gap-2">
                    {project.tags.map((tag) => (
                      <span key={tag} className="px-3 py-1 bg-dark-700/50 text-gray-400 text-sm rounded-lg">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mt-16 text-center"
        >
          <div className="glass-card p-8 inline-block">
            <EditableText contentKey="projects.cta.title" defaultValue="Хотите присоединиться?" tag="h3" className="text-xl font-bold text-white mb-3" />
            <EditableText contentKey="projects.cta.text" defaultValue="Следите за развитием проектов в TZ.Connect" tag="p" className="text-gray-400 mb-4" />
            <Link href="/connect" className="btn-primary inline-block">
              Перейти в TZ.Connect
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
