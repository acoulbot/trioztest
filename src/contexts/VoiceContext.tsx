"use client";

import { createContext, useContext, useState, useRef, useCallback, useEffect } from "react";
import { useSession } from "next-auth/react";
import { io, Socket } from "socket.io-client";
import { NoiseSuppressor, NSStatus } from "@/lib/noiseSuppressor";
import { patchedOffer, patchedAnswer } from "@/lib/sdpUtils";

/* ─── Types ─── */

export interface VoiceUser {
  socketId: string;
  userId:   string;
  userName: string;
  muted:    boolean;
}

interface VoiceState {
  isConnected:     boolean;
  channelId:       string | null;
  channelName:     string | null;
  isMuted:         boolean;
  isDeafened:      boolean;
  users:           VoiceUser[];
  speakingUsers:   Set<string>;
  localSpeaking:   boolean;
  error:           string | null;
  isSharingScreen: boolean;
  screenSharerId:  string | null;
  screenShareName: string;
  screenStream:    MediaStream | null;
  nsEnabled:       boolean;
  nsStatus:        NSStatus;
  vadProb:         number;
  userVolumes:     Map<string, number>;
  channelUsersMap: Map<string, VoiceUser[]>;
}

interface VoiceActions {
  joinVoice:        (channelId: string, channelName: string) => Promise<void>;
  leaveVoice:       () => void;
  toggleMute:       () => void;
  toggleDeafen:     () => void;
  toggleNS:         () => void;
  startScreenShare: () => Promise<void>;
  stopScreenShare:  () => Promise<void>;
  setUserVolume:    (socketId: string, volume: number) => void;
  setNsEnabled:     (v: boolean) => void;
  queryChannelUsers:(channelId: string) => void;
}

type VoiceCtx = VoiceState & VoiceActions;

const VoiceContext = createContext<VoiceCtx | null>(null);

export function useVoice() {
  const ctx = useContext(VoiceContext);
  if (!ctx) throw new Error("useVoice must be inside VoiceProvider");
  return ctx;
}

/* ─── Constants ─── */

const DEFAULT_ICE: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun.nextcloud.com:443" },
  ],
  iceTransportPolicy: "all",
  iceCandidatePoolSize: 2,
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
/*  Provider                                                                  */
/* ═══════════════════════════════════════════════════════════════════════════ */

