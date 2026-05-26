"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import GlowAvatar from "@/components/ui/GlowAvatar";
import { isOnline, timeAgo } from "@/lib/timeAgo";
import TypingIndicator from "@/components/ui/TypingIndicator";
import VoiceRecorder from "@/components/ui/VoiceRecorder";
import VoicePlayer from "@/components/ui/VoicePlayer";

interface Attachment {
  url: string;
  name: string;
  size: number;
  type: string;
  isImage: boolean;
  isVoice?: boolean;
  duration?: number;
}

interface DMUser {
  id: string;
  name: string;
  username: string;
  avatar: string | null;
  role: string;
  lastSeen: string | null;
  customStatus: string | null;
  statusEmoji: string | null;
  avatarGlowEnabled: boolean;
  avatarGlowColors: string | null;
}

interface Conversation {
  id: string;
  other: DMUser;
  lastMessage: { id: string; content: string; createdAt: string; userId: string } | null;
  lastMessageAt: string | null;
}

interface Message {
  id: string;
  content: string;
  userId: string;
  edited: boolean;
  deleted: boolean;
  attachments: string | null;
  createdAt: string;
  user: { id: string; name: string; username: string; avatar: string | null; role: string; avatarGlowEnabled: boolean; avatarGlowColors: string | null };
}

interface DMPanelProps {
  currentUserId: string;
  onClose?: () => void;
  initialFriendId?: string | null;
}

