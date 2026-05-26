"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";

interface Stats {
  users: number;
  channels: number;
  articles: number;
  services: number;
}

interface MainCommunityInfo {
  id?: string;
  name?: string;
  exists?: boolean;
}

export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [stats, setStats] = useState<Stats>({ users: 0, channels: 0, articles: 0, services: 0 });
  const [mainCommunity, setMainCommunity] = useState<MainCommunityInfo | null>(null);
  const [settingUp, setSettingUp] = useState(false);

  useEffect(() => {
    if (status === "authenticated" && session?.user?.role !== "ADMIN") {
      router.push("/");
    }
  }, [session, status, router]);

  useEffect(() => {
    if (session?.user?.role === "ADMIN") {
      Promise.all([
        fetch("/api/users").then((r) => r.ok ? r.json() : []),
        fetch("/api/channels").then((r) => r.ok ? r.json() : []),
        fetch("/api/articles").then((r) => r.ok ? r.json() : []),
        fetch("/api/services").then((r) => r.ok ? r.json() : []),
      ]).then(([users, channels, articles, services]) => {
        setStats({
          users: Array.isArray(users) ? users.length : 0,
          channels: Array.isArray(channels) ? channels.length : 0,
          articles: Array.isArray(articles) ? articles.length : 0,
          services: Array.isArray(services) ? services.length : 0,
        });
      }).catch(() => {});
      fetch("/api/groups/main-community").then((r) => r.ok ? r.json() : { exists: false }).then(setMainCommunity).catch(() => {});
    }
  }, [session]);

  const handleSetupMainCommunity = async () => {
    setSettingUp(true);
    const res = await fetch("/api/groups/main-community", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "TZ Connect" }),
    });
    const data = await res.json();
    setMainCommunity(data);
    setSettingUp(false);
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-dark-900">
        <div className="animate-spin w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (session?.user?.role !== "ADMIN") return null;

  const cards = [
    {
      title: "Пользователи",
      count: stats.users,
      href: "/admin/users",
      icon: "👥",
      description: "Управление, баны, роли",
      color: "from-cyan-400/20 to-blue-600/20",
      borderColor: "border-cyan-400/20 hover:border-cyan-400/40",
    },
    {
      title: "Контент",
      count: stats.articles,
      href: "/admin/content",
      icon: "📝",
      description: "Статьи, категории",
      color: "from-fantasy-emerald/20 to-green-600/20",
      borderColor: "border-fantasy-emerald/20 hover:border-fantasy-emerald/40",
    },
    {
      title: "Услуги",
      count: stats.services,
      href: "/admin/services",
      icon: "⚡",
      description: "Каталог услуг TZ.Connect",
      color: "from-fantasy-gold/20 to-yellow-600/20",
      borderColor: "border-fantasy-gold/20 hover:border-fantasy-gold/40",
    },
    {
      title: "Экосистема",
      count: "-",
      href: "/admin/ecosystem",
      icon: "🌐",
      description: "Элементы экосистемы",
      color: "from-fantasy-purple/20 to-purple-600/20",
      borderColor: "border-fantasy-purple/20 hover:border-fantasy-purple/40",
    },
    {
      title: "Окна главной",
      count: "4",
      href: "/admin/windows",
      icon: "🖼️",
      description: "Фоны, анимации, контент окон",
      color: "from-red-400/20 to-orange-600/20",
      borderColor: "border-red-400/20 hover:border-red-400/40",
    },
    {
      title: "ИИ-ассистент",
      count: "AI",
      href: "/admin/ai",
      icon: "🧠",
      description: "API ключ, модель, промт",
      color: "from-violet-400/20 to-indigo-600/20",
      borderColor: "border-violet-400/20 hover:border-violet-400/40",
    },
    {
      title: "Логи редактора",
      count: "📋",
      href: "/admin/logs",
      icon: "📋",
      description: "Кто что редактировал",
      color: "from-gray-400/20 to-slate-600/20",
      borderColor: "border-gray-400/20 hover:border-gray-400/40",
    },
  ];

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-dark-900 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold text-white mb-2">Панель администратора</h1>
          <p className="text-gray-400">Управление экосистемой TrioZ</p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {cards.map((card, i) => (
            <motion.div
              key={card.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <Link href={card.href}>
                <div className={`glass-card p-6 border ${card.borderColor} bg-gradient-to-br ${card.color} group cursor-pointer transition-all duration-500 hover:shadow-lg`}>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-3xl group-hover:scale-110 transition-transform duration-300">{card.icon}</span>
                    <span className="text-2xl font-bold text-white">{card.count}</span>
                  </div>
                  <h3 className="text-white font-semibold mb-1">{card.title}</h3>
                  <p className="text-gray-400 text-sm">{card.description}</p>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>

        <div className="glass-card p-6">
          <h3 className="text-lg font-bold text-white mb-4">Быстрые действия</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <Link href="/admin/content" className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors text-gray-300 hover:text-white">
              <span className="text-xl">➕</span>
              <span>Создать статью</span>
            </Link>
            <Link href="/admin/services" className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors text-gray-300 hover:text-white">
              <span className="text-xl">⚡</span>
              <span>Управление услугами</span>
            </Link>
            <Link href="/admin/users" className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors text-gray-300 hover:text-white">
              <span className="text-xl">🔒</span>
              <span>Управление пользователями</span>
            </Link>
            <Link href="/admin/ecosystem" className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors text-gray-300 hover:text-white">
              <span className="text-xl">🌐</span>
              <span>Добавить элемент экосистемы</span>
            </Link>
            <Link href="/admin/windows" className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors text-gray-300 hover:text-white">
              <span className="text-xl">🖼️</span>
              <span>Настроить окна главной</span>
            </Link>
            <Link href="/admin/ai" className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors text-gray-300 hover:text-white">
              <span className="text-xl">🧠</span>
              <span>Настроить ИИ-ассистент</span>
            </Link>
            <Link href="/admin/logs" className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors text-gray-300 hover:text-white">
              <span className="text-xl">📋</span>
              <span>Логи редактора сайта</span>
            </Link>
          </div>
        </div>

        {/* Main Community Section */}
        <div className="glass-card p-6 mt-6">
          <h3 className="text-lg font-bold text-white mb-4">🏰 Главное сообщество</h3>
          {mainCommunity?.id ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <span className="text-sm text-green-400">✔ Настроено</span>
                <span className="text-sm text-gray-400">{mainCommunity.name}</span>
              </div>
              <button
                onClick={async () => { await fetch("/api/groups/main-community", { method: "PUT" }); alert("Услуги синхронизированы!"); }}
                className="px-4 py-2 bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 rounded-xl text-sm hover:bg-cyan-500/30 transition-colors"
              >
                Синхронизировать услуги
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-gray-400">Главное сообщество ещё не создано. Создайте его, чтобы все новые пользователи автоматически вступали.</p>
              <button
                onClick={handleSetupMainCommunity}
                disabled={settingUp}
                className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl text-sm font-medium hover:shadow-lg transition-all disabled:opacity-50"
              >
                {settingUp ? "Создание..." : "Создать главное сообщество"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