export function VoiceProvider({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();

  /* ── Core state ── */
  const [isConnected,   setIsConnected]   = useState(false);
  const [channelId,     setChannelId]     = useState<string | null>(null);
  const [channelName,   setChannelName]   = useState<string | null>(null);
  const [isMuted,       setIsMuted]       = useState(false);
  const [isDeafened,    setIsDeafened]    = useState(false);
  const [users,         setUsers]         = useState<VoiceUser[]>([]);
  const [speakingUsers, setSpeakingUsers] = useState<Set<string>>(new Set());
  const [localSpeaking, setLocalSpeaking] = useState(false);
  const [error,         setError]         = useState<string | null>(null);

  /* ── Screen share ── */
  const [isSharingScreen, setIsSharingScreen] = useState(false);
  const [screenSharerId,  setScreenSharerId]  = useState<string | null>(null);
  const [screenShareName, setScreenShareName] = useState("");
  const [screenStream,     setScreenStreamState] = useState<MediaStream | null>(null);

  /* ── Noise suppressor ── */
  const [nsEnabled, setNsEnabled] = useState(true);
  const [nsStatus,  setNsStatus]  = useState<NSStatus>("idle");
  const [vadProb,   setVadProb]   = useState(0);

  /* ── Per-user volume ── */
  const [userVolumes, setUserVolumes] = useState<Map<string, number>>(new Map());

  /* ── Channel users preview (before joining) ── */
  const [channelUsersMap, setChannelUsersMap] = useState<Map<string, VoiceUser[]>>(new Map());

  /* ── Refs ── */
  const socketRef           = useRef<Socket | null>(null);
  const rawStreamRef        = useRef<MediaStream | null>(null);
  const localStreamRef      = useRef<MediaStream | null>(null);
  const screenStreamRef     = useRef<MediaStream | null>(null);
  const peersRef            = useRef<Map<string, RTCPeerConnection>>(new Map());
  const screenSendersRef    = useRef<Map<string, RTCRtpSender>>(new Map());
  const remoteScreenRef     = useRef<Map<string, MediaStream>>(new Map());
  const audioCtxRef         = useRef<AudioContext | null>(null);
  const analyserRef         = useRef<AnalyserNode | null>(null);
  const speakingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const remoteAudiosRef     = useRef<Map<string, HTMLAudioElement>>(new Map());
  const noiseSuppRef        = useRef<NoiseSuppressor | null>(null);
  const connectionSfxRef    = useRef<HTMLAudioElement | null>(null);
  const disconnectionSfxRef = useRef<HTMLAudioElement | null>(null);
  const channelIdRef        = useRef<string | null>(null);
  const iceConfigRef        = useRef<RTCConfiguration>(DEFAULT_ICE);

  /* ── Fetch TURN/ICE config from API ── */
  useEffect(() => {
    fetch("/api/voice/turn").then(r => r.json()).then(data => {
      if (data?.iceServers) {
        // If TURN is configured, force relay-only to avoid NAT issues
        const hasTurn = data.iceServers.some((s: { urls: string | string[] }) =>
          (Array.isArray(s.urls) ? s.urls : [s.urls]).some((u: string) => u.startsWith("turn"))
        );
        iceConfigRef.current = {
          iceServers: data.iceServers,
          iceTransportPolicy: hasTurn ? "relay" : "all",
          iceCandidatePoolSize: 2,
        };
        console.log(`[Voice] ICE config: ${hasTurn ? "relay (TURN)" : "all (STUN only)"}`, data.iceServers.length, "servers");
      }
    }).catch(() => {});
  }, []);

  /* Keep channelIdRef in sync */
  useEffect(() => { channelIdRef.current = channelId; }, [channelId]);

  /* ── Sound effects ── */
  useEffect(() => {
    connectionSfxRef.current    = Object.assign(new Audio("/sounds/connection.mp3"),    { preload: "auto" as const });
    disconnectionSfxRef.current = Object.assign(new Audio("/sounds/disconnection.mp3"), { preload: "auto" as const });
    return () => { connectionSfxRef.current = null; disconnectionSfxRef.current = null; };
  }, []);

  const playSound = useCallback((ref: React.RefObject<HTMLAudioElement | null>) => {
    if (!ref.current) return;
    try { const c = ref.current.cloneNode() as HTMLAudioElement; c.volume = 0.5; c.play().catch(() => {}); } catch { /* ignore */ }
  }, []);

  /* ── Screen video ── */
  const setScreenVideo = useCallback((stream: MediaStream | null) => {
    setScreenStreamState(stream);
  }, []);

  /* ── Peer cleanup ── */
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

  /* ── Create peer connection ── */
  const createPeerConnection = useCallback((remoteSocketId: string, isInitiator: boolean) => {
    const pc = new RTCPeerConnection(iceConfigRef.current);
    peersRef.current.set(remoteSocketId, pc);

    localStreamRef.current?.getTracks().forEach(t => {
      const sender = pc.addTrack(t, localStreamRef.current!);
      if (t.kind === "audio") {
        const params = sender.getParameters();
        if (!params.encodings?.length) params.encodings = [{}];
        params.encodings[0].maxBitrate = 128_000;
        sender.setParameters(params).catch(() => {});
      }
    });

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
          audio = new Audio();
          audio.autoplay = true;
          audio.volume = 1.0;
          remoteAudiosRef.current.set(remoteSocketId, audio);
        }
        audio.srcObject = stream;

        const tryPlay = () => {
          if (!audio) return;
          audio.play().catch((e) => {
            console.warn("[Voice] audio.play() failed:", e.name, "- retrying on interaction");
            const retry = () => { audio?.play().catch(() => {}); document.removeEventListener("click", retry); };
            document.addEventListener("click", retry, { once: true });
          });
        };

        // play() immediately and also on track unmute (media starts flowing after ICE)
        tryPlay();
        track.onunmute = tryPlay;
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
      if (candidate) {
        console.log(`[Voice] ICE candidate: ${candidate.type} ${candidate.protocol} ${candidate.address}:${candidate.port}`);
        socketRef.current?.emit("ice-candidate", { to: remoteSocketId, candidate: candidate.toJSON() });
      }
    };

    pc.onicegatheringstatechange = () => {
      console.log(`[Voice] ICE gathering: ${pc.iceGatheringState}`);
    };

    pc.oniceconnectionstatechange = () => {
      console.log(`[Voice] ICE connection: ${pc.iceConnectionState}`);
    };

    pc.onconnectionstatechange = () => {
      const state = pc.connectionState;
      console.log(`[Voice] Peer ${remoteSocketId} connection: ${state}`);
      if (state === "connected") {
        // Connection established — ensure audio is playing
        const audio = remoteAudiosRef.current.get(remoteSocketId);
        if (audio && audio.paused) audio.play().catch(() => {});
      }
      if (state === "failed") {
        console.warn("[Voice] ICE failed, restarting...");
        pc.restartIce();
        patchedOffer(pc).then(offer =>
          socketRef.current?.emit("voice-offer", { to: remoteSocketId, offer })
        ).catch(() => cleanupPeer(remoteSocketId));
      }
      if (state === "disconnected") {
        // Give 5s for reconnect before cleanup
        setTimeout(() => {
          if (pc.connectionState === "disconnected") {
            pc.restartIce();
            patchedOffer(pc).then(offer =>
              socketRef.current?.emit("voice-offer", { to: remoteSocketId, offer })
            ).catch(() => {});
          }
        }, 5000);
      }
    };

    if (isInitiator) {
      patchedOffer(pc).then(offer =>
        socketRef.current?.emit("voice-offer", { to: remoteSocketId, offer })
      );
    }

    return pc;
  }, [cleanupPeer, setScreenVideo]);

  /* ── Speaking detection ── */
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
          socketRef.current?.emit("speaking", { channelId: channelIdRef.current, speaking });
        return speaking;
      });
    }, 100);
  }, []);

  /* ── Noise suppressor toggle ── */
  const toggleNS = useCallback(() => {
    const next = !nsEnabled;
    setNsEnabled(next);
    noiseSuppRef.current?.setBypass(!next);
  }, [nsEnabled]);

  /* ── Stop screen share ── */
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
    socketRef.current?.emit("screen-share-stopped", { channelId: channelIdRef.current });
    setIsSharingScreen(false);
    setScreenVideo(null);
  }, [setScreenVideo]);

  /* ── Start screen share ── */
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
    socketRef.current?.emit("screen-share-started", { channelId: channelIdRef.current });
    setIsSharingScreen(true);
    setScreenVideo(stream);
    videoTrack.onended = () => stopScreenShare();
  }, [isConnected, setScreenVideo, stopScreenShare]);

  /* ── Leave voice ── */
  const leaveVoice = useCallback(() => {
    if (isSharingScreen) stopScreenShare();
    playSound(disconnectionSfxRef);

    socketRef.current?.emit("leave-voice", { channelId: channelIdRef.current });
    socketRef.current?.disconnect();
    socketRef.current = null;

    rawStreamRef.current?.getTracks().forEach(t => t.stop());
    rawStreamRef.current = null;
    localStreamRef.current?.getTracks().forEach(t => t.stop());
    localStreamRef.current = null;

    noiseSuppRef.current?.destroy();
    noiseSuppRef.current = null;
    setNsStatus("idle");

    peersRef.current.forEach((_, id) => cleanupPeer(id));
    peersRef.current.clear();

    if (speakingIntervalRef.current) { clearInterval(speakingIntervalRef.current); speakingIntervalRef.current = null; }
    audioCtxRef.current?.close();
    audioCtxRef.current = null;
    analyserRef.current = null;

    setIsConnected(false);
    setChannelId(null);
    setChannelName(null);
    setUsers([]);
    setSpeakingUsers(new Set());
    setLocalSpeaking(false);
    setIsMuted(false);
    setIsDeafened(false);
    setIsSharingScreen(false);
    setScreenSharerId(null);
    setScreenShareName("");
    setScreenVideo(null);
    setUserVolumes(new Map());
  }, [cleanupPeer, isSharingScreen, stopScreenShare, playSound, setScreenVideo]);

  /* ── Join voice ── */
  const joinVoice = useCallback(async (chId: string, chName: string) => {
    if (!session?.user) return;

    // If already in another channel, leave first
    if (isConnected && channelIdRef.current && channelIdRef.current !== chId) {
      leaveVoice();
      // small delay for cleanup
      await new Promise(r => setTimeout(r, 200));
    }

    setError(null);
    setChannelId(chId);
    setChannelName(chName);

    if (!navigator.mediaDevices?.getUserMedia) {
      setError("Голосовой канал требует защищённого соединения (HTTPS).");
      return;
    }

    let rawStream: MediaStream | null = null;

    try {
      try {
        rawStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            channelCount: 1,
            sampleRate: 48000,
          },
        });
      } catch {
        rawStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      }
      rawStreamRef.current = rawStream;

      setNsStatus("loading");
      const ns = new NoiseSuppressor();
      ns.onStatus(s => setNsStatus(s));
      ns.onVad(p => setVadProb(p));
      noiseSuppRef.current = ns;
      const processedStream = await ns.init(rawStream);
      ns.setBypass(!nsEnabled);
      localStreamRef.current = processedStream;

      const socket = io({ path: "/api/socketio", transports: ["websocket", "polling"] });
      socketRef.current = socket;

      socket.on("connect", () => {
        const userName = session.user.name || "Пользователь";
        socket.emit("join-voice", { channelId: chId, userId: session.user.id, userName });
        setIsConnected(true);
        playSound(connectionSfxRef);

        // Add self to user list immediately
        const self: VoiceUser = { socketId: socket.id!, userId: session.user.id, userName, muted: false };
        setUsers(prev => [...prev.filter(u => u.socketId !== socket.id), self]);
      });

      socket.on("voice-users", (existing: VoiceUser[]) => {
        // Merge existing users with self
        setUsers(prev => {
          const selfUser = prev.find(u => u.socketId === socket.id);
          const merged = selfUser ? [...existing.filter(u => u.socketId !== socket.id), selfUser] : existing;
          return merged;
        });
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

      socket.on("user-muted", ({ socketId, muted }: { socketId: string; muted: boolean }) =>
        setUsers(p => p.map(u => u.socketId === socketId ? { ...u, muted } : u))
      );
      socket.on("user-speaking", ({ socketId, speaking }: { socketId: string; speaking: boolean }) =>
        setSpeakingUsers(p => { const n = new Set(p); speaking ? n.add(socketId) : n.delete(socketId); return n; })
      );

      socket.on("screen-share-started", ({ socketId: id }: { socketId: string }) => {
        setScreenSharerId(id);
        const stream = remoteScreenRef.current.get(id);
        if (stream) setScreenVideo(stream);
      });
      socket.on("screen-share-stopped", ({ socketId: id }: { socketId: string }) => {
        remoteScreenRef.current.delete(id);
        setScreenSharerId(p => p === id ? null : p);
        setScreenShareName("");
        setScreenVideo(null);
      });

      socket.on("voice-channel-users", ({ channelId: cId, users: cUsers }: { channelId: string; users: VoiceUser[] }) => {
        setChannelUsersMap(prev => { const m = new Map(prev); m.set(cId, cUsers); return m; });
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
      setNsStatus("idle");

      if (err instanceof DOMException) {
        const msgs: Record<string, string> = {
          NotAllowedError:       "Доступ к микрофону запрещён. Разрешите в настройках браузера.",
          PermissionDeniedError: "Доступ к микрофону запрещён.",
          NotFoundError:         "Микрофон не найден.",
          NotReadableError:      "Микрофон занят другим приложением.",
        };
        setError(msgs[err.name] ?? `Ошибка микрофона: ${(err as DOMException).message}`);
      } else {
        setError("Не удалось подключиться. Попробуйте обновить страницу.");
      }
    }
  }, [session, isConnected, leaveVoice, createPeerConnection, cleanupPeer, startSpeakingDetection, playSound, nsEnabled, setScreenVideo]);

  /* ── Mute / Deafen ── */
  const toggleMute = useCallback(() => {
    const track = rawStreamRef.current?.getAudioTracks()[0];
    if (!track) return;
    track.enabled = isMuted;
    localStreamRef.current?.getAudioTracks().forEach(t => { t.enabled = isMuted; });
    setIsMuted(!isMuted);
    socketRef.current?.emit("toggle-mute", { channelId: channelIdRef.current, muted: !isMuted });
  }, [isMuted]);

  const toggleDeafen = useCallback(() => {
    const next = !isDeafened;
    setIsDeafened(next);
    remoteAudiosRef.current.forEach(a => { a.muted = next; });
    if (next && !isMuted) toggleMute();
  }, [isDeafened, isMuted, toggleMute]);

  /* ── Per-user volume ── */
  const setUserVolume = useCallback((socketId: string, volume: number) => {
    const clamped = Math.max(10, Math.min(100, volume));
    setUserVolumes(prev => { const m = new Map(prev); m.set(socketId, clamped); return m; });
    const audio = remoteAudiosRef.current.get(socketId);
    if (audio) audio.volume = clamped / 100;
  }, []);

  /* ── Query channel users (before joining) ── */
  const queryChannelUsers = useCallback((chId: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit("get-voice-channel-users", { channelId: chId });
    }
  }, []);

  /* ── Cleanup on unmount ── */
  useEffect(() => () => {
    if (isConnected) leaveVoice();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Update screen share name when users change ── */
  useEffect(() => {
    if (screenSharerId && !isSharingScreen) {
      const u = users.find(u => u.socketId === screenSharerId);
      setScreenShareName(u?.userName ?? "Участник");
    }
  }, [screenSharerId, users, isSharingScreen]);

  const activeScreenName = isSharingScreen
    ? `${session?.user?.name ?? "Вы"} (Вы)`
    : screenShareName || "Участник";

  const value: VoiceCtx = {
    isConnected, channelId, channelName, isMuted, isDeafened,
    users, speakingUsers, localSpeaking, error,
    isSharingScreen, screenSharerId, screenShareName: activeScreenName,
    screenStream,
    nsEnabled, nsStatus, vadProb, userVolumes, channelUsersMap,
    joinVoice, leaveVoice, toggleMute, toggleDeafen, toggleNS,
    startScreenShare, stopScreenShare, setUserVolume, setNsEnabled,
    queryChannelUsers,
  };

  return <VoiceContext.Provider value={value}>{children}</VoiceContext.Provider>;
}
