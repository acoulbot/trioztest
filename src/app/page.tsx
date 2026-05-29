"use client";

import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { useEffect, useState, useMemo } from "react";
import { useSession, signOut } from "next-auth/react";
import { useTheme } from "@/components/Providers";
import { useInlineEdit } from "@/components/InlineEditContext";
import EditableText from "@/components/EditableText";

/* ─────────────── Types ─────────────── */

interface WindowData {
  id: string;
  windowKey: string;
  title: string;
  subtitle: string;
  description: string;
  href: string;
  accentColor: string;
  backgroundUrl: string | null;
  backgroundType: string;
  gradientFrom: string;
  gradientTo: string;
}

/* ─────────────── Particle System ─────────────── */

function useParticles(count: number, seed: number) {
  return useMemo(() => {
    const particles = [];
    for (let i = 0; i < count; i++) {
      const s = seed + i * 137.508;
      particles.push({
        id: i,
        x: (s * 7919) % 100,
        y: (s * 104729) % 100,
        size: 1.5 + ((s * 31) % 3),
        delay: (i * 0.4) % 6,
        duration: 5 + ((s * 13) % 8),
      });
    }
    return particles;
  }, [count, seed]);
}

/* ─────────────── Window Background Animation ─────────────── */

function WindowAnimation({ accentColor, seed }: { accentColor: string; seed: number }) {
  const particles = useParticles(6, seed);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full"
          style={{
            width: p.size,
            height: p.size,
            left: `${p.x}%`,
            top: `${p.y}%`,
            backgroundColor: accentColor,
          }}
          animate={{
            y: [0, -40, -80],
            opacity: [0, 0.4, 0],
            scale: [0.5, 1, 0.3],
          }}
          transition={{
            duration: p.duration,
            repeat: Infinity,
            delay: p.delay,
            ease: "easeOut",
          }}
        />
      ))}
    </div>
  );
}

/* ─────────────── Window Card ─────────────── */

function WindowCard({ window, index }: { window: WindowData; index: number }) {
  const [hovered, setHovered] = useState(false);
  const seeds = [42, 77, 123, 99];

  const bgStyle = window.backgroundType === "video" && window.backgroundUrl
    ? {}
    : {
        background: `linear-gradient(135deg, ${window.gradientFrom} 0%, ${window.gradientTo} 100%)`,
      };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.8, delay: index * 0.15, ease: [0.25, 0.1, 0.25, 1] }}
      className="relative"
    >
      <Link href={window.href}>
        <motion.div
          className="relative w-full h-full overflow-hidden cursor-pointer group"
          style={bgStyle}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          whileHover={{ scale: 1.01 }}
          transition={{ duration: 0.3 }}
        >
          {window.backgroundType === "video" && window.backgroundUrl && (
            <video
              autoPlay muted loop playsInline
              className="absolute inset-0 w-full h-full object-cover"
              src={window.backgroundUrl}
            />
          )}

          {window.backgroundType === "image" && window.backgroundUrl && (
            <div
              className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: `url(${window.backgroundUrl})` }}
            />
          )}

          <WindowAnimation accentColor={window.accentColor} seed={seeds[index] || 42} />

          <motion.div
            className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent"
            animate={{ opacity: hovered ? 0.5 : 0.7 }}
            transition={{ duration: 0.4 }}
          />

          <div className="relative z-10 flex flex-col justify-end h-full p-4 sm:p-6">
            <EditableText
              contentKey={`window.${window.windowKey}.title`}
              defaultValue={window.title}
              tag="h3"
              className="text-lg sm:text-xl md:text-2xl font-display font-bold text-white mb-1 group-hover:translate-x-1 transition-transform duration-500"
            />

            <motion.div
              animate={hovered ? { opacity: 1 } : { opacity: 0.3 }}
              transition={{ duration: 0.3 }}
            >
              <EditableText
                contentKey={`window.${window.windowKey}.subtitle`}
                defaultValue={window.subtitle}
                tag="p"
                className="text-gray-500 text-xs sm:text-sm"
              />
            </motion.div>
          </div>
        </motion.div>
      </Link>
    </motion.div>
  );
}

/* ─────────────── Center Logo Button ─────────────── */

function CenterLogoButton() {
  const [hovered, setHovered] = useState(false);

  return (
    <Link href="/about">
      <motion.div
        className="relative cursor-pointer"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 1, delay: 0.6, ease: [0.34, 1.56, 0.64, 1] }}
      >
        {/* Glow behind logo */}
        <motion.div
          className="absolute blur-2xl"
          style={{ inset: -16 }}
          animate={{
            background: hovered
              ? "radial-gradient(circle, rgba(100,200,255,0.35) 0%, transparent 70%)"
              : "radial-gradient(circle, rgba(255,255,255,0.03) 0%, transparent 70%)",
          }}
          transition={{ duration: 0.4 }}
        />

        {/* Logo image */}
        <motion.div
          className="relative w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32"
          animate={
            hovered
              ? { rotate: [0, 4, -4, 3, -3, 0], scale: 1.05 }
              : { rotate: 0, scale: 1 }
          }
          transition={
            hovered
              ? { rotate: { duration: 2.5, repeat: Infinity, ease: "easeInOut" }, scale: { duration: 0.4 } }
              : { duration: 0.4 }
          }
          style={{
            filter: hovered
              ? "drop-shadow(0 0 20px rgba(100,200,255,0.5)) drop-shadow(0 0 40px rgba(100,200,255,0.2))"
              : "drop-shadow(0 0 8px rgba(0,0,0,0.5))",
          }}
        >
          <Image
            src="/logo.png"
            alt="TrioZ"
            fill
            className="object-contain"
            priority
          />
        </motion.div>
      </motion.div>
    </Link>
  );
}

