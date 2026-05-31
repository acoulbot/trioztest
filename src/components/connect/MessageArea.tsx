"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { io, Socket } from "socket.io-client";
import Image from "next/image";
import ImageLightbox from "@/components/ui/ImageLightbox";
import { playMsgNotification, playMentionNotification } from "@/lib/msgSound";
import GlowAvatar from "@/components/ui/GlowAvatar";
import TypingIndicator from "@/components/ui/TypingIndicator";
import VoiceRecorder from "@/components/ui/VoiceRecorder";
import VoicePlayer from "@/components/ui/VoicePlayer";
import DayNightBackground from "@/components/connect/DayNightBackground";
import { PlusMenu, ChannelToolsPanel } from "@/components/connect/ChannelTools";

interface MessageUser {
  id: string;
  name: string;
  username?: string;
  avatar: string | null;
  role: string;
  avatarGlowEnabled?: boolean;
  avatarGlowColors?: string | null;
}

interface Attachment {
  url: string;
  name: string;
  size: number;
  type: string;
  isImage: boolean;
  isVoice?: boolean;
  duration?: number;
}

interface Reaction {
  id: string;
  emoji: string;
  userId: string;
  user: { id: string; name: string };
}

interface ReplyTo {
  id: string;
  content: string;
  user: { id: string; name: string };
}

interface Message {
  id: string;
  content: string;
  createdAt: string;
  edited?: boolean;
  editedAt?: string | null;
  deleted?: boolean;
  pinned?: boolean;
  attachments?: string | null;
  reactions?: Reaction[];
  replyTo?: ReplyTo | null;
  reads?: { userId: string }[];
  threadId?: string | null;
  threadCount?: number;
  _count?: { threadReplies: number };
  user: MessageUser;
}

interface MessageAreaProps {
  channelId: string;
  channelName: string;
  channelIcon: string | null;
  channelType?: string;
  currentUserId: string;
  currentUserName?: string;
  currentUserRole: string;
  isBanned: boolean;
  onBack?: () => void;
  onNewMessage?: () => void;
}

