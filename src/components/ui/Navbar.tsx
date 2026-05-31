"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { usePathname } from "next/navigation";
import { useTheme } from "@/components/Providers";
import { useInlineEdit } from "@/components/InlineEditContext";
import SearchDialog from "@/components/ui/SearchDialog";
import { Search, Sun, Moon, SquarePen, ChevronDown, Bell, Settings, LogOut, Menu, X } from "lucide-react";

export default function Navbar() {
  const { data: session } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const { editMode, toggleEditMode, isAdmin } = useInlineEdit();
  const pathname = usePathname();

  const handleSearchToggle = useCallback(() => setSearchOpen((o) => !o), []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  // Close mobile menu on route change
  useEffect(() => { setMenuOpen(false); }, [pathname]);

  const navLinks = [
    { href: "/", label: "Главная" },
    { href: "/connect", label: "TZ.Connect" },
    { href: "/projects", label: "T.R.I.O.Z." },
    { href: "/pero", label: "Перо измерений" },
    { href: "/games", label: "Игры" },
    { href: "/library", label: "TZ.Library" },
  ];

  /** Exact match for "/" only, prefix match for everything else */
  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(href + "/");

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 dark:bg-neutral-950/80 backdrop-blur-xl border-b border-neutral-200 dark:border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Navigation links */}
          <div className="hidden md:flex items-center gap-0.5">
            {navLinks.map((link) => {
              const active = isActive(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`relative px-3 py-2 text-sm rounded-lg transition-all duration-200 ${
                    active
                      ? "text-accent font-medium"
                      : "text-neutral-600 dark:text-gray-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-white/5"
                  }`}
                >
                  {link.label}
                  {active && (
                    <motion.span
                      layoutId="nav-indicator"
                      className="absolute inset-0 rounded-lg bg-violet-50 dark:bg-cyan-400/10 -z-10"
                      transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
                    />
                  )}
                </Link>
              );
            })}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-2 ml-auto">
            {/* Search */}
            <button
              onClick={handleSearchToggle}
              className="p-2 rounded-lg text-neutral-500 dark:text-gray-400 hover:bg-neutral-100 dark:hover:bg-white/5 transition-colors flex items-center gap-1.5"
              title="Поиск (Ctrl+K)"
            >
              <Search className="w-5 h-5" strokeWidth={2} />
              <kbd className="hidden lg:block text-[10px] text-neutral-400 bg-neutral-100 dark:bg-neutral-800 px-1 py-0.5 rounded border border-neutral-200 dark:border-white/10">
                Ctrl+K
              </kbd>
            </button>

            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg text-neutral-500 dark:text-gray-400 hover:bg-neutral-100 dark:hover:bg-white/5 transition-colors"
              title={theme === "dark" ? "Светлая тема" : "Тёмная тема"}
            >
              {theme === "dark" ? (
                <Sun className="w-5 h-5" strokeWidth={2} />
              ) : (
                <Moon className="w-5 h-5" strokeWidth={2} />
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
                    <SquarePen className="w-4 h-4" strokeWidth={2} />
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

                {/* User menu with hover dropdown */}
                <div className="relative group hidden sm:block">
                  <button className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-white/5 transition-colors">
                    <span className="text-sm text-neutral-500 dark:text-gray-400">{session.user?.name}</span>
                    <ChevronDown className="w-3 h-3 text-neutral-400" strokeWidth={2} />
                  </button>

                  {/* Dropdown */}
                  <div className="absolute right-0 top-full mt-1 w-44 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-white/10 rounded-xl shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 z-50 overflow-hidden">
                    <Link
                      href="/settings/notifications"
                      className="flex items-center gap-2 px-4 py-2.5 text-sm text-neutral-700 dark:text-gray-300 hover:bg-neutral-50 dark:hover:bg-white/5 transition-colors"
                    >
                      <Bell className="w-4 h-4 text-neutral-400" strokeWidth={2} />
                      Уведомления
                    </Link>
                    <Link
                      href="/settings"
                      className="flex items-center gap-2 px-4 py-2.5 text-sm text-neutral-700 dark:text-gray-300 hover:bg-neutral-50 dark:hover:bg-white/5 transition-colors"
                    >
                      <Settings className="w-4 h-4 text-neutral-400" strokeWidth={2} />
                      Настройки профиля
                    </Link>
                    <div className="border-t border-neutral-100 dark:border-white/5" />
                    <button
                      onClick={() => signOut()}
                      className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-500/5 transition-colors"
                    >
                      <LogOut className="w-4 h-4" strokeWidth={2} />
                      Выйти
                    </button>
                  </div>
                </div>

                {/* Mobile: simple sign out */}
                <button
                  onClick={() => signOut()}
                  className="sm:hidden text-sm text-neutral-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
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
              {menuOpen ? (
                <X className="w-6 h-6" strokeWidth={2} />
              ) : (
                <Menu className="w-6 h-6" strokeWidth={2} />
              )}
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
              {navLinks.map((link) => {
                const active = isActive(link.href);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMenuOpen(false)}
                    className={`block px-3 py-2 rounded-lg transition-colors text-sm ${
                      active
                        ? "bg-violet-50 dark:bg-cyan-400/10 text-accent font-medium"
                        : "text-neutral-700 dark:text-gray-300 hover:text-violet-600 dark:hover:text-cyan-400 hover:bg-neutral-50 dark:hover:bg-white/5"
                    }`}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <SearchDialog open={searchOpen} onClose={() => setSearchOpen(false)} />
    </nav>
  );
}
