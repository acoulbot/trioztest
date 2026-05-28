"use client";

import { useEffect, useRef } from "react";

/* ─── seeded PRNG (mulberry32) ────────────────────────────── */

function mulberry32(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

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

interface SkyPalette {
  top: string;
  mid: string;
  horizon: string;
  phase: "night" | "dawn" | "morning" | "day" | "golden" | "dusk";
  t: number;
  starsOpacity: number;
  cloudOpacity: number;
  cityAlpha: number;
  windowGlow: number;
  hazeOpacity: number;
}

function getSky(p: number): SkyPalette {
  // 6 phases with smooth transitions
  // night: 0.00-0.21, dawn: 0.21-0.27, morning: 0.27-0.375, day: 0.375-0.71, golden: 0.71-0.77, dusk: 0.77-0.84

  if (p < 0.21) {
    return {
      top: "#04021a", mid: "#080330", horizon: "#0d0840",
      phase: "night", t: 0, starsOpacity: 1, cloudOpacity: 0,
      cityAlpha: 0.85, windowGlow: 0.85, hazeOpacity: 0.15,
    };
  }
  if (p < 0.27) {
    const t = (p - 0.21) / 0.06;
    return {
      top: lerpHex("#04021a", "#1a1060", t),
      mid: lerpHex("#080330", "#a83800", t),
      horizon: lerpHex("#0d0840", "#ff9050", t),
      phase: "dawn", t, starsOpacity: (1 - t) * 0.8, cloudOpacity: t * 0.2,
      cityAlpha: 0.85 - t * 0.3, windowGlow: 0.85 - t * 0.4, hazeOpacity: 0.15 + t * 0.1,
    };
  }
  if (p < 0.375) {
    const t = (p - 0.27) / 0.105;
    return {
      top: lerpHex("#1a1060", "#1a60c0", t),
      mid: lerpHex("#a83800", "#5090e0", t),
      horizon: lerpHex("#ff9050", "#b0d4ff", t),
      phase: "morning", t, starsOpacity: 0, cloudOpacity: 0.2 + t * 0.3,
      cityAlpha: 0.55 - t * 0.25, windowGlow: 0.45 - t * 0.35, hazeOpacity: 0.25 - t * 0.1,
    };
  }
  if (p < 0.71) {
    const t = Math.sin(((p - 0.375) / 0.335) * Math.PI);
    return {
      top: lerpHex("#1060c0", "#1880e0", t * 0.5),
      mid: lerpHex("#3080e0", "#60a8ff", t * 0.6),
      horizon: lerpHex("#90c0ff", "#d0e8ff", t),
      phase: "day", t, starsOpacity: 0, cloudOpacity: 0.5,
      cityAlpha: 0.3, windowGlow: 0.08, hazeOpacity: 0.05,
    };
  }
  if (p < 0.77) {
    const t = (p - 0.71) / 0.06;
    return {
      top: lerpHex("#1060c0", "#402060", t),
      mid: lerpHex("#3080e0", "#c04000", t),
      horizon: lerpHex("#90c0ff", "#ffa040", t),
      phase: "golden", t, starsOpacity: 0, cloudOpacity: 0.5 - t * 0.3,
      cityAlpha: 0.3 + t * 0.25, windowGlow: 0.08 + t * 0.4, hazeOpacity: 0.05 + t * 0.15,
    };
  }
  if (p < 0.84) {
    const t = (p - 0.77) / 0.07;
    return {
      top: lerpHex("#402060", "#04021a", t),
      mid: lerpHex("#c04000", "#080330", t),
      horizon: lerpHex("#ffa040", "#0d0840", t),
      phase: "dusk", t, starsOpacity: t * 0.9, cloudOpacity: (1 - t) * 0.2,
      cityAlpha: 0.55 + t * 0.3, windowGlow: 0.48 + t * 0.37, hazeOpacity: 0.2 - t * 0.05,
    };
  }
  // late night
  return {
    top: "#04021a", mid: "#080330", horizon: "#0d0840",
    phase: "night", t: 0, starsOpacity: 1, cloudOpacity: 0,
    cityAlpha: 0.85, windowGlow: 0.85, hazeOpacity: 0.15,
  };
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

/* ─── types ───────────────────────────────────────────────── */

interface Star { x: number; y: number; r: number; phase: number; speed: number; drift: number }

interface Cloud { x: number; y: number; w: number; h: number; speed: number; opacity: number }

interface Bird { x: number; y: number; speed: number; wingPhase: number; size: number }

type BuildingType = "pyramid" | "terrace" | "crystal" | "box" | "spire" | "antenna";

interface BuildingDef {
  x: number; w: number; h: number; layer: number;
  type: BuildingType;
  windowSeed: number;
}

/* ─── generate buildings (seeded, futuristic) ────────────── */

function generateBuildings(seed: number): BuildingDef[] {
  const rng = mulberry32(seed);
  const buildings: BuildingDef[] = [];
  const fgTypes: BuildingType[] = ["pyramid", "terrace", "crystal", "box", "spire", "antenna"];

  // Layer 0 — background (shorter, fills gaps) — reduced 20%
  const count0 = 9 + Math.floor(rng() * 3);
  for (let i = 0; i < count0; i++) {
    buildings.push({
      x: (i / count0) + (rng() - 0.5) * 0.03,
      w: 0.04 + rng() * 0.04,
      h: 0.2 + rng() * 0.18,
      layer: 0,
      type: "box",
      windowSeed: rng() * 10000,
    });
  }

  // Layer 1 — foreground (futuristic types) — reduced 20%
  const count1 = 8 + Math.floor(rng() * 4);
  for (let i = 0; i < count1; i++) {
    const type = fgTypes[Math.floor(rng() * fgTypes.length)];
    buildings.push({
      x: (i / count1) + (rng() - 0.5) * 0.04,
      w: 0.045 + rng() * 0.05,
      h: 0.5 + rng() * 0.35,
      layer: 1,
      type,
      windowSeed: rng() * 10000,
    });
  }

  return buildings;
}

/* ─── generate birds ──────────────────────────────────────── */

function generateBirds(seed: number): Bird[] {
  const rng = mulberry32(seed + 777);
  return Array.from({ length: 5 }, () => ({
    x: rng(),
    y: 0.1 + rng() * 0.3,
    speed: 0.0001 + rng() * 0.00015,
    wingPhase: rng() * Math.PI * 2,
    size: 3 + rng() * 4,
  }));
}

/* ─── generate clouds ─────────────────────────────────────── */

function generateClouds(seed: number): Cloud[] {
  const rng = mulberry32(seed + 999);
  return Array.from({ length: 4 }, () => ({
    x: rng(),
    y: 0.08 + rng() * 0.25,
    w: 0.12 + rng() * 0.15,
    h: 0.02 + rng() * 0.025,
    speed: 0.00003 + rng() * 0.00005,
    opacity: 0.15 + rng() * 0.2,
  }));
}

/* ─── canvas renderer ──────────────────────────────────────── */

function drawScene(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  progress: number,
  frame: number,
  stars: Star[],
  buildings: BuildingDef[],
  clouds: Cloud[],
  birds: Bird[],
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

  /* stars — moving slowly */
  if (sky.starsOpacity > 0) {
    stars.forEach(s => {
      const twinkle = 0.5 + 0.5 * Math.sin(s.phase + frame * s.speed);
      const driftX = ((s.x + frame * s.drift) % 1.05) - 0.025;
      ctx.beginPath();
      ctx.arc(driftX * w, s.y * h * 0.6, s.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(200,220,255,${sky.starsOpacity * (0.3 + 0.7 * twinkle)})`;
      ctx.fill();
    });
  }

  /* birds — daytime only */
  if (sky.phase === "day" || sky.phase === "morning" || sky.phase === "golden") {
    const birdAlpha = sky.phase === "day" ? 0.6 : 0.35;
    ctx.strokeStyle = `rgba(30,30,50,${birdAlpha})`;
    ctx.lineWidth = 1.2;
    birds.forEach(bird => {
      const bx = ((bird.x + frame * bird.speed) % 1.3) - 0.15;
      const by = bird.y;
      const px = bx * w;
      const py = by * h;
      const wing = Math.sin(bird.wingPhase + frame * 0.06) * bird.size * 0.5;
      ctx.beginPath();
      ctx.moveTo(px - bird.size, py + wing);
      ctx.quadraticCurveTo(px - bird.size * 0.3, py - Math.abs(wing) * 0.3, px, py);
      ctx.quadraticCurveTo(px + bird.size * 0.3, py - Math.abs(wing) * 0.3, px + bird.size, py + wing);
      ctx.stroke();
    });
  }

  /* sun */
  const sx = (sunX / 100) * w;
  const sy = (sunY / 100) * h;
  if (sunY < 95 && sunY > -10) {
    const sunR = isDay ? 16 : 12;
    const glowR = isDay ? 50 : 38;
    const glowGrad = ctx.createRadialGradient(sx, sy, 0, sx, sy, glowR);
    glowGrad.addColorStop(0, isDay ? "rgba(255,230,80,0.35)" : "rgba(255,140,40,0.4)");
    glowGrad.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = glowGrad;
    ctx.beginPath();
    ctx.arc(sx, sy, glowR, 0, Math.PI * 2);
    ctx.fill();

    const sunGrad = ctx.createRadialGradient(sx - 2, sy - 2, 0, sx, sy, sunR);
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
    const moonR = 12;
    const glowGrad = ctx.createRadialGradient(mx, my, 0, mx, my, 40);
    glowGrad.addColorStop(0, "rgba(160,200,255,0.2)");
    glowGrad.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = glowGrad;
    ctx.beginPath();
    ctx.arc(mx, my, 40, 0, Math.PI * 2);
    ctx.fill();

    const moonGrad = ctx.createRadialGradient(mx - 2, my - 2, 0, mx, my, moonR);
    moonGrad.addColorStop(0, "#e8f0ff");
    moonGrad.addColorStop(0.5, "#c0d8f8");
    moonGrad.addColorStop(1, "#90b4e8");
    ctx.fillStyle = moonGrad;
    ctx.beginPath();
    ctx.arc(mx, my, moonR, 0, Math.PI * 2);
    ctx.fill();

    /* craters */
    ctx.fillStyle = "rgba(100,140,200,0.2)";
    ctx.beginPath(); ctx.arc(mx + 3, my + 2, 2.5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(mx - 2, my + 4, 1.5, 0, Math.PI * 2); ctx.fill();
  }

  /* clouds */
  if (sky.cloudOpacity > 0) {
    clouds.forEach(c => {
      const cx = ((c.x + frame * c.speed) % 1.3) - 0.15;
      const cloudX = cx * w;
      const cloudY = c.y * h;
      const cloudW = c.w * w;
      const cloudH = c.h * h;

      ctx.save();
      ctx.globalAlpha = sky.cloudOpacity * c.opacity;
      ctx.fillStyle = isNight ? "rgba(40,50,80,0.6)" : "rgba(255,255,255,0.8)";

      // organic cloud shape (3 overlapping ellipses)
      ctx.beginPath();
      ctx.ellipse(cloudX, cloudY, cloudW * 0.5, cloudH, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(cloudX - cloudW * 0.25, cloudY + cloudH * 0.3, cloudW * 0.35, cloudH * 0.8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(cloudX + cloudW * 0.3, cloudY + cloudH * 0.2, cloudW * 0.4, cloudH * 0.9, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    });
  }

  /* horizon haze */
  if (sky.hazeOpacity > 0) {
    const hazeGrad = ctx.createLinearGradient(0, h * 0.6, 0, h);
    hazeGrad.addColorStop(0, "rgba(0,0,0,0)");
    hazeGrad.addColorStop(1, `rgba(${isNight ? "20,40,80" : "140,170,220"},${sky.hazeOpacity})`);
    ctx.fillStyle = hazeGrad;
    ctx.fillRect(0, h * 0.6, w, h * 0.4);
  }

  /* city silhouette */
  const cityH = h * 0.4;
  const baseY = h;

  buildings.forEach(b => {
    const bx = b.x * w;
    const bw = b.w * w;
    const bh = b.h * cityH;
    const by = baseY - bh;
    const layerAlpha = b.layer === 0 ? sky.cityAlpha * 0.55 : sky.cityAlpha;

    /* building body — shape depends on type */
    const bColor = isNight
      ? (b.layer === 1 ? `rgba(13,32,64,${layerAlpha})` : `rgba(10,26,53,${layerAlpha})`)
      : `rgba(26,42,80,${layerAlpha})`;
    ctx.fillStyle = bColor;

    switch (b.type) {
      case "pyramid":
        ctx.beginPath();
        ctx.moveTo(bx + bw / 2, by);
        ctx.lineTo(bx - bw * 0.08, baseY);
        ctx.lineTo(bx + bw * 1.08, baseY);
        ctx.closePath();
        ctx.fill();
        break;
      case "terrace": {
        const steps = 4;
        for (let s = 0; s < steps; s++) {
          const stepH = bh / steps;
          const shrink = s * bw * 0.08;
          ctx.fillRect(bx + shrink, by + s * stepH, bw - shrink * 2, stepH + 1);
        }
        break;
      }
      case "crystal":
        ctx.beginPath();
        ctx.moveTo(bx + bw * 0.3, by);
        ctx.lineTo(bx, by + bh * 0.35);
        ctx.lineTo(bx, baseY);
        ctx.lineTo(bx + bw, baseY);
        ctx.lineTo(bx + bw, by + bh * 0.25);
        ctx.lineTo(bx + bw * 0.7, by);
        ctx.closePath();
        ctx.fill();
        break;
      case "spire":
        ctx.fillRect(bx, by, bw, bh);
        ctx.beginPath();
        ctx.moveTo(bx + bw / 2, by - bh * 0.12);
        ctx.lineTo(bx + bw * 0.3, by);
        ctx.lineTo(bx + bw * 0.7, by);
        ctx.closePath();
        ctx.fill();
        break;
      case "antenna":
        ctx.fillRect(bx, by, bw, bh);
        break;
      default: // box
        ctx.fillRect(bx, by, bw, bh);
    }

    /* windows grid (for all types except pyramid) */
    if (sky.windowGlow > 0.02 && b.type !== "pyramid") {
      const winW = 3, winH = 4, gapX = 7, gapY = 7, padX = 3, padT = 5;
      const cols = Math.floor((bw - padX * 2) / gapX);
      const rows = Math.floor((bh - padT) / gapY);
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const wx = bx + padX + col * gapX;
          const wy = by + padT + row * gapY;
          const seed = (Math.sin(b.windowSeed + wx * 127 + wy * 311) + 1) / 2;
          if (seed < 0.35) continue;
          // For terrace/crystal: skip windows outside shape
          if (b.type === "terrace") {
            const relRow = row / rows;
            const shrink = relRow * bw * 0.08 * 4;
            if (wx < bx + shrink || wx > bx + bw - shrink) continue;
          }
          const warmCool = seed > 0.55;
          const alpha = sky.windowGlow * (0.5 + seed * 0.5);
          ctx.fillStyle = isNight || sky.phase === "dusk" || sky.phase === "golden"
            ? warmCool
              ? `rgba(255,210,130,${alpha})`
              : `rgba(180,220,255,${alpha * 0.8})`
            : `rgba(180,220,255,${sky.windowGlow})`;
          ctx.fillRect(wx, wy, winW, winH);
        }
      }
    }

    /* antenna with beacon */
    if (b.type === "antenna" && b.layer === 1) {
      const ax = bx + bw / 2;
      ctx.strokeStyle = isNight ? "rgba(0,180,220,0.6)" : "rgba(74,128,255,0.3)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(ax, by);
      ctx.lineTo(ax, by - 14);
      ctx.stroke();
      const blink = Math.sin(frame * 0.02) > 0.3;
      ctx.fillStyle = blink
        ? (isNight ? "rgba(255,50,50,0.9)" : "rgba(255,100,100,0.4)")
        : "rgba(255,50,50,0.05)";
      ctx.beginPath();
      ctx.arc(ax, by - 14, 2, 0, Math.PI * 2);
      ctx.fill();
    }

    /* subtle neon edge lines (night, foreground only) */
    if (isNight && b.layer === 1 && b.type !== "pyramid") {
      ctx.strokeStyle = "rgba(0,180,220,0.12)";
      ctx.lineWidth = 0.6;
      ctx.beginPath();
      ctx.moveTo(bx, by); ctx.lineTo(bx, baseY); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(bx + bw, by); ctx.lineTo(bx + bw, baseY); ctx.stroke();
      ctx.strokeStyle = "rgba(0,180,220,0.18)";
      ctx.beginPath();
      ctx.moveTo(bx, by); ctx.lineTo(bx + bw, by); ctx.stroke();
    }
  });

  /* city light pollution glow (night only) */
  if (isNight || sky.phase === "dusk") {
    const pollutionAlpha = isNight ? 0.08 : 0.04;
    const pollutionGrad = ctx.createLinearGradient(0, h * 0.7, 0, h);
    pollutionGrad.addColorStop(0, "rgba(0,0,0,0)");
    pollutionGrad.addColorStop(1, `rgba(80,100,140,${pollutionAlpha})`);
    ctx.fillStyle = pollutionGrad;
    ctx.fillRect(0, h * 0.7, w, h * 0.3);
  }

  /* ground line */
  ctx.strokeStyle = isNight ? "rgba(0,180,220,0.2)" : "rgba(74,128,255,0.08)";
  ctx.lineWidth = isNight ? 0.8 : 0.4;
  ctx.beginPath();
  ctx.moveTo(0, baseY - 1);
  ctx.lineTo(w, baseY - 1);
  ctx.stroke();
}

/* ─── main exported component ──────────────────────────────── */

interface DayNightBackgroundProps {
  opacity?: number;
}

export default function DayNightBackground({ opacity = 0.15 }: DayNightBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const starsRef = useRef<Star[]>([]);
  const buildingsRef = useRef<BuildingDef[]>([]);
  const cloudsRef = useRef<Cloud[]>([]);
  const birdsRef = useRef<Bird[]>([]);
  const frameRef = useRef(0);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const sessionSeed = Date.now();
    starsRef.current = Array.from({ length: 120 }, () => ({
      x: Math.random(),
      y: Math.random(),
      r: Math.random() * 1.0 + 0.3,
      phase: Math.random() * Math.PI * 2,
      speed: 0.005 + Math.random() * 0.012,
      drift: 0.000015 + Math.random() * 0.000025,
    }));
    buildingsRef.current = generateBuildings(sessionSeed);
    cloudsRef.current = generateClouds(sessionSeed);
    birdsRef.current = generateBirds(sessionSeed);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let skipFrame = false;

    function loop() {
      // Render every 2nd frame for performance
      skipFrame = !skipFrame;
      if (skipFrame) {
        frameRef.current++;
        rafRef.current = requestAnimationFrame(loop);
        return;
      }

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
      drawScene(
        ctx!, canvas!.offsetWidth, canvas!.offsetHeight,
        progress, frameRef.current,
        starsRef.current, buildingsRef.current, cloudsRef.current, birdsRef.current,
      );
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
  const buildingsRef = useRef<BuildingDef[]>([]);
  const cloudsRef = useRef<Cloud[]>([]);
  const birdsRef = useRef<Bird[]>([]);
  const frameRef = useRef(0);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    starsRef.current = Array.from({ length: 50 }, () => ({
      x: Math.random(), y: Math.random(),
      r: Math.random() * 0.8 + 0.2,
      phase: Math.random() * Math.PI * 2,
      speed: 0.008 + Math.random() * 0.015,
      drift: 0.00002 + Math.random() * 0.00003,
    }));
    buildingsRef.current = generateBuildings(42);
    cloudsRef.current = generateClouds(42);
    birdsRef.current = generateBirds(42);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let skipFrame = false;
    function loop() {
      skipFrame = !skipFrame;
      if (skipFrame) {
        frameRef.current++;
        rafRef.current = requestAnimationFrame(loop);
        return;
      }
      const now = new Date();
      const progress = getProgress(now.getHours(), now.getMinutes() + now.getSeconds() / 60);
      const w = canvas!.offsetWidth;
      const h = canvas!.offsetHeight;
      canvas!.width = w;
      canvas!.height = h;
      drawScene(ctx!, w, h, progress, frameRef.current, starsRef.current, buildingsRef.current, cloudsRef.current, birdsRef.current);
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
