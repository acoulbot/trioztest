"use client";

import { useEffect, useRef, useState } from "react";

/* ─── sky math ─────────────────────────────────────────────── */

function getProgress(h: number, m: number) {
  return (h * 60 + m) / 1440;
}

function lerpHex(a: string, b: string, t: number): string {
  const ah = parseInt(a.replace("#", ""), 16);
  const bh = parseInt(b.replace("#", ""), 16);
  const ar = (ah >> 16) & 255, ag = (ah >> 8) & 255, ab = ah & 255;
  const br = (bh >> 16) & 255, bg = (bh >> 8) & 255, bb = bh & 255;
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const bl = Math.round(ab + (bb - ab) * t);
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${bl.toString(16).padStart(2, "0")}`;
}

function lerp3(a: string, b: string, c: string, t: number): string {
  if (t <= 0.5) return lerpHex(a, b, t * 2);
  return lerpHex(b, c, (t - 0.5) * 2);
}

interface SkyPalette {
  top: string;
  mid: string;
  horizon: string;
  phase: "dawn" | "day" | "dusk" | "night";
  t: number;
  starsOpacity: number;
}

function getSky(progress: number): SkyPalette {
  const p = progress;
  if (p >= 0.22 && p < 0.29) {
    const t = (p - 0.22) / 0.07;
    return {
      top: lerp3("#04021a", "#1a1060", "#0a2050", t),
      mid: lerp3("#0a0520", "#b33a00", "#ff6a00", t),
      horizon: lerp3("#1a0a40", "#ff8c42", "#ffe0a0", t),
      phase: "dawn", t,
      starsOpacity: (1 - t) * 0.7,
    };
  }
  if (p >= 0.29 && p < 0.71) {
    const t = Math.sin(((p - 0.29) / 0.42) * Math.PI);
    return {
      top: lerpHex("#0d2080", "#0a4acc", t * 0.6),
      mid: lerpHex("#1050c8", "#4a90ff", t * 0.8),
      horizon: lerpHex("#80b0ff", "#c8e8ff", t),
      phase: "day", t, starsOpacity: 0,
    };
  }
  if (p >= 0.71 && p < 0.79) {
    const t = (p - 0.71) / 0.08;
    return {
      top: lerp3("#0a2050", "#1a1060", "#04021a", t),
      mid: lerp3("#ff6a00", "#c23000", "#1a0a40", t),
      horizon: lerp3("#ffe0a0", "#ff4040", "#1a0a40", t),
      phase: "dusk", t,
      starsOpacity: t * 0.8,
    };
  }
  return { top: "#04021a", mid: "#080330", horizon: "#0d0840", phase: "night", t: 0, starsOpacity: 1 };
}

function getSkyBodyPos(progress: number) {
  const sunAngle = (progress - 0.25) * Math.PI / 0.5;
  const sunX = 50 + 42 * Math.cos(sunAngle + Math.PI / 2);
  const sunY = 85 - 70 * Math.sin(sunAngle + Math.PI / 2);
  const moonProgress = (progress + 0.5) % 1;
  const moonAngle = (moonProgress - 0.25) * Math.PI / 0.5;
  const moonX = 50 + 42 * Math.cos(moonAngle + Math.PI / 2);
  const moonY = 85 - 70 * Math.sin(moonAngle + Math.PI / 2);
  return { sunX, sunY, moonX, moonY };
}

/* ─── canvas renderer ──────────────────────────────────────── */

interface Star { x: number; y: number; r: number; phase: number; speed: number }

function drawScene(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  progress: number,
  frame: number,
  stars: Star[]
) {
  const sky = getSky(progress);
  const { sunX, sunY, moonX, moonY } = getSkyBodyPos(progress);
  const isNight = sky.phase === "night";
  const isDay = sky.phase === "day";

  /* sky gradient */
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, sky.top);
  grad.addColorStop(0.55, sky.mid);
  grad.addColorStop(1, sky.horizon);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  /* stars */
  if (sky.starsOpacity > 0) {
    stars.forEach(s => {
      const twinkle = 0.5 + 0.5 * Math.sin(s.phase + frame * s.speed);
      ctx.beginPath();
      ctx.arc(s.x * w, s.y * h * 0.65, s.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(200,220,255,${sky.starsOpacity * (0.4 + 0.6 * twinkle)})`;
      ctx.fill();
    });
  }

  /* sun */
  const sx = (sunX / 100) * w;
  const sy = (sunY / 100) * h;
  if (sunY < 95 && sunY > -10) {
    const sunR = isDay ? 18 : 14;
    const glowR = isDay ? 60 : 45;
    const glowGrad = ctx.createRadialGradient(sx, sy, 0, sx, sy, glowR);
    glowGrad.addColorStop(0, isDay ? "rgba(255,230,80,0.4)" : "rgba(255,140,40,0.45)");
    glowGrad.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = glowGrad;
    ctx.beginPath();
    ctx.arc(sx, sy, glowR, 0, Math.PI * 2);
    ctx.fill();

    const sunGrad = ctx.createRadialGradient(sx - 3, sy - 3, 0, sx, sy, sunR);
    sunGrad.addColorStop(0, isDay ? "#fffff0" : "#ffd580");
    sunGrad.addColorStop(0.6, isDay ? "#ffdd00" : "#ff8c00");
    sunGrad.addColorStop(1, isDay ? "#ffaa00" : "#cc4400");
    ctx.fillStyle = sunGrad;
    ctx.beginPath();
    ctx.arc(sx, sy, sunR, 0, Math.PI * 2);
    ctx.fill();
  }

  /* moon */
  const mx = (moonX / 100) * w;
  const my = (moonY / 100) * h;
  if (!isDay && moonY < 95 && moonY > -10) {
    const moonR = 14;
    const glowGrad = ctx.createRadialGradient(mx, my, 0, mx, my, 50);
    glowGrad.addColorStop(0, "rgba(160,200,255,0.25)");
    glowGrad.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = glowGrad;
    ctx.beginPath();
    ctx.arc(mx, my, 50, 0, Math.PI * 2);
    ctx.fill();

    const moonGrad = ctx.createRadialGradient(mx - 3, my - 3, 0, mx, my, moonR);
    moonGrad.addColorStop(0, "#e8f0ff");
    moonGrad.addColorStop(0.5, "#c0d8f8");
    moonGrad.addColorStop(1, "#90b4e8");
    ctx.fillStyle = moonGrad;
    ctx.beginPath();
    ctx.arc(mx, my, moonR, 0, Math.PI * 2);
    ctx.fill();

    /* craters */
    ctx.fillStyle = "rgba(100,140,200,0.25)";
    ctx.beginPath(); ctx.arc(mx + 4, my + 2, 3, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(mx - 3, my + 5, 2, 0, Math.PI * 2); ctx.fill();
  }

  /* city silhouette */
  const cityH = h * 0.42;
  const baseY = h;

  type BuildingDef = { x: number; w: number; h: number; layer: number; antenna?: boolean; spire?: boolean };
  const buildings: BuildingDef[] = [
    { x: 0.00, w: 0.065, h: 0.40, layer: 0 },
    { x: 0.06, w: 0.045, h: 0.52, layer: 0 },
    { x: 0.15, w: 0.07,  h: 0.38, layer: 0 },
    { x: 0.23, w: 0.06,  h: 0.47, layer: 0 },
    { x: 0.32, w: 0.08,  h: 0.44, layer: 0 },
    { x: 0.43, w: 0.05,  h: 0.50, layer: 0 },
    { x: 0.52, w: 0.07,  h: 0.42, layer: 0 },
    { x: 0.62, w: 0.06,  h: 0.48, layer: 0 },
    { x: 0.71, w: 0.08,  h: 0.40, layer: 0 },
    { x: 0.82, w: 0.06,  h: 0.52, layer: 0 },
    { x: 0.91, w: 0.09,  h: 0.44, layer: 0 },
    { x: 0.01, w: 0.05,  h: 0.65, layer: 1, antenna: true },
    { x: 0.13, w: 0.075, h: 0.78, layer: 1, spire: true },
    { x: 0.26, w: 0.06,  h: 0.60, layer: 1 },
    { x: 0.38, w: 0.085, h: 0.85, layer: 1, antenna: true, spire: true },
    { x: 0.50, w: 0.09,  h: 0.72, layer: 1 },
    { x: 0.63, w: 0.06,  h: 0.80, layer: 1, antenna: true },
    { x: 0.75, w: 0.075, h: 0.75, layer: 1, spire: true },
    { x: 0.87, w: 0.10,  h: 0.68, layer: 1 },
  ];

  buildings.forEach(b => {
    const bx = b.x * w;
    const bw = b.w * w;
    const bh = b.h * cityH;
    const by = baseY - bh;
    const alpha = isNight ? 0.80 : sky.phase === "dawn" || sky.phase === "dusk" ? 0.55 : 0.30;
    const layerAlpha = b.layer === 0 ? alpha * 0.6 : alpha;

    /* building body */
    const bGrad = ctx.createLinearGradient(0, by, 0, baseY);
    if (isNight) {
      bGrad.addColorStop(0, b.layer === 1 ? `rgba(13,32,64,${layerAlpha})` : `rgba(10,26,53,${layerAlpha * 0.7})`);
      bGrad.addColorStop(1, b.layer === 1 ? `rgba(5,16,26,${layerAlpha})` : `rgba(5,13,20,${layerAlpha * 0.7})`);
    } else {
      bGrad.addColorStop(0, `rgba(26,42,80,${layerAlpha})`);
      bGrad.addColorStop(1, `rgba(10,22,40,${layerAlpha})`);
    }
    ctx.fillStyle = bGrad;
    ctx.fillRect(bx, by, bw, bh);

    /* windows grid */
    const winAlpha = isNight ? 0.85 : sky.phase === "dawn" || sky.phase === "dusk" ? 0.45 : 0.08;
    if (winAlpha > 0.01) {
      const winW = 4, winH = 5, gapX = 7, gapY = 8, padX = 3, padT = 5;
      const cols = Math.floor((bw - padX * 2) / gapX);
      const rows = Math.floor((bh - padT) / gapY);
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const wx = bx + padX + col * gapX;
          const wy = by + padT + row * gapY;
          // randomly skip some windows (deterministic by position)
          const seed = (Math.sin(wx * 127 + wy * 311) + 1) / 2;
          if (isNight && seed < 0.3) continue;
          const warmCool = seed > 0.5;
          ctx.fillStyle = isNight
            ? warmCool
              ? `rgba(255,210,130,${winAlpha * (0.6 + seed * 0.4)})`
              : `rgba(180,230,255,${winAlpha * (0.5 + seed * 0.5)})`
            : `rgba(180,220,255,${winAlpha})`;
          ctx.fillRect(wx, wy, winW, winH);
        }
      }
    }

    /* antenna */
    if (b.antenna && b.layer === 1) {
      const ax = bx + bw / 2;
      ctx.strokeStyle = isNight ? "rgba(0,212,255,0.9)" : "rgba(74,128,255,0.4)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(ax, by);
      ctx.lineTo(ax, by - 14);
      ctx.stroke();

      /* blinking beacon */
      const blink = Math.sin(frame * 0.04) > 0;
      ctx.fillStyle = blink ? (isNight ? "rgba(255,50,50,1)" : "rgba(255,100,100,0.5)") : "rgba(255,50,50,0.1)";
      ctx.beginPath();
      ctx.arc(ax, by - 14, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }

    /* spire */
    if (b.spire && b.layer === 1) {
      ctx.fillStyle = isNight ? `rgba(13,32,64,${layerAlpha})` : `rgba(26,46,85,${layerAlpha})`;
      ctx.beginPath();
      ctx.moveTo(bx + bw / 2, by - 18);
      ctx.lineTo(bx + 4, by);
      ctx.lineTo(bx + bw - 4, by);
      ctx.closePath();
      ctx.fill();
    }

    /* night neon edge lines */
    if (isNight && b.layer === 1) {
      ctx.strokeStyle = "rgba(0,212,255,0.25)";
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(bx, by); ctx.lineTo(bx, baseY); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(bx + bw, by); ctx.lineTo(bx + bw, baseY); ctx.stroke();
      ctx.strokeStyle = "rgba(0,212,255,0.4)";
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(bx, by); ctx.lineTo(bx + bw, by); ctx.stroke();
    }
  });

  /* ground line */
  ctx.strokeStyle = isNight ? "rgba(0,212,255,0.35)" : "rgba(74,128,255,0.12)";
  ctx.lineWidth = isNight ? 1 : 0.5;
  ctx.beginPath();
  ctx.moveTo(0, baseY - 1);
  ctx.lineTo(w, baseY - 1);
  ctx.stroke();
}

