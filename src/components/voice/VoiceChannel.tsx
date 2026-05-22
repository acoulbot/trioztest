"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import { io, Socket } from "socket.io-client";

interface VoiceUser {
  socketId: string;
  userId: string;
  userName: string;
  muted: boolean;
}

interface VoiceChannelProps {
  channelId: string;
  channelName: string;
  onClose: () => void;
}

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

export default function VoiceChannel({ channelId, channelName, onClose }: VoiceChannelProps) {
  const { data: session } = useSession();
  const [isConnected, setIsConnected] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isDeafened, setIsDeafened] = useState(false);
  const [users, setUsers] = useState<VoiceUser[]>([]);
  const [speakingUsers, setSpeakingUsers] = useState<Set<string>>(new Set());
  const [localSpeaking, setLocalSpeaking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const socketRef = useRef<Socket | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const peersRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const speakingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const remoteAudiosRef = useRef<Map<string, HTMLAudioElement>>(new Map());

  const cleanupPeer = useCallback((socketId: string) => {
    const peer = peersRef.current.get(socketId);
    if (peer) {
      peer.close();
      peersRef.current.delete(socketId);
    }
    const audio = remoteAudiosRef.current.get(socketId);
    if (audio) {
      audio.pause();
      audio.srcObject = null;
      remoteAudiosRef.current.delete(socketId);
    }
  }, []);

  const createPeerConnection = useCallback((remoteSocketId: string, isInitiator: boolean) => {
    const pc = new RTCPeerConnection(ICE_SERVERS);
    peersRef.current.set(remoteSocketId, pc);

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        pc.addTrack(track, localStreamRef.current!);
      });
    }

    pc.ontrack = (event) => {
      const [remoteStream] = event.streams;
      let audio = remoteAudiosRef.current.get(remoteSocketId);
      if (!audio) {
        audio = new Audio();
        audio.autoplay = true;
        remoteAudiosRef.current.set(remoteSocketId, audio);
      }
      audio.srcObject = remoteStream;
    };

    pc.onicecandidate = (event) => {
      if (event.candidate && socketRef.current) {
        socketRef.current.emit("ice-candidate", {
          to: remoteSocketId,
          candidate: event.candidate.toJSON(),
        });
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "failed" || pc.connectionState === "disconnected") {
        cleanupPeer(remoteSocketId);
      }
    };

    if (isInitiator) {
      pc.createOffer()
        .then((offer) => pc.setLocalDescription(offer))
        .then(() => {
          socketRef.current?.emit("voice-offer", {
            to: remoteSocketId,
            offer: pc.localDescription,
          });
        });
    }

    return pc;
  }, [cleanupPeer]);

  const startSpeakingDetection = useCallback(() => {
    if (!localStreamRef.current) return;

    const audioContext = new AudioContext();
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 512;
    analyser.smoothingTimeConstant = 0.4;

    const source = audioContext.createMediaStreamSource(localStreamRef.current);
    source.connect(analyser);

    audioContextRef.current = audioContext;
    analyserRef.current = analyser;

    const dataArray = new Uint8Array(analyser.frequencyBinCount);

    speakingIntervalRef.current = setInterval(() => {
      analyser.getByteFrequencyData(dataArray);
      const average = dataArray.reduce((sum, val) => sum + val, 0) / dataArray.length;
      const isSpeaking = average > 15;

      setLocalSpeaking((prev) => {
        if (prev !== isSpeaking) {
          socketRef.current?.emit("speaking", { channelId, speaking: isSpeaking });
        }
        return isSpeaking;
      });
    }, 100);
  }, [channelId]);

  const joinVoice = useCallback(async () => {
    if (!session?.user) return;
    setError(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      localStreamRef.current = stream;

      const socket = io({
        path: "/api/socketio",
        transports: ["websocket", "polling"],
      });
      socketRef.current = socket;

      socket.on("connect", () => {
        socket.emit("join-voice", {
          channelId,
          userId: session.user.id,
          userName: session.user.name || "Пользователь",
        });
        setIsConnected(true);
      });

      socket.on("voice-users", (existingUsers: VoiceUser[]) => {
        setUsers(existingUsers);
        existingUsers.forEach((user) => {
          createPeerConnection(user.socketId, true);
        });
      });

      socket.on("user-joined", (user: VoiceUser) => {
        setUsers((prev) => [...prev.filter((u) => u.socketId !== user.socketId), user]);
        createPeerConnection(user.socketId, false);
      });

      socket.on("user-left", ({ socketId }: { socketId: string }) => {
        setUsers((prev) => prev.filter((u) => u.socketId !== socketId));
        cleanupPeer(socketId);
        setSpeakingUsers((prev) => {
          const next = new Set(prev);
          next.delete(socketId);
          return next;
        });
      });

      socket.on("voice-offer", async ({ from, offer }: { from: string; offer: RTCSessionDescriptionInit }) => {
        let pc = peersRef.current.get(from);
        if (!pc) {
          pc = createPeerConnection(from, false);
        }
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit("voice-answer", { to: from, answer });
      });

      socket.on("voice-answer", async ({ from, answer }: { from: string; answer: RTCSessionDescriptionInit }) => {
        const pc = peersRef.current.get(from);
        if (pc) {
          await pc.setRemoteDescription(new RTCSessionDescription(answer));
        }
      });

      socket.on("ice-candidate", async ({ from, candidate }: { from: string; candidate: RTCIceCandidateInit }) => {
        const pc = peersRef.current.get(from);
        if (pc) {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        }
      });

      socket.on("user-muted", ({ socketId, muted }: { socketId: string; muted: boolean }) => {
        setUsers((prev) => prev.map((u) => u.socketId === socketId ? { ...u, muted } : u));
      });

      socket.on("user-speaking", ({ socketId, speaking }: { socketId: string; speaking: boolean }) => {
        setSpeakingUsers((prev) => {
          const next = new Set(prev);
          if (speaking) next.add(socketId);
          else next.delete(socketId);
          return next;
        });
      });

      socket.on("connect_error", () => {
        setError("Не удалось подключиться к серверу");
      });

      startSpeakingDetection();
    } catch (err) {
      if (err instanceof DOMException && err.name === "NotAllowedError") {
        setError("Доступ к микрофону запрещён. Разрешите доступ в настройках браузера.");
      } else {
        setError("Не удалось подключиться к голосовому каналу");
      }
    }
  }, [session, channelId, createPeerConnection, cleanupPeer, startSpeakingDetection]);

  const leaveVoice = useCallback(() => {
    socketRef.current?.emit("leave-voice", { channelId });
    socketRef.current?.disconnect();
    socketRef.current = null;

    localStreamRef.current?.getTracks().forEach((track) => track.stop());
    localStreamRef.current = null;

    peersRef.current.forEach((_, socketId) => cleanupPeer(socketId));
    peersRef.current.clear();

    if (speakingIntervalRef.current) {
      clearInterval(speakingIntervalRef.current);
      speakingIntervalRef.current = null;
    }

    audioContextRef.current?.close();
    audioContextRef.current = null;
    analyserRef.current = null;

    setIsConnected(false);
    setUsers([]);
    setSpeakingUsers(new Set());
    setLocalSpeaking(false);
    setIsMuted(false);
    setIsDeafened(false);
  }, [channelId, cleanupPeer]);

  const toggleMute = useCallback(() => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = isMuted;
        setIsMuted(!isMuted);
        socketRef.current?.emit("toggle-mute", { channelId, muted: !isMuted });
      }
    }
  }, [isMuted, channelId]);

  const toggleDeafen = useCallback(() => {
    const newDeafened = !isDeafened;
    setIsDeafened(newDeafened);
    remoteAudiosRef.current.forEach((audio) => {
      audio.muted = newDeafened;
    });
    if (newDeafened && !isMuted) {
      toggleMute();
    }
  }, [isDeafened, isMuted, toggleMute]);

  const handleClose = async () => {
    if (isConnected) leaveVoice();
    onClose();
  };

  useEffect(() => {
    return () => {
      if (isConnected) leaveVoice();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={handleClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl border border-neutral-200 dark:border-white/10 w-full max-w-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 dark:border-white/10">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${isConnected ? "bg-green-400 animate-pulse" : "bg-neutral-400"}`} />
            <div>
              <h3 className="font-semibold text-neutral-900 dark:text-white flex items-center gap-2">
                🎙️ {channelName}
              </h3>
              <p className="text-xs text-neutral-500">
                {isConnected ? `Подключено • ${users.length + 1} участник(ов)` : "Голосовой канал"}
              </p>
            </div>
          </div>
          <button onClick={handleClose} className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-white/10 transition-colors">
            <svg className="w-5 h-5 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Participants */}
        <div className="p-6 min-h-[250px]">
          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 text-sm rounded-xl">
              {error}
            </div>
          )}

          {isConnected ? (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-4">
              {/* Local user */}
              <VoiceUserCard
                name={session?.user?.name || "Вы"}
                muted={isMuted}
                speaking={localSpeaking && !isMuted}
                isLocal
              />

              {/* Remote users */}
              <AnimatePresence>
                {users.map((user) => (
                  <VoiceUserCard
                    key={user.socketId}
                    name={user.userName}
                    muted={user.muted}
                    speaking={speakingUsers.has(user.socketId)}
                  />
                ))}
              </AnimatePresence>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full py-8">
              <div className="w-20 h-20 rounded-full bg-emerald-50 dark:bg-emerald-400/10 flex items-center justify-center mb-4">
                <svg className="w-10 h-10 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-2">Голосовой канал</h3>
              <p className="text-neutral-500 text-sm text-center max-w-sm">
                Нажмите &laquo;Подключиться&raquo; для присоединения. Потребуется доступ к микрофону.
              </p>
            </div>
          )}
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
              {/* Mute */}
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

              {/* Deafen */}
              <button
                onClick={toggleDeafen}
                className={`p-3 rounded-xl transition-all ${
                  isDeafened
                    ? "bg-red-100 dark:bg-red-500/20 text-red-500"
                    : "bg-neutral-200 dark:bg-white/10 text-neutral-700 dark:text-neutral-300"
                }`}
                title={isDeafened ? "Включить звук" : "Отключить звук"}
              >
                {isDeafened ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                  </svg>
                )}
              </button>

              {/* Disconnect */}
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
      </motion.div>
    </motion.div>
  );
}

