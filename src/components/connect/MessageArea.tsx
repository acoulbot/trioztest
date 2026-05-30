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
  user: MessageUser;
}

interface MessageAreaProps {
  channelId: string;
  channelName: string;
  channelIcon: string | null;
  currentUserId: string;
  currentUserName?: string;
  currentUserRole: string;
  isBanned: boolean;
  onBack?: () => void;
}

export default function MessageArea({
  channelId, channelName, channelIcon, currentUserId, currentUserName = "", currentUserRole, isBanned, onBack,
}: MessageAreaProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [replyTo, setReplyTo] = useState<{ id: string; name: string; content: string } | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState<string | null>(null);
  const [typingUsers, setTypingUsers] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [sending, setSending] = useState(false);
  const [recordingVoice, setRecordingVoice] = useState(false);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);

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

  // Socket.IO connection
  useEffect(() => {
    const socket = io({ path: "/api/socketio", withCredentials: true });
    socketRef.current = socket;

    socket.on("connect", () => {
      socket.emit("join-channel", { channelId });
    });

    socket.on("new-message", (msg: Message) => {
      setMessages((prev) => [...prev, msg]);
      // Play notification only for messages from others
      if (msg.user.id !== currentUserId) {
        const isMention = currentUserName && (
          msg.content.toLowerCase().includes(`@${currentUserName.toLowerCase()}`) ||
          msg.content.includes("@everyone")
        );
        if (isMention) playMentionNotification();
        else playMsgNotification();
      }
    });

    socket.on("message-edited", (msg: Message) => {
      setMessages((prev) => prev.map((m) => (m.id === msg.id ? msg : m)));
    });

    socket.on("message-deleted", ({ id }: { id: string }) => {
      setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, deleted: true, content: "" } : m)));
    });

    socket.on("user-typing", ({ userId, userName }: { userId: string; userName: string }) => {
      setTypingUsers((prev) => new Map(prev).set(userId, userName));
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
    if (el.scrollTop === 0 && hasMore && nextCursor) {
      fetchMessages(nextCursor);
    }
  };

  const emitTyping = () => {
    socketRef.current?.emit("typing", { channelId });
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socketRef.current?.emit("stop-typing", { channelId });
    }, 2000);
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || sending) return;

    setSending(true);
    socketRef.current?.emit("stop-typing", { channelId });

    const content = newMessage;
    const body: Record<string, unknown> = { content, channelId };
    if (replyTo) body.replyToId = replyTo.id;

    setNewMessage("");
    setReplyTo(null);

    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        setNewMessage(content);
        alert(data.error || "Ошибка отправки");
      }
    } catch {
      setNewMessage(content);
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
    await fetch("/api/messages/pin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messageId, channelId }),
    });
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
        alert(data.error || "Upload failed");
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
    if (!confirm("Удалить сообщение?")) return;
    await fetch(`/api/messages?messageId=${messageId}`, { method: "DELETE" });
  };

  const parseAttachments = (raw: string | null | undefined): Attachment[] => {
    if (!raw) return [];
    try { return JSON.parse(raw); } catch { return []; }
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
        <span aria-hidden="true">{channelIcon || "\uD83D\uDCAC"}</span>
        <span className="font-medium text-neutral-900 dark:text-white text-sm">{channelName}</span>
      </header>

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
          messages.map((msg) => (
            <motion.div key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 380, damping: 28 }}
              className={`flex gap-3 group ${msg.pinned ? "bg-amber-50/50 dark:bg-amber-400/5 -mx-2 px-2 py-1 rounded-lg" : ""}`}>
              <GlowAvatar user={msg.user} size={36} />
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

                <div className="flex items-baseline gap-2 flex-wrap">
                  <span className="font-medium text-neutral-900 dark:text-white text-sm">{msg.user.name}</span>
                  {msg.user.username && <span className="text-[11px] text-neutral-400">@{msg.user.username}</span>}
                  <span className="text-xs text-neutral-400 dark:text-gray-600">
                    {new Date(msg.createdAt).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                  {msg.edited && <span className="text-[10px] text-neutral-400">(ред.)</span>}
                </div>

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
                    {msg.content && <p className="text-neutral-700 dark:text-gray-300 text-sm mt-0.5 break-words">{msg.content}</p>}
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
                            ? "bg-violet-50 dark:bg-cyan-400/10 border-violet-200 dark:border-cyan-400/30 text-violet-600 dark:text-cyan-400"
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
                    {/* Pin (admin only) */}
                    {currentUserRole === "ADMIN" && (
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
                  </div>
                )}
              </div>
            </motion.div>
          ))
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

      {/* Input */}
      {!isBanned ? (
        <div className="p-3 border-t border-[var(--cn-border)]">
          {recordingVoice ? (
            <VoiceRecorder onRecorded={handleVoiceRecorded} />
          ) : (
            <form onSubmit={sendMessage} className="flex gap-2">
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
              <input
                type="text"
                value={newMessage}
                onChange={(e) => { setNewMessage(e.target.value); emitTyping(); }}
                placeholder={`Написать в #${channelName}...`}
                className="input-field flex-1 !py-2.5"
                aria-label={`Message ${channelName}`}
              />
              {newMessage.trim() ? (
                <button type="submit" className="btn-primary !px-4 !py-2.5" aria-label="Send message">
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
      ) : (
        <div className="p-3 border-t border-[var(--cn-border)] text-center text-red-400/60 text-sm">
          Отправка сообщений ограничена
        </div>
      )}

      {/* Image Lightbox */}
      <ImageLightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />
    </div>
  );
}
