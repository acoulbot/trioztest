"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function Navbar() {
  const { data: session } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);

  const navLinks = [
    { href: "/", label: "Главная" },
    { href: "/projects", label: "Т.Р.И.О.Z" },
    { href: "/pero", label: "Перо Измерений" },
    { href: "/connect", label: "TZ.Connect" },
    { href: "/library", label: "TZ.Library" },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-dark-900/80 backdrop-blur-xl border-b border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 bg-gradient-to-br from-cyan-400 to-fantasy-purple rounded-lg flex items-center justify-center
              transition-all duration-300 group-hover:shadow-[0_0_20px_rgba(0,240,255,0.5)]">
              <span className="text-white font-bold text-sm">TZ</span>
            </div>
            <span className="text-white font-bold text-lg hidden sm:block">
              Trio<span className="text-cyan-400">Z</span>
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="px-3 py-2 text-sm text-gray-300 hover:text-cyan-400 transition-colors duration-300 rounded-lg hover:bg-white/5"
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-3">
            {session ? (
              <div className="flex items-center gap-3">
                {session.user.role === "ADMIN" && (
                  <Link
                    href="/admin"
                    className="text-sm text-fantasy-gold hover:text-yellow-300 transition-colors"
                  >
                    Админ
                  </Link>
                )}
                <span className="text-sm text-gray-400 hidden sm:block">{session.user.name}</span>
                <button
                  onClick={() => signOut()}
                  className="text-sm text-gray-400 hover:text-red-400 transition-colors"
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
              className="md:hidden p-2 text-gray-400 hover:text-white"
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
            className="md:hidden bg-dark-800/95 backdrop-blur-xl border-b border-white/5"
          >
            <div className="px-4 py-3 space-y-1">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  className="block px-3 py-2 text-gray-300 hover:text-cyan-400 hover:bg-white/5 rounded-lg transition-colors"
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
