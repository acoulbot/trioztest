"use client";

import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import Link from "next/link";
import { useEffect, useState, useMemo } from "react";

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

/* ─────────────── Animated Counter ─────────────── */

function AnimatedCounter({ value, duration = 2 }: { value: number; duration?: number }) {
  const count = useMotionValue(0);
  const rounded = useTransform(count, (v) => Math.round(v));
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const controls = animate(count, value, { duration });
    const unsub = rounded.on("change", (v) => setDisplay(v));
    return () => { controls.stop(); unsub(); };
  }, [value, duration, count, rounded]);

  return <span>{display}</span>;
}

/* ─────────────── Window 1: Т.Р.И.О."Z" — Gaming World ─────────────── */

function GamingAnimation() {
  const particles = useParticles(20, 42);

  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* Hexagonal Grid */}
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

      {/* Floating Sword */}
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

      {/* Shield */}
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
        <motion.path
          d="M32 22L38 30H26L32 22Z"
          fill="currentColor" opacity="0.4"
          animate={{ opacity: [0.4, 0.8, 0.4] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      </motion.svg>

      {/* Rotating Crystal */}
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
          <motion.polygon
            points="28,12 40,22 36,44 20,44 16,22"
            fill="none" stroke="currentColor" strokeWidth="0.5" opacity="0.5"
            animate={{ rotate: [0, 360] }}
            transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
          />
        </svg>
      </motion.div>

      {/* Dice */}
      <motion.svg
        className="absolute w-10 h-10 text-fantasy-red/50"
        viewBox="0 0 40 40" fill="none"
        style={{ bottom: "25%", left: "15%" }}
        animate={{ y: [-4, 4, -4], rotate: [0, 10, -10, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
      >
        <rect x="4" y="4" width="32" height="32" rx="4" fill="currentColor" opacity="0.15" stroke="currentColor" strokeWidth="1" />
        <circle cx="14" cy="14" r="2.5" fill="currentColor" opacity="0.6" />
        <circle cx="26" cy="14" r="2.5" fill="currentColor" opacity="0.6" />
        <circle cx="14" cy="26" r="2.5" fill="currentColor" opacity="0.6" />
        <circle cx="26" cy="26" r="2.5" fill="currentColor" opacity="0.6" />
        <circle cx="20" cy="20" r="2.5" fill="currentColor" opacity="0.6" />
      </motion.svg>

      {/* Energy Particles */}
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

      {/* Pulsing Rings */}
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
      {/* Magical Starfield */}
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

      {/* Animated Quill */}
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
        <motion.path
          d="M18 65C18 65 20 72 15 80"
          stroke="currentColor" strokeWidth="1.5" opacity="0.6"
          strokeDasharray="30"
          animate={{ strokeDashoffset: [30, 0, 30] }}
          transition={{ duration: 3, repeat: Infinity }}
        />
        {/* Ink drops */}
        <motion.circle cx="15" cy="80" r="3" fill="currentColor" opacity="0.5"
          animate={{ r: [3, 5, 3], opacity: [0.5, 0.2, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      </motion.svg>

      {/* Floating Rune Symbols */}
      {["ᚠ", "ᛟ", "ᚢ", "ᛊ", "ᚨ"].map((rune, i) => (
        <motion.div
          key={i}
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

      {/* Dimension Portal */}
      <motion.div
        className="absolute"
        style={{ bottom: "20%", left: "25%" }}
      >
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
          <motion.ellipse
            cx="40" cy="40" rx="15" ry="5"
            fill="rgba(139,92,246,0.1)" stroke="rgba(139,92,246,0.5)" strokeWidth="0.5"
            animate={{ ry: [5, 10, 5], rx: [15, 12, 15] }}
            transition={{ duration: 5, repeat: Infinity, delay: 0.6 }}
          />
        </svg>
      </motion.div>

      {/* Floating Pages */}
      {[0, 1, 2].map((i) => (
        <motion.svg
          key={i}
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
            x: [-3, 3, -3],
          }}
          transition={{ duration: 6 + i, repeat: Infinity, ease: "easeInOut", delay: i * 0.5 }}
        >
          <rect x="2" y="2" width="26" height="36" rx="2" fill="currentColor" opacity="0.15" stroke="currentColor" strokeWidth="1" />
          <line x1="7" y1="10" x2="23" y2="10" stroke="currentColor" strokeWidth="0.5" opacity="0.5" />
          <line x1="7" y1="15" x2="20" y2="15" stroke="currentColor" strokeWidth="0.5" opacity="0.4" />
          <line x1="7" y1="20" x2="22" y2="20" stroke="currentColor" strokeWidth="0.5" opacity="0.3" />
          <line x1="7" y1="25" x2="18" y2="25" stroke="currentColor" strokeWidth="0.5" opacity="0.2" />
        </motion.svg>
      ))}

      {/* Magical Spiral */}
      <motion.svg
        className="absolute opacity-20"
        style={{ top: "5%", left: "10%", width: 60, height: 60 }}
        viewBox="0 0 60 60"
        animate={{ rotate: 360 }}
        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
      >
        <motion.path
          d="M30 10C40 10 50 20 50 30C50 40 40 50 30 50C20 50 14 42 14 34C14 26 20 20 28 20C36 20 40 26 40 32"
          fill="none" stroke="rgba(139,92,246,0.6)" strokeWidth="1.5"
          strokeDasharray="150"
          animate={{ strokeDashoffset: [150, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
        />
      </motion.svg>
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
      {/* Grid Background */}
      <svg className="absolute inset-0 w-full h-full opacity-[0.06]">
        <defs>
          <pattern id="net-grid" width="30" height="30" patternUnits="userSpaceOnUse">
            <path d="M30 0L0 0L0 30" fill="none" stroke="rgba(0,240,255,0.5)" strokeWidth="0.3" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#net-grid)" />
      </svg>

      {/* Connection Lines with traveling data packets */}
      <svg className="absolute inset-0 w-full h-full">
        {connections.map(([from, to], i) => (
          <g key={i}>
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

      {/* Network Nodes */}
      {nodes.map((node, i) => (
        <motion.div
          key={i}
          className="absolute"
          style={{ left: `${node.x}%`, top: `${node.y}%`, transform: "translate(-50%, -50%)" }}
        >
          <motion.div
            className="relative"
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 3, repeat: Infinity, delay: i * 0.4 }}
          >
            <div className="w-4 h-4 bg-cyan-400/30 rounded-full border border-cyan-400/50 flex items-center justify-center">
              <div className="w-2 h-2 bg-cyan-400/80 rounded-full" />
            </div>
            <motion.div
              className="absolute inset-0 rounded-full border border-cyan-400/20"
              animate={{ scale: [1, 2.5], opacity: [0.4, 0] }}
              transition={{ duration: 2, repeat: Infinity, delay: i * 0.3 }}
            />
          </motion.div>
        </motion.div>
      ))}

      {/* Signal Waves */}
      <motion.div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
        {[0, 1, 2, 3].map((wave) => (
          <motion.div
            key={wave}
            className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan-400/15"
            style={{ width: 40, height: 40 }}
            animate={{ scale: [1, 5], opacity: [0.3, 0] }}
            transition={{ duration: 4, repeat: Infinity, delay: wave * 1, ease: "easeOut" }}
          />
        ))}
      </motion.div>

      {/* Binary Rain (subtle) */}
      {[0, 1, 2, 3, 4].map((col) => (
        <motion.div
          key={col}
          className="absolute text-[8px] text-cyan-400/20 font-mono leading-tight select-none"
          style={{ left: `${15 + col * 18}%`, top: "-20%" }}
          animate={{ y: ["0%", "120%"] }}
          transition={{ duration: 8 + col * 2, repeat: Infinity, ease: "linear", delay: col * 1.5 }}
        >
          {Array.from({ length: 15 }, (_, j) => (
            <div key={j}>{((col * 7 + j * 13) % 2).toString()}</div>
          ))}
        </motion.div>
      ))}

      {/* Chat Bubbles */}
      {[
        { x: "12%", y: "30%", delay: 0 },
        { x: "70%", y: "40%", delay: 2 },
        { x: "40%", y: "70%", delay: 4 },
      ].map((bubble, i) => (
        <motion.svg
          key={i}
          className="absolute text-cyan-400/25"
          style={{ left: bubble.x, top: bubble.y, width: 28, height: 24 }}
          viewBox="0 0 28 24" fill="none"
          animate={{ y: [-3, 3, -3], opacity: [0.2, 0.5, 0.2] }}
          transition={{ duration: 4, repeat: Infinity, delay: bubble.delay }}
        >
          <path d="M2 2H22C23.1 2 24 2.9 24 4V14C24 15.1 23.1 16 22 16H8L4 20V16H4C2.9 16 2 15.1 2 14V4C2 2.9 2.9 2 4 2Z"
            fill="currentColor" opacity="0.3" stroke="currentColor" strokeWidth="0.8" />
          <line x1="6" y1="7" x2="18" y2="7" stroke="currentColor" strokeWidth="0.5" opacity="0.5" />
          <line x1="6" y1="10" x2="15" y2="10" stroke="currentColor" strokeWidth="0.5" opacity="0.4" />
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
      {/* Knowledge Orbs */}
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full"
          style={{
            width: p.size + 2,
            height: p.size + 2,
            left: `${p.x}%`,
            top: `${p.y}%`,
            background: "radial-gradient(circle, rgba(16,185,129,0.4) 0%, transparent 70%)",
          }}
          animate={{
            y: [0, -30, 0],
            opacity: [0.2, 0.7, 0.2],
            scale: [0.8, 1.3, 0.8],
          }}
          transition={{
            duration: p.duration,
            repeat: Infinity,
            delay: p.delay,
          }}
        />
      ))}

      {/* Floating Books */}
      {[0, 1, 2].map((i) => (
        <motion.svg
          key={i}
          className="absolute text-fantasy-emerald/40"
          style={{
            width: 36 + i * 8,
            height: 44 + i * 8,
            left: `${20 + i * 25}%`,
            top: `${20 + (i % 2) * 35}%`,
          }}
          viewBox="0 0 36 44" fill="none"
          animate={{
            y: [-6, 6, -6],
            rotate: [-3 + i * 2, 3 - i * 2, -3 + i * 2],
          }}
          transition={{ duration: 5 + i * 1.5, repeat: Infinity, ease: "easeInOut", delay: i * 0.7 }}
        >
          {/* Book spine */}
          <rect x="4" y="4" width="28" height="36" rx="2" fill="currentColor" opacity="0.15" stroke="currentColor" strokeWidth="1" />
          <line x1="10" y1="4" x2="10" y2="40" stroke="currentColor" strokeWidth="0.8" opacity="0.4" />
          {/* Pages */}
          <line x1="14" y1="12" x2="28" y2="12" stroke="currentColor" strokeWidth="0.5" opacity="0.3" />
          <line x1="14" y1="16" x2="26" y2="16" stroke="currentColor" strokeWidth="0.5" opacity="0.25" />
          <line x1="14" y1="20" x2="27" y2="20" stroke="currentColor" strokeWidth="0.5" opacity="0.2" />
          <line x1="14" y1="24" x2="24" y2="24" stroke="currentColor" strokeWidth="0.5" opacity="0.15" />
          {/* Glow */}
          <motion.rect
            x="4" y="4" width="28" height="36" rx="2"
            fill="none" stroke="currentColor" strokeWidth="1.5"
            animate={{ opacity: [0.1, 0.4, 0.1] }}
            transition={{ duration: 3, repeat: Infinity, delay: i * 0.5 }}
          />
        </motion.svg>
      ))}

      {/* DNA-like Knowledge Helix */}
      <motion.svg
        className="absolute opacity-25"
        style={{ right: "10%", top: "10%", width: 60, height: 160 }}
        viewBox="0 0 60 160"
        animate={{ y: [-5, 5, -5] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      >
        {Array.from({ length: 8 }, (_, i) => {
          const y = i * 20 + 10;
          const xLeft = 15 + Math.sin(i * 0.8) * 12;
          const xRight = 45 - Math.sin(i * 0.8) * 12;
          return (
            <g key={i}>
              <motion.circle cx={xLeft} cy={y} r="2.5" fill="rgba(16,185,129,0.5)"
                animate={{ opacity: [0.3, 0.7, 0.3] }}
                transition={{ duration: 2, repeat: Infinity, delay: i * 0.25 }}
              />
              <motion.circle cx={xRight} cy={y} r="2.5" fill="rgba(16,185,129,0.5)"
                animate={{ opacity: [0.3, 0.7, 0.3] }}
                transition={{ duration: 2, repeat: Infinity, delay: i * 0.25 + 0.5 }}
              />
              <line x1={xLeft} y1={y} x2={xRight} y2={y} stroke="rgba(16,185,129,0.2)" strokeWidth="0.5" />
            </g>
          );
        })}
      </motion.svg>

      {/* Orbiting Symbols */}
      <motion.div
        className="absolute"
        style={{ bottom: "25%", left: "20%", width: 100, height: 100 }}
        animate={{ rotate: 360 }}
        transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
      >
        {["⟁", "∞", "◊", "☆"].map((sym, i) => (
          <motion.span
            key={i}
            className="absolute text-fantasy-emerald/30 text-lg select-none"
            style={{
              left: `${50 + 45 * Math.cos((i * Math.PI) / 2)}%`,
              top: `${50 + 45 * Math.sin((i * Math.PI) / 2)}%`,
              transform: "translate(-50%, -50%)",
            }}
            animate={{ opacity: [0.2, 0.6, 0.2] }}
            transition={{ duration: 3, repeat: Infinity, delay: i * 0.7 }}
          >
            {sym}
          </motion.span>
        ))}
      </motion.div>

      {/* Scroll */}
      <motion.svg
        className="absolute text-fantasy-emerald/35"
        style={{ left: "10%", top: "60%", width: 40, height: 50 }}
        viewBox="0 0 40 50" fill="none"
        animate={{ y: [-4, 4, -4], rotate: [2, -2, 2] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      >
        <ellipse cx="20" cy="6" rx="16" ry="5" fill="currentColor" opacity="0.2" stroke="currentColor" strokeWidth="0.8" />
        <rect x="4" y="6" width="32" height="34" fill="currentColor" opacity="0.1" />
        <ellipse cx="20" cy="40" rx="16" ry="5" fill="currentColor" opacity="0.2" stroke="currentColor" strokeWidth="0.8" />
        <line x1="4" y1="6" x2="4" y2="40" stroke="currentColor" strokeWidth="0.8" opacity="0.4" />
        <line x1="36" y1="6" x2="36" y2="40" stroke="currentColor" strokeWidth="0.8" opacity="0.4" />
        <line x1="10" y1="15" x2="30" y2="15" stroke="currentColor" strokeWidth="0.4" opacity="0.3" />
        <line x1="10" y1="20" x2="28" y2="20" stroke="currentColor" strokeWidth="0.4" opacity="0.25" />
        <line x1="10" y1="25" x2="26" y2="25" stroke="currentColor" strokeWidth="0.4" opacity="0.2" />
      </motion.svg>

      {/* Glowing Center Eye of Knowledge */}
      <motion.div
        className="absolute top-[15%] left-[45%]"
      >
        <svg width="50" height="30" viewBox="0 0 50 30">
          <motion.path
            d="M5 15C5 15 15 3 25 3C35 3 45 15 45 15C45 15 35 27 25 27C15 27 5 15 5 15Z"
            fill="rgba(16,185,129,0.05)" stroke="rgba(16,185,129,0.3)" strokeWidth="1"
            animate={{ opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 4, repeat: Infinity }}
          />
          <motion.circle cx="25" cy="15" r="5" fill="rgba(16,185,129,0.2)" stroke="rgba(16,185,129,0.4)" strokeWidth="0.8"
            animate={{ r: [5, 6, 5] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
          <motion.circle cx="25" cy="15" r="2" fill="rgba(16,185,129,0.6)"
            animate={{ opacity: [0.6, 1, 0.6] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        </svg>
      </motion.div>
    </div>
  );
}

/* ─────────────── Section Card Component ─────────────── */

interface SectionData {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  href: string;
  gradient: string;
  accent: string;
  borderColor: string;
  glowColor: string;
  stats: { label: string; value: number; suffix: string }[];
  animation: React.ReactNode;
}

const sections: SectionData[] = [
  {
    id: "trioz",
    title: 'Проекты Т.Р.И.О."Z"',
    subtitle: "MMORPG • Стратегии • Онлайн",
    description: "Глобальная MMORPG с элементами стратегии, полной социальной сферой и бесконечным миром для исследования",
    href: "/projects",
    gradient: "from-red-950/80 via-red-900/40 to-dark-900/90",
    accent: "text-fantasy-red",
    borderColor: "hover:border-fantasy-red/50",
    glowColor: "group-hover:shadow-[0_0_60px_rgba(255,68,68,0.25)]",
    stats: [
      { label: "Локаций", value: 2500, suffix: "+" },
      { label: "Игроков", value: 150, suffix: "K" },
      { label: "Квестов", value: 800, suffix: "+" },
    ],
    animation: <GamingAnimation />,
  },
  {
    id: "pero",
    title: "Перо Измерений",
    subtitle: "Книги • Настольные игры • Офлайн",
    description: "Развлекательные товары направленные на развитие мышления — от книг до уникальных настольных игр",
    href: "/pero",
    gradient: "from-purple-950/80 via-indigo-900/40 to-dark-900/90",
    accent: "text-fantasy-purple",
    borderColor: "hover:border-fantasy-purple/50",
    glowColor: "group-hover:shadow-[0_0_60px_rgba(139,92,246,0.25)]",
    stats: [
      { label: "Книг", value: 47, suffix: "" },
      { label: "Настолок", value: 12, suffix: "" },
      { label: "Миров", value: 9, suffix: "" },
    ],
    animation: <QuillAnimation />,
  },
  {
    id: "connect",
    title: "TZ.Connect",
    subtitle: "Связь • IT-услуги • Бизнес",
    description: "Коммуникационная платформа и комплексные IT-решения для современного бизнеса",
    href: "/connect",
    gradient: "from-cyan-950/80 via-teal-900/40 to-dark-900/90",
    accent: "text-cyan-400",
    borderColor: "hover:border-cyan-400/50",
    glowColor: "group-hover:shadow-[0_0_60px_rgba(0,240,255,0.25)]",
    stats: [
      { label: "Клиентов", value: 340, suffix: "+" },
      { label: "Проектов", value: 1200, suffix: "+" },
      { label: "Uptime", value: 99, suffix: "%" },
    ],
    animation: <NetworkAnimation />,
  },
  {
    id: "library",
    title: "TZ.Library",
    subtitle: "Лор • Вики • История",
    description: "Хранилище знаний и лора вселенной — от древних легенд до новейших открытий",
    href: "/library",
    gradient: "from-emerald-950/80 via-green-900/40 to-dark-900/90",
    accent: "text-fantasy-emerald",
    borderColor: "hover:border-fantasy-emerald/50",
    glowColor: "group-hover:shadow-[0_0_60px_rgba(16,185,129,0.25)]",
    stats: [
      { label: "Статей", value: 3400, suffix: "+" },
      { label: "Авторов", value: 89, suffix: "" },
      { label: "Томов", value: 24, suffix: "" },
    ],
    animation: <LibraryAnimation />,
  },
];

/* ─────────────── Main Variants ─────────────── */

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.2, delayChildren: 0.5 },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 60, scale: 0.92 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 1, ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number] },
  },
};

/* ─────────────── Section Window Card ─────────────── */

function SectionWindow({ section }: { section: SectionData }) {
  const [hovered, setHovered] = useState(false);

  return (
    <motion.div variants={cardVariants}>
      <Link href={section.href}>
        <motion.div
          className={`group relative overflow-hidden rounded-3xl border border-white/[0.08] bg-gradient-to-br ${section.gradient}
            min-h-[340px] md:min-h-[400px] flex flex-col justify-between cursor-pointer
            transition-all duration-700 ${section.borderColor} ${section.glowColor}`}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          whileHover={{ scale: 1.02 }}
          transition={{ duration: 0.4 }}
        >
          {/* Animation Layer */}
          <div className="absolute inset-0 transition-opacity duration-700 opacity-60 group-hover:opacity-100">
            {section.animation}
          </div>

          {/* Glass overlay on hover */}
          <motion.div
            className="absolute inset-0 bg-gradient-to-t from-dark-900/90 via-dark-900/40 to-transparent"
            animate={{ opacity: hovered ? 0.95 : 0.7 }}
            transition={{ duration: 0.5 }}
          />

          {/* Content */}
          <div className="relative z-10 p-6 md:p-8 flex flex-col h-full justify-between">
            {/* Top: Title area */}
            <div>
              <motion.div
                className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border border-current/20 ${section.accent} text-xs font-medium mb-4 opacity-70`}
                animate={hovered ? { opacity: 1, x: 0 } : { opacity: 0.7, x: 0 }}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                {section.subtitle}
              </motion.div>

              <h3 className="text-2xl md:text-3xl font-bold text-white mb-2 group-hover:translate-x-1 transition-transform duration-500">
                {section.title}
              </h3>

              <motion.p
                className="text-gray-400 text-sm md:text-base leading-relaxed max-w-[90%]"
                animate={hovered ? { opacity: 1, y: 0 } : { opacity: 0.6, y: 4 }}
                transition={{ duration: 0.4 }}
              >
                {section.description}
              </motion.p>
            </div>

            {/* Bottom: Stats */}
            <div className="mt-6">
              <motion.div
                className="flex gap-6"
                animate={hovered ? { opacity: 1, y: 0 } : { opacity: 0, y: 15 }}
                transition={{ duration: 0.5, delay: 0.1 }}
              >
                {section.stats.map((stat, i) => (
                  <div key={i} className="text-center">
                    <div className={`text-lg md:text-xl font-bold ${section.accent}`}>
                      {hovered ? <AnimatedCounter value={stat.value} duration={1.5} /> : 0}
                      {stat.suffix}
                    </div>
                    <div className="text-[10px] md:text-xs text-gray-500 mt-1">{stat.label}</div>
                  </div>
                ))}
              </motion.div>

              {/* Enter button */}
              <motion.div
                className="flex items-center gap-2 mt-4"
                animate={hovered ? { opacity: 1, x: 0 } : { opacity: 0, x: -10 }}
                transition={{ duration: 0.4, delay: 0.15 }}
              >
                <span className={`text-sm font-medium ${section.accent}`}>Войти в раздел</span>
                <motion.svg
                  className={`w-4 h-4 ${section.accent}`}
                  fill="none" stroke="currentColor" viewBox="0 0 24 24"
                  animate={hovered ? { x: [0, 5, 0] } : { x: 0 }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </motion.svg>
              </motion.div>
            </div>
          </div>

          {/* Corner Accent */}
          <div className={`absolute top-0 right-0 w-24 h-24 opacity-0 group-hover:opacity-100 transition-opacity duration-700`}>
            <svg className="w-full h-full" viewBox="0 0 96 96" fill="none">
              <motion.path
                d="M96 0L96 96L0 0Z"
                fill="currentColor"
                className={section.accent}
                opacity="0.05"
                animate={hovered ? { opacity: 0.1 } : { opacity: 0.03 }}
              />
            </svg>
          </div>
        </motion.div>
      </Link>
    </motion.div>
  );
}

/* ─────────────── Main Page ─────────────── */

export default function HomePage() {
  return (
    <div className="min-h-screen bg-dark-900 relative overflow-hidden">
      {/* Ambient background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-cyan-400/[0.03] rounded-full blur-[150px]" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-fantasy-purple/[0.03] rounded-full blur-[150px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-fantasy-red/[0.02] rounded-full blur-[200px]" />
      </div>

      {/* Hero Section */}
      <section className="relative flex flex-col items-center justify-center px-4 pt-20 pb-8 md:pt-28 md:pb-12">
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.2, ease: "easeOut" }}
          className="text-center mb-8 md:mb-12"
        >
          <motion.div
            initial={{ scale: 0.6, opacity: 0, rotate: -10 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            transition={{ duration: 1, delay: 0.2, ease: [0.34, 1.56, 0.64, 1] }}
            className="inline-flex items-center gap-3 mb-6"
          >
            <div className="relative">
              <div className="w-16 h-16 md:w-20 md:h-20 bg-gradient-to-br from-cyan-400 via-fantasy-purple to-fantasy-red rounded-2xl flex items-center justify-center shadow-[0_0_50px_rgba(0,240,255,0.3)]">
                <span className="text-white font-bold text-2xl md:text-3xl tracking-tight">TZ</span>
              </div>
              <motion.div
                className="absolute -inset-2 rounded-2xl border border-cyan-400/20"
                animate={{ scale: [1, 1.15, 1], opacity: [0.3, 0, 0.3] }}
                transition={{ duration: 3, repeat: Infinity }}
              />
            </div>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="text-5xl md:text-7xl lg:text-8xl font-bold mb-4"
          >
            <span className="bg-gradient-to-r from-cyan-400 via-white to-fantasy-purple bg-clip-text text-transparent">
              Trio
            </span>
            <span className="text-cyan-400 glow-text">Z</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="text-base md:text-lg text-gray-400 max-w-xl mx-auto leading-relaxed"
          >
            Один мир. Множество измерений.
          </motion.p>
        </motion.div>

        {/* 4 Section Windows */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6 max-w-6xl w-full px-4"
        >
          {sections.map((section) => (
            <SectionWindow key={section.id} section={section} />
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
