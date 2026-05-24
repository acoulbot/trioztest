"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { io, Socket } from "socket.io-client";
import Image from "next/image";
import GlowAvatar from "@/components/ui/GlowAvatar";

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
}

interface Message {
  id: string;
  content: string;
  createdAt: string;
  edited?: boolean;
  editedAt?: string | null;
  deleted?: boolean;
  attachments?: string | null;
  user: MessageUser;
}

interface MessageAreaProps {
  channelId: string;
  channelName: string;
  channelIcon: string | null;
  currentUserId: string;
  currentUserRole: string;
  isBanned: boolean;
  onBack?: () => void;
}

export default function MessageArea({
  channelId, channelName, channelIcon, currentUserId, currentUserRole, isBanned, onBack,
}: MessageAreaProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [typingUsers, setTypingUsers] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

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
    isAtBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 100;
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
    if (!newMessage.trim()) return;

    socketRef.current?.emit("stop-typing", { channelId });

    const res = await fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: newMessage, channelId }),
    });

    if (!res.ok) {
      const data = await res.json();
      alert(data.error || "Ошибка отправки");
      return;
    }
    setNewMessage("");
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

  const typingText = (() => {
    const names = Array.from(typingUsers.values()).filter((n) => n);
    if (names.length === 0) return null;
    if (names.length === 1) return `${names[0]} печатает...`;
    if (names.length <= 3) return `${names.join(", ")} печатают...`;
    return "Несколько человек печатают...";
  })();

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-violet-500 dark:border-cyan-400 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full min-w-0">
      {/* Header */}
      <header className="h-12 bg-white/50 dark:bg-neutral-900/50 border-b border-neutral-200 dark:border-white/5 flex items-center px-4 gap-2 backdrop-blur-sm flex-shrink-0">
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
            <motion.div key={msg.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="flex gap-3 group">
              <GlowAvatar user={msg.user} size={36} />
              <div className="flex-1 min-w-0">
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
                      className="w-full bg-neutral-50 dark:bg-neutral-700 border border-neutral-200 dark:border-white/10 rounded-lg px-3 py-1.5 text-sm text-neutral-900 dark:text-white"
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
                      att.isImage ? (
                        <div key={i} className="mt-2 max-w-xs">
                          <Image src={att.url} alt={att.name} width={320} height={240} className="rounded-lg" unoptimized />
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

                {/* Actions */}
                {!msg.deleted && !editingId && (
                  <div className="opacity-0 group-hover:opacity-100 flex gap-2 mt-0.5 transition-opacity">
                    {msg.user.id === currentUserId && (
                      <button onClick={() => startEdit(msg)} className="text-[11px] text-neutral-400 hover:text-violet-500 dark:hover:text-cyan-400" aria-label="Edit message">
                        Ред.
                      </button>
                    )}
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

      {/* Typing indicator */}
      {typingText && (
        <div className="px-4 py-1 text-xs text-neutral-400 dark:text-gray-500 animate-pulse">
          {typingText}
        </div>
      )}

      {/* Input */}
      {!isBanned ? (
        <form onSubmit={sendMessage} className="p-3 border-t border-neutral-200 dark:border-white/5">
          <div className="flex gap-2">
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
            <button type="submit" className="btn-primary !px-4 !py-2.5" aria-label="Send message">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </div>
        </form>
      ) : (
        <div className="p-3 border-t border-neutral-200 dark:border-white/5 text-center text-red-400/60 text-sm">
          Отправка сообщений ограничена
        </div>
      )}
    </div>
  );
}
