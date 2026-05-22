"use client";

import { useEffect, useRef, useState, useCallback } from "react";
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
  userId: string;
  userName: string;
}

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

export default function VoiceChannel({ channelId, channelName, userId, userName }: VoiceChannelProps) {
  const [connected, setConnected] = useState(false);
  const [muted, setMuted] = useState(false);
  const [deafened, setDeafened] = useState(false);
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

    // Add local audio tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        pc.addTrack(track, localStreamRef.current!);
      });
    }

    // Handle remote stream
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

    // Handle ICE candidates
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

  const joinChannel = useCallback(async () => {
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
        socket.emit("join-voice", { channelId, userId, userName });
        setConnected(true);
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

      socket.on("user-muted", ({ socketId, muted: isMuted }: { socketId: string; muted: boolean }) => {
        setUsers((prev) => prev.map((u) => u.socketId === socketId ? { ...u, muted: isMuted } : u));
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
  }, [channelId, userId, userName, createPeerConnection, cleanupPeer, startSpeakingDetection]);

  const leaveChannel = useCallback(() => {
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

    setConnected(false);
    setUsers([]);
    setSpeakingUsers(new Set());
    setLocalSpeaking(false);
    setMuted(false);
    setDeafened(false);
  }, [channelId, cleanupPeer]);

  const toggleMute = useCallback(() => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = muted;
        setMuted(!muted);
        socketRef.current?.emit("toggle-mute", { channelId, muted: !muted });
      }
    }
  }, [muted, channelId]);

  const toggleDeafen = useCallback(() => {
    const newDeafened = !deafened;
    setDeafened(newDeafened);
    remoteAudiosRef.current.forEach((audio) => {
      audio.muted = newDeafened;
    });
    if (newDeafened && !muted) {
      toggleMute();
    }
  }, [deafened, muted, toggleMute]);

  useEffect(() => {
    return () => {
      if (connected) leaveChannel();
    };
  }, [connected, leaveChannel]);

  return (
    <div className="flex flex-col h-full">
      {/* Voice Channel Header */}
      <div className="p-6 border-b border-white/5">
        <div className="flex items-center gap-3 mb-2">
          <div className={`w-3 h-3 rounded-full ${connected ? "bg-green-400 animate-pulse" : "bg-gray-600"}`} />
          <h2 className="text-xl font-bold text-white">{channelName}</h2>
        </div>
        <p className="text-sm text-gray-500">
          {connected ? `Подключено • ${users.length + 1} участник(ов)` : "Голосовой канал"}
        </p>
      </div>

      {/* Users List */}
      <div className="flex-1 overflow-y-auto p-4">
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm"
          >
            {error}
          </motion.div>
        )}

        {connected && (
          <div className="space-y-2">
            {/* Local User */}
            <VoiceUserCard
              name={userName}
              muted={muted}
              speaking={localSpeaking && !muted}
              isLocal
            />

            {/* Remote Users */}
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
        )}

        {!connected && !error && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-20 h-20 rounded-full bg-fantasy-emerald/10 flex items-center justify-center mb-4">
              <svg className="w-10 h-10 text-fantasy-emerald" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Голосовой канал</h3>
            <p className="text-gray-400 text-sm mb-6 max-w-sm">
              Нажмите &ldquo;Подключиться&rdquo; чтобы присоединиться к голосовому каналу. Потребуется доступ к микрофону.
            </p>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="p-4 border-t border-white/5 bg-dark-800/50">
        {connected ? (
          <div className="flex items-center justify-center gap-3">
            {/* Mute */}
            <button
              onClick={toggleMute}
              className={`p-3 rounded-xl transition-all duration-300 ${
                muted
                  ? "bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30"
                  : "bg-white/5 text-gray-300 border border-white/10 hover:bg-white/10 hover:text-white"
              }`}
              title={muted ? "Включить микрофон" : "Выключить микрофон"}
            >
              {muted ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
              )}
            </button>

            {/* Deafen */}
            <button
              onClick={toggleDeafen}
              className={`p-3 rounded-xl transition-all duration-300 ${
                deafened
                  ? "bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30"
                  : "bg-white/5 text-gray-300 border border-white/10 hover:bg-white/10 hover:text-white"
              }`}
              title={deafened ? "Включить звук" : "Отключить звук"}
            >
              {deafened ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                </svg>
              )}
            </button>

            {/* Disconnect */}
            <button
              onClick={leaveChannel}
              className="p-3 rounded-xl bg-red-600/20 text-red-400 border border-red-500/30 hover:bg-red-600/40 transition-all duration-300"
              title="Отключиться"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M16 8l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M5 3a2 2 0 00-2 2v1c0 8.284 6.716 15 15 15h1a2 2 0 002-2v-3.28a1 1 0 00-.684-.948l-4.493-1.498a1 1 0 00-1.21.502l-1.13 2.257a11.042 11.042 0 01-5.516-5.517l2.257-1.128a1 1 0 00.502-1.21L9.228 3.683A1 1 0 008.279 3H5z" />
              </svg>
            </button>
          </div>
        ) : (
          <button
            onClick={joinChannel}
            className="w-full py-3 rounded-xl bg-fantasy-emerald/20 text-fantasy-emerald border border-fantasy-emerald/30 
              hover:bg-fantasy-emerald/30 hover:border-fantasy-emerald/50 transition-all duration-300 font-medium"
          >
            Подключиться к голосовому каналу
          </button>
        )}
      </div>
    </div>
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
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -10 }}
      className={`flex items-center gap-3 p-3 rounded-xl transition-all duration-300 ${
        speaking ? "bg-fantasy-emerald/10 border border-fantasy-emerald/30" : "bg-white/[0.02] border border-transparent"
      }`}
    >
      {/* Avatar with speaking ring */}
      <div className="relative">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 ${
          speaking
            ? "bg-fantasy-emerald/30 text-fantasy-emerald ring-2 ring-fantasy-emerald ring-offset-2 ring-offset-dark-900"
            : "bg-gradient-to-br from-cyan-400/30 to-fantasy-purple/30 text-white"
        }`}>
          {name.charAt(0).toUpperCase()}
        </div>
        {speaking && (
          <motion.div
            className="absolute -inset-1 rounded-full border-2 border-fantasy-emerald/50"
            animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
        )}
      </div>

      {/* Name and status */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={`text-sm font-medium truncate ${speaking ? "text-fantasy-emerald" : "text-white"}`}>
            {name}
          </span>
          {isLocal && (
            <span className="text-[10px] text-gray-500 px-1.5 py-0.5 rounded bg-white/5">Вы</span>
          )}
        </div>
        {speaking && (
          <div className="flex items-center gap-1 mt-0.5">
            <div className="flex gap-0.5">
              {[0, 1, 2, 3].map((i) => (
                <motion.div
                  key={i}
                  className="w-0.5 bg-fantasy-emerald rounded-full"
                  animate={{ height: [3, 8 + i * 2, 3] }}
                  transition={{ duration: 0.4, repeat: Infinity, delay: i * 0.1 }}
                />
              ))}
            </div>
            <span className="text-[10px] text-fantasy-emerald/60">Говорит</span>
          </div>
        )}
      </div>

      {/* Muted icon */}
      {muted && (
        <div className="text-red-400/60">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
          </svg>
        </div>
      )}
    </motion.div>
  );
}
