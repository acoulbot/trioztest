"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import { io, Socket } from "socket.io-client";
import { NoiseSuppressor, NSStatus } from "@/lib/noiseSuppressor";
import { patchedOffer, patchedAnswer } from "@/lib/sdpUtils";
import AudioBars from "@/components/ui/AudioBars";

/* ─── Types ──────────────────────────────────────────────────────────────── */

interface VoiceUser {
  socketId: string;
  userId:   string;
  userName: string;
  muted:    boolean;
}

interface VoiceChannelProps {
  channelId:   string;
  channelName: string;
  onClose:     () => void;
}

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

const SCREEN_CONSTRAINTS: DisplayMediaStreamOptions = {
  video: {
    width:     { ideal: 1280, max: 1280 },
    height:    { ideal: 720,  max: 720  },
    frameRate: { ideal: 60,   max: 60   },
  } as MediaTrackConstraints,
  audio: false,
};

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  Main component                                                             */
/* ═══════════════════════════════════════════════════════════════════════════ */

export default function VoiceChannel({ channelId, channelName, onClose }: VoiceChannelProps) {
  const { data: session } = useSession();

  /* ── Core ───────────────────────────────────────────────────────────── */
  const [isConnected,   setIsConnected]   = useState(false);
  const [isMuted,       setIsMuted]       = useState(false);
  const [isDeafened,    setIsDeafened]    = useState(false);
  const [users,         setUsers]         = useState<VoiceUser[]>([]);
  const [speakingUsers, setSpeakingUsers] = useState<Set<string>>(new Set());
  const [localSpeaking, setLocalSpeaking] = useState(false);
  const [error,         setError]         = useState<string | null>(null);

  /* ── Screen share ────────────────────────────────────────────────────── */
  const [isSharingScreen, setIsSharingScreen] = useState(false);
  const [screenSharerId,  setScreenSharerId]  = useState<string | null>(null);
  const [screenShareName, setScreenShareName] = useState("");

  /* ── Noise suppressor ───────────────────────────────────────────────── */
  const [nsEnabled, setNsEnabled] = useState(true);
  const [nsStatus,  setNsStatus]  = useState<NSStatus>('idle');
  const [vadProb,   setVadProb]   = useState(0);

  /* ── Refs ────────────────────────────────────────────────────────────── */
  const socketRef          = useRef<Socket | null>(null);
  const rawStreamRef       = useRef<MediaStream | null>(null);  // original mic
  const localStreamRef     = useRef<MediaStream | null>(null);  // processed (into peers)
  const screenStreamRef    = useRef<MediaStream | null>(null);
  const peersRef           = useRef<Map<string, RTCPeerConnection>>(new Map());
  const screenSendersRef   = useRef<Map<string, RTCRtpSender>>(new Map());
  const remoteScreenRef    = useRef<Map<string, MediaStream>>(new Map());
  const audioCtxRef        = useRef<AudioContext | null>(null);
  const analyserRef        = useRef<AnalyserNode | null>(null);
  const speakingIntervalRef= useRef<NodeJS.Timeout | null>(null);
  const remoteAudiosRef    = useRef<Map<string, HTMLAudioElement>>(new Map());
  const screenVideoRef     = useRef<HTMLVideoElement | null>(null);
  const noiseSuppRef       = useRef<NoiseSuppressor | null>(null);
  const connectionSfxRef   = useRef<HTMLAudioElement | null>(null);
  const disconnectionSfxRef= useRef<HTMLAudioElement | null>(null);

  /* ── Sound effects ──────────────────────────────────────────────────── */
  useEffect(() => {
    connectionSfxRef.current    = Object.assign(new Audio("/sounds/connection.mp3"),    { preload: "auto" as const });
    disconnectionSfxRef.current = Object.assign(new Audio("/sounds/disconnection.mp3"), { preload: "auto" as const });
    return () => { connectionSfxRef.current = null; disconnectionSfxRef.current = null; };
  }, []);

  const playSound = useCallback((ref: React.RefObject<HTMLAudioElement | null>) => {
    if (!ref.current) return;
    try { const c = ref.current.cloneNode() as HTMLAudioElement; c.volume = 0.5; c.play().catch(() => {}); } catch { /* ignore */ }
  }, []);

  /* ── Screen video ───────────────────────────────────────────────────── */
  const setScreenVideo = useCallback((stream: MediaStream | null) => {
    if (screenVideoRef.current) {
      screenVideoRef.current.srcObject = stream;
      if (stream) screenVideoRef.current.play().catch(() => {});
    }
  }, []);

  /* ── Peer cleanup ───────────────────────────────────────────────────── */
  const cleanupPeer = useCallback((socketId: string) => {
    peersRef.current.get(socketId)?.close();
    peersRef.current.delete(socketId);
    const audio = remoteAudiosRef.current.get(socketId);
    if (audio) { audio.pause(); audio.srcObject = null; remoteAudiosRef.current.delete(socketId); }
    screenSendersRef.current.delete(socketId);
    if (remoteScreenRef.current.has(socketId)) {
      remoteScreenRef.current.delete(socketId);
      setScreenSharerId(p => p === socketId ? null : p);
      setScreenShareName("");
      setScreenVideo(null);
    }
  }, [setScreenVideo]);

  /* ── Create peer connection ─────────────────────────────────────────── */
  const createPeerConnection = useCallback((remoteSocketId: string, isInitiator: boolean) => {
    const pc = new RTCPeerConnection(ICE_SERVERS);
    peersRef.current.set(remoteSocketId, pc);

    // Add local audio (processed stream)
    localStreamRef.current?.getTracks().forEach(t =>
      pc.addTrack(t, localStreamRef.current!)
    );
    // Add screen video if already sharing
    if (screenStreamRef.current) {
      screenStreamRef.current.getVideoTracks().forEach(t => {
        const sender = pc.addTrack(t, screenStreamRef.current!);
        screenSendersRef.current.set(remoteSocketId, sender);
      });
    }

    pc.ontrack = ({ track, streams: [stream] }) => {
      if (track.kind === "audio") {
        let audio = remoteAudiosRef.current.get(remoteSocketId);
        if (!audio) {
          audio = Object.assign(new Audio(), { autoplay: true });
          remoteAudiosRef.current.set(remoteSocketId, audio);
        }
        audio.srcObject = stream;
      } else if (track.kind === "video") {
        remoteScreenRef.current.set(remoteSocketId, stream);
        setScreenSharerId(remoteSocketId);
        setScreenVideo(stream);
        track.onended = () => {
          remoteScreenRef.current.delete(remoteSocketId);
          setScreenSharerId(p => p === remoteSocketId ? null : p);
          setScreenVideo(null);
        };
      }
    };

    pc.onicecandidate = ({ candidate }) => {
      if (candidate) socketRef.current?.emit("ice-candidate", {
        to: remoteSocketId, candidate: candidate.toJSON()
      });
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "failed") {
        pc.restartIce();
        patchedOffer(pc).then(offer =>
          socketRef.current?.emit("voice-offer", { to: remoteSocketId, offer })
        ).catch(() => cleanupPeer(remoteSocketId));
      }
    };

    if (isInitiator) {
      patchedOffer(pc).then(offer =>
        socketRef.current?.emit("voice-offer", { to: remoteSocketId, offer })
      );
    }

    return pc;
  }, [cleanupPeer, setScreenVideo]);

  /* ── Speaking detection ─────────────────────────────────────────────── */
  const startSpeakingDetection = useCallback(() => {
    const src = rawStreamRef.current;
    if (!src) return;
    const ctx = new AudioContext();
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 512;
    analyser.smoothingTimeConstant = 0.4;
    ctx.createMediaStreamSource(src).connect(analyser);
    audioCtxRef.current = ctx;
    analyserRef.current = analyser;
    const data = new Uint8Array(analyser.frequencyBinCount);
    speakingIntervalRef.current = setInterval(() => {
      analyser.getByteFrequencyData(data);
      const avg = data.reduce((s, v) => s + v, 0) / data.length;
      const speaking = avg > 15;
      setLocalSpeaking(prev => {
        if (prev !== speaking)
          socketRef.current?.emit("speaking", { channelId, speaking });
        return speaking;
      });
    }, 100);
  }, [channelId]);

  /* ── Noise suppressor toggle ────────────────────────────────────────── */
  const toggleNoiseSuppressor = useCallback(() => {
    const next = !nsEnabled;
    setNsEnabled(next);
    noiseSuppRef.current?.setBypass(!next);
  }, [nsEnabled]);

  /* ── Screen share ───────────────────────────────────────────────────── */
  const stopScreenShare = useCallback(async () => {
    if (!screenStreamRef.current) return;
    for (const [id, pc] of peersRef.current) {
      const sender = screenSendersRef.current.get(id);
      if (sender) try { pc.removeTrack(sender); } catch { /* ignore */ }
      if (pc.signalingState === "stable") {
        try {
          const offer = await patchedOffer(pc);
          socketRef.current?.emit("voice-offer", { to: id, offer });
        } catch { /* ignore */ }
      }
    }
    screenSendersRef.current.clear();
    screenStreamRef.current.getTracks().forEach(t => t.stop());
    screenStreamRef.current = null;
    socketRef.current?.emit("screen-share-stopped", { channelId });
    setIsSharingScreen(false);
    setScreenVideo(null);
  }, [channelId, setScreenVideo]);

  const startScreenShare = useCallback(async () => {
    if (!isConnected || !navigator.mediaDevices?.getDisplayMedia) {
      setError("Демонстрация экрана не поддерживается в этом браузере.");
      return;
    }
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getDisplayMedia(SCREEN_CONSTRAINTS);
    } catch (e) {
      if (e instanceof DOMException && e.name === "NotAllowedError") return;
      setError("Не удалось захватить экран.");
      return;
    }
    screenStreamRef.current = stream;
    const videoTrack = stream.getVideoTracks()[0];
    for (const [id, pc] of peersRef.current) {
      const sender = pc.addTrack(videoTrack, stream);
      screenSendersRef.current.set(id, sender);
      if (pc.signalingState === "stable") {
        try {
          const offer = await patchedOffer(pc);
          socketRef.current?.emit("voice-offer", { to: id, offer });
        } catch { /* ignore */ }
      }
    }
    socketRef.current?.emit("screen-share-started", { channelId });
    setIsSharingScreen(true);
    setScreenVideo(stream);
    videoTrack.onended = () => stopScreenShare();
  }, [isConnected, channelId, setScreenVideo, stopScreenShare]);

  /* ── Join voice ─────────────────────────────────────────────────────── */
  const joinVoice = useCallback(async () => {
    if (!session?.user) return;
    setError(null);

    if (!navigator.mediaDevices?.getUserMedia) {
      setError("Голосовой канал требует защищённого соединения (HTTPS).");
      return;
    }

    let rawStream: MediaStream | null = null;

    try {
      // 1. Get raw mic stream
      try {
        rawStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation:  true,
            noiseSuppression:  false,  // We handle this ourselves with RNNoise
            autoGainControl:   true,
            sampleRate:        48000,
          },
        });
      } catch {
        rawStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      }
      rawStreamRef.current = rawStream;

      // 2. Build NoiseSuppressor pipeline
      setNsStatus('loading');
      const ns = new NoiseSuppressor();
      ns.onStatus(s => setNsStatus(s));
      ns.onVad(p => setVadProb(p));
      noiseSuppRef.current = ns;
      const processedStream = await ns.init(rawStream);
      ns.setBypass(!nsEnabled);
      localStreamRef.current = processedStream;

      // 3. Connect to socket
      const socket = io({ path: "/api/socketio", transports: ["websocket", "polling"] });
      socketRef.current = socket;

      socket.on("connect", () => {
        socket.emit("join-voice", {
          channelId,
          userId:   session.user.id,
          userName: session.user.name || "Пользователь",
        });
        setIsConnected(true);
        playSound(connectionSfxRef);
      });

      socket.on("voice-users", (existing: VoiceUser[]) => {
        setUsers(existing);
        existing.forEach(u => createPeerConnection(u.socketId, true));
      });

      socket.on("user-joined", (user: VoiceUser) => {
        setUsers(p => [...p.filter(u => u.socketId !== user.socketId), user]);
        createPeerConnection(user.socketId, false);
        playSound(connectionSfxRef);
      });

      socket.on("user-left", ({ socketId }: { socketId: string }) => {
        setUsers(p => p.filter(u => u.socketId !== socketId));
        cleanupPeer(socketId);
        setSpeakingUsers(p => { const n = new Set(p); n.delete(socketId); return n; });
        playSound(disconnectionSfxRef);
      });

      socket.on("voice-offer", async ({ from, offer }: { from: string; offer: RTCSessionDescriptionInit }) => {
        let pc = peersRef.current.get(from);
        if (!pc) pc = createPeerConnection(from, false);
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await patchedAnswer(pc);
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

      socket.on("user-muted",    ({ socketId, muted }: { socketId: string; muted: boolean }) =>
        setUsers(p => p.map(u => u.socketId === socketId ? { ...u, muted } : u))
      );
      socket.on("user-speaking", ({ socketId, speaking }: { socketId: string; speaking: boolean }) =>
        setSpeakingUsers(p => { const n = new Set(p); speaking ? n.add(socketId) : n.delete(socketId); return n; })
      );
      socket.on("screen-share-started", ({ socketId: id }: { socketId: string }) => {
        setScreenSharerId(id);
        setScreenShareName(users.find(u => u.socketId === id)?.userName ?? "Участник");
        const stream = remoteScreenRef.current.get(id);
        if (stream) setScreenVideo(stream);
      });
      socket.on("screen-share-stopped", ({ socketId: id }: { socketId: string }) => {
        remoteScreenRef.current.delete(id);
        setScreenSharerId(p => p === id ? null : p);
        setScreenShareName("");
        setScreenVideo(null);
      });
      socket.on("connect_error", () => {
        rawStream?.getTracks().forEach(t => t.stop());
        ns.destroy();
        socketRef.current?.disconnect();
        socketRef.current = null;
        setError("Не удалось подключиться к серверу.");
      });

      startSpeakingDetection();

    } catch (err) {
      rawStream?.getTracks().forEach(t => t.stop());
      noiseSuppRef.current?.destroy();
      noiseSuppRef.current = null;
      setNsStatus('idle');

      if (err instanceof DOMException) {
        const msgs: Record<string, string> = {
          NotAllowedError:    "Доступ к микрофону запрещён. Разрешите в настройках браузера.",
          PermissionDeniedError: "Доступ к микрофону запрещён.",
          NotFoundError:      "Микрофон не найден.",
          NotReadableError:   "Микрофон занят другим приложением.",
        };
        setError(msgs[err.name] ?? `Ошибка микрофона: ${err.message}`);
      } else {
        setError("Не удалось подключиться. Попробуйте обновить страницу.");
      }
    }
  }, [session, channelId, createPeerConnection, cleanupPeer,
      startSpeakingDetection, playSound, nsEnabled, setScreenVideo, users]);

  /* ── Leave voice ────────────────────────────────────────────────────── */
  const leaveVoice = useCallback(() => {
    if (isSharingScreen) stopScreenShare();
    playSound(disconnectionSfxRef);

    socketRef.current?.emit("leave-voice", { channelId });
    socketRef.current?.disconnect();
    socketRef.current = null;

    // Stop all media
    rawStreamRef.current?.getTracks().forEach(t => t.stop());
    rawStreamRef.current  = null;
    localStreamRef.current?.getTracks().forEach(t => t.stop());
    localStreamRef.current = null;

    // Destroy noise suppressor
    noiseSuppRef.current?.destroy();
    noiseSuppRef.current = null;
    setNsStatus('idle');

    peersRef.current.forEach((_, id) => cleanupPeer(id));
    peersRef.current.clear();

    if (speakingIntervalRef.current) { clearInterval(speakingIntervalRef.current); speakingIntervalRef.current = null; }
    audioCtxRef.current?.close();
    audioCtxRef.current = null;
    analyserRef.current = null;

    setIsConnected(false);
    setUsers([]);
    setSpeakingUsers(new Set());
    setLocalSpeaking(false);
    setIsMuted(false);
    setIsDeafened(false);
    setIsSharingScreen(false);
    setScreenSharerId(null);
    setScreenShareName("");
    setScreenVideo(null);
  }, [channelId, cleanupPeer, isSharingScreen, stopScreenShare, playSound, setScreenVideo]);

  /* ── Mute / Deafen ──────────────────────────────────────────────────── */
  const toggleMute = useCallback(() => {
    const track = rawStreamRef.current?.getAudioTracks()[0];
    if (!track) return;
    track.enabled = isMuted;
    // Also mute the processed stream track
    localStreamRef.current?.getAudioTracks().forEach(t => { t.enabled = isMuted; });
    setIsMuted(!isMuted);
    socketRef.current?.emit("toggle-mute", { channelId, muted: !isMuted });
  }, [isMuted, channelId]);

  const toggleDeafen = useCallback(() => {
    const next = !isDeafened;
    setIsDeafened(next);
    remoteAudiosRef.current.forEach(a => { a.muted = next; });
    if (next && !isMuted) toggleMute();
  }, [isDeafened, isMuted, toggleMute]);

  /* ── Cleanup on unmount ─────────────────────────────────────────────── */
  useEffect(() => () => { if (isConnected) leaveVoice(); }, []); // eslint-disable-line

  const hasScreenShare = isSharingScreen || screenSharerId !== null;
  const activeScreenName = isSharingScreen
    ? `${session?.user?.name ?? "Вы"} (Вы)`
    : screenShareName || "Участник";

  /* ════════════════════════════════════════════════════════════════════ */
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) { if (isConnected) leaveVoice(); onClose(); } }}
    >
      <motion.div
        initial={{ scale: 0.92, opacity: 0, y: 12 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.92, opacity: 0, y: 12 }}
        transition={{ type: "spring", damping: 26, stiffness: 280 }}
        className="bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl border border-neutral-200 dark:border-white/10 w-full max-w-3xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 dark:border-white/10">
          <div className="flex items-center gap-3">
            <div className={`w-2.5 h-2.5 rounded-full ${isConnected ? "bg-green-400 animate-pulse" : "bg-neutral-300 dark:bg-neutral-600"}`} />
            <div>
              <h3 className="font-semibold text-sm text-neutral-900 dark:text-white">🎙️ {channelName}</h3>
              <p className="text-[11px] text-neutral-400">
                {isConnected
                  ? `Подключено · ${users.length + 1} участн. · ${nsStatus === "ready" ? "🟢 Шумодав" : nsStatus === "loading" ? "⏳ Шумодав" : nsStatus === "error" ? "🔴 Шумодав" : ""}`
                  : "Голосовой канал · Opus 256 kbps · FEC"}
              </p>
            </div>
          </div>
          <button
            onClick={() => { if (isConnected) leaveVoice(); onClose(); }}
            className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-white/10 text-neutral-400 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* ── Body ── */}
        <div className="p-6 min-h-[260px] space-y-4">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 text-sm rounded-xl border border-red-200 dark:border-red-500/20">
              {error}
            </div>
          )}

          {isConnected ? (
            <>
              {/* Screen share */}
              <AnimatePresence>
                {hasScreenShare && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="rounded-xl overflow-hidden bg-black relative"
                  >
                    <video
                      ref={screenVideoRef}
                      autoPlay playsInline muted
                      className="w-full max-h-[360px] object-contain bg-black"
                    />
                    <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-black/60 backdrop-blur-sm text-white text-xs px-2.5 py-1 rounded-full">
                      <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                      {activeScreenName} · 720p 60 fps
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Participants */}
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-4">
                <VoiceUserCard
                  name={session?.user?.name || "Вы"}
                  muted={isMuted}
                  speaking={localSpeaking && !isMuted}
                  isLocal
                  vadProb={vadProb}
                  nsActive={nsEnabled && nsStatus === "ready"}
                />
                <AnimatePresence>
                  {users.map(user => (
                    <VoiceUserCard
                      key={user.socketId}
                      name={user.userName}
                      muted={user.muted}
                      speaking={speakingUsers.has(user.socketId)}
                      isSharing={user.socketId === screenSharerId}
                    />
                  ))}
                </AnimatePresence>
              </div>
            </>
          ) : (
            /* Pre-connect */
            <div className="flex flex-col items-center justify-center h-full py-10">
              <div className="w-20 h-20 rounded-full bg-emerald-50 dark:bg-emerald-400/10 flex items-center justify-center mb-4">
                <svg className="w-9 h-9 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
              </div>
              <h3 className="text-base font-semibold text-neutral-900 dark:text-white mb-1">Голосовой канал</h3>
              <p className="text-sm text-neutral-500 text-center max-w-xs mb-2">
                Opus 256 kbps · FEC (восстановление пакетов) · RNNoise шумодав
              </p>
              <div className="flex items-center gap-1.5 text-[11px] text-neutral-400 mt-1">
                <span className={`w-1.5 h-1.5 rounded-full ${nsEnabled ? "bg-green-400" : "bg-neutral-400"}`} />
                Шумодав {nsEnabled ? "включён" : "выключен"} перед подключением
              </div>
            </div>
          )}
        </div>

        {/* ── Controls ── */}
        <div className="flex items-center justify-center gap-2.5 px-6 py-4 border-t border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-white/[0.02]">
          {!isConnected ? (
            <div className="flex items-center gap-3">
              {/* Pre-connect NS toggle */}
              <button
                onClick={() => setNsEnabled(!nsEnabled)}
                title={nsEnabled ? "Выключить шумодав" : "Включить шумодав"}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all border ${
                  nsEnabled
                    ? "bg-green-50 dark:bg-green-500/10 text-green-600 dark:text-green-400 border-green-200 dark:border-green-500/20"
                    : "bg-neutral-100 dark:bg-white/5 text-neutral-500 border-neutral-200 dark:border-white/10"
                }`}
              >
                <NsIcon className="w-3.5 h-3.5" />
                {nsEnabled ? "Шумодав вкл." : "Шумодав выкл."}
              </button>
              <button
                onClick={joinVoice}
                className="px-6 py-2.5 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-medium text-sm hover:shadow-lg hover:shadow-green-500/20 transition-all"
              >
                Подключиться
              </button>
            </div>
          ) : (
            <>
              {/* Mute */}
              <ControlButton active={isMuted} activeColor="red" onClick={toggleMute} title={isMuted ? "Включить микрофон" : "Выключить микрофон"}>
                {isMuted
                  ? <MutedMicIcon />
                  : <MicIcon />}
              </ControlButton>

              {/* Deafen */}
              <ControlButton active={isDeafened} activeColor="red" onClick={toggleDeafen} title={isDeafened ? "Включить звук" : "Отключить звук"}>
                {isDeafened ? <DeafenOnIcon /> : <DeafenOffIcon />}
              </ControlButton>

              {/* Noise suppressor */}
              <ControlButton
                active={nsEnabled && nsStatus === "ready"}
                activeColor="green"
                onClick={toggleNoiseSuppressor}
                title={nsEnabled ? "Выключить шумодав" : "Включить шумодав"}
                disabled={nsStatus === "loading"}
              >
                <NsButtonContent status={nsStatus} enabled={nsEnabled} />
              </ControlButton>

              {/* Screen share */}
              <ControlButton
                active={isSharingScreen}
                activeColor="green"
                onClick={isSharingScreen ? stopScreenShare : startScreenShare}
                title={isSharingScreen ? "Остановить демонстрацию" : "Демонстрация экрана"}
                disabled={!isSharingScreen && screenSharerId !== null}
              >
                <ScreenShareIcon />
              </ControlButton>

              {/* Disconnect */}
              <ControlButton
                active={false}
                activeColor="red"
                onClick={leaveVoice}
                title="Отключиться"
                className="!bg-red-500 !text-white hover:!bg-red-600 !border-red-500"
              >
                <HangupIcon />
              </ControlButton>
            </>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  Control Button                                                             */
/* ═══════════════════════════════════════════════════════════════════════════ */

function ControlButton({ onClick, active, activeColor, title, children, disabled = false, className = "" }: {
  onClick: () => void;
  active: boolean;
  activeColor: "red" | "green";
  title: string;
  children: React.ReactNode;
  disabled?: boolean;
  className?: string;
}) {
  const color = active
    ? activeColor === "red"
      ? "bg-red-100 dark:bg-red-500/20 text-red-500 border-red-200 dark:border-red-500/20"
      : "bg-green-100 dark:bg-green-500/20 text-green-500 border-green-200 dark:border-green-500/20"
    : "bg-neutral-100 dark:bg-white/8 text-neutral-600 dark:text-neutral-400 border-neutral-200 dark:border-white/10";

  return (
    <button
      onClick={onClick}
      title={title}
      disabled={disabled}
      className={`p-3 rounded-xl border transition-all disabled:opacity-40 disabled:cursor-not-allowed ${color} ${className}`}
    >
      {children}
    </button>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  Voice User Card                                                            */
/* ═══════════════════════════════════════════════════════════════════════════ */

function VoiceUserCard({ name, muted, speaking, isLocal, isSharing, vadProb = 0, nsActive = false }: {
  name: string; muted: boolean; speaking: boolean;
  isLocal?: boolean; isSharing?: boolean;
  vadProb?: number; nsActive?: boolean;
}) {
  return (
    <motion.div
      initial={{ scale: 0.85, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.85, opacity: 0 }}
      className="flex flex-col items-center gap-2"
    >
      <div className="relative">
        <div className={`w-14 h-14 rounded-full flex items-center justify-center text-base font-bold transition-all duration-300 ${
          speaking
            ? "bg-green-400/20 text-green-600 dark:text-green-400 ring-[3px] ring-green-400 ring-offset-2 ring-offset-white dark:ring-offset-neutral-900"
            : "bg-gradient-to-br from-violet-400/25 to-indigo-500/25 text-neutral-700 dark:text-white border border-white/10"
        }`}>
          {name.charAt(0).toUpperCase()}
        </div>

        {speaking && (
          <motion.div
            className="absolute -inset-1 rounded-full border-2 border-green-400/50"
            animate={{ scale: [1, 1.35, 1], opacity: [0.5, 0, 0.5] }}
            transition={{ duration: 1.3, repeat: Infinity, ease: "easeOut" }}
          />
        )}

        {/* Badges */}
        <div className="absolute -top-1 -right-1 flex flex-col gap-0.5">
          {isSharing && (
            <div className="w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center shadow">
              <ScreenShareIcon className="w-2.5 h-2.5 text-white" />
            </div>
          )}
          {isLocal && nsActive && (
            <div className="w-4 h-4 rounded-full bg-green-500 flex items-center justify-center shadow" title="Шумодав активен">
              <NsIcon className="w-2.5 h-2.5 text-white" />
            </div>
          )}
        </div>

        {/* Status dot */}
        <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-neutral-900 ${
          speaking ? "bg-green-400" : muted ? "bg-red-400" : "bg-green-300"
        }`} />
      </div>

      <span className={`text-[11px] truncate max-w-[70px] ${
        speaking ? "text-green-500 dark:text-green-400 font-medium" : "text-neutral-500 dark:text-neutral-400"
      }`}>
        {name}{isLocal ? " (Вы)" : ""}
      </span>

      {/* Speaking equalizer */}
      {speaking && <AudioBars bars={5} color="bg-green-400" maxH={16} />}

      {/* VAD noise meter for local user */}
      {isLocal && nsActive && !speaking && vadProb > 0 && (
        <div className="w-12 h-[2px] bg-neutral-200 dark:bg-white/10 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-green-400 rounded-full"
            animate={{ width: `${Math.round(vadProb * 100)}%` }}
            transition={{ duration: 0.1 }}
          />
        </div>
      )}

      {muted && !speaking && (
        <MutedMicIcon className="w-3 h-3 text-red-400" />
      )}
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  Noise suppressor button content                                            */
/* ═══════════════════════════════════════════════════════════════════════════ */

function NsButtonContent({ status, enabled: _enabled }: { status: NSStatus; enabled: boolean }) {
  if (status === "loading") {
    return (
      <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
      </svg>
    );
  }
  if (status === "error") return <NsIcon className="w-5 h-5 opacity-40" />;
  return <NsIcon className="w-5 h-5" />;
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  Icons                                                                      */
/* ═══════════════════════════════════════════════════════════════════════════ */

function MicIcon({ className = "w-5 h-5" }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
    </svg>
  );
}
function MutedMicIcon({ className = "w-5 h-5" }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
    </svg>
  );
}
function DeafenOffIcon({ className = "w-5 h-5" }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
    </svg>
  );
}
function DeafenOnIcon({ className = "w-5 h-5" }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
    </svg>
  );
}
function ScreenShareIcon({ className = "w-5 h-5" }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  );
}
function HangupIcon({ className = "w-5 h-5" }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M16 8l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M5 3a2 2 0 00-2 2v1c0 8.284 6.716 15 15 15h1a2 2 0 002-2v-3.28a1 1 0 00-.684-.948l-4.493-1.498a1 1 0 00-1.21.502l-1.13 2.257a11.042 11.042 0 01-5.516-5.517l2.257-1.128a1 1 0 00.502-1.21L9.228 3.683A1 1 0 008.279 3H5z" />
    </svg>
  );
}
function NsIcon({ className = "w-5 h-5" }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
    </svg>
  );
}