export default function DMPanel({ currentUserId, onClose, initialFriendId }: DMPanelProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConv, setSelectedConv] = useState<string | null>(null);
  const [initialHandled, setInitialHandled] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [sending, setSending] = useState(false);
  const [voiceUploading, setVoiceUploading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    fetch("/api/dm")
      .then((r) => { if (!r.ok) throw new Error(r.statusText); return r.json(); })
      .then(async (convs: Conversation[]) => {
        setConversations(convs);
        if (initialFriendId && !initialHandled) {
          setInitialHandled(true);
          const existing = convs.find((c: Conversation) => c.other.id === initialFriendId);
          if (existing) {
            setSelectedConv(existing.id);
          } else {
            try {
              const res = await fetch("/api/dm", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId: initialFriendId }),
              });
              if (res.ok) {
                const data = await res.json();
                setSelectedConv(data.id);
                const refreshRes = await fetch("/api/dm");
                if (refreshRes.ok) setConversations(await refreshRes.json());
              }
            } catch { /* ignore */ }
          }
        }
      })
      .catch(() => setConversations([]))
      .finally(() => setLoading(false));
  }, [initialFriendId, initialHandled]);

  const loadMessages = useCallback(async (convId: string, cursor?: string) => {
    setMessagesLoading(true);
    try {
      const url = `/api/dm/${convId}${cursor ? `?cursor=${cursor}` : ""}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(res.statusText);
      const data = await res.json();
      if (cursor) {
        setMessages((prev) => [...data.messages, ...prev]);
      } else {
        setMessages(data.messages);
      }
      setNextCursor(data.nextCursor);
    } catch {
      setMessages([]);
      setNextCursor(null);
    } finally {
      setMessagesLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedConv) loadMessages(selectedConv);
  }, [selectedConv, loadMessages]);

  useEffect(() => {
    if (!messagesLoading && messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages.length, messagesLoading]);

  const [dmTypingName, setDmTypingName] = useState<string | null>(null);
  const dmTypingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Socket.IO for real-time DM messages
  useEffect(() => {
    const socket = io({ path: "/api/socketio", withCredentials: true });
    socketRef.current = socket;

    socket.on("connect", () => {
      socket.emit("join-dm", { userId: currentUserId });
    });

    socket.on("dm-typing", ({ userName }: { userId: string; userName: string }) => {
      setDmTypingName(userName);
      if (dmTypingTimeoutRef.current) clearTimeout(dmTypingTimeoutRef.current);
      dmTypingTimeoutRef.current = setTimeout(() => setDmTypingName(null), 3000);
    });

    socket.on("dm-stop-typing", () => {
      setDmTypingName(null);
      if (dmTypingTimeoutRef.current) clearTimeout(dmTypingTimeoutRef.current);
    });

    socket.on("dm-message", (msg: Message & { conversationId: string }) => {
      if (msg.conversationId === selectedConv) {
        setMessages((prev) => {
          if (prev.find((m) => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
      }
      setConversations((prev) =>
        prev.map((c) => c.id === msg.conversationId
          ? { ...c, lastMessage: { id: msg.id, content: msg.content, createdAt: msg.createdAt, userId: msg.userId }, lastMessageAt: msg.createdAt }
          : c
        ).sort((a, b) => new Date(b.lastMessageAt || 0).getTime() - new Date(a.lastMessageAt || 0).getTime())
      );
    });

    socket.on("dm-edited", (msg: Message & { conversationId: string }) => {
      if (msg.conversationId === selectedConv) {
        setMessages((prev) => prev.map((m) => m.id === msg.id ? msg : m));
      }
    });

    socket.on("dm-deleted", ({ messageId, conversationId }: { messageId: string; conversationId: string }) => {
      if (conversationId === selectedConv) {
        setMessages((prev) => prev.map((m) => m.id === messageId ? { ...m, deleted: true, content: "" } : m));
      }
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [currentUserId, selectedConv]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !selectedConv || sending) return;
    setSending(true);
    const content = input.trim();
    setInput("");
    try {
      const res = await fetch(`/api/dm/${selectedConv}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      if (res.ok) {
        const msg = await res.json();
        setMessages((prev) => {
          if (prev.find((m) => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
        setConversations((prev) =>
          prev.map((c) => c.id === selectedConv ? { ...c, lastMessage: msg, lastMessageAt: msg.createdAt } : c)
            .sort((a, b) => new Date(b.lastMessageAt || 0).getTime() - new Date(a.lastMessageAt || 0).getTime())
        );
      } else {
        setInput(content);
      }
    } catch {
      setInput(content);
    } finally {
      setSending(false);
    }
  };

  const handleVoiceRecorded = async (blob: Blob, duration: number) => {
    if (!selectedConv) return;
    setVoiceUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", blob, "voice.webm");
      fd.append("duration", String(duration));
      const uploadRes = await fetch("/api/messages/upload", { method: "POST", body: fd });
      if (!uploadRes.ok) return;
      const attachment = await uploadRes.json();
      const res = await fetch(`/api/dm/${selectedConv}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: "", attachments: [attachment] }),
      });
      if (res.ok) {
        const msg = await res.json();
        setMessages((prev) => {
          if (prev.find((m) => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
      }
    } finally {
      setVoiceUploading(false);
    }
  };

  const parseAttachments = (raw: string | null | undefined): Attachment[] => {
    if (!raw) return [];
    try { return JSON.parse(raw); } catch { return []; }
  };

  const editMessage = async (messageId: string) => {
    if (!editContent.trim() || !selectedConv) return;
    const res = await fetch(`/api/dm/${selectedConv}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messageId, content: editContent }),
    });
    if (res.ok) {
      const msg = await res.json();
      setMessages((prev) => prev.map((m) => m.id === msg.id ? msg : m));
    }
    setEditingId(null);
    setEditContent("");
  };

  const deleteMessage = async (messageId: string) => {
    if (!selectedConv) return;
    await fetch(`/api/dm/${selectedConv}?messageId=${messageId}`, { method: "DELETE" });
    setMessages((prev) => prev.map((m) => m.id === messageId ? { ...m, deleted: true, content: "" } : m));
  };

  const selectedOther = conversations.find((c) => c.id === selectedConv)?.other;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin w-6 h-6 border-2 border-violet-500 dark:border-cyan-400 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="flex flex-1 h-full">
      {/* Conversations list */}
      <aside className={`w-72 max-md:w-full border-r border-neutral-200 dark:border-white/5 flex flex-col ${selectedConv ? "max-md:hidden" : ""}`}>
        <div className="p-3 border-b border-neutral-200 dark:border-white/5 flex items-center justify-between">
          <h2 className="font-bold text-neutral-900 dark:text-white text-sm">Личные сообщения</h2>
          {onClose && (
            <button onClick={onClose} className="p-1 text-neutral-400 hover:text-neutral-600 dark:hover:text-white">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
        <div className="flex-1 overflow-y-auto">
          {conversations.length === 0 ? (
            <p className="text-sm text-neutral-400 text-center py-8">Нет диалогов</p>
          ) : (
            conversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => setSelectedConv(conv.id)}
                className={`w-full text-left p-3 flex items-center gap-3 hover:bg-neutral-100 dark:hover:bg-white/5 transition-colors ${selectedConv === conv.id ? "bg-violet-50 dark:bg-cyan-400/10" : ""}`}
              >
                <GlowAvatar user={conv.other} size={36} onlineColor={isOnline(conv.other.lastSeen) ? "green" : undefined} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-neutral-900 dark:text-white truncate">{conv.other.name}</p>
                  {conv.lastMessage ? (
                    <p className="text-xs text-neutral-400 truncate">
                      {conv.lastMessage.userId === currentUserId ? "Вы: " : ""}
                      {conv.lastMessage.content}
                    </p>
                  ) : (
                    <p className="text-xs text-neutral-400">Нет сообщений</p>
                  )}
                </div>
                {conv.lastMessageAt && (
                  <span className="text-[10px] text-neutral-400 flex-shrink-0">
                    {timeAgo(conv.lastMessageAt)}
                  </span>
                )}
              </button>
            ))
          )}
        </div>
      </aside>

      {/* Messages area */}
      <main className={`flex-1 flex flex-col ${!selectedConv ? "max-md:hidden" : ""}`}>
        {selectedConv && selectedOther ? (
          <>
            <div className="p-3 border-b border-neutral-200 dark:border-white/5 flex items-center gap-3">
              <button onClick={() => setSelectedConv(null)} className="md:hidden p-1 text-neutral-400 hover:text-neutral-600 dark:hover:text-white">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <GlowAvatar user={selectedOther} size={32} onlineColor={isOnline(selectedOther.lastSeen) ? "green" : undefined} />
              <div className="min-w-0">
                <p className="text-sm font-medium text-neutral-900 dark:text-white truncate">{selectedOther.name}</p>
                <p className="text-xs text-neutral-400">
                  {isOnline(selectedOther.lastSeen) ? "Онлайн" : `Был(а) ${timeAgo(selectedOther.lastSeen)}`}
                </p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {nextCursor && (
                <button onClick={() => loadMessages(selectedConv, nextCursor)} disabled={messagesLoading} className="mx-auto block text-xs text-violet-500 dark:text-cyan-400 hover:underline disabled:opacity-50">
                  {messagesLoading ? "Загрузка..." : "Загрузить ранние"}
                </button>
              )}
              {messages.map((msg) => (
                <div key={msg.id} className={`flex items-end gap-2 ${msg.userId === currentUserId ? "flex-row-reverse" : ""}`}>
                  <div className={`max-w-[70%] rounded-2xl px-3.5 py-2 ${
                    msg.userId === currentUserId
                      ? "bg-violet-500 dark:bg-cyan-600 text-white"
                      : "bg-neutral-100 dark:bg-white/10 text-neutral-900 dark:text-white"
                  }`}>
                    {msg.deleted ? (
                      <p className="text-xs italic opacity-60">Сообщение удалено</p>
                    ) : editingId === msg.id ? (
                      <div className="flex gap-1">
                        <input value={editContent} onChange={(e) => setEditContent(e.target.value)} onKeyDown={(e) => e.key === "Enter" && editMessage(msg.id)} className="flex-1 bg-transparent border-b border-white/30 text-sm outline-none" autoFocus />
                        <button onClick={() => editMessage(msg.id)} className="text-xs opacity-70 hover:opacity-100">✓</button>
                        <button onClick={() => setEditingId(null)} className="text-xs opacity-70 hover:opacity-100">✕</button>
                      </div>
                    ) : (
                      <>
                        {msg.content && <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>}
                        {parseAttachments(msg.attachments).map((att, i) => (
                          att.isVoice ? (
                            <div key={i} className="mt-1">
                              <VoicePlayer url={att.url} duration={att.duration} isOwn={msg.userId === currentUserId} />
                            </div>
                          ) : att.isImage ? (
                            <div key={i} className="mt-1">
                              <img src={att.url} alt={att.name} className="max-w-[200px] rounded-lg" />
                            </div>
                          ) : (
                            <a key={i} href={att.url} target="_blank" rel="noopener noreferrer" className="mt-1 block text-xs underline opacity-80">
                              {att.name}
                            </a>
                          )
                        ))}
                        <div className="flex items-center gap-1 mt-0.5">
                          <span className={`text-[10px] ${msg.userId === currentUserId ? "text-white/60" : "text-neutral-400"}`}>
                            {new Date(msg.createdAt).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
                          </span>
                          {msg.edited && <span className={`text-[9px] ${msg.userId === currentUserId ? "text-white/40" : "text-neutral-400"}`}>(ред.)</span>}
                        </div>
                      </>
                    )}
                  </div>
                  {msg.userId === currentUserId && !msg.deleted && !editingId && (
                    <div className="flex gap-0.5 opacity-0 hover:opacity-100 transition-opacity">
                      <button onClick={() => { setEditingId(msg.id); setEditContent(msg.content); }} className="p-1 text-neutral-400 hover:text-violet-500 dark:hover:text-cyan-400">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                      </button>
                      <button onClick={() => deleteMessage(msg.id)} className="p-1 text-neutral-400 hover:text-red-500">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </div>
                  )}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            <TypingIndicator names={dmTypingName ? [dmTypingName] : []} />
            <div className="p-3 border-t border-neutral-200 dark:border-white/5">
              <form onSubmit={sendMessage} className="flex items-center gap-2">
                <input
                  value={input}
                  onChange={(e) => {
                    setInput(e.target.value);
                    socketRef.current?.emit("dm-typing", { convId: selectedConv });
                  }}
                  placeholder="Написать сообщение..."
                  className="flex-1 px-3 py-2 bg-neutral-100 dark:bg-white/5 border border-neutral-200 dark:border-white/10 rounded-xl text-sm text-neutral-900 dark:text-white placeholder:text-neutral-400 outline-none focus:border-violet-500 dark:focus:border-cyan-400 transition-colors"
                  maxLength={4000}
                />
                {input.trim() ? (
                  <button type="submit" className="p-2 bg-violet-500 dark:bg-cyan-600 text-white rounded-xl hover:opacity-90 transition-opacity">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                  </button>
                ) : (
                  <VoiceRecorder onRecorded={handleVoiceRecorded} disabled={voiceUploading} />
                )}
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-neutral-400 text-sm">
            <div className="text-center">
              <span className="text-4xl block mb-3">💬</span>
              <p>Выберите диалог</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
