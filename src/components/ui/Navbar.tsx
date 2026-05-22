"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "@/components/Providers";
import { useInlineEdit } from "@/components/InlineEditContext";

export default function Navbar() {
  const { data: session } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const { editMode, toggleEditMode, isAdmin } = useInlineEdit();

  const navLinks = [
    { href: "/", label: "Главная" },
    { href: "/projects", label: "Т.Р.И.О.Z" },
    { href: "/pero", label: "Перо Измерений" },
    { href: "/connect", label: "TZ.Connect" },
    { href: "/library", label: "TZ.Library" },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 dark:bg-neutral-950/80 backdrop-blur-xl border-b border-neutral-200 dark:border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Navigation links */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="px-3 py-2 text-sm text-neutral-600 dark:text-gray-300 hover:text-violet-600 dark:hover:text-cyan-400 transition-colors duration-300 rounded-lg hover:bg-neutral-100 dark:hover:bg-white/5"
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-2 ml-auto">
            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg text-neutral-500 dark:text-gray-400 hover:bg-neutral-100 dark:hover:bg-white/5 transition-colors"
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

            {session ? (
              <div className="flex items-center gap-2">
                {isAdmin && (
                  <button
                    onClick={toggleEditMode}
                    className={`text-sm px-3 py-1.5 rounded-lg transition-all duration-300 flex items-center gap-1.5 ${
                      editMode
                        ? "bg-violet-500 dark:bg-cyan-500 text-white shadow-lg shadow-violet-500/30 dark:shadow-cyan-500/30"
                        : "text-neutral-500 dark:text-gray-400 hover:text-violet-600 dark:hover:text-cyan-400 hover:bg-neutral-100 dark:hover:bg-white/5"
                    }`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    <span className="hidden sm:inline">{editMode ? "Редактирование" : "Редактировать"}</span>
                  </button>
                )}
                {isAdmin && (
                  <Link
                    href="/admin"
                    className="text-sm text-amber-600 dark:text-fantasy-gold hover:text-amber-500 dark:hover:text-yellow-300 transition-colors"
                  >
                    Админ
                  </Link>
                )}
                <span className="text-sm text-neutral-500 dark:text-gray-400 hidden sm:block">{session.user?.name}</span>
                <button
                  onClick={() => signOut()}
                  className="text-sm text-neutral-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                >
                  Выход
                </button>
              </div>
            ) : (
              <Link href="/auth/signin" className="btn-secondary text-sm !px-4 !py-2">
                Войти
              </Link>
            )}

            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="md:hidden p-2 text-neutral-500 dark:text-gray-400 hover:text-neutral-900 dark:hover:text-white"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {menuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-white/95 dark:bg-neutral-900/95 backdrop-blur-xl border-b border-neutral-200 dark:border-white/5"
          >
            <div className="px-4 py-3 space-y-1">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  className="block px-3 py-2 text-neutral-700 dark:text-gray-300 hover:text-violet-600 dark:hover:text-cyan-400 hover:bg-neutral-50 dark:hover:bg-white/5 rounded-lg transition-colors"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
