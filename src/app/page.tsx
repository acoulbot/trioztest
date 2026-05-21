"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { useState, useMemo } from "react";

/* ─────────────── Particle Systems ─────────────── */

function useParticles(count: number, seed: number) {
  return useMemo(() => {
    const particles = [];
    for (let i = 0; i < count; i++) {
      const s = seed + i * 137.508;
      particles.push({
        id: i,
        x: ((s * 7919) % 100),
        y: ((s * 104729) % 100),
        size: 2 + ((s * 31) % 4),
        delay: (i * 0.3) % 5,
        duration: 4 + ((s * 13) % 6),
      });
    }
    return particles;
  }, [count, seed]);
}

/* ─────────────── Window 1: Т.Р.И.О."Z" — Gaming World ─────────────── */

function GamingAnimation() {
  const particles = useParticles(20, 42);

  return (
    <div className="absolute inset-0 overflow-hidden">
      <svg className="absolute inset-0 w-full h-full opacity-10" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="hex-grid" width="56" height="100" patternUnits="userSpaceOnUse" patternTransform="scale(0.8)">
            <path d="M28 2L54 18V50L28 66L2 50V18Z" fill="none" stroke="rgba(255,68,68,0.3)" strokeWidth="0.5" />
            <path d="M28 52L54 68V100L28 116L2 100V68Z" fill="none" stroke="rgba(255,68,68,0.2)" strokeWidth="0.5" />
          </pattern>
        </defs>
        <motion.rect
          width="100%" height="100%" fill="url(#hex-grid)"
          animate={{ x: [0, 28, 0], y: [0, -50, 0] }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        />
      </svg>

      <motion.svg
        className="absolute w-20 h-20 text-fantasy-red/60"
        viewBox="0 0 80 80" fill="none"
        style={{ top: "15%", left: "20%" }}
        animate={{ y: [-8, 8, -8], rotate: [0, 5, -5, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      >
        <path d="M40 8L44 38H36L40 8Z" fill="currentColor" opacity="0.8" />
        <rect x="30" y="38" width="20" height="4" rx="1" fill="currentColor" opacity="0.6" />
        <rect x="36" y="42" width="8" height="16" rx="2" fill="currentColor" opacity="0.4" />
        <motion.circle cx="40" cy="25" r="12" fill="none" stroke="currentColor" strokeWidth="0.5" opacity="0.3"
          animate={{ r: [12, 18, 12], opacity: [0.3, 0.1, 0.3] }}
          transition={{ duration: 3, repeat: Infinity }}
        />
      </motion.svg>

      <motion.svg
        className="absolute w-16 h-16 text-fantasy-red/40"
        viewBox="0 0 64 64" fill="none"
        style={{ top: "55%", right: "15%" }}
        animate={{ y: [5, -5, 5], rotate: [-3, 3, -3] }}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
      >
        <path d="M32 6L8 18V36C8 48 32 58 32 58C32 58 56 48 56 36V18L32 6Z" 
          fill="currentColor" opacity="0.15" stroke="currentColor" strokeWidth="1.5" />
        <path d="M32 14L16 22V34C16 42 32 50 32 50C32 50 48 42 48 34V22L32 14Z" 
          fill="none" stroke="currentColor" strokeWidth="0.8" opacity="0.5" />
      </motion.svg>

      <motion.div
        className="absolute"
        style={{ top: "30%", right: "30%" }}
        animate={{ rotate: 360 }}
        transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
      >
        <svg className="w-14 h-14 text-fantasy-red/50" viewBox="0 0 56 56" fill="none">
          <motion.polygon
            points="28,4 48,20 40,52 16,52 8,20"
            fill="currentColor" opacity="0.1"
            stroke="currentColor" strokeWidth="1"
            animate={{ opacity: [0.1, 0.25, 0.1] }}
            transition={{ duration: 4, repeat: Infinity }}
          />
        </svg>
      </motion.div>

      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full bg-fantasy-red"
          style={{
            width: p.size,
            height: p.size,
            left: `${p.x}%`,
            top: `${p.y}%`,
          }}
          animate={{
            y: [0, -60, -120],
            opacity: [0, 0.8, 0],
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

      <motion.div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
        style={{ width: 120, height: 120 }}
      >
        {[0, 1, 2].map((ring) => (
          <motion.div
            key={ring}
            className="absolute inset-0 rounded-full border border-fantasy-red/20"
            animate={{ scale: [1, 2.5, 1], opacity: [0.3, 0, 0.3] }}
            transition={{ duration: 4, repeat: Infinity, delay: ring * 1.3, ease: "easeOut" }}
          />
        ))}
      </motion.div>
    </div>
  );
}

/* ─────────────── Window 2: Перо Измерений — Mystic Quill ─────────────── */

function QuillAnimation() {
  const particles = useParticles(15, 77);

  return (
    <div className="absolute inset-0 overflow-hidden">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute"
          style={{ left: `${p.x}%`, top: `${p.y}%` }}
          animate={{
            opacity: [0, 1, 0],
            scale: [0.5, 1.2, 0.5],
          }}
          transition={{
            duration: p.duration,
            repeat: Infinity,
            delay: p.delay,
          }}
        >
          <svg width={p.size * 3} height={p.size * 3} viewBox="0 0 12 12">
            <path d="M6 0L7 5L12 6L7 7L6 12L5 7L0 6L5 5Z" fill="rgba(139,92,246,0.6)" />
          </svg>
        </motion.div>
      ))}

      <motion.svg
        className="absolute text-fantasy-purple/70"
        style={{ top: "10%", left: "55%", width: 100, height: 100 }}
        viewBox="0 0 100 100" fill="none"
        animate={{ y: [-5, 5, -5], rotate: [-15, -10, -15] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      >
        <path d="M70 10C70 10 20 60 18 65C16 70 15 80 15 80L25 75C25 75 75 25 70 10Z"
          fill="currentColor" opacity="0.2" stroke="currentColor" strokeWidth="1" />
        <path d="M70 10L75 5C78 2 82 6 80 10L70 10Z"
          fill="currentColor" opacity="0.4" />
        <motion.circle cx="15" cy="80" r="3" fill="currentColor" opacity="0.5"
          animate={{ r: [3, 5, 3], opacity: [0.5, 0.2, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      </motion.svg>

      {["ᚠ", "ᛟ", "ᚢ", "ᛊ", "ᚨ"].map((rune, i) => (
        <motion.div
          key={rune}
          className="absolute text-fantasy-purple/40 font-bold select-none"
          style={{
            fontSize: 20 + i * 4,
            left: `${15 + i * 18}%`,
            top: `${40 + (i % 3) * 15}%`,
          }}
          animate={{
            y: [-10, 10, -10],
            opacity: [0.2, 0.6, 0.2],
            rotate: [0, 10, -10, 0],
          }}
          transition={{
            duration: 5 + i,
            repeat: Infinity,
            delay: i * 0.8,
          }}
        >
          {rune}
        </motion.div>
      ))}

      <motion.div className="absolute" style={{ bottom: "20%", left: "25%" }}>
        <svg width="80" height="80" viewBox="0 0 80 80">
          <motion.ellipse
            cx="40" cy="40" rx="35" ry="12"
            fill="none" stroke="rgba(139,92,246,0.3)" strokeWidth="1.5"
            animate={{ ry: [12, 20, 12], rx: [35, 30, 35], opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 5, repeat: Infinity }}
          />
          <motion.ellipse
            cx="40" cy="40" rx="25" ry="8"
            fill="rgba(139,92,246,0.05)" stroke="rgba(139,92,246,0.4)" strokeWidth="1"
            animate={{ ry: [8, 15, 8], rx: [25, 20, 25] }}
            transition={{ duration: 5, repeat: Infinity, delay: 0.3 }}
          />
        </svg>
      </motion.div>

      {[0, 1, 2].map((i) => (
        <motion.svg
          key={`page-${i}`}
          className="absolute text-fantasy-purple/30"
          style={{
            width: 30 + i * 5,
            height: 40 + i * 5,
            right: `${10 + i * 20}%`,
            top: `${15 + i * 25}%`,
          }}
          viewBox="0 0 30 40" fill="none"
          animate={{
            y: [-8, 8, -8],
            rotate: [-5 + i * 3, 5 - i * 3, -5 + i * 3],
          }}
          transition={{ duration: 6 + i, repeat: Infinity, ease: "easeInOut", delay: i * 0.5 }}
        >
          <rect x="2" y="2" width="26" height="36" rx="2" fill="currentColor" opacity="0.15" stroke="currentColor" strokeWidth="1" />
          <line x1="7" y1="10" x2="23" y2="10" stroke="currentColor" strokeWidth="0.5" opacity="0.5" />
          <line x1="7" y1="15" x2="20" y2="15" stroke="currentColor" strokeWidth="0.5" opacity="0.4" />
          <line x1="7" y1="20" x2="22" y2="20" stroke="currentColor" strokeWidth="0.5" opacity="0.3" />
        </motion.svg>
      ))}
    </div>
  );
}

/* ─────────────── Window 3: TZ.Connect — Network ─────────────── */

function NetworkAnimation() {
  const nodes = useMemo(() => [
    { x: 25, y: 20 }, { x: 75, y: 15 }, { x: 50, y: 45 },
    { x: 15, y: 65 }, { x: 80, y: 60 }, { x: 45, y: 80 },
    { x: 60, y: 25 }, { x: 35, y: 55 },
  ], []);

  const connections = useMemo(() => [
    [0, 2], [1, 2], [2, 3], [2, 4], [3, 5], [4, 5], [0, 6], [1, 6], [6, 2], [3, 7], [7, 2],
  ], []);

  return (
    <div className="absolute inset-0 overflow-hidden">
      <svg className="absolute inset-0 w-full h-full opacity-[0.06]">
        <defs>
          <pattern id="net-grid" width="30" height="30" patternUnits="userSpaceOnUse">
            <path d="M30 0L0 0L0 30" fill="none" stroke="rgba(0,240,255,0.5)" strokeWidth="0.3" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#net-grid)" />
      </svg>

      <svg className="absolute inset-0 w-full h-full">
        {connections.map(([from, to], i) => (
          <g key={`conn-${i}`}>
            <motion.line
              x1={`${nodes[from].x}%`} y1={`${nodes[from].y}%`}
              x2={`${nodes[to].x}%`} y2={`${nodes[to].y}%`}
              stroke="rgba(0,240,255,0.15)" strokeWidth="1"
              animate={{ opacity: [0.1, 0.3, 0.1] }}
              transition={{ duration: 3, repeat: Infinity, delay: i * 0.3 }}
            />
            <motion.circle
              r="2" fill="rgba(0,240,255,0.8)"
              animate={{
                cx: [`${nodes[from].x}%`, `${nodes[to].x}%`],
                cy: [`${nodes[from].y}%`, `${nodes[to].y}%`],
                opacity: [0, 1, 0],
              }}
              transition={{
                duration: 2 + (i % 3),
                repeat: Infinity,
                delay: i * 0.5,
                ease: "linear",
              }}
            />
          </g>
        ))}
      </svg>

      {nodes.map((node, i) => (
        <motion.div
          key={`node-${i}`}
          className="absolute"
          style={{ left: `${node.x}%`, top: `${node.y}%`, transform: "translate(-50%, -50%)" }}
        >
          <motion.div
            className="w-3 h-3 rounded-full bg-cyan-400/80"
            animate={{ scale: [1, 1.3, 1], opacity: [0.6, 1, 0.6] }}
            transition={{ duration: 2, repeat: Infinity, delay: i * 0.4 }}
          />
          <motion.div
            className="absolute inset-0 rounded-full border border-cyan-400/30"
            animate={{ scale: [1, 2.5, 1], opacity: [0.4, 0, 0.4] }}
            transition={{ duration: 3, repeat: Infinity, delay: i * 0.3 }}
          />
        </motion.div>
      ))}

      {[0, 1, 2, 3, 4].map((col) => (
        <div
          key={`rain-${col}`}
          className="absolute top-0 text-cyan-400/10 text-[10px] font-mono leading-tight select-none overflow-hidden"
          style={{ left: `${15 + col * 18}%`, height: "100%" }}
        >
          <motion.div
            animate={{ y: ["-100%", "100%"] }}
            transition={{ duration: 8 + col * 2, repeat: Infinity, ease: "linear", delay: col * 0.5 }}
          >
            {Array.from({ length: 15 }, (_, i) => (
              <div key={i}>{(col + i) % 2}</div>
            ))}
          </motion.div>
        </div>
      ))}

      {[0, 1, 2].map((i) => (
        <motion.svg
          key={`chat-${i}`}
          className="absolute text-cyan-400/25"
          style={{
            width: 24,
            height: 20,
            left: `${30 + i * 25}%`,
            bottom: `${10 + i * 15}%`,
          }}
          viewBox="0 0 24 20" fill="currentColor"
          animate={{ y: [-3, 3, -3], opacity: [0.2, 0.5, 0.2] }}
          transition={{ duration: 4, repeat: Infinity, delay: i * 1.2 }}
        >
          <path d="M2 2C2 0.9 2.9 0 4 0H20C21.1 0 22 0.9 22 2V12C22 13.1 21.1 14 20 14H8L2 20V2Z" />
        </motion.svg>
      ))}
    </div>
  );
}

/* ─────────────── Window 4: TZ.Library — Knowledge Vault ─────────────── */

function LibraryAnimation() {
  const particles = useParticles(12, 99);

  return (
    <div className="absolute inset-0 overflow-hidden">
      {[0, 1, 2].map((i) => (
        <motion.svg
          key={`book-${i}`}
          className="absolute text-fantasy-emerald/40"
          style={{
            width: 36 + i * 4,
            height: 28 + i * 4,
            left: `${15 + i * 30}%`,
            top: `${20 + i * 20}%`,
          }}
          viewBox="0 0 36 28" fill="none"
          animate={{
            y: [-6, 6, -6],
            rotate: [-3, 3, -3],
          }}
          transition={{ duration: 7 + i, repeat: Infinity, ease: "easeInOut", delay: i * 0.7 }}
        >
          <path d="M2 4C2 2 4 2 6 2H16L18 4L20 2H30C32 2 34 2 34 4V22C34 24 32 24 30 24H20L18 26L16 24H6C4 24 2 24 2 22V4Z"
            fill="currentColor" opacity="0.12" stroke="currentColor" strokeWidth="1" />
          <line x1="18" y1="4" x2="18" y2="24" stroke="currentColor" strokeWidth="0.5" opacity="0.4" />
        </motion.svg>
      ))}

      <motion.div
        className="absolute"
        style={{ right: "20%", top: "15%" }}
        animate={{ rotate: 360 }}
        transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
      >
        <svg width="80" height="80" viewBox="0 0 80 80">
          {[0, 1, 2, 3, 4, 5].map((i) => {
            const angle = (i * 60 * Math.PI) / 180;
            const x = 40 + 25 * Math.cos(angle);
            const y = 40 + 25 * Math.sin(angle);
            return (
              <motion.circle
                key={i}
                cx={x} cy={y} r="3"
                fill="rgba(16,185,129,0.4)"
                animate={{ r: [3, 5, 3], opacity: [0.3, 0.7, 0.3] }}
                transition={{ duration: 3, repeat: Infinity, delay: i * 0.5 }}
              />
            );
          })}
          <circle cx="40" cy="40" r="25" fill="none" stroke="rgba(16,185,129,0.15)" strokeWidth="0.5" strokeDasharray="4 4" />
        </svg>
      </motion.div>

      <motion.div
        className="absolute text-fantasy-emerald/30 text-lg font-mono select-none"
        style={{ left: "40%", top: "55%" }}
        animate={{ opacity: [0.2, 0.5, 0.2], rotate: [0, 5, -5, 0] }}
        transition={{ duration: 8, repeat: Infinity }}
      >
        ⟁∞◊☆
      </motion.div>

      <motion.svg
        className="absolute text-fantasy-emerald/30"
        style={{ left: "10%", bottom: "15%", width: 50, height: 70 }}
        viewBox="0 0 50 70" fill="none"
        animate={{ y: [-4, 4, -4], rotate: [-2, 2, -2] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      >
        <rect x="5" y="5" width="40" height="60" rx="3" fill="currentColor" opacity="0.1" stroke="currentColor" strokeWidth="1" />
        <line x1="15" y1="15" x2="35" y2="15" stroke="currentColor" strokeWidth="0.5" opacity="0.4" />
        <line x1="15" y1="22" x2="30" y2="22" stroke="currentColor" strokeWidth="0.5" opacity="0.3" />
        <line x1="15" y1="29" x2="33" y2="29" stroke="currentColor" strokeWidth="0.5" opacity="0.3" />
        <motion.rect x="10" y="40" width="30" height="2" fill="currentColor" opacity="0.2"
          animate={{ width: [0, 30, 30, 0] }}
          transition={{ duration: 4, repeat: Infinity }}
        />
      </motion.svg>

      <motion.svg
        className="absolute text-fantasy-emerald/50"
        style={{ right: "10%", bottom: "30%", width: 30, height: 30 }}
        viewBox="0 0 60 60" fill="none"
        animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.6, 0.3] }}
        transition={{ duration: 5, repeat: Infinity }}
      >
        <circle cx="30" cy="30" r="20" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="30" cy="30" r="8" fill="currentColor" opacity="0.3" />
        <circle cx="30" cy="24" r="3" fill="currentColor" opacity="0.6" />
      </motion.svg>

      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full bg-fantasy-emerald/40"
          style={{
            width: p.size,
            height: p.size,
            left: `${p.x}%`,
            top: `${p.y}%`,
          }}
          animate={{ opacity: [0, 0.6, 0], y: [0, -40] }}
          transition={{ duration: p.duration, repeat: Infinity, delay: p.delay }}
        />
      ))}
    </div>
  );
}

/* ─────────────── Section Data ─────────────── */

interface SectionData {
  id: string;
  title: string;
  subtitle: string;
  href: string;
  gradient: string;
  accent: string;
  borderColor: string;
  glowColor: string;
  animation: React.ReactNode;
}

const sections: SectionData[] = [
  {
    id: "trioz",
    title: "Т.Р.И.О.\"Z\"",
    subtitle: "MMORPG • Стратегии • Онлайн",
    href: "/projects",
    gradient: "from-red-950/80 via-rose-900/40 to-dark-900/90",
    accent: "text-fantasy-red",
    borderColor: "hover:border-fantasy-red/50",
    glowColor: "group-hover:shadow-[0_0_60px_rgba(255,68,68,0.25)]",
    animation: <GamingAnimation />,
  },
  {
    id: "pero",
    title: "Перо Измерений",
    subtitle: "Книги • Настольные игры • Офлайн",
    href: "/pero",
    gradient: "from-purple-950/80 via-violet-900/40 to-dark-900/90",
    accent: "text-fantasy-purple",
    borderColor: "hover:border-fantasy-purple/50",
    glowColor: "group-hover:shadow-[0_0_60px_rgba(139,92,246,0.25)]",
    animation: <QuillAnimation />,
  },
  {
    id: "connect",
    title: "TZ.Connect",
    subtitle: "Связь • IT-услуги • Бизнес",
    href: "/connect",
    gradient: "from-cyan-950/80 via-teal-900/40 to-dark-900/90",
    accent: "text-cyan-400",
    borderColor: "hover:border-cyan-400/50",
    glowColor: "group-hover:shadow-[0_0_60px_rgba(0,240,255,0.25)]",
    animation: <NetworkAnimation />,
  },
  {
    id: "library",
    title: "TZ.Library",
    subtitle: "Лор • Вики • История",
    href: "/library",
    gradient: "from-emerald-950/80 via-green-900/40 to-dark-900/90",
    accent: "text-fantasy-emerald",
    borderColor: "hover:border-fantasy-emerald/50",
    glowColor: "group-hover:shadow-[0_0_60px_rgba(16,185,129,0.25)]",
    animation: <LibraryAnimation />,
  },
];

/* ─────────────── Fullscreen Window Card ─────────────── */

function WindowCard({ section }: { section: SectionData }) {
  return (
    <Link href={section.href} className="block w-full h-full">
      <motion.div
        className={`group relative overflow-hidden w-full h-full bg-gradient-to-br ${section.gradient}
          border border-white/[0.06] cursor-pointer transition-all duration-700 ${section.borderColor} ${section.glowColor}`}
        whileHover={{ scale: 1.01 }}
        transition={{ duration: 0.4 }}
      >
        {/* Animation Layer */}
        <div className="absolute inset-0 transition-opacity duration-700 opacity-40 group-hover:opacity-80">
          {section.animation}
        </div>

        {/* Glass overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-dark-900/80 via-dark-900/30 to-transparent group-hover:from-dark-900/90 transition-all duration-500" />

        {/* Content */}
        <div className="relative z-10 h-full flex flex-col justify-end p-4 md:p-6">
          <motion.div
            className={`inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full border border-current/20 ${section.accent} text-[10px] md:text-xs font-medium mb-2 opacity-60 group-hover:opacity-100 transition-opacity w-fit`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
            {section.subtitle}
          </motion.div>

          <h3 className="text-xl md:text-2xl lg:text-3xl font-bold text-white group-hover:translate-x-1 transition-transform duration-500">
            {section.title}
          </h3>
        </div>
      </motion.div>
    </Link>
  );
}

/* ─────────────── Center Button ─────────────── */

function CenterButton() {
  const [hovered, setHovered] = useState(false);

  return (
    <div className="absolute inset-0 flex items-center justify-center z-30 pointer-events-none">
      <Link href="/about" className="pointer-events-auto">
        <motion.div
          className="relative cursor-pointer"
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.95 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
        >
          {/* Outer glow ring */}
          <motion.div
            className="absolute -inset-4 md:-inset-6 rounded-full"
            animate={hovered ? {
              background: [
                "radial-gradient(circle, rgba(0,240,255,0.3) 0%, transparent 70%)",
                "radial-gradient(circle, rgba(100,200,255,0.4) 0%, transparent 70%)",
                "radial-gradient(circle, rgba(0,240,255,0.3) 0%, transparent 70%)",
              ],
              scale: [1, 1.15, 1],
            } : {
              background: "radial-gradient(circle, rgba(0,240,255,0.1) 0%, transparent 70%)",
              scale: 1,
            }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          />

          {/* Pulsing rings */}
          {[0, 1, 2].map((ring) => (
            <motion.div
              key={ring}
              className="absolute -inset-3 md:-inset-5 rounded-full border"
              style={{
                borderColor: hovered ? "rgba(0,240,255,0.3)" : "rgba(0,240,255,0.1)",
              }}
              animate={{
                scale: [1, 1.5 + ring * 0.3, 1],
                opacity: [0.3, 0, 0.3],
              }}
              transition={{ duration: 3, repeat: Infinity, delay: ring * 0.8, ease: "easeOut" }}
            />
          ))}

          {/* Button with gradient border */}
          <motion.div
            className="relative w-20 h-20 md:w-28 md:h-28 lg:w-32 lg:h-32 rounded-full flex items-center justify-center overflow-hidden"
            style={{
              background: hovered
                ? "linear-gradient(135deg, rgba(0,240,255,0.2), rgba(100,180,255,0.15), rgba(0,200,230,0.2))"
                : "rgba(10,10,15,0.8)",
              border: "2px solid",
              borderColor: hovered ? "rgba(0,240,255,0.5)" : "rgba(255,255,255,0.1)",
              boxShadow: hovered
                ? "0 0 40px rgba(0,240,255,0.3), inset 0 0 30px rgba(0,240,255,0.1)"
                : "0 0 20px rgba(0,0,0,0.5)",
            }}
          >
            {/* Animated gradient overlay on hover */}
            <motion.div
              className="absolute inset-0 rounded-full"
              animate={hovered ? {
                background: [
                  "linear-gradient(0deg, rgba(0,240,255,0.15), rgba(100,200,255,0.05), transparent)",
                  "linear-gradient(120deg, rgba(0,200,255,0.15), rgba(80,220,255,0.1), transparent)",
                  "linear-gradient(240deg, rgba(0,240,255,0.15), rgba(100,200,255,0.05), transparent)",
                  "linear-gradient(360deg, rgba(0,240,255,0.15), rgba(100,200,255,0.05), transparent)",
                ],
              } : {
                background: "transparent",
              }}
              transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
            />

            {/* Emblem image */}
            <div className="relative w-14 h-14 md:w-20 md:h-20 lg:w-24 lg:h-24">
              <Image
                src="/emblem.png"
                alt="TrioZ"
                fill
                className="object-contain drop-shadow-[0_0_10px_rgba(0,240,255,0.3)]"
                priority
              />
            </div>
          </motion.div>
        </motion.div>
      </Link>
    </div>
  );
}

/* ─────────────── Main Page ─────────────── */

export default function HomePage() {
  return (
    <div className="h-screen w-screen overflow-hidden bg-dark-900 relative -mt-16">
      {/* Ambient background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[400px] h-[400px] bg-cyan-400/[0.02] rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-fantasy-purple/[0.02] rounded-full blur-[120px]" />
      </div>

      {/* 4 Fullscreen Windows in 2x2 Grid */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.5 }}
        className="relative z-10 grid grid-cols-2 grid-rows-2 w-full h-full"
      >
        {sections.map((section) => (
          <WindowCard key={section.id} section={section} />
        ))}
      </motion.div>

      {/* Center Button */}
      <CenterButton />
    </div>
  );
}
