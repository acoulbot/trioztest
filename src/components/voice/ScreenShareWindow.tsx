"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";

interface ScreenShareWindowProps {
  stream: MediaStream | null;
  sharerName: string;
  isLocal: boolean;
  onStop?: () => void;
}

/**
 * Floating draggable screen share window.
 * Renders OUTSIDE the VoiceChannel modal so it never blocks the UI.
 * User can drag it, resize it between three sizes, or go fullscreen.
 */
export default function ScreenShareWindow({
  stream, sharerName, isLocal, onStop,
}: ScreenShareWindowProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const dragRef  = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<"sm" | "md" | "lg">("md");
  const [pos, setPos] = useState({ x: 80, y: 80 });
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ mx: 0, my: 0, px: 0, py: 0 });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [minimized, setMinimized] = useState(false);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(() => {});
    }
  }, [stream]);

  const sizeClasses = {
    sm: "w-72  h-44",
    md: "w-[560px] h-[340px]",
    lg: "w-[840px] h-[500px]",
  };

  // Drag handlers
  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("button")) return;
    setDragging(true);
    setDragStart({ mx: e.clientX, my: e.clientY, px: pos.x, py: pos.y });
  }, [pos]);

  useEffect(() => {
    if (!dragging) return;
    const onMove = (e: MouseEvent) => {
      setPos({
        x: dragStart.px + e.clientX - dragStart.mx,
        y: dragStart.py + e.clientY - dragStart.my,
      });
    };
    const onUp = () => setDragging(false);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
  }, [dragging, dragStart]);

  if (isFullscreen) {
    return (
      <div className="fixed inset-0 z-[9998] bg-black flex flex-col">
        <div className="flex items-center justify-between px-4 py-2 bg-neutral-900/80 absolute top-0 left-0 right-0 z-10">
          <span className="text-white text-sm">{sharerName} демонстрирует экран</span>
          <div className="flex gap-2">
            <button onClick={() => setIsFullscreen(false)}
              className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs transition-colors">
              Выйти из полного экрана
            </button>
            {isLocal && onStop && (
              <button onClick={onStop}
                className="px-3 py-1.5 rounded-lg bg-red-500/80 hover:bg-red-500 text-white text-xs transition-colors">
                Остановить
              </button>
            )}
          </div>
        </div>
        <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-contain" />
      </div>
    );
  }

  return (
    <motion.div
      ref={dragRef}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      style={{ left: pos.x, top: pos.y, zIndex: 9997 }}
      className={`fixed rounded-2xl overflow-hidden shadow-2xl border border-white/10 select-none
        ${minimized ? "w-56 h-auto" : sizeClasses[size]}
        ${dragging ? "cursor-grabbing" : "cursor-grab"}`}
      onMouseDown={onMouseDown}
    >
      {/* Header bar */}
      <div className="flex items-center justify-between px-3 py-2 bg-neutral-900/95 backdrop-blur-sm gap-2 flex-shrink-0">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse flex-shrink-0" />
          <span className="text-white text-xs truncate">{sharerName}</span>
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          {/* Size controls */}
          {!minimized && (
            <>
              {(["sm", "md", "lg"] as const).map(s => (
                <button key={s} onClick={e => { e.stopPropagation(); setSize(s); }}
                  className={`px-1.5 py-0.5 rounded text-[10px] transition-colors ${
                    size === s
                      ? "bg-white/20 text-white"
                      : "text-white/50 hover:text-white hover:bg-white/10"
                  }`}>
                  {s === "sm" ? "S" : s === "md" ? "M" : "L"}
                </button>
              ))}
              <button onClick={e => { e.stopPropagation(); setIsFullscreen(true); }}
                className="p-1 text-white/50 hover:text-white hover:bg-white/10 rounded transition-colors" title="На весь экран">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                </svg>
              </button>
            </>
          )}

          <button onClick={e => { e.stopPropagation(); setMinimized(m => !m); }}
            className="p-1 text-white/50 hover:text-white hover:bg-white/10 rounded transition-colors"
            title={minimized ? "Развернуть" : "Свернуть"}>
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={minimized ? "M5 15l7-7 7 7" : "M19 9l-7 7-7-7"} />
            </svg>
          </button>

          {isLocal && onStop && (
            <button onClick={e => { e.stopPropagation(); onStop(); }}
              className="px-2 py-0.5 rounded bg-red-500/80 hover:bg-red-500 text-white text-[10px] transition-colors">
              Стоп
            </button>
          )}
        </div>
      </div>

      {/* Video */}
      {!minimized && (
        <video
          ref={videoRef}
          autoPlay muted playsInline
          className="w-full h-full object-contain bg-black"
        />
      )}
    </motion.div>
  );
}
