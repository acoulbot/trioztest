"use client";

import { useState, useRef, useEffect, useCallback } from "react";

interface VoicePlayerProps {
  url: string;
  duration?: number;
  isOwn?: boolean;
}

export default function VoicePlayer({ url, duration: initialDuration, isOwn }: VoicePlayerProps) {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(initialDuration || 0);
  const [error, setError] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = new Audio(url);
    audio.preload = "metadata";
    audioRef.current = audio;

    audio.onloadedmetadata = () => {
      if (audio.duration && isFinite(audio.duration)) {
        setDuration(Math.round(audio.duration));
      }
    };

    audio.ontimeupdate = () => {
      if (audio.duration && isFinite(audio.duration)) {
        setProgress(audio.currentTime / audio.duration);
        setCurrentTime(audio.currentTime);
      }
    };

    audio.onended = () => {
      setPlaying(false);
      setProgress(0);
      setCurrentTime(0);
    };

    audio.onerror = () => {
      setError(true);
      setPlaying(false);
    };

    return () => {
      audio.pause();
      audio.src = "";
    };
  }, [url]);

  const toggle = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (audio.paused) {
      setError(false);
      audio.play().catch(() => setError(true));
      setPlaying(true);
    } else {
      audio.pause();
      setPlaying(false);
    }
  }, []);

  const seek = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    if (!audio || !audio.duration || !isFinite(audio.duration)) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    audio.currentTime = ratio * audio.duration;
    setProgress(ratio);
    setCurrentTime(audio.currentTime);
  }, []);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s) % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  return (
    <div className="flex items-center gap-2.5 min-w-[180px] max-w-[280px]">
      <button
        onClick={toggle}
        className={`w-8 h-8 flex-shrink-0 rounded-full flex items-center justify-center transition-colors ${
          error
            ? "bg-red-100 dark:bg-red-900/30 text-red-500"
            : isOwn
              ? "bg-white/20 hover:bg-white/30 text-white"
              : "bg-violet-100 dark:bg-cyan-400/20 hover:bg-violet-200 dark:hover:bg-cyan-400/30 text-violet-600 dark:text-cyan-400"
        }`}
      >
        {playing ? (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <rect x="6" y="4" width="4" height="16" rx="1" />
            <rect x="14" y="4" width="4" height="16" rx="1" />
          </svg>
        ) : (
          <svg className="w-4 h-4 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
        )}
      </button>

      <div className="flex-1 min-w-0">
        <div
          className={`h-1.5 rounded-full cursor-pointer ${
            isOwn ? "bg-white/20" : "bg-neutral-200 dark:bg-white/10"
          }`}
          onClick={seek}
        >
          <div
            className={`h-full rounded-full transition-all duration-100 ${
              isOwn ? "bg-white/70" : "bg-violet-500 dark:bg-cyan-400"
            }`}
            style={{ width: `${progress * 100}%` }}
          />
        </div>
        <div className="flex justify-between mt-0.5">
          <span className={`text-[10px] ${isOwn ? "text-white/60" : "text-neutral-400"}`}>
            {playing ? formatTime(currentTime) : formatTime(0)}
          </span>
          <span className={`text-[10px] ${isOwn ? "text-white/60" : "text-neutral-400"}`}>
            {formatTime(duration)}
          </span>
        </div>
      </div>
    </div>
  );
}