/* ─────────────── Voice User Card ─────────────── */

function VoiceUserCard({ name, muted, speaking, isLocal }: {
  name: string;
  muted: boolean;
  speaking: boolean;
  isLocal?: boolean;
}) {
  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.8, opacity: 0 }}
      className="flex flex-col items-center gap-2"
    >
      <div className="relative">
        {/* Avatar */}
        <div className={`w-16 h-16 rounded-full flex items-center justify-center text-lg font-bold transition-all duration-300 ${
          speaking
            ? "bg-green-400/20 text-green-400 ring-[3px] ring-green-400 ring-offset-2 ring-offset-white dark:ring-offset-neutral-900"
            : "bg-gradient-to-br from-violet-400/30 to-indigo-500/30 text-white border-2 border-white/10"
        }`}>
          {name.charAt(0).toUpperCase()}
        </div>

        {/* Speaking pulse animation */}
        {speaking && (
          <motion.div
            className="absolute -inset-1 rounded-full border-2 border-green-400/60"
            animate={{ scale: [1, 1.3, 1], opacity: [0.6, 0, 0.6] }}
            transition={{ duration: 1.2, repeat: Infinity, ease: "easeOut" }}
          />
        )}

        {/* Online indicator */}
        <div className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-white dark:border-neutral-900 ${
          speaking ? "bg-green-400" : muted ? "bg-red-400" : "bg-green-400"
        }`} />
      </div>

      {/* Name */}
      <span className={`text-xs truncate max-w-[80px] transition-colors ${
        speaking ? "text-green-500 font-semibold" : "text-neutral-600 dark:text-neutral-400"
      }`}>
        {name}{isLocal ? " (Вы)" : ""}
      </span>

      {/* Speaking indicator bars */}
      {speaking && (
        <div className="flex items-end gap-0.5 h-3">
          {[0, 1, 2, 3, 4].map((i) => (
            <motion.div
              key={i}
              className="w-[3px] bg-green-400 rounded-full"
              animate={{ height: [3, 8 + Math.random() * 6, 3] }}
              transition={{ duration: 0.3 + i * 0.05, repeat: Infinity, ease: "easeInOut" }}
            />
          ))}
        </div>
      )}

      {/* Muted indicator */}
      {muted && !speaking && (
        <div className="text-red-400">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
          </svg>
        </div>
      )}
    </motion.div>
  );
}