/* ─── main exported component ──────────────────────────────── */

interface DayNightBackgroundProps {
  /** 0–1, default 0.15 */
  opacity?: number;
}

export default function DayNightBackground({ opacity = 0.15 }: DayNightBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const starsRef = useRef<Star[]>([]);
  const frameRef = useRef(0);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    starsRef.current = Array.from({ length: 130 }, () => ({
      x: Math.random(),
      y: Math.random(),
      r: Math.random() * 1.1 + 0.3,
      phase: Math.random() * Math.PI * 2,
      speed: 0.008 + Math.random() * 0.018,
    }));
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    function loop() {
      const now = new Date();
      const progress = getProgress(now.getHours(), now.getMinutes() + now.getSeconds() / 60);
      const w = canvas!.offsetWidth * window.devicePixelRatio;
      const h = canvas!.offsetHeight * window.devicePixelRatio;
      if (canvas!.width !== w || canvas!.height !== h) {
        canvas!.width = w;
        canvas!.height = h;
      }
      ctx!.setTransform(window.devicePixelRatio, 0, 0, window.devicePixelRatio, 0, 0);
      ctx!.clearRect(0, 0, canvas!.offsetWidth, canvas!.offsetHeight);
      drawScene(ctx!, canvas!.offsetWidth, canvas!.offsetHeight, progress, frameRef.current, starsRef.current);
      frameRef.current++;
      rafRef.current = requestAnimationFrame(loop);
    }
    loop();
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        opacity,
        pointerEvents: "none",
        zIndex: 0,
      }}
    />
  );
}

