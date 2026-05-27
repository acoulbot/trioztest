/**
 * DM notification sound via Web Audio API (no files needed).
 * Two-tone gentle ping — Discord-inspired but softer.
 */

let _ctx: AudioContext | null = null;
let _enabled = true;

export function setDMSoundEnabled(v: boolean) { _enabled = v; }
export function getDMSoundEnabled() { return _enabled; }

function getCtx(): AudioContext | null {
  if (!_enabled) return null;
  if (typeof window === "undefined") return null;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return null;
  if (!_ctx) _ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
  return _ctx;
}

export function playDMNotification() {
  const ctx = getCtx();
  if (!ctx) return;
  try {
    const now = ctx.currentTime;
    // First tone: E5
    const o1 = ctx.createOscillator();
    const g1 = ctx.createGain();
    o1.connect(g1); g1.connect(ctx.destination);
    o1.type = "sine"; o1.frequency.value = 659;
    g1.gain.setValueAtTime(0, now);
    g1.gain.linearRampToValueAtTime(0.12, now + 0.02);
    g1.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
    o1.start(now); o1.stop(now + 0.25);

    // Second tone: G5 (after 120ms)
    const o2 = ctx.createOscillator();
    const g2 = ctx.createGain();
    o2.connect(g2); g2.connect(ctx.destination);
    o2.type = "sine"; o2.frequency.value = 784;
    g2.gain.setValueAtTime(0, now + 0.12);
    g2.gain.linearRampToValueAtTime(0.09, now + 0.14);
    g2.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    o2.start(now + 0.12); o2.stop(now + 0.35);
  } catch { /* ignore */ }
}
