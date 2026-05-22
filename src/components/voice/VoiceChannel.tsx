"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";

interface Participant {
  name: string;
  peerId: string;
  joinedAt: number;
}

interface VoiceChannelProps {
  channelId: string;
  channelName: string;
  onClose: () => void;
}

export default function VoiceChannel({ channelId, channelName, onClose }: VoiceChannelProps) {
  const { data: session } = useSession();
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const localStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const remoteAudiosRef = useRef<Map<string, HTMLAudioElement>>(new Map());
  const screenVideoRef = useRef<HTMLVideoElement>(null);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  const fetchParticipants = useCallback(async () => {
    try {
      const res = await fetch(`/api/voice?channelId=${channelId}`);
      const data = await res.json();
      setParticipants(data.participants || []);
    } catch {
      // ignore
    }
  }, [channelId]);

  const joinVoice = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 48000,
        },
      });
      localStreamRef.current = stream;

      await fetch("/api/voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channelId, action: "join", peerId: session?.user?.id }),
      });

      setIsConnected(true);
      setError(null);

      pollRef.current = setInterval(fetchParticipants, 2000);
    } catch {
      setError("Не удалось получить доступ к микрофону. Проверьте разрешения.");
    }
  };

  const leaveVoice = async () => {
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    screenStreamRef.current?.getTracks().forEach((t) => t.stop());
    screenStreamRef.current = null;

    peerConnectionsRef.current.forEach((pc) => pc.close());
    peerConnectionsRef.current.clear();
    remoteAudiosRef.current.forEach((audio) => audio.pause());
    remoteAudiosRef.current.clear();

    await fetch("/api/voice", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ channelId, action: "leave" }),
    });

    if (pollRef.current) clearInterval(pollRef.current);
    setIsConnected(false);
    setIsScreenSharing(false);
  };

  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  const toggleScreenShare = async () => {
    if (isScreenSharing) {
      screenStreamRef.current?.getTracks().forEach((t) => t.stop());
      screenStreamRef.current = null;
      setIsScreenSharing(false);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: 30 },
        audio: true,
      });

      screenStreamRef.current = stream;
      setIsScreenSharing(true);

      if (screenVideoRef.current) {
        screenVideoRef.current.srcObject = stream;
      }

      stream.getVideoTracks()[0].onended = () => {
        screenStreamRef.current = null;
        setIsScreenSharing(false);
      };
    } catch {
      setError("Не удалось начать демонстрацию экрана.");
    }
  };

  useEffect(() => {
    fetchParticipants();
    const pcs = peerConnectionsRef.current;
    const audios = remoteAudiosRef.current;
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
      screenStreamRef.current?.getTracks().forEach((t) => t.stop());
      pcs.forEach((pc) => pc.close());
      audios.forEach((audio) => audio.pause());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchParticipants]);

  const handleClose = async () => {
    if (isConnected) await leaveVoice();
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
    >
      <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl border border-neutral-200 dark:border-white/10 w-full max-w-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 dark:border-white/10">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${isConnected ? "bg-green-400 animate-pulse" : "bg-neutral-400"}`} />
            <div>
              <h3 className="font-semibold text-neutral-900 dark:text-white">🎙️ {channelName}</h3>
              <p className="text-xs text-neutral-500">
                {participants.length} участник{participants.length === 1 ? "" : participants.length < 5 ? "а" : "ов"}
              </p>
            </div>
          </div>
          <button onClick={handleClose} className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-white/10 transition-colors">
            <svg className="w-5 h-5 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Screen Share */}
        {isScreenSharing && (
          <div className="bg-black relative">
            <video
              ref={screenVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full max-h-80 object-contain"
            />
            <div className="absolute top-2 left-2 px-2 py-1 bg-red-500 text-white text-xs rounded-lg flex items-center gap-1">
              <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
              Демонстрация экрана
            </div>
          </div>
        )}

        {/* Participants */}
        <div className="p-6 min-h-[200px]">
          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 text-sm rounded-xl">
              {error}
            </div>
          )}

          <div className="grid grid-cols-3 sm:grid-cols-4 gap-4">
            {participants.map((p) => (
              <motion.div
                key={p.peerId}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="flex flex-col items-center gap-2"
              >
                <div className="relative">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-violet-400/30 to-indigo-500/30 flex items-center justify-center text-lg font-bold text-white border-2 border-green-400/50">
                    {p.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-white dark:border-neutral-900" />
                </div>
                <span className="text-xs text-neutral-600 dark:text-neutral-400 truncate max-w-[80px]">{p.name}</span>
              </motion.div>
            ))}

            {participants.length === 0 && (
              <div className="col-span-full text-center py-8 text-neutral-400">
                <span className="text-4xl block mb-2">🎙️</span>
                <p className="text-sm">Канал пуст. Подключитесь первым!</p>
              </div>
            )}
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-3 px-6 py-4 border-t border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-white/5">
          {!isConnected ? (
            <button
              onClick={joinVoice}
              className="px-6 py-2.5 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl font-medium text-sm hover:shadow-lg hover:shadow-green-500/20 transition-all"
            >
              Подключиться
            </button>
          ) : (
            <>
              <button
                onClick={toggleMute}
                className={`p-3 rounded-xl transition-all ${
                  isMuted
                    ? "bg-red-100 dark:bg-red-500/20 text-red-500"
                    : "bg-neutral-200 dark:bg-white/10 text-neutral-700 dark:text-neutral-300"
                }`}
                title={isMuted ? "Включить микрофон" : "Выключить микрофон"}
              >
                {isMuted ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  </svg>
                )}
              </button>

              <button
                onClick={toggleScreenShare}
                className={`p-3 rounded-xl transition-all ${
                  isScreenSharing
                    ? "bg-blue-100 dark:bg-blue-500/20 text-blue-500"
                    : "bg-neutral-200 dark:bg-white/10 text-neutral-700 dark:text-neutral-300"
                }`}
                title={isScreenSharing ? "Остановить демонстрацию" : "Демонстрация экрана"}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </button>

              <button
                onClick={leaveVoice}
                className="p-3 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-all"
                title="Отключиться"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M5 3a2 2 0 00-2 2v1c0 8.284 6.716 15 15 15h1a2 2 0 002-2v-3.28a1 1 0 00-.684-.948l-4.493-1.498a1 1 0 00-1.21.502l-1.13 2.257a11.042 11.042 0 01-5.516-5.517l2.257-1.128a1 1 0 00.502-1.21L9.228 3.683A1 1 0 008.279 3H5z" />
                </svg>
              </button>
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
}