/* ─────────────── User Menu Overlay ─────────────── */

function UserMenu() {
  const { data: session } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const { editMode, toggleEditMode, isAdmin } = useInlineEdit();

  return (
    <div className="flex items-center gap-2">
      {/* Theme toggle */}
      <button
        onClick={toggleTheme}
        className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-all"
        title={theme === "dark" ? "Светлая тема" : "Тёмная тема"}
      >
        {theme === "dark" ? (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
        ) : (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
          </svg>
        )}
      </button>

      {isAdmin && (
        <button
          onClick={toggleEditMode}
          className={`p-2 rounded-xl transition-all ${
            editMode
              ? "bg-cyan-500 text-white shadow-lg shadow-cyan-500/30"
              : "text-gray-400 hover:text-white hover:bg-white/10"
          }`}
          title={editMode ? "Выключить редактирование" : "Редактировать сайт"}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </button>
      )}

      {!session ? (
        <Link href="/auth/signin">
          <motion.button
            className="px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300
              border border-white/10 text-gray-300 hover:text-cyan-400 hover:border-cyan-400/40
              hover:shadow-[0_0_20px_rgba(0,240,255,0.15)] backdrop-blur-xl bg-black/30"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Войти
          </motion.button>
        </Link>
      ) : (
        <div className="relative">
          <motion.button
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm
              border border-white/10 text-gray-300 backdrop-blur-xl bg-black/30
              hover:border-cyan-400/30 transition-all duration-300"
            whileHover={{ scale: 1.02 }}
          >
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-violet-400/30 to-indigo-500/30 flex items-center justify-center">
              <span className="text-[10px] font-bold text-white">
                {session.user?.name?.charAt(0) || "U"}
              </span>
            </div>
            <span className="hidden sm:inline text-xs">{session.user?.name}</span>
            <svg className={`w-3 h-3 transition-transform ${menuOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </motion.button>

          <AnimatePresence>
            {menuOpen && (
              <motion.div
                initial={{ opacity: 0, y: -8, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className="absolute right-0 top-full mt-2 w-48 rounded-xl border border-white/10 bg-neutral-900/95 backdrop-blur-xl shadow-2xl overflow-hidden z-50"
              >
                <div className="p-3 border-b border-white/5">
                  <p className="text-xs text-gray-400">Вы вошли как</p>
                  <p className="text-sm text-white font-medium truncate">{session.user?.name}</p>
                  <p className="text-[10px] text-gray-500 truncate">{session.user?.email}</p>
                </div>

                <div className="p-1">
                  {(session.user as { role?: string })?.role === "ADMIN" && (
                    <Link
                      href="/admin"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-2 px-3 py-2 text-sm text-amber-400 hover:bg-white/5 rounded-lg transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      Админ-панель
                    </Link>
                  )}

                  <Link
                    href="/projects"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                    </svg>
                    Проекты
                  </Link>

                  <button
                    onClick={() => { signOut(); setMenuOpen(false); }}
                    className="flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-white/5 rounded-lg transition-colors w-full text-left"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    Выйти
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

/* ─────────────── Main Page ─────────────── */

export default function HomePage() {
  const [windows, setWindows] = useState<WindowData[]>([]);

  useEffect(() => {
    fetch("/api/windows")
      .then((r) => r.json())
      .then((data) => setWindows(data))
      .catch(() => {
        setWindows([
          {
            id: "1", windowKey: "trioz", title: 'Проекты Т.Р.И.О."Z"',
            subtitle: "MMORPG • Стратегии • Онлайн",
            description: "Глобальная MMORPG с элементами стратегии и бесконечным миром",
            href: "/projects", accentColor: "#ff4444", backgroundUrl: null,
            backgroundType: "gradient", gradientFrom: "#1a0000", gradientTo: "#0a0a0f",
          },
          {
            id: "2", windowKey: "pero", title: "Перо Измерений",
            subtitle: "Книги • Настольные игры • Офлайн",
            description: "Развлекательные товары для развития мышления",
            href: "/pero", accentColor: "#8b5cf6", backgroundUrl: null,
            backgroundType: "gradient", gradientFrom: "#1a002e", gradientTo: "#0a0a0f",
          },
          {
            id: "3", windowKey: "connect", title: "TZ.Connect",
            subtitle: "Связь • IT-услуги • Бизнес",
            description: "Коммуникационная платформа и IT-решения",
            href: "/connect", accentColor: "#00f0ff", backgroundUrl: null,
            backgroundType: "gradient", gradientFrom: "#001a1f", gradientTo: "#0a0a0f",
          },
          {
            id: "4", windowKey: "library", title: "TZ.Library",
            subtitle: "Лор • Вики • История",
            description: "Хранилище знаний и лора вселенной",
            href: "/library", accentColor: "#10b981", backgroundUrl: null,
            backgroundType: "gradient", gradientFrom: "#001a0e", gradientTo: "#0a0a0f",
          },
        ]);
      });
  }, []);

  return (
    <div className="fixed inset-0 bg-neutral-950 overflow-hidden">
      {/* Top right: Auth button + Theme toggle */}
      <div className="fixed top-4 right-4 z-50">
        <UserMenu />
      </div>

      {/* 4 Windows Grid */}
      <div className="absolute inset-0 grid grid-cols-2 grid-rows-2 gap-[1px] [&>*]:min-h-[160px]" style={{ backgroundColor: "rgba(255,255,255,0.03)" }}>
        {windows.map((win, i) => (
          <WindowCard key={win.id} window={win} index={i} />
        ))}
      </div>

      {/* Center Logo Button */}
      <div className="fixed inset-0 flex items-center justify-center z-40 pointer-events-none">
        <div className="pointer-events-auto">
          <CenterLogoButton />
        </div>
      </div>
    </div>
  );
}