export default function MessageArea({
  channelId, channelName, channelIcon, channelType = "TEXT", currentUserId, currentUserName = "", currentUserRole, isBanned, onBack, onNewMessage,
}: MessageAreaProps) {
  const isNewsChannel = channelType === "NEWS";
  const canWriteNews = isNewsChannel && (currentUserRole === "OWNER" || currentUserRole === "ADMIN" || currentUserRole === "MODERATOR" || currentUserRole === "SITE_ADMIN");
  const currentUserIdRef = useRef(currentUserId);
  const currentUserNameRef = useRef(currentUserName);
  const onNewMessageRef = useRef(onNewMessage);
  useEffect(() => { currentUserIdRef.current = currentUserId; }, [currentUserId]);
  useEffect(() => { currentUserNameRef.current = currentUserName; }, [currentUserName]);
  useEffect(() => { onNewMessageRef.current = onNewMessage; }, [onNewMessage]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [replyTo, setReplyTo] = useState<{ id: string; name: string; content: string } | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState<string | null>(null);
  const [typingUsers, setTypingUsers] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [forwardToast, setForwardToast] = useState(false);
  const [forwardMsg, setForwardMsg] = useState<{ content: string; userName: string } | null>(null);
  const [forwardTargets, setForwardTargets] = useState<{ type: "channel" | "dm"; id: string; name: string; icon?: string | null }[]>([]);
  const [forwardSearch, setForwardSearch] = useState("");
  const [forwardSending, setForwardSending] = useState(false);
  const [mentionSuggestions, setMentionSuggestions] = useState<{id:string;name:string|null}[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [sending, setSending] = useState(false);
  const [errorToast, setErrorToast] = useState<string | null>(null);
  const [confirmModal, setConfirmModal] = useState<{ message: string; onConfirm: () => void } | null>(null);
  const [toolsRefresh, setToolsRefresh] = useState(0);
  const [channelMembers, setChannelMembers] = useState<{id:string;name:string|null}[]>([]);
  const [recordingVoice, setRecordingVoice] = useState(false);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const [showPinned, setShowPinned] = useState(false);
  const [pinnedMessages, setPinnedMessages] = useState<Message[]>([]);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Message[]>([]);
  const [searching, setSearching] = useState(false);
  const [activeThread, setActiveThread] = useState<{ id: string; user: string; content: string } | null>(null);
  const [threadMessages, setThreadMessages] = useState<Message[]>([]);
  const [threadInput, setThreadInput] = useState("");
  const [showSchedule, setShowSchedule] = useState(false);
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("");
  const [scheduledList, setScheduledList] = useState<{ id: string; content: string; scheduledAt: string; channel?: { name: string } }[]>([]);
  const [showFormatBar, setShowFormatBar] = useState(true);
  const [slowmodeWait, setSlowmodeWait] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const canPin = currentUserRole === "OWNER" || currentUserRole === "ADMIN" || currentUserRole === "MODERATOR" || currentUserRole === "SITE_ADMIN";

  const fetchPinned = async () => {
    const res = await fetch(`/api/messages/pin?channelId=${channelId}`);
    if (res.ok) setPinnedMessages(await res.json());
  };

  const togglePin = async (messageId: string) => {
    await fetch("/api/messages/pin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messageId }),
    });
    fetchPinned();
  };

  const performSearch = async (query: string) => {
    if (query.trim().length < 2) { setSearchResults([]); return; }
    setSearching(true);
    const res = await fetch(`/api/messages/search?channelId=${channelId}&q=${encodeURIComponent(query.trim())}`);
    if (res.ok) setSearchResults(await res.json());
    setSearching(false);
  };

  // Day-Night background (optional, controlled via profile settings)
  const [dayNightEnabled, setDayNightEnabled] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("tz-connect-daynight") === "true";
    }
    return false;
  });
  const [dayNightOpacity, setDayNightOpacity] = useState<number>(() => {
    if (typeof window !== "undefined") {
      return parseInt(localStorage.getItem("tz-connect-daynight-opacity") ?? "15", 10);
    }
    return 15;
  });

  useEffect(() => {
    function handleDayNightChange(e: Event) {
      const detail = (e as CustomEvent<{ enabled: boolean; opacity: number }>).detail;
      setDayNightEnabled(detail.enabled);
      setDayNightOpacity(detail.opacity);
    }
    window.addEventListener("tz-daynight-change", handleDayNightChange);
    return () => window.removeEventListener("tz-daynight-change", handleDayNightChange);
  }, []);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isAtBottomRef = useRef(true);
  const scrollFetchLock = useRef(false);

  const fetchMessages = useCallback(async (cursor?: string) => {
    const url = `/api/messages?channelId=${channelId}&limit=50${cursor ? `&cursor=${cursor}` : ""}`;
    const res = await fetch(url);
    if (!res.ok) return;
    const data = await res.json();
    if (cursor) {
      setMessages((prev) => [...data.messages, ...prev]);
    } else {
      setMessages(data.messages);
    }
    setNextCursor(data.nextCursor);
    setHasMore(!!data.nextCursor);
    setLoading(false);
  }, [channelId]);

  useEffect(() => {
    setMessages([]);
    setLoading(true);
    setNextCursor(null);
    fetchMessages();
  }, [channelId, fetchMessages]);

  // Mute state ref
  const isMutedRef = useRef(false);

  // Fetch channel members for tools (polls/tasks assignment) + mute state
  useEffect(() => {
    fetch(`/api/channels/${channelId}`)
      .then((r) => r.ok ? r.json() : null)
      .then((ch) => {
        if (!ch?.groupId) return;
        // Fetch members + mute state in parallel
        Promise.all([
          fetch(`/api/groups/${ch.groupId}`).then((r) => r.ok ? r.json() : null),
          fetch(`/api/channels/mute?groupId=${ch.groupId}`).then((r) => r.ok ? r.json() : null),
        ]).then(([g, muteData]) => {
          if (g?.members) {
            setChannelMembers(g.members.map((m: { user: { id: string; name: string | null } }) => ({ id: m.user.id, name: m.user.name })));
          }
          if (muteData) {
            const groupMuted = muteData.groupMuted ?? false;
            const channelMuted = muteData.channels?.[channelId];
            // Muted if: channel explicitly muted, or group muted and channel not explicitly unmuted
            isMutedRef.current = channelMuted === true || (groupMuted && channelMuted !== false);
          }
        });
      })
      .catch(() => {});
  }, [channelId]);

  // Socket.IO connection
  useEffect(() => {
    const socket = io({ path: "/api/socketio", withCredentials: true });
    socketRef.current = socket;

    socket.on("connect", () => {
      socket.emit("join-channel", { channelId });
    });

    socket.on("new-message", (msg: Message) => {
      setMessages((prev) => {
        if (prev.find((m) => m.id === msg.id)) return prev;
        // If this is our own message, replace optimistic placeholder
        if (msg.user.id === currentUserIdRef.current) {
          const hasOptimistic = prev.some((m) => m.id.startsWith("opt-"));
          if (hasOptimistic) return prev.map((m) => m.id.startsWith("opt-") && m.user.id === msg.user.id ? msg : m);
        }
        return [...prev, msg];
      });
      onNewMessageRef.current?.();
      // Play notification only for messages from others (unless muted)
      if (msg.user.id !== currentUserIdRef.current && !isMutedRef.current) {
        const uname = currentUserNameRef.current;
        const isMention = uname && (
          msg.content.toLowerCase().includes(`@${uname.toLowerCase()}`) ||
          msg.content.includes("@everyone")
        );
        if (isMention) playMentionNotification();
        else playMsgNotification();
        if (document.hidden && typeof Notification !== "undefined" && Notification.permission === "granted") {
          new Notification(`${msg.user.name}`, { body: msg.content.slice(0, 80), tag: msg.id });
        }
      }
    });

    socket.on("message-edited", (msg: Message) => {
      setMessages((prev) => prev.map((m) => (m.id === msg.id ? msg : m)));
    });

    socket.on("message-deleted", ({ id }: { id: string }) => {
      setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, deleted: true, content: "" } : m)));
    });

    socket.on("user-typing", ({ userId, userName }: { userId: string; userName: string }) => {
      setTypingUsers((prev) => {
        if (prev.size >= 5 && !prev.has(userId)) return prev; // throttle: max 5 tracked
        return new Map(prev).set(userId, userName);
      });
    });

    socket.on("user-stop-typing", ({ userId }: { userId: string }) => {
      setTypingUsers((prev) => {
        const next = new Map(prev);
        next.delete(userId);
        return next;
      });
    });

    socket.on("reaction-added", ({ messageId, emoji, userId: uid, userName }: { messageId: string; emoji: string; userId: string; userName: string }) => {
      setMessages((prev) => prev.map((m) => {
        if (m.id !== messageId) return m;
        const reactions = [...(m.reactions || [])];
        if (!reactions.find((r) => r.userId === uid && r.emoji === emoji)) {
          reactions.push({ id: `${uid}-${emoji}`, emoji, userId: uid, user: { id: uid, name: userName } });
        }
        return { ...m, reactions };
      }));
    });

    socket.on("reaction-removed", ({ messageId, emoji, userId: uid }: { messageId: string; emoji: string; userId: string }) => {
      setMessages((prev) => prev.map((m) => {
        if (m.id !== messageId) return m;
        return { ...m, reactions: (m.reactions || []).filter((r) => !(r.userId === uid && r.emoji === emoji)) };
      }));
    });

    socket.on("message-pinned", ({ messageId, pinned }: { messageId: string; pinned: boolean }) => {
      setMessages((prev) => prev.map((m) => m.id === messageId ? { ...m, pinned } : m));
    });

    socket.on("profile-updated", (data: { id: string; avatar?: string | null; avatarGlowEnabled?: boolean; avatarGlowColors?: string | null }) => {
      setMessages((prev) => prev.map((m) => {
        if (m.user.id !== data.id) return m;
        return { ...m, user: { ...m.user, avatar: data.avatar ?? m.user.avatar, avatarGlowEnabled: data.avatarGlowEnabled ?? m.user.avatarGlowEnabled, avatarGlowColors: data.avatarGlowColors ?? m.user.avatarGlowColors } };
      }));
    });

    socket.on("messages-read", ({ userId: readerId, messageIds: readIds }: { userId: string; messageIds: string[] }) => {
      setMessages((prev) => prev.map((m) => {
        if (!readIds.includes(m.id)) return m;
        if ((m.reads || []).some(r => r.userId === readerId)) return m;
        return { ...m, reads: [...(m.reads || []), { userId: readerId }] };
      }));
    });

    return () => {
      socket.emit("leave-channel", { channelId });
      socket.disconnect();
      socketRef.current = null;
    };
  }, [channelId]);

  // Scroll to bottom on new messages if already at bottom
  useEffect(() => {
    if (isAtBottomRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const handleScroll = () => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    isAtBottomRef.current = distFromBottom < 100;
    setShowScrollBtn(distFromBottom > 300);
    if (el.scrollTop < 50 && hasMore && nextCursor && !scrollFetchLock.current) {
      scrollFetchLock.current = true;
      fetchMessages(nextCursor).finally(() => {
        setTimeout(() => { scrollFetchLock.current = false; }, 300);
      });
    }
  };

  const emitTyping = () => {
    socketRef.current?.emit("typing", { channelId });
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socketRef.current?.emit("stop-typing", { channelId });
    }, 2000);
  };

  // Mark messages as read when visible
  const lastMsgIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (messages.length === 0) return;
    const lastId = messages[messages.length - 1]?.id;
    if (lastId === lastMsgIdRef.current) return;
    lastMsgIdRef.current = lastId;
    const unread = messages.filter(m => m.user.id !== currentUserId && !(m.reads || []).some(r => r.userId === currentUserId));
    if (unread.length === 0) return;
    fetch("/api/messages/read", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messageIds: unread.map(m => m.id), channelId }),
    }).then(() => {
      setMessages(prev => prev.map(m => {
        if (unread.some(u => u.id === m.id)) {
          return { ...m, reads: [...(m.reads || []), { userId: currentUserId }] };
        }
        return m;
      }));
    }).catch(() => {});
  }, [messages, currentUserId, channelId]);

  // Slowmode countdown
  useEffect(() => {
    if (slowmodeWait <= 0) return;
    const t = setInterval(() => setSlowmodeWait(prev => Math.max(0, prev - 1)), 1000);
    return () => clearInterval(t);
  }, [slowmodeWait]);

  // Thread functions
  const openThread = async (msg: Message) => {
    setActiveThread({ id: msg.id, user: msg.user.name, content: msg.content.slice(0, 80) });
    const res = await fetch(`/api/messages?channelId=${channelId}&threadId=${msg.id}`);
    if (res.ok) {
      const data = await res.json();
      setThreadMessages(data.messages);
    }
  };

  const sendThreadReply = async () => {
    if (!threadInput.trim() || !activeThread) return;
    const content = threadInput;
    setThreadInput("");
    const res = await fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content, channelId, threadId: activeThread.id }),
    });
    if (res.ok) {
      const msg = await res.json();
      setThreadMessages(prev => [...prev, msg]);
      setMessages(prev => prev.map(m => m.id === activeThread.id ? { ...m, threadCount: (m.threadCount || 0) + 1, _count: { ...m._count, threadReplies: ((m._count?.threadReplies || 0) + 1) } } : m));
    }
  };

  // Scheduled messages
  const loadScheduled = async () => {
    const res = await fetch("/api/messages/scheduled");
    if (res.ok) setScheduledList(await res.json());
  };

  const scheduleMessage = async () => {
    if (!newMessage.trim() || !scheduleDate || !scheduleTime) return;
    const dt = new Date(`${scheduleDate}T${scheduleTime}`);
    if (dt.getTime() <= Date.now()) { setErrorToast("Время должно быть в будущем"); setTimeout(() => setErrorToast(null), 3500); return; }
    await fetch("/api/messages/scheduled", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: newMessage, channelId, scheduledAt: dt.toISOString() }),
    });
    setNewMessage("");
    setShowSchedule(false);
    loadScheduled();
  };

  const deleteScheduled = async (id: string) => {
    await fetch(`/api/messages/scheduled?id=${id}`, { method: "DELETE" });
    loadScheduled();
  };

  // Format helpers
  const insertFormat = (prefix: string, suffix: string) => {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const text = newMessage;
    const selected = text.slice(start, end);
    const newText = text.slice(0, start) + prefix + selected + suffix + text.slice(end);
    setNewMessage(newText);
    setTimeout(() => { ta.focus(); ta.selectionStart = start + prefix.length; ta.selectionEnd = end + prefix.length; }, 0);
  };

  // Render formatted content: **bold**, *italic*, `code`, - lists, #channel mentions, @mentions
  const renderContent = (text: string) => {
    const parts: React.ReactNode[] = [];
    const regex = /(\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`|^- (.+)$|#(\S+)|@(everyone|[A-Za-z0-9_а-яА-ЯёЁ]+))/gm;
    let lastIndex = 0;
    let match;
    let key = 0;
    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIndex) parts.push(text.slice(lastIndex, match.index));
      if (match[2]) parts.push(<strong key={key++}>{match[2]}</strong>);
      else if (match[3]) parts.push(<em key={key++}>{match[3]}</em>);
      else if (match[4]) parts.push(<code key={key++} className="bg-neutral-200 dark:bg-white/10 px-1 rounded text-xs">{match[4]}</code>);
      else if (match[5]) parts.push(<span key={key++} className="flex items-start gap-1"><span className="text-violet-500 dark:text-cyan-400">•</span>{match[5]}</span>);
      else if (match[6]) parts.push(<span key={key++} className="text-violet-500 dark:text-cyan-400 cursor-pointer hover:underline">#{match[6]}</span>);
      else if (match[7]) parts.push(<span key={key++} className="bg-violet-500/20 dark:bg-cyan-400/20 text-violet-600 dark:text-cyan-300 px-1 rounded font-medium">@{match[7]}</span>);
      lastIndex = match.index + match[0].length;
    }
    if (lastIndex < text.length) parts.push(text.slice(lastIndex));
    return parts.length > 0 ? parts : text;
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || sending || slowmodeWait > 0) return;

    setSending(true);
    socketRef.current?.emit("stop-typing", { channelId });

    const content = newMessage;
    const body: Record<string, unknown> = { content, channelId };
    if (replyTo) body.replyToId = replyTo.id;

    setNewMessage("");
    const savedReply = replyTo;
    setReplyTo(null);

    // Optimistic update — show message immediately
    const optimisticId = `opt-${Date.now()}`;
    const optimisticMsg: Message = {
      id: optimisticId,
      content,
      createdAt: new Date().toISOString(),
      edited: false,
      deleted: false,
      pinned: false,
      attachments: null,
      user: { id: currentUserId, name: currentUserName, avatar: null, avatarGlowEnabled: false, avatarGlowColors: null, role: currentUserRole },
      replyTo: savedReply ? { id: savedReply.id, content: savedReply.content, user: { id: "", name: savedReply.name } } : undefined,
      reads: [],
    };
    setMessages(prev => [...prev, optimisticMsg]);
    isAtBottomRef.current = true;

    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        setNewMessage(content);
        setMessages(prev => prev.filter(m => m.id !== optimisticId));
        if (res.status === 429 && data.error) {
          const secs = parseInt(data.error.match(/\d+/)?.[0] || "5");
          setSlowmodeWait(secs);
        }
        setErrorToast(data.error || "Ошибка отправки");
        setTimeout(() => setErrorToast(null), 3500);
      } else {
        // Replace optimistic message with real one from server
        const real = await res.json();
        setMessages(prev => prev.map(m => m.id === optimisticId ? { ...real } : m));
      }
    } catch {
      setNewMessage(content);
      setMessages(prev => prev.filter(m => m.id !== optimisticId));
    } finally {
      setSending(false);
    }
  };

  const toggleReaction = async (messageId: string, emoji: string) => {
    setShowEmojiPicker(null);
    await fetch("/api/reactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messageId, emoji }),
    });
  };

  const pinMessage = async (messageId: string) => {
    const res = await fetch("/api/messages/pin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messageId }),
    });
    if (res.ok) {
      const { pinned } = await res.json();
      setMessages(prev => prev.map(m => m.id === messageId ? { ...m, pinned } : m));
      if (showPinned) fetchPinned();
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const uploadRes = await fetch("/api/messages/upload", { method: "POST", body: fd });
      if (!uploadRes.ok) {
        const data = await uploadRes.json();
        setErrorToast(data.error || "Ошибка загрузки");
        setTimeout(() => setErrorToast(null), 3500);
        return;
      }
      const attachment = await uploadRes.json();
      await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: "",
          channelId,
          attachments: [attachment],
        }),
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleVoiceRecorded = async (blob: Blob, duration: number) => {
    setRecordingVoice(false);
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", blob, "voice.webm");
      fd.append("duration", String(duration));
      const uploadRes = await fetch("/api/messages/upload", { method: "POST", body: fd });
      if (!uploadRes.ok) return;
      const attachment = await uploadRes.json();
      await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: "", channelId, attachments: [attachment] }),
      });
    } finally {
      setUploading(false);
    }
  };

  const startEdit = (msg: Message) => {
    setEditingId(msg.id);
    setEditContent(msg.content);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditContent("");
  };

  const saveEdit = async () => {
    if (!editingId || !editContent.trim()) return;
    const res = await fetch("/api/messages", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messageId: editingId, content: editContent }),
    });
    if (res.ok) cancelEdit();
  };

  const deleteMessage = async (messageId: string) => {
    setConfirmModal({
      message: "Удалить сообщение?",
      onConfirm: async () => {
        await fetch(`/api/messages?messageId=${messageId}`, { method: "DELETE" });
        setConfirmModal(null);
      },
    });
  };

  const parseAttachments = (raw: string | null | undefined): Attachment[] => {
    if (!raw) return [];
    try { return JSON.parse(raw); } catch { return []; }
  };

  const openForwardModal = async (msg: Message) => {
    setForwardMsg({ content: msg.content, userName: msg.user.name });
    setForwardSearch("");
    try {
      const [chRes, dmRes] = await Promise.all([
        fetch("/api/channels"),
        fetch("/api/dm"),
      ]);
      const targets: { type: "channel" | "dm"; id: string; name: string; icon?: string | null }[] = [];
      if (chRes.ok) {
        const channels = await chRes.json();
        for (const ch of channels) {
          if (ch.id !== channelId) targets.push({ type: "channel", id: ch.id, name: ch.name, icon: null });
        }
      }
      if (dmRes.ok) {
        const convs = await dmRes.json();
        for (const c of convs) {
          const peer = c.user1?.id === currentUserId ? c.user2 : c.user1;
          if (peer) targets.push({ type: "dm", id: c.id, name: peer.name || peer.username || "DM", icon: peer.avatar });
        }
      }
      setForwardTargets(targets);
    } catch { /* ignore */ }
  };

  const doForward = async (target: { type: "channel" | "dm"; id: string; name: string }) => {
    if (!forwardMsg || forwardSending) return;
    setForwardSending(true);
    const fwdContent = `> Переслано от ${forwardMsg.userName}:\n> ${forwardMsg.content.split("\n").join("\n> ")}\n`;
    try {
      if (target.type === "channel") {
        await fetch("/api/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ channelId: target.id, content: fwdContent }),
        });
      } else {
        await fetch(`/api/dm/${target.id}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: fwdContent }),
        });
      }
      setForwardMsg(null);
      setForwardSearch("");
      setForwardToast(true);
      setTimeout(() => setForwardToast(false), 2000);
    } catch { /* ignore */ }
    setForwardSending(false);
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-violet-500 dark:border-cyan-400 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full min-w-0 relative">
      {/* Day-Night atmospheric background (optional) */}
      {dayNightEnabled && (
        <DayNightBackground opacity={dayNightOpacity / 100} />
      )}
      {/* Header */}
      <header className="h-12 border-b bg-[var(--cn-main)]/80 backdrop-blur-sm flex items-center px-4 gap-2 backdrop-blur-sm flex-shrink-0">
        {onBack && (
          <button onClick={onBack} className="md:hidden p-1 text-neutral-400 hover:text-neutral-600 dark:hover:text-white" aria-label="Back to channels">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        )}
        <span aria-hidden="true">{channelIcon || (isNewsChannel ? "\uD83D\uDCF0" : "\uD83D\uDCAC")}</span>
        <span className="font-medium text-neutral-900 dark:text-white text-sm">{channelName}</span>
        {isNewsChannel && (
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 font-medium">
            Новости
          </span>
        )}
        <div className="ml-auto flex gap-1">
          <button
            onClick={() => { setShowSearch(!showSearch); if (showSearch) { setSearchQuery(""); setSearchResults([]); } }}
            className={`p-1.5 rounded-lg transition-colors ${showSearch ? "text-violet-500 dark:text-cyan-400 bg-violet-50 dark:bg-cyan-900/20" : "text-neutral-400 hover:text-neutral-600 dark:hover:text-white"}`}
            aria-label="Search"
            title="Поиск"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>
          <button
            onClick={() => { setShowPinned(!showPinned); if (!showPinned) fetchPinned(); }}
            className={`p-1.5 rounded-lg transition-colors ${showPinned ? "text-violet-500 dark:text-cyan-400 bg-violet-50 dark:bg-cyan-900/20" : "text-neutral-400 hover:text-neutral-600 dark:hover:text-white"}`}
            aria-label="Pinned messages"
            title="Закреплённые"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
            </svg>
          </button>
        </div>
      </header>

      {/* Search bar */}
      {showSearch && (
        <div className="border-b border-[var(--cn-border)] bg-[var(--cn-main)]">
          <div className="px-4 py-2 relative">
            <div className="flex gap-2 items-center">
              <div className="flex-1 relative">
                <input
                  value={searchQuery}
                  onChange={e => {
                    const val = e.target.value;
                    setSearchQuery(val);
                    if (val.startsWith("@") && val.length >= 2) {
                      const nick = val.slice(1).toLowerCase();
                      const matches = channelMembers.filter(m => (m.name || "").toLowerCase().includes(nick));
                      setMentionSuggestions(matches.slice(0, 8));
                    } else {
                      setMentionSuggestions([]);
                      performSearch(val);
                    }
                  }}
                  onKeyDown={e => {
                    if (e.key === "Enter" && searchQuery.startsWith("@") && mentionSuggestions.length > 0) {
                      e.preventDefault();
                      const picked = mentionSuggestions[0];
                      setSearchQuery("");
                      setMentionSuggestions([]);
                      performSearch(`@${picked.name}`);
                    }
                  }}
                  placeholder="Поиск сообщений или @ник..."
                  className="w-full px-3 py-1.5 bg-neutral-100 dark:bg-white/5 border border-neutral-200 dark:border-white/10 rounded-lg text-sm text-neutral-900 dark:text-white outline-none focus:ring-1 focus:ring-violet-500 dark:focus:ring-cyan-400"
                  autoFocus
                />
                {mentionSuggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-white/10 rounded-lg shadow-xl z-50 overflow-hidden">
                    {mentionSuggestions.map(u => (
                      <button
                        key={u.id}
                        onClick={() => {
                          setSearchQuery("");
                          setMentionSuggestions([]);
                          performSearch(`@${u.name}`);
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-violet-50 dark:hover:bg-white/5 transition-colors"
                      >
                        <span className="text-sm text-neutral-900 dark:text-white">{u.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button onClick={() => { setShowSearch(false); setSearchQuery(""); setSearchResults([]); setMentionSuggestions([]); }} className="text-neutral-400 hover:text-neutral-600 dark:hover:text-white p-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
          </div>
          {searching && <p className="px-4 pb-2 text-xs text-neutral-400">Поиск...</p>}
          {searchResults.length > 0 && (
            <div className="max-h-[35vh] overflow-y-auto">
              {searchResults.map(sr => (
                <div key={sr.id} className="px-4 py-2 hover:bg-black/5 dark:hover:bg-white/5 border-t border-[var(--cn-border)] cursor-pointer" onClick={() => { setShowSearch(false); setSearchQuery(""); setSearchResults([]); }}>
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs font-medium text-accent">{sr.user.name}</span>
                    <span className="text-[10px] text-neutral-400">{new Date(sr.createdAt).toLocaleDateString("ru")}</span>
                  </div>
                  <p className="text-sm text-[var(--cn-text)] line-clamp-2">{sr.content}</p>
                </div>
              ))}
            </div>
          )}
          {!searching && searchQuery.length >= 2 && !searchQuery.startsWith("@") && searchResults.length === 0 && (
            <p className="px-4 pb-2 text-xs text-neutral-400">Ничего не найдено</p>
          )}
        </div>
      )}

      {/* Pinned messages panel */}
      {showPinned && (
        <div className="border-b border-[var(--cn-border)] bg-[var(--cn-accent-dim)] max-h-[40vh] overflow-y-auto">
          <div className="px-4 py-2 text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider flex items-center justify-between">
            <span>Закреплённые ({pinnedMessages.length})</span>
            <button onClick={() => setShowPinned(false)} className="text-neutral-400 hover:text-neutral-600 dark:hover:text-white">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
          {pinnedMessages.length === 0 ? (
            <p className="px-4 pb-3 text-sm text-neutral-400">Нет закреплённых сообщений</p>
          ) : (
            pinnedMessages.map(pm => (
              <div key={pm.id} className="px-4 py-2 flex items-start gap-2 hover:bg-black/5 dark:hover:bg-white/5 border-b border-[var(--cn-border)] last:border-0">
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-medium text-accent">{pm.user.name}</span>
                  <p className="text-sm text-[var(--cn-text)] line-clamp-2">{pm.content || "[файл]"}</p>
                </div>
                {canPin && (
                  <button onClick={() => togglePin(pm.id)} className="flex-shrink-0 p-1 text-neutral-400 hover:text-red-500" title="Открепить">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* Messages */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-4 space-y-3"
        role="log"
        aria-label="Messages"
      >
        {hasMore && (
          <div className="text-center py-2">
            <button onClick={() => nextCursor && fetchMessages(nextCursor)} className="text-sm text-violet-500 dark:text-cyan-400 hover:underline">
              Загрузить ранее
            </button>
          </div>
        )}

        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-neutral-400">
            <div className="text-center">
              <span className="text-4xl block mb-3">{"\uD83D\uDCAC"}</span>
              <p className="text-sm">Нет сообщений. Начните общение!</p>
            </div>
          </div>
        ) : (
          messages.map((msg, idx) => {
            const prev = idx > 0 ? messages[idx - 1] : null;
            const isGrouped = prev
              && prev.user.id === msg.user.id
              && !msg.replyTo
              && !msg.pinned
              && (new Date(msg.createdAt).getTime() - new Date(prev.createdAt).getTime()) < 5 * 60 * 1000;
            return (
            <motion.div key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 380, damping: 28 }}
              className={`flex gap-3 group ${isGrouped ? "mt-[-8px]" : ""} ${msg.pinned ? "bg-amber-50/50 dark:bg-amber-400/5 -mx-2 px-2 py-1 rounded-lg" : ""}`}>
              {isGrouped ? <div className="w-9 flex-shrink-0" /> : <GlowAvatar user={msg.user} size={36} />}
              <div className="flex-1 min-w-0">
                {/* Pin indicator */}
                {msg.pinned && (
                  <div className="flex items-center gap-1 text-[10px] text-amber-500 mb-0.5">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path d="M5 5a2 2 0 012-2h6a2 2 0 012 2v2a2 2 0 01-2 2H7a2 2 0 01-2-2V5zm0 8l3.5-1.5L10 14l1.5-2.5L15 13v2H5v-2z" /></svg>
                    Закреплено
                  </div>
                )}

                {/* Reply reference */}
                {msg.replyTo && (
                  <div className="flex items-center gap-1 text-[11px] text-neutral-400 mb-0.5 border-l-2 border-violet-400 dark:border-cyan-400 pl-2">
                    <span className="font-medium">{msg.replyTo.user.name}:</span>
                    <span className="truncate max-w-[200px]">{msg.replyTo.content}</span>
                  </div>
                )}

                {!isGrouped && <div className="flex items-baseline gap-2 flex-wrap">
                  <span className="font-medium text-neutral-900 dark:text-white text-sm">{msg.user.name}</span>
                  {msg.user.role === "ADMIN" && <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/15 text-red-400 font-medium">Админ</span>}
                  {msg.user.role === "MODERATOR" && <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-400 font-medium">Модератор</span>}
                  {msg.user.username && <span className="text-[11px] text-neutral-400">@{msg.user.username}</span>}
                  <span className="text-xs text-neutral-400 dark:text-gray-600">
                    {new Date(msg.createdAt).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                  {msg.user.id === currentUserId && !msg.deleted && (() => {
                    const readCount = (msg.reads || []).filter(r => r.userId !== currentUserId).length;
                    return (
                      <span className="text-[10px] text-neutral-400" title={`Прочитано: ${readCount}`}>
                        {readCount > 0 ? <span className="text-violet-500 dark:text-cyan-400">✓✓ {readCount}</span> : "✓"}
                      </span>
                    );
                  })()}
                  {msg.edited && <span className="text-[10px] text-neutral-400">(ред.)</span>}
                </div>}

                {msg.deleted ? (
                  <p className="text-neutral-400 dark:text-gray-600 text-sm mt-0.5 italic">Сообщение удалено</p>
                ) : editingId === msg.id ? (
                  <div className="mt-1 space-y-1">
                    <input
                      type="text"
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") saveEdit();
                        if (e.key === "Escape") cancelEdit();
                      }}
                      className="w-full bg-[var(--cn-accent-dim)] border border-[var(--cn-border)] rounded-lg px-3 py-1.5 text-sm text-neutral-900 dark:text-white"
                      autoFocus
                    />
                    <div className="flex gap-1">
                      <button onClick={saveEdit} className="text-xs text-green-500 hover:underline">Сохранить</button>
                      <button onClick={cancelEdit} className="text-xs text-neutral-400 hover:underline">Отмена</button>
                    </div>
                  </div>
                ) : (
                  <>
                    {msg.content && <p className="text-neutral-700 dark:text-gray-300 text-sm mt-0.5 break-words whitespace-pre-wrap">{renderContent(msg.content)}</p>}
                    {parseAttachments(msg.attachments).map((att, i) => (
                      att.isVoice ? (
                        <div key={i} className="mt-1.5">
                          <VoicePlayer url={att.url} duration={att.duration} />
                        </div>
                      ) : att.isImage ? (
                        <div key={i} className="mt-2 max-w-xs">
                          <Image
                            src={att.url} alt={att.name} width={320} height={240}
                            className="rounded-lg cursor-zoom-in hover:opacity-90 transition-opacity"
                            unoptimized
                            onClick={() => setLightboxSrc(att.url)}
                          />
                        </div>
                      ) : (
                        <a key={i} href={att.url} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex items-center gap-1 text-sm text-violet-500 dark:text-cyan-400 hover:underline">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                          </svg>
                          {att.name} ({Math.round(att.size / 1024)}KB)
                        </a>
                      )
                    ))}
                  </>
                )}

                {/* Reactions display */}
                {msg.reactions && msg.reactions.length > 0 && !msg.deleted && (
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {Object.entries(msg.reactions.reduce<Record<string, { count: number; userReacted: boolean }>>((acc, r) => {
                      if (!acc[r.emoji]) acc[r.emoji] = { count: 0, userReacted: false };
                      acc[r.emoji].count++;
                      if (r.userId === currentUserId) acc[r.emoji].userReacted = true;
                      return acc;
                    }, {})).map(([emoji, data]) => (
                      <button
                        key={emoji}
                        onClick={() => toggleReaction(msg.id, emoji)}
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border transition-colors ${
                          data.userReacted
                            ? "bg-violet-50 dark:bg-cyan-400/10 border-violet-200 dark:border-cyan-400/30 text-accent"
                            : "bg-[var(--cn-accent-dim)] border-[var(--cn-border)] text-neutral-500 hover:bg-[var(--cn-hover)]"
                        }`}
                      >
                        <span>{emoji}</span>
                        <span>{data.count}</span>
                      </button>
                    ))}
                  </div>
                )}

                {/* Actions */}
                {!msg.deleted && !editingId && (
                  <div className="opacity-0 group-hover:opacity-100 flex gap-2 mt-0.5 transition-opacity">
                    {/* Reply */}
                    <button onClick={() => setReplyTo({ id: msg.id, name: msg.user.name, content: msg.content.slice(0, 50) })} className="text-[11px] text-neutral-400 hover:text-violet-500 dark:hover:text-cyan-400">
                      Ответить
                    </button>
                    {/* React */}
                    <div className="relative">
                      <button onClick={() => setShowEmojiPicker(showEmojiPicker === msg.id ? null : msg.id)} className="text-[11px] text-neutral-400 hover:text-violet-500 dark:hover:text-cyan-400">
                        Реакция
                      </button>
                      {showEmojiPicker === msg.id && (
                        <div className="absolute bottom-full left-0 mb-1 bg-[var(--cn-sidebar)] border border-[var(--cn-border)] rounded-lg p-1.5 flex gap-0.5 shadow-lg z-10">
                          {["👍", "❤️", "😂", "😮", "😢", "🔥", "👏", "🎉"].map((e) => (
                            <button key={e} onClick={() => toggleReaction(msg.id, e)} className="w-7 h-7 text-lg hover:bg-[var(--cn-hover)] rounded">{e}</button>
                          ))}
                        </div>
                      )}
                    </div>
                    {/* Pin (admin/mod) */}
                    {canPin && (
                      <button onClick={() => pinMessage(msg.id)} className="text-[11px] text-neutral-400 hover:text-amber-500">
                        {msg.pinned ? "Открепить" : "Закрепить"}
                      </button>
                    )}
                    {/* Edit */}
                    {msg.user.id === currentUserId && (
                      <button onClick={() => startEdit(msg)} className="text-[11px] text-neutral-400 hover:text-violet-500 dark:hover:text-cyan-400" aria-label="Edit message">
                        Ред.
                      </button>
                    )}
                    {/* Delete */}
                    {(msg.user.id === currentUserId || currentUserRole === "ADMIN") && (
                      <button onClick={() => deleteMessage(msg.id)} className="text-[11px] text-neutral-400 hover:text-red-500" aria-label="Delete message">
                        Удалить
                      </button>
                    )}
                    {/* Thread */}
                    <button onClick={() => openThread(msg)} className="text-[11px] text-neutral-400 hover:text-violet-500 dark:hover:text-cyan-400">
                      Тред
                    </button>
                    {/* Forward */}
                    <button onClick={() => openForwardModal(msg)} className="text-[11px] text-neutral-400 hover:text-violet-500 dark:hover:text-cyan-400">
                      Переслать
                    </button>
                  </div>
                )}

                {/* Thread indicator */}
                {(msg._count?.threadReplies || msg.threadCount || 0) > 0 && (
                  <button onClick={() => openThread(msg)} className="text-[11px] text-violet-500 dark:text-cyan-400 mt-0.5 hover:underline">
                    💬 {msg._count?.threadReplies || msg.threadCount} ответов
                  </button>
                )}

              </div>
            </motion.div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Scroll to bottom button */}
      <AnimatePresence>
        {showScrollBtn && (
          <motion.button
            key="scroll-btn"
            initial={{ opacity: 0, scale: 0.8, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 8 }}
            onClick={() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })}
            className="absolute bottom-24 right-6 z-10 w-9 h-9 rounded-full bg-violet-500 dark:bg-cyan-500 text-white shadow-lg flex items-center justify-center hover:scale-110 transition-transform"
            aria-label="Прокрутить вниз"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
            </svg>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Typing indicator */}
      <TypingIndicator names={Array.from(typingUsers.values()).filter(Boolean)} />

      {/* Reply indicator */}
      {replyTo && (
        <div className="px-4 py-2 border-t border-[var(--cn-border)] flex items-center gap-2 text-xs text-neutral-500 dark:text-gray-400 bg-[var(--cn-accent-dim)]">
          <div className="w-0.5 h-4 bg-violet-400 dark:bg-cyan-400 rounded-full" />
          <span>Ответ для <strong className="text-neutral-700 dark:text-gray-300">{replyTo.name}</strong>: {replyTo.content}</span>
          <button onClick={() => setReplyTo(null)} className="ml-auto text-neutral-400 hover:text-neutral-600 dark:hover:text-white">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
      )}

      {/* Channel Tools Panel (polls & tasks) */}
      <ChannelToolsPanel key={`tools-${channelId}-${toolsRefresh}`} channelId={channelId} currentUserId={currentUserId} members={channelMembers} />

      {/* Input */}
      {isNewsChannel && !canWriteNews ? (
        <div className="p-3 border-t border-[var(--cn-border)] text-center text-neutral-400 text-sm">
          Канал новостей — только администраторы и модераторы могут писать
        </div>
      ) : !isBanned ? (
        <div className="border-t border-[var(--cn-border)]">
          {/* Extra tools panel */}
          {showFormatBar && (
            <div className="px-3 pt-2 pb-1">
              <div className="flex flex-wrap items-center gap-1 p-2 rounded-lg bg-neutral-50 dark:bg-white/5 border border-neutral-200 dark:border-white/10">
                <span className="text-[10px] text-neutral-400 mr-1">Формат:</span>
                <button type="button" onClick={() => insertFormat("**", "**")} className="px-2 py-1 text-xs font-bold text-neutral-600 dark:text-neutral-300 hover:text-violet-600 dark:hover:text-cyan-400 hover:bg-violet-50 dark:hover:bg-white/10 rounded transition-colors" title="Жирный">B</button>
                <button type="button" onClick={() => insertFormat("*", "*")} className="px-2 py-1 text-xs italic text-neutral-600 dark:text-neutral-300 hover:text-violet-600 dark:hover:text-cyan-400 hover:bg-violet-50 dark:hover:bg-white/10 rounded transition-colors" title="Курсив">I</button>
                <button type="button" onClick={() => insertFormat("`", "`")} className="px-2 py-1 text-xs font-mono text-neutral-600 dark:text-neutral-300 hover:text-violet-600 dark:hover:text-cyan-400 hover:bg-violet-50 dark:hover:bg-white/10 rounded transition-colors" title="Код">&lt;/&gt;</button>
                <button type="button" onClick={() => insertFormat("- ", "")} className="px-2 py-1 text-xs text-neutral-600 dark:text-neutral-300 hover:text-violet-600 dark:hover:text-cyan-400 hover:bg-violet-50 dark:hover:bg-white/10 rounded transition-colors" title="Список">•</button>
                <button type="button" onClick={() => insertFormat("#", "")} className="px-2 py-1 text-xs text-neutral-600 dark:text-neutral-300 hover:text-violet-600 dark:hover:text-cyan-400 hover:bg-violet-50 dark:hover:bg-white/10 rounded transition-colors" title="Упоминание канала">#</button>
                <div className="w-px h-4 bg-neutral-200 dark:bg-white/10 mx-1" />
                <button type="button" onClick={() => { setShowSchedule(!showSchedule); if (!showSchedule) loadScheduled(); }} className="px-2 py-1 text-xs text-neutral-600 dark:text-neutral-300 hover:text-violet-600 dark:hover:text-cyan-400 hover:bg-violet-50 dark:hover:bg-white/10 rounded transition-colors" title="Запланировать">⏰ Расписание</button>
                <div className="flex-1" />
                <button type="button" onClick={() => setShowFormatBar(false)} className="px-1.5 py-1 text-xs text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 rounded transition-colors" title="Закрыть">✕</button>
              </div>
            </div>
          )}

          {/* Slowmode indicator */}
          {slowmodeWait > 0 && (
            <div className="px-3 py-1 text-xs text-amber-500">
              Слоумод: подождите {slowmodeWait} сек.
            </div>
          )}

          {/* Schedule panel */}
          {showSchedule && (
            <div className="px-3 py-2 border-b border-[var(--cn-border)] bg-[var(--cn-accent-dim)]">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-medium text-neutral-600 dark:text-gray-300">Запланировать отправку:</span>
                <input type="date" value={scheduleDate} onChange={e => setScheduleDate(e.target.value)} className="input-field !py-1 !px-2 text-xs" />
                <input type="time" value={scheduleTime} onChange={e => setScheduleTime(e.target.value)} className="input-field !py-1 !px-2 text-xs" />
                <button type="button" onClick={scheduleMessage} disabled={!newMessage.trim() || !scheduleDate || !scheduleTime} className="btn-primary !py-1 !px-3 text-xs disabled:opacity-50">Запланировать</button>
              </div>
              {scheduledList.length > 0 && (
                <div className="space-y-1">
                  <span className="text-[10px] text-neutral-400">Запланированные:</span>
                  {scheduledList.map(s => (
                    <div key={s.id} className="flex items-center gap-2 text-xs text-neutral-500">
                      <span>{new Date(s.scheduledAt).toLocaleString("ru")}</span>
                      <span className="truncate flex-1">{s.content.slice(0, 50)}</span>
                      <button onClick={() => deleteScheduled(s.id)} className="text-red-400 hover:text-red-600">✕</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="p-3">
            {recordingVoice ? (
              <VoiceRecorder onRecorded={handleVoiceRecorded} />
            ) : (
              <form onSubmit={sendMessage} className="flex gap-2 items-end">
                <PlusMenu
                  channelId={channelId}
                  channelMembers={channelMembers}
                  currentUserId={currentUserId}
                  onCreated={() => setToolsRefresh((n) => n + 1)}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="p-2.5 text-neutral-400 hover:text-violet-500 dark:hover:text-cyan-400 transition-colors disabled:opacity-50"
                  aria-label="Attach file"
                >
                  {uploading ? (
                    <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                    </svg>
                  )}
                </button>
                <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileUpload} accept="image/*,.pdf,.doc,.docx,.txt" />
                <textarea
                  ref={textareaRef}
                  value={newMessage}
                  onChange={(e) => { setNewMessage(e.target.value); emitTyping(); e.target.style.height = "auto"; e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px"; }}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(e); } }}
                  placeholder={slowmodeWait > 0 ? `Слоумод: ${slowmodeWait} сек...` : `Написать в #${channelName}...`}
                  className="input-field flex-1 !py-2.5 resize-none overflow-y-auto"
                  rows={1}
                  style={{ maxHeight: 120 }}
                  disabled={slowmodeWait > 0}
                  aria-label={`Message ${channelName}`}
                />
                <button
                  type="button"
                  onClick={() => setShowFormatBar(!showFormatBar)}
                  className={`p-2.5 transition-colors ${showFormatBar ? "text-violet-500 dark:text-cyan-400" : "text-neutral-400 hover:text-violet-500 dark:hover:text-cyan-400"}`}
                  aria-label="Extra tools"
                  title="Доп. инструменты"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>
                </button>
                {newMessage.trim() ? (
                  <button type="submit" disabled={slowmodeWait > 0 || sending} className="btn-primary !px-4 !py-2.5 disabled:opacity-50" aria-label="Send message">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                  </button>
                ) : (
                  <VoiceRecorder onRecorded={handleVoiceRecorded} disabled={uploading} />
                )}
              </form>
            )}
          </div>
        </div>
      ) : (
        <div className="p-3 border-t border-[var(--cn-border)] text-center text-red-400/60 text-sm">
          Отправка сообщений ограничена
        </div>
      )}

      {/* Thread Panel */}
      <AnimatePresence>
        {activeThread && (
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="absolute right-0 top-0 bottom-0 w-80 bg-[var(--cn-sidebar)] border-l border-[var(--cn-border)] flex flex-col z-30 shadow-xl"
          >
            <div className="p-3 border-b border-[var(--cn-border)] flex items-center gap-2">
              <span className="font-medium text-sm text-neutral-800 dark:text-white flex-1 truncate">Тред: {activeThread.user}</span>
              <button onClick={() => setActiveThread(null)} className="text-neutral-400 hover:text-neutral-600 dark:hover:text-white">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-3 border-b border-[var(--cn-border)] bg-[var(--cn-accent-dim)]">
              <p className="text-xs text-neutral-600 dark:text-gray-400">{activeThread.content}</p>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {threadMessages.map(tm => (
                <div key={tm.id} className="flex gap-2">
                  <GlowAvatar user={tm.user} size={24} />
                  <div>
                    <span className="text-xs font-medium text-neutral-800 dark:text-white">{tm.user.name}</span>
                    <p className="text-xs text-neutral-600 dark:text-gray-300 mt-0.5">{renderContent(tm.content)}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="p-3 border-t border-[var(--cn-border)]">
              <div className="flex gap-2">
                <input
                  value={threadInput}
                  onChange={e => setThreadInput(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); sendThreadReply(); } }}
                  placeholder="Ответить в треде..."
                  className="input-field flex-1 !py-2 text-sm"
                />
                <button onClick={sendThreadReply} disabled={!threadInput.trim()} className="btn-primary !px-3 !py-2 text-sm disabled:opacity-50">→</button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Image Lightbox */}
      <ImageLightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />

      {/* Forward modal */}
      <AnimatePresence>
        {forwardMsg && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
            onClick={() => { setForwardMsg(null); setForwardSearch(""); }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="w-80 max-h-[70vh] rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-white/10 shadow-2xl overflow-hidden flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-4 pt-4 pb-2">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-neutral-900 dark:text-white">Переслать сообщение</span>
                  <button onClick={() => { setForwardMsg(null); setForwardSearch(""); }} className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
                <div className="text-[11px] text-neutral-400 mb-2 truncate">от {forwardMsg.userName}: {forwardMsg.content.slice(0, 60)}{forwardMsg.content.length > 60 ? "..." : ""}</div>
                <input
                  type="text"
                  value={forwardSearch}
                  onChange={(e) => setForwardSearch(e.target.value)}
                  placeholder="Поиск канала или диалога..."
                  className="input-field !py-2 !text-sm w-full"
                  autoFocus
                />
              </div>
              <div className="flex-1 overflow-y-auto px-2 pb-3 space-y-0.5">
                {forwardTargets
                  .filter(t => t.name.toLowerCase().includes(forwardSearch.toLowerCase()))
                  .map(t => (
                    <button
                      key={`${t.type}-${t.id}`}
                      onClick={() => doForward(t)}
                      disabled={forwardSending}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left hover:bg-violet-50 dark:hover:bg-white/5 transition-colors disabled:opacity-50"
                    >
                      <span className="text-base flex-shrink-0">{t.type === "channel" ? "#" : "💬"}</span>
                      <span className="text-sm text-neutral-900 dark:text-white truncate">{t.name}</span>
                      <span className="text-[10px] text-neutral-400 ml-auto flex-shrink-0">{t.type === "channel" ? "канал" : "ЛС"}</span>
                    </button>
                  ))}
                {forwardTargets.filter(t => t.name.toLowerCase().includes(forwardSearch.toLowerCase())).length === 0 && (
                  <div className="text-center text-xs text-neutral-400 py-4">Ничего не найдено</div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Forward toast */}
      {forwardToast && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-green-500 text-white text-sm rounded-xl shadow-lg animate-fade-in">
          Сообщение переслано
        </div>
      )}

      {/* Error toast */}
      {errorToast && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-red-500 text-white text-sm rounded-xl shadow-lg animate-fade-in">
          {errorToast}
        </div>
      )}

      {/* Confirm modal */}
      {confirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setConfirmModal(null)}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div className="relative z-10 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-white/10 rounded-2xl shadow-2xl p-5 max-w-sm w-full" onClick={e => e.stopPropagation()}>
            <p className="text-sm text-neutral-900 dark:text-white mb-4">{confirmModal.message}</p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setConfirmModal(null)} className="px-4 py-2 text-sm text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 rounded-xl hover:bg-neutral-100 dark:hover:bg-white/5">Отмена</button>
              <button onClick={confirmModal.onConfirm} className="px-4 py-2 text-sm bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors">Удалить</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
