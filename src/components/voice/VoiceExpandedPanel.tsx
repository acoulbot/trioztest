"use client";

import { useVoice, type ConnectionQuality } from "@/contexts/VoiceContext";
import { motion } from "framer-motion";

function QualityIcon({ quality }: { quality: ConnectionQuality }) {
  const colors: Record<ConnectionQuality, string> = {
    good: "#22c55e",
    medium: "#eab308",
    poor: "#ef4444",
    unknown: "#6b7280",
  };
  const bars = quality === "good" ? 4 : quality === "medium" ? 3 : quality === "poor" ? 1 : 0;
  return (
    <svg width={14} height={14} viewBox="0 0 16 16" aria-label={quality}>
      {[0, 1, 2, 3].map(i => (
        <rect
          key={i}
          x={1 + i * 4}
          y={12 - (i + 1) * 3}
          width={3}
          height={(i + 1) * 3}
          rx={0.5}
          fill={i < bars ? colors[quality] : "#4b5563"}
        />
      ))}
    </svg>
  );
}

interface VoiceExpandedPanelProps {
  onClose: () => void;
}

export default function VoiceExpandedPanel({ onClose }: VoiceExpandedPanelProps) {
  const voice = useVoice();

  if (!voice.isConnected) return null;

  const screenSharer = voice.isSharingScreen
    ? "Вы"
    : voice.screenSharerId
      ? voice.users.find(u => u.socketId === voice.screenSharerId)?.userName ?? "Участник"
      : null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ scale: 0.92, opacity: 0, y: 12 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.92, opacity: 0, y: 12 }}
        transition={{ type: "spring", damping: 26, stiffness: 280 }}
        className="bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl border border-neutral-200 dark:border-white/10 w-full max-w-xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-neutral-200 dark:border-white/10">
          <div className="flex items-center gap-3">
            <span className="w-3 h-3 rounded-full bg-green-400 animate-pulse" />
            <div>
              <h3 className="text-sm font-semibold text-neutral-900 dark:text-white">
                {voice.channelName || "Голосовой канал"}
              </h3>
              <span className="text-xs text-neutral-500">
                {voice.users.length} {voice.users.length === 1 ? "участник" : voice.users.length < 5 ? "участника" : "участников"}
                {voice.localPing !== null && (
                  <span className={`ml-2 ${voice.localPing < 150 ? "text-green-400" : voice.localPing < 400 ? "text-yellow-400" : "text-red-400"}`}>
                    {Math.round(voice.localPing)} мс
                  </span>
                )}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-neutral-100 dark:hover:bg-white/10 rounded-lg transition-colors text-neutral-500 hover:text-neutral-700 dark:hover:text-white"
          >
            <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Users */}
        <div className="px-3 py-3 max-h-64 overflow-y-auto space-y-1">
          {voice.users.map(u => {
            const isSpeaking = voice.speakingUsers.has(u.socketId);
            const isScreenSharing = voice.screenSharerId === u.socketId;

            return (
              <div
                key={u.socketId}
                className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-all ${
                  isSpeaking ? "bg-green-500/10 ring-1 ring-green-400/30" : "hover:bg-neutral-100 dark:hover:bg-white/5"
                }`}
              >
                {/* Avatar */}
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 transition-all ${
                    isSpeaking
                      ? "bg-green-500/20 ring-2 ring-green-400 text-green-400"
                      : "bg-neutral-200 dark:bg-white/10 text-neutral-600 dark:text-neutral-300"
                  }`}
                >
                  {u.userName.charAt(0).toUpperCase()}
                </div>

                {/* Name */}
                <div className="flex-1 min-w-0">
                  <span className="text-sm text-neutral-900 dark:text-white truncate block">
                    {u.userName}
                  </span>
                  {isSpeaking && (
                    <span className="text-[10px] text-green-400">Говорит</span>
                  )}
                </div>

                {/* Status icons */}
                <div className="flex items-center gap-1.5">
                  <QualityIcon quality={voice.connectionQuality.get(u.socketId) ?? "unknown"} />
                  {isScreenSharing && (
                    <span className="text-blue-400" title="Демонстрация экрана">
                      <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                        <rect x="2" y="3" width="20" height="14" rx="2" />
                        <line x1="8" y1="21" x2="16" y2="21" />
                        <line x1="12" y1="17" x2="12" y2="21" />
                      </svg>
                    </span>
                  )}
                  {u.muted && (
                    <span className="text-red-400" title="Микрофон выключен">
                      <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                        <line x1="1" y1="1" x2="23" y2="23" />
                        <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" />
                        <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2c0 .28-.02.56-.06.84" />
                      </svg>
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Screen share info */}
        {screenSharer && (
          <div className="px-4 pb-3">
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3 flex items-center gap-3">
              <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="text-blue-400 flex-shrink-0">
                <rect x="2" y="3" width="20" height="14" rx="2" />
                <line x1="8" y1="21" x2="16" y2="21" />
                <line x1="12" y1="17" x2="12" y2="21" />
              </svg>
              <span className="text-xs text-blue-300">{screenSharer} демонстрирует экран</span>
            </div>
          </div>
        )}

        {/* Controls */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-neutral-900/50">
          <div className="flex gap-2">
            <button
              onClick={voice.toggleMute}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                voice.isMuted
                  ? "bg-red-500/20 text-red-400 hover:bg-red-500/30"
                  : "bg-neutral-200 dark:bg-white/10 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-300 dark:hover:bg-white/15"
              }`}
            >
              {voice.isMuted ? (
                <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <line x1="1" y1="1" x2="23" y2="23" />
                  <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" />
                  <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2c0 .28-.02.56-.06.84" />
                </svg>
              ) : (
                <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                  <line x1="12" y1="19" x2="12" y2="23" />
                  <line x1="8" y1="23" x2="16" y2="23" />
                </svg>
              )}
              {voice.isMuted ? "Вкл. микрофон" : "Выкл. микрофон"}
            </button>
            <button
              onClick={voice.toggleDeafen}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                voice.isDeafened
                  ? "bg-red-500/20 text-red-400 hover:bg-red-500/30"
                  : "bg-neutral-200 dark:bg-white/10 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-300 dark:hover:bg-white/15"
              }`}
            >
              <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
                <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
              </svg>
              {voice.isDeafened ? "Вкл. звук" : "Выкл. звук"}
            </button>
          </div>
          <button
            onClick={() => { voice.leaveVoice(); onClose(); }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
          >
            <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M16 8l-8 8M8 8l8 8" />
            </svg>
            Выйти
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
