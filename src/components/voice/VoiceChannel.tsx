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
  sharing?: boolean;
}

interface VoiceChannelProps {
  channelId: string;
  channelName: string;
  onClose: () => void;
}

let cachedIceConfig: RTCConfiguration | null = null;

async function getIceConfig(): Promise<RTCConfiguration> {
  if (cachedIceConfig) return cachedIceConfig;
  try {
    const res = await fetch("/api/voice/turn");
    if (res.ok) {
      const data = await res.json();
      cachedIceConfig = { iceServers: data.iceServers, iceCandidatePoolSize: 10 };
      return cachedIceConfig;
    }
  } catch {}
  cachedIceConfig = {
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:stun1.l.google.com:19302" },
    ],
    iceCandidatePoolSize: 10,
  };
  return cachedIceConfig;
}

const SCREEN_CONSTRAINTS: DisplayMediaStreamOptions = {
  video: {
    width:     { ideal: 1280 },
    height:    { ideal: 720  },
    frameRate: { ideal: 60, max: 60 },
  },
  audio: false,
};

export default function VoiceChannel({ channelId, channelName, onClose }: VoiceChannelProps) {
  const { data: session } = useSession();

  const [isConnected,    setIsConnected]    = useState(false);
  const [isMuted,        setIsMuted]        = useState(false);
  const [isDeafened,     setIsDeafened]     = useState(false);
  const [isSharing,      setIsSharing]      = useState(false);
  const [users,          setUsers]          = useState<VoiceUser[]>([]);
  const [speakingUsers,  setSpeakingUsers]  = useState<Set<string>>(new Set());
  const [localSpeaking,  setLocalSpeaking]  = useState(false);
  const [error,          setError]          = useState<string | null>(null);
  const [sharerSocketId, setSharerSocketId] = useState<string | null>(null);

  const socketRef           = useRef<Socket | null>(null);
  const localStreamRef      = useRef<MediaStream | null>(null);
  const screenStreamRef     = useRef<MediaStream | null>(null);
  const peersRef            = useRef<Map<string, RTCPeerConnection>>(new Map());
  const audioContextRef     = useRef<AudioContext | null>(null);
  const analyserRef         = useRef<AnalyserNode | null>(null);
  const speakingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const remoteAudiosRef     = useRef<Map<string, HTMLAudioElement>>(new Map());
  const screenVideoRef      = useRef<HTMLVideoElement | null>(null);
  const screenTransceivers  = useRef<Map<string, RTCRtpTransceiver>>(new Map());

  // ── Sound effects ─────────────────────────────────────────────────────────
  const connectionSfxRef    = useRef<HTMLAudioElement | null>(null);
  const disconnectionSfxRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    connectionSfxRef.current    = new Audio("/sounds/connection.mp3");
    disconnectionSfxRef.current = new Audio("/sounds/disconnection.mp3");
    connectionSfxRef.current.preload    = "auto";
    disconnectionSfxRef.current.preload = "auto";
    return () => {
      connectionSfxRef.current    = null;
      disconnectionSfxRef.current = null;
    };
  }, []);

  const playSound = useCallback((ref: React.RefObject<HTMLAudioElement | null>) => {
    const src = ref.current;
    if (!src) return;
    try {
      const clone = src.cloneNode() as HTMLAudioElement;
      clone.volume = 0.5;
      clone.play().catch(() => {});
    } catch { /* ignore */ }
  }, []);

  // ── Peer cleanup ──────────────────────────────────────────────────────────
  const cleanupPeer = useCallback((socketId: string) => {
    const peer = peersRef.current.get(socketId);
    if (peer) { peer.close(); peersRef.current.delete(socketId); }
    const audio = remoteAudiosRef.current.get(socketId);
    if (audio) { audio.pause(); audio.srcObject = null; remoteAudiosRef.current.delete(socketId); }
    screenTransceivers.current.delete(socketId);
  }, []);

  // ── Peer creation ─────────────────────────────────────────────────────────
  const createPeerConnection = useCallback(
    async (remoteSocketId: string, isInitiator: boolean) => {
      const iceConfig = await getIceConfig();
      const pc = new RTCPeerConnection(iceConfig);
      peersRef.current.set(remoteSocketId, pc);

      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) =>
          pc.addTrack(t, localStreamRef.current!)
        );
      }

      if (screenStreamRef.current) {
        const screenTrack = screenStreamRef.current.getVideoTracks()[0];
        const transceiver = pc.addTransceiver(screenTrack, {
          direction: "sendonly",
          streams: [screenStreamRef.current],
          sendEncodings: [{ maxFramerate: 60, maxBitrate: 8_000_000 }],
        });
        screenTransceivers.current.set(remoteSocketId, transceiver);
      } else {
        pc.addTransceiver("video", { direction: "recvonly" });
      }

      pc.ontrack = (event) => {
        const [remoteStream] = event.streams;
        if (event.track.kind === "audio") {
          let audio = remoteAudiosRef.current.get(remoteSocketId);
          if (!audio) {
            audio = new Audio();
            audio.autoplay = true;
            remoteAudiosRef.current.set(remoteSocketId, audio);
          }
          audio.srcObject = remoteStream;
        } else if (event.track.kind === "video") {
          if (screenVideoRef.current) screenVideoRef.current.srcObject = remoteStream;
          setSharerSocketId(remoteSocketId);
          event.track.onended = () =>
            setSharerSocketId((prev) => (prev === remoteSocketId ? null : prev));
        }
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

      pc.onnegotiationneeded = async () => {
        if (!isInitiator && !screenStreamRef.current) return;
        try {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          socketRef.current?.emit("voice-offer", { to: remoteSocketId, offer: pc.localDescription });
        } catch { /* connection already closed */ }
      };

      if (isInitiator) {
        pc.createOffer()
          .then((offer) => pc.setLocalDescription(offer))
          .then(() => {
            socketRef.current?.emit("voice-offer", { to: remoteSocketId, offer: pc.localDescription });
          });
      }

      return pc;
    },
    [cleanupPeer]
  );

  // ── Speaking detection ────────────────────────────────────────────────────
  const startSpeakingDetection = useCallback(() => {
    if (!localStreamRef.current) return;
    const audioContext = new AudioContext();
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 512;
    analyser.smoothingTimeConstant = 0.4;
    audioContext.createMediaStreamSource(localStreamRef.current).connect(analyser);
    audioContextRef.current = audioContext;
    analyserRef.current = analyser;
    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    speakingIntervalRef.current = setInterval(() => {
      analyser.getByteFrequencyData(dataArray);
      const avg = dataArray.reduce((s, v) => s + v, 0) / dataArray.length;
      const speaking = avg > 15;
      setLocalSpeaking((prev) => {
        if (prev !== speaking) socketRef.current?.emit("speaking", { channelId, speaking });
        return speaking;
      });
    }, 100);
  }, [channelId]);

  // ── Join ──────────────────────────────────────────────────────────────────
  const joinVoice = useCallback(async () => {
    if (!session?.user) return;
    setError(null);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setError(
        "Голосовой канал требует защищённого соединения (HTTPS). " +
        "При локальном тесте используйте http://localhost:3000, а не IP-адрес."
      );
      return;
    }

    let stream: MediaStream | null = null;
    try {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        });
      } catch (constraintErr) {
        const name = constraintErr instanceof DOMException ? constraintErr.name : "";
        if (name === "OverconstrainedError" || name === "NotReadableError") {
          stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        } else {
          throw constraintErr;
        }
      }

      localStreamRef.current = stream;

      const socket = io({ path: "/api/socketio", transports: ["websocket", "polling"] });
      socketRef.current = socket;

      socket.on("connect", () => {
        socket.emit("join-voice", {
          channelId,
          userId: session.user.id,
          userName: session.user.name || "Пользователь",
        });
        setIsConnected(true);
        playSound(connectionSfxRef);
      });

      socket.on("voice-users", async (existingUsers: VoiceUser[]) => {
        setUsers(existingUsers);
        for (const u of existingUsers) await createPeerConnection(u.socketId, true);
      });

      socket.on("user-joined", async (user: VoiceUser) => {
        setUsers((prev) => [...prev.filter((u) => u.socketId !== user.socketId), user]);
        await createPeerConnection(user.socketId, false);
        playSound(connectionSfxRef);
      });

      socket.on("user-left", ({ socketId }: { socketId: string }) => {
        setUsers((prev) => prev.filter((u) => u.socketId !== socketId));
        cleanupPeer(socketId);
        setSpeakingUsers((prev) => { const n = new Set(prev); n.delete(socketId); return n; });
        setSharerSocketId((prev) => (prev === socketId ? null : prev));
        playSound(disconnectionSfxRef);
      });

      socket.on("voice-offer", async ({ from, offer }: { from: string; offer: RTCSessionDescriptionInit }) => {
        let pc = peersRef.current.get(from);
        if (!pc) pc = await createPeerConnection(from, false);
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit("voice-answer", { to: from, answer });
      });

      socket.on("voice-answer", async ({ from, answer }: { from: string; answer: RTCSessionDescriptionInit }) => {
        const pc = peersRef.current.get(from);
        if (pc) await pc.setRemoteDescription(new RTCSessionDescription(answer));
      });

      socket.on("ice-candidate", async ({ from, candidate }: { from: string; candidate: RTCIceCandidateInit }) => {
        const pc = peersRef.current.get(from);
        if (pc) await pc.addIceCandidate(new RTCIceCandidate(candidate));
      });

      socket.on("user-muted", ({ socketId, muted }: { socketId: string; muted: boolean }) => {
        setUsers((prev) => prev.map((u) => u.socketId === socketId ? { ...u, muted } : u));
      });

      socket.on("user-speaking", ({ socketId, speaking }: { socketId: string; speaking: boolean }) => {
        setSpeakingUsers((prev) => {
          const n = new Set(prev);
          speaking ? n.add(socketId) : n.delete(socketId);
          return n;
        });
      });

      socket.on("screen-share-start", ({ socketId }: { socketId: string }) => {
        setUsers((prev) => prev.map((u) => u.socketId === socketId ? { ...u, sharing: true } : u));
      });

      socket.on("screen-share-stop", ({ socketId }: { socketId: string }) => {
        setUsers((prev) => prev.map((u) => u.socketId === socketId ? { ...u, sharing: false } : u));
        setSharerSocketId((prev) => (prev === socketId ? null : prev));
      });

      socket.on("connect_error", () => {
        stream?.getTracks().forEach((t) => t.stop());
        localStreamRef.current = null;
        socketRef.current?.disconnect();
        socketRef.current = null;
        setError("Не удалось подключиться к серверу. Проверьте соединение и попробуйте снова.");
      });

      startSpeakingDetection();
    } catch (err) {
      stream?.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;

      if (err instanceof DOMException) {
        switch (err.name) {
          case "NotAllowedError":
          case "PermissionDeniedError":
            setError("Доступ к микрофону запрещён. Нажмите на иконку 🔒 в адресной строке и разрешите микрофон.");
            break;
          case "NotFoundError":
          case "DevicesNotFoundError":
            setError("Микрофон не найден. Подключите микрофон или гарнитуру и попробуйте снова.");
            break;
          case "NotReadableError":
          case "TrackStartError":
            setError("Микрофон занят другим приложением. Закройте остальные вкладки или приложения, использующие микрофон.");
            break;
          case "OverconstrainedError":
            setError("Ваш микрофон не поддерживает нужные параметры. Попробуйте другой микрофон.");
            break;
          case "AbortError":
            setError("Не удалось получить доступ к микрофону. Попробуйте снова.");
            break;
          default:
            setError(`Ошибка микрофона: ${err.message}`);
        }
      } else {
        setError("Не удалось подключиться к голосовому каналу. Попробуйте обновить страницу.");
      }
    }
  }, [session, channelId, createPeerConnection, cleanupPeer, startSpeakingDetection, playSound]);

  // ── Screen share ──────────────────────────────────────────────────────────
  const startScreenShare = useCallback(async () => {
    if (!isConnected) return;
    if (!navigator.mediaDevices?.getDisplayMedia) {
      setError("Ваш браузер не поддерживает демонстрацию экрана.");
      return;
    }
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia(SCREEN_CONSTRAINTS);
      screenStreamRef.current = screenStream;
      setIsSharing(true);
      socketRef.current?.emit("screen-share-start", { channelId });

      const screenTrack = screenStream.getVideoTracks()[0];

      peersRef.current.forEach((pc, remoteSocketId) => {
        const transceivers = pc.getTransceivers();
        const videoTc = transceivers.find(
          (tc) => tc.receiver.track.kind === "video" || tc.sender.track?.kind === "video"
        );
        if (videoTc?.sender) {
          videoTc.sender.replaceTrack(screenTrack);
          videoTc.direction = "sendonly";
          const params = videoTc.sender.getParameters();
          if (params.encodings?.length) {
            params.encodings[0].maxBitrate   = 8_000_000;
            params.encodings[0].maxFramerate = 60;
          }
          videoTc.sender.setParameters(params).catch(() => {});
          screenTransceivers.current.set(remoteSocketId, videoTc);
        } else {
          const tc = pc.addTransceiver(screenTrack, {
            direction: "sendonly",
            streams: [screenStream],
            sendEncodings: [{ maxFramerate: 60, maxBitrate: 8_000_000 }],
          });
          screenTransceivers.current.set(remoteSocketId, tc);
        }
        pc.createOffer()
          .then((offer) => pc.setLocalDescription(offer))
          .then(() => socketRef.current?.emit("voice-offer", { to: remoteSocketId, offer: pc.localDescription }))
          .catch(() => {});
      });

      screenTrack.onended = () => stopScreenShare();
    } catch (err) {
      if (err instanceof DOMException && err.name !== "NotAllowedError") {
        setError("Не удалось захватить экран.");
      }
    }
  }, [isConnected, channelId]);

  const stopScreenShare = useCallback(() => {
    screenStreamRef.current?.getTracks().forEach((t) => t.stop());
    screenStreamRef.current = null;
    screenTransceivers.current.forEach((tc) => {
      tc.sender.replaceTrack(null).catch(() => {});
      tc.direction = "inactive";
    });
    screenTransceivers.current.clear();
    setIsSharing(false);
    socketRef.current?.emit("screen-share-stop", { channelId });
  }, [channelId]);

  // ── Leave ─────────────────────────────────────────────────────────────────
  const leaveVoice = useCallback(() => {
    if (isSharing) stopScreenShare();
    playSound(disconnectionSfxRef);
    socketRef.current?.emit("leave-voice", { channelId });
    socketRef.current?.disconnect();
    socketRef.current = null;

    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;

    peersRef.current.forEach((_, sid) => cleanupPeer(sid));
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
    setSharerSocketId(null);
  }, [channelId, cleanupPeer, isSharing, stopScreenShare, playSound]);

  const toggleMute = useCallback(() => {
    const track = localStreamRef.current?.getAudioTracks()[0];
    if (track) {
      track.enabled = isMuted;
      setIsMuted(!isMuted);
      socketRef.current?.emit("toggle-mute", { channelId, muted: !isMuted });
    }
  }, [isMuted, channelId]);

  const toggleDeafen = useCallback(() => {
    const nd = !isDeafened;
    setIsDeafened(nd);
    remoteAudiosRef.current.forEach((a) => { a.muted = nd; });
    if (nd && !isMuted) toggleMute();
  }, [isDeafened, isMuted, toggleMute]);

  useEffect(() => () => { if (isConnected) leaveVoice(); }, []); // eslint-disable-line

  const activeSharer   = sharerSocketId ? users.find((u) => u.socketId === sharerSocketId) : null;
  const hasRemoteShare = !!sharerSocketId && !isSharing;

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={() => { if (isConnected) leaveVoice(); onClose(); }}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl border border-neutral-200 dark:border-white/10 w-full max-w-3xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 dark:border-white/10">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${isConnected ? "bg-green-400 animate-pulse" : "bg-neutral-400"}`} />
            <div>
              <h3 className="font-semibold text-neutral-900 dark:text-white flex items-center gap-2">
                🎙️ {channelName}
                {isSharing && (
                  <span className="text-xs font-medium px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded-full animate-pulse">
                    Вы показываете экран
                  </span>
                )}
              </h3>
              <p className="text-xs text-neutral-500">
                {isConnected ? `Подключено · ${users.length + 1} уч.` : "Голосовой канал"}
              </p>
            </div>
          </div>
          <button onClick={() => { if (isConnected) leaveVoice(); onClose(); }}
            className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-white/10 transition-colors">
            <svg className="w-5 h-5 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Screen share panels */}
        <AnimatePresence>
          {hasRemoteShare && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
              className="relative bg-black overflow-hidden">
              <video ref={screenVideoRef} autoPlay playsInline muted className="w-full max-h-[360px] object-contain" />
              <div className="absolute top-3 left-3 flex items-center gap-2 px-2.5 py-1 rounded-lg bg-black/60 backdrop-blur-sm text-xs text-white">
                <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                {activeSharer?.userName ?? "Участник"} показывает экран · 720p 60fps
              </div>
            </motion.div>
          )}
          {isSharing && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
              className="relative bg-black overflow-hidden">
              <video autoPlay playsInline muted
                ref={(el) => { if (el && screenStreamRef.current) el.srcObject = screenStreamRef.current; }}
                className="w-full max-h-[360px] object-contain opacity-90" />
              <div className="absolute top-3 left-3 flex items-center gap-2 px-2.5 py-1 rounded-lg bg-black/60 backdrop-blur-sm text-xs text-white">
                <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                Ваш экран · 720p 60fps
              </div>
              <button onClick={stopScreenShare}
                className="absolute top-3 right-3 px-3 py-1 rounded-lg bg-red-500/80 hover:bg-red-500 text-white text-xs font-medium transition-colors">
                Остановить
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Participants */}
        <div className="p-6 min-h-[200px]">
          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 text-sm rounded-xl">
              {error}
            </div>
          )}
          {isConnected ? (
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-4">
              <VoiceUserCard name={session?.user?.name || "Вы"} muted={isMuted} speaking={localSpeaking && !isMuted} isLocal sharing={isSharing} />
              <AnimatePresence>
                {users.map((u) => (
                  <VoiceUserCard key={u.socketId} name={u.userName} muted={u.muted} speaking={speakingUsers.has(u.socketId)} sharing={!!u.sharing} />
                ))}
              </AnimatePresence>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full py-8">
              <div className="w-20 h-20 rounded-full bg-emerald-50 dark:bg-emerald-400/10 flex items-center justify-center mb-4">
                <svg className="w-10 h-10 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-2">Голосовой канал</h3>
              <p className="text-neutral-500 text-sm text-center max-w-sm">
                Нажмите «Подключиться» для присоединения. Потребуется доступ к микрофону.
              </p>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-3 px-6 py-4 border-t border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-white/5 flex-wrap">
          {!isConnected ? (
            <button onClick={joinVoice}
              className="px-6 py-2.5 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl font-medium text-sm hover:shadow-lg hover:shadow-green-500/20 transition-all">
              Подключиться
            </button>
          ) : (
            <>
              <ControlBtn active={isMuted} activeColor="red" onClick={toggleMute} title={isMuted ? "Включить микрофон" : "Отключить микрофон"}>
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
              </ControlBtn>

              <ControlBtn active={isDeafened} activeColor="red" onClick={toggleDeafen} title={isDeafened ? "Включить звук" : "Отключить звук"}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {isDeafened
                    ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                    : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                  }
                </svg>
              </ControlBtn>

              <ControlBtn active={isSharing} activeColor="blue" onClick={isSharing ? stopScreenShare : startScreenShare}
                title={isSharing ? "Остановить демонстрацию" : "Показать экран (720p 60fps)"}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </ControlBtn>

              <button onClick={leaveVoice} className="p-3 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-all" title="Отключиться">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M16 8l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M5 3a2 2 0 00-2 2v1c0 8.284 6.716 15 15 15h1a2 2 0 002-2v-3.28a1 1 0 00-.684-.948l-4.493-1.498a1 1 0 00-1.21.502l-1.13 2.257a11.042 11.042 0 01-5.516-5.517l2.257-1.128a1 1 0 00.502-1.21L9.228 3.683A1 1 0 008.279 3H5z" />
                </svg>
              </button>
            </>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

function ControlBtn({ active, activeColor, onClick, title, children }: {
  active: boolean; activeColor: "red" | "blue"; onClick: () => void; title: string; children: React.ReactNode;
}) {
  const colors = { red: "bg-red-100 dark:bg-red-500/20 text-red-500", blue: "bg-blue-100 dark:bg-blue-500/20 text-blue-400" };
  return (
    <button onClick={onClick} title={title}
      className={`p-3 rounded-xl transition-all ${active ? colors[activeColor] : "bg-neutral-200 dark:bg-white/10 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-300 dark:hover:bg-white/20"}`}>
      {children}
    </button>
  );
}

function VoiceUserCard({ name, muted, speaking, isLocal, sharing }: {
  name: string; muted: boolean; speaking: boolean; isLocal?: boolean; sharing?: boolean;
}) {
  return (
    <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.8, opacity: 0 }}
      className="flex flex-col items-center gap-2">
      <div className="relative">
        <div className={`w-14 h-14 rounded-full flex items-center justify-center text-base font-bold transition-all duration-300 ${
          speaking ? "bg-green-400/20 text-green-400 ring-[3px] ring-green-400 ring-offset-2 ring-offset-white dark:ring-offset-neutral-900"
                   : "bg-gradient-to-br from-violet-400/30 to-indigo-500/30 text-white border-2 border-white/10"
        }`}>
          {name.charAt(0).toUpperCase()}
        </div>
        {speaking && (
          <motion.div className="absolute -inset-1 rounded-full border-2 border-green-400/60"
            animate={{ scale: [1, 1.3, 1], opacity: [0.6, 0, 0.6] }}
            transition={{ duration: 1.2, repeat: Infinity, ease: "easeOut" }} />
        )}
        <div className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-white dark:border-neutral-900 ${
          sharing ? "bg-blue-400" : speaking ? "bg-green-400" : muted ? "bg-red-400" : "bg-green-400"
        }`} />
      </div>
      <span className={`text-xs truncate max-w-[72px] ${speaking ? "text-green-500 font-semibold" : "text-neutral-600 dark:text-neutral-400"}`}>
        {name}{isLocal ? " (Вы)" : ""}
      </span>
      {sharing && <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 font-medium">экран</span>}
      {speaking && (
        <div className="flex items-end gap-0.5 h-3">
          {[0, 1, 2, 3, 4].map((i) => (
            <motion.div key={i} className="w-[3px] bg-green-400 rounded-full"
              animate={{ height: [3, 8 + Math.random() * 6, 3] }}
              transition={{ duration: 0.3 + i * 0.05, repeat: Infinity, ease: "easeInOut" }} />
          ))}
        </div>
      )}
      {muted && !speaking && (
        <svg className="w-3.5 h-3.5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
        </svg>
      )}
    </motion.div>
  );
}