/* ─── mini preview for ProfileSettingsModal ───────────────── */

export function DayNightMiniPreview({ opacity }: { opacity: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const starsRef = useRef<Star[]>([]);
  const frameRef = useRef(0);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    starsRef.current = Array.from({ length: 60 }, () => ({
      x: Math.random(), y: Math.random(),
      r: Math.random() * 0.9 + 0.2,
      phase: Math.random() * Math.PI * 2,
      speed: 0.01 + Math.random() * 0.02,
    }));
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    function loop() {
      const now = new Date();
      const progress = getProgress(now.getHours(), now.getMinutes() + now.getSeconds() / 60);
      const w = canvas!.offsetWidth;
      const h = canvas!.offsetHeight;
      canvas!.width = w;
      canvas!.height = h;
      drawScene(ctx!, w, h, progress, frameRef.current, starsRef.current);
      frameRef.current++;
      rafRef.current = requestAnimationFrame(loop);
    }
    loop();
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  return (
    <div style={{ position: "relative", width: "100%", height: "100%", background: "#12121c" }}>
      <canvas
        ref={canvasRef}
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: opacity / 100 }}
      />
      {/* overlay chat mockup */}
      <div style={{
        position: "absolute", inset: 0, padding: "8px 10px",
        display: "flex", flexDirection: "column", justifyContent: "flex-end", gap: 5,
      }}>
        {[
          { user: "A", text: "Атмосферно!", self: false },
          { user: "Y", text: "Да, небо живое 🌙", self: true },
        ].map((m, i) => (
          <div key={i} style={{ display: "flex", gap: 6, justifyContent: m.self ? "flex-end" : "flex-start" }}>
            {!m.self && (
              <div style={{ width: 18, height: 18, borderRadius: "30%", background: "rgba(0,212,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 8, color: "#00d4ff", fontWeight: 700, flexShrink: 0 }}>{m.user}</div>
            )}
            <div style={{ background: m.self ? "rgba(0,212,255,0.1)" : "rgba(255,255,255,0.06)", borderRadius: 6, padding: "3px 7px", fontSize: 10, color: "rgba(255,255,255,0.75)", backdropFilter: "blur(4px)" }}>
              {m.text}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
