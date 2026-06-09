"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Spinner from "@/components/ui/Spinner";
import { io, Socket } from "socket.io-client";
import GlowAvatar from "@/components/ui/GlowAvatar";
import { isOnline, timeAgo } from "@/lib/timeAgo";
import TypingIndicator from "@/components/ui/TypingIndicator";
import VoiceRecorder from "@/components/ui/VoiceRecorder";
import VoicePlayer from "@/components/ui/VoicePlayer";
import { playDMNotification } from "@/lib/dmSound";
import { getOrCreateKeyPair, encryptMessage, decryptMessage, isE2EEMessage, encryptFile } from "@/lib/e2ee";

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

interface DMReplyTo {
  id: string;
  content: string;
  user: { id: string; name: string };
}

interface Message {
  id: string;
  content: string;
  userId: string;
  edited: boolean;
  deleted: boolean;
  attachments: string | null;
  replyTo?: DMReplyTo | null;
  createdAt: string;
  user: { id: string; name: string; username: string; avatar: string | null; role: string; avatarGlowEnabled: boolean; avatarGlowColors: string | null };
}

interface DMPanelProps {
  currentUserId: string;
  onClose?: () => void;
  initialFriendId?: string | null;
}

export default function DMPanel({ currentUserId, onClose, initialFriendId }: DMPanelProps) {
  const currentUserIdRef = useRef(currentUserId);
  useEffect(() => { currentUserIdRef.current = currentUserId; }, [currentUserId]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConv, setSelectedConv] = useState<string | null>(null);
  const [initialHandled, setInitialHandled] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [replyTo, setReplyTo] = useState<{ id: string; name: string; content: string } | null>(null);
  const [sending, setSending] = useState(false);
  const [voiceUploading, setVoiceUploading] = useState(false);
  const [fileUploading, setFileUploading] = useState(false);
  const [dmErrorToast, setDmErrorToast] = useState<string | null>(null);
  const [e2eeReady, setE2eeReady] = useState(false);
  const [e2eeEnabled, setE2eeEnabled] = useState(true); // user toggle

  // Two separate message arrays — one per channel mode
  const [encryptedMessages, setEncryptedMessages] = useState<Message[]>([]);
  const [plainMessages, setPlainMessages] = useState<Message[]>([]);
  const [nextCursorEncrypted, setNextCursorEncrypted] = useState<string | null>(null);
  const [nextCursorPlain, setNextCursorPlain] = useState<string | null>(null);

  // Active channel depends on e2eeEnabled
  const messages = e2eeEnabled ? encryptedMessages : plainMessages;
  const setMessages = (fn: Message[] | ((prev: Message[]) => Message[])) => {
    if (e2eeEnabled) setEncryptedMessages(typeof fn === "function" ? fn : () => fn);
    else setPlainMessages(typeof fn === "function" ? fn : () => fn);
  };
  const nextCursor = e2eeEnabled ? nextCursorEncrypted : nextCursorPlain;
  const setNextCursor = e2eeEnabled ? setNextCursorEncrypted : setNextCursorPlain;
  const [peerReadAt, setPeerReadAt] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);
  const privateKeyRef = useRef<CryptoKey | null>(null);
  const peerPublicKeyRef = useRef<JsonWebKey | null>(null);
  const decryptedCache = useRef<Map<string, string>>(new Map());
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize E2EE keypair
  useEffect(() => {
    getOrCreateKeyPair().then(({ publicKeyJwk, privateKey }) => {
      privateKeyRef.current = privateKey;
      fetch("/api/e2ee", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ publicKey: publicKeyJwk }),
      }).catch(() => {});
    }).catch(() => {});
  }, []);

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

  // Fetch peer's public key when conversation changes
  useEffect(() => {
    if (!selectedConv) { peerPublicKeyRef.current = null; setE2eeReady(false); return; }
    const other = conversations.find(c => c.id === selectedConv)?.other;
    if (!other) return;
    decryptedCache.current.clear();
    fetch(`/api/e2ee?userId=${other.id}`)
      .then(r => r.json())
      .then(data => {
        peerPublicKeyRef.current = data.publicKey || null;
        setE2eeReady(!!data.publicKey && !!privateKeyRef.current);
      })
      .catch(() => { peerPublicKeyRef.current = null; setE2eeReady(false); });
  }, [selectedConv, conversations]);

  const decryptContent = useCallback(async (msgId: string, content: string): Promise<string> => {
    if (!isE2EEMessage(content)) return content;
    const cached = decryptedCache.current.get(msgId);
    if (cached) return cached;
    if (!privateKeyRef.current || !peerPublicKeyRef.current) return "\uD83D\uDD12 \u0417\u0430\u0448\u0438\u0444\u0440\u043e\u0432\u0430\u043d\u043d\u043e\u0435 \u0441\u043e\u043e\u0431\u0449\u0435\u043d\u0438\u0435";
    try {
      const decrypted = await decryptMessage(content, privateKeyRef.current, peerPublicKeyRef.current);
      decryptedCache.current.set(msgId, decrypted);
      return decrypted;
    } catch {
      return "\uD83D\uDD12 \u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0440\u0430\u0441\u0448\u0438\u0444\u0440\u043e\u0432\u0430\u0442\u044c";
    }
  }, []);

  const loadMessages = useCallback(async (convId: string, cursor?: string, encrypted?: boolean) => {
    setMessagesLoading(true);
    try {
      const encParam = encrypted !== undefined ? `&encrypted=${encrypted}` : "";
      const url = `/api/dm/${convId}?limit=50${cursor ? `&cursor=${cursor}` : ""}${encParam}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(res.statusText);
      const data = await res.json();

      const decryptedMsgs = await Promise.all(
        data.messages.map(async (msg: Message) => {
          if (isE2EEMessage(msg.content)) {
            const plaintext = await decryptContent(msg.id, msg.content);
            return { ...msg, content: plaintext, _encrypted: true };
          }
          return msg;
        })
      );

      if (encrypted) {
        if (cursor) setEncryptedMessages((prev) => [...decryptedMsgs, ...prev]);
        else setEncryptedMessages(decryptedMsgs);
        setNextCursorEncrypted(data.nextCursor);
      } else {
        if (cursor) setPlainMessages((prev) => [...decryptedMsgs, ...prev]);
        else setPlainMessages(decryptedMsgs);
        setNextCursorPlain(data.nextCursor);
      }
    } catch {
      if (encrypted) { setEncryptedMessages([]); setNextCursorEncrypted(null); }
      else { setPlainMessages([]); setNextCursorPlain(null); }
    } finally {
      setMessagesLoading(false);
    }
  }, [decryptContent]);

  useEffect(() => {
    if (selectedConv) {
      // Load both encrypted and plain channels simultaneously
      loadMessages(selectedConv, undefined, true);
      loadMessages(selectedConv, undefined, false);
      fetch("/api/dm/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId: selectedConv }),
      }).catch(() => {});
    }
  }, [selectedConv, loadMessages]);

  // Join/leave DM conversation room for typing indicators
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket || !selectedConv) return;
    socket.emit("join-dm-conv", { convId: selectedConv });
    return () => {
      socket.emit("leave-dm-conv", { convId: selectedConv });
    };
  }, [selectedConv]);

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
      // Re-join current conversation room after reconnect
      if (selectedConv) socket.emit("join-dm-conv", { convId: selectedConv });
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

    socket.on("dm-message", async (msg: Message & { conversationId: string }) => {
      let displayMsg = msg;
      if (isE2EEMessage(msg.content) && privateKeyRef.current && peerPublicKeyRef.current) {
        try {
          const plaintext = await decryptMessage(msg.content, privateKeyRef.current, peerPublicKeyRef.current);
          decryptedCache.current.set(msg.id, plaintext);
          displayMsg = { ...msg, content: plaintext };
        } catch { /* keep encrypted */ }
      }
      if (msg.conversationId === selectedConv) {
        // Route to correct channel based on whether message is encrypted
        const isEncMsg = isE2EEMessage(msg.content) || !!(msg as Message & { encrypted?: boolean }).encrypted;
        if (isEncMsg) {
          setEncryptedMessages((prev) => {
            if (prev.find((m) => m.id === msg.id)) return prev;
            return [...prev, displayMsg];
          });
        } else {
          setPlainMessages((prev) => {
            if (prev.find((m) => m.id === msg.id)) return prev;
            return [...prev, displayMsg];
          });
        }
      }
      // Play notification only for incoming messages (not own)
      if (msg.userId !== currentUserIdRef.current) {
        playDMNotification();
        if (document.hidden && typeof Notification !== "undefined" && Notification.permission === "granted") {
          new Notification("Личное сообщение", { body: msg.content.slice(0, 80), tag: msg.id });
        }
      }
      setConversations((prev) =>
        prev.map((c) => c.id === msg.conversationId
          ? { ...c, lastMessage: { id: msg.id, content: msg.content, createdAt: msg.createdAt, userId: msg.userId }, lastMessageAt: msg.createdAt }
          : c
        ).sort((a, b) => new Date(b.lastMessageAt || 0).getTime() - new Date(a.lastMessageAt || 0).getTime())
      );
    });

    socket.on("dm-edited", async (msg: Message & { conversationId: string }) => {
      let displayMsg = msg;
      if (isE2EEMessage(msg.content) && privateKeyRef.current && peerPublicKeyRef.current) {
        try {
          const plaintext = await decryptMessage(msg.content, privateKeyRef.current, peerPublicKeyRef.current);
          decryptedCache.current.set(msg.id, plaintext);
          displayMsg = { ...msg, content: plaintext };
        } catch { /* keep encrypted */ }
      }
      if (msg.conversationId === selectedConv) {
        setMessages((prev) => prev.map((m) => m.id === msg.id ? displayMsg : m));
      }
    });

    socket.on("dm-deleted", ({ messageId, conversationId }: { messageId: string; conversationId: string }) => {
      if (conversationId === selectedConv) {
        setMessages((prev) => prev.filter((m) => m.id !== messageId));
      }
    });

    socket.on("dm-read", ({ conversationId, readAt }: { conversationId: string; userId: string; readAt: string }) => {
      if (conversationId === selectedConv) {
        setPeerReadAt(readAt);
      }
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
      if (dmTypingTimeoutRef.current) {
        clearTimeout(dmTypingTimeoutRef.current);
        dmTypingTimeoutRef.current = null;
      }
    };
  }, [currentUserId, selectedConv]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !selectedConv || sending) return;
    setSending(true);
    const content = input.trim();
    setInput("");
    socketRef.current?.emit("dm-stop-typing", { convId: selectedConv });
    try {
      let finalContent = content;
      const useE2EE = e2eeEnabled && e2eeReady && privateKeyRef.current && peerPublicKeyRef.current;
      if (useE2EE) {
        finalContent = await encryptMessage(content, privateKeyRef.current!, peerPublicKeyRef.current!);
      }
      const res = await fetch(`/api/dm/${selectedConv}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: finalContent, replyToId: replyTo?.id || null, encrypted: useE2EE }),
      });
      if (res.ok) {
        const msg = await res.json();
        const displayMsg = isE2EEMessage(msg.content) ? { ...msg, content } : msg;
        setMessages((prev) => {
          if (prev.find((m) => m.id === msg.id)) return prev;
          return [...prev, displayMsg];
        });
        decryptedCache.current.set(msg.id, content);
        setReplyTo(null);
        setConversations((prev) =>
          prev.map((c) => c.id === selectedConv ? { ...c, lastMessage: { ...msg, content }, lastMessageAt: msg.createdAt } : c)
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
      let uploadBlob = blob;
      let encIv: string | undefined;

      if (e2eeEnabled && e2eeReady && privateKeyRef.current && peerPublicKeyRef.current) {
        const arrayBuf = await blob.arrayBuffer();
        const { encrypted, iv } = await encryptFile(arrayBuf, privateKeyRef.current, peerPublicKeyRef.current);
        uploadBlob = new Blob([encrypted], { type: "application/octet-stream" });
        encIv = iv;
      }

      const fd = new FormData();
      fd.append("file", uploadBlob, encIv ? "voice.enc" : "voice.webm");
      fd.append("duration", String(duration));
      if (encIv) fd.append("e2eeIv", encIv);
      const uploadRes = await fetch("/api/messages/upload", { method: "POST", body: fd });
      if (!uploadRes.ok) return;
      const attachment = await uploadRes.json();
      if (encIv) {
        attachment.e2eeIv = encIv;
        attachment.isE2EE = true;
      }
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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedConv) return;
    setFileUploading(true);
    try {
      let uploadFile: File | Blob = file;
      let encIv: string | undefined;

      if (e2eeEnabled && e2eeReady && privateKeyRef.current && peerPublicKeyRef.current) {
        const arrayBuf = await file.arrayBuffer();
        const { encrypted, iv } = await encryptFile(arrayBuf, privateKeyRef.current, peerPublicKeyRef.current);
        uploadFile = new Blob([encrypted], { type: "application/octet-stream" });
        encIv = iv;
      }

      const fd = new FormData();
      fd.append("file", uploadFile, encIv ? `${file.name}.enc` : file.name);
      if (encIv) fd.append("e2eeIv", encIv);
      const uploadRes = await fetch("/api/messages/upload", { method: "POST", body: fd });
      if (!uploadRes.ok) {
        const data = await uploadRes.json();
        setDmErrorToast(data.error || "Ошибка загрузки");
        setTimeout(() => setDmErrorToast(null), 3500);
        return;
      }
      const attachment = await uploadRes.json();
      if (encIv) {
        attachment.e2eeIv = encIv;
        attachment.isE2EE = true;
      }
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
      setFileUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const parseAttachments = (raw: string | null | undefined): Attachment[] => {
    if (!raw) return [];
    try { return JSON.parse(raw); } catch { return []; }
  };

  const editMessage = async (messageId: string) => {
    if (!editContent.trim() || !selectedConv) return;
    let finalContent = editContent;
    if (e2eeEnabled && e2eeReady && privateKeyRef.current && peerPublicKeyRef.current) {
      finalContent = await encryptMessage(editContent, privateKeyRef.current, peerPublicKeyRef.current);
    }
    const res = await fetch(`/api/dm/${selectedConv}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messageId, content: finalContent }),
    });
    if (res.ok) {
      const msg = await res.json();
      const displayMsg = isE2EEMessage(msg.content) ? { ...msg, content: editContent, _encrypted: true } : msg;
      decryptedCache.current.set(msg.id, editContent);
      setMessages((prev) => prev.map((m) => m.id === msg.id ? displayMsg : m));
    }
    setEditingId(null);
    setEditContent("");
  };

  const deleteMessage = async (messageId: string) => {
    if (!selectedConv) return;
    await fetch(`/api/dm/${selectedConv}?messageId=${messageId}`, { method: "DELETE" });
    setMessages((prev) => prev.filter((m) => m.id !== messageId));
  };

  const handleDecryptFile = useCallback(async (encrypted: ArrayBuffer, iv: string): Promise<ArrayBuffer> => {
    if (!privateKeyRef.current || !peerPublicKeyRef.current) throw new Error("No keys");
    const { decryptFile } = await import("@/lib/e2ee");
    return decryptFile(encrypted, iv, privateKeyRef.current, peerPublicKeyRef.current);
  }, []);

  const selectedOther = conversations.find((c) => c.id === selectedConv)?.other;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Spinner size="md" />
      </div>
    );
  }

  return (
    <div className="flex flex-1 h-full">
      {/* Conversations list */}
      <aside className={`w-60 max-md:w-full cn-sidebar flex-shrink-0 flex flex-col ${selectedConv ? "max-md:hidden" : ""}`}>
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
                className={`w-full text-left p-3 flex items-center gap-3 hover:bg-neutral-100 dark:hover:bg-white/5 transition-colors ${selectedConv === conv.id ? "bg-[var(--cn-accent-dim)] border-l-2 border-[var(--cn-accent)]" : ""}`}
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
      <main className={`flex-1 flex flex-col min-h-0 ${!selectedConv ? "max-md:hidden" : ""}`}>
        {selectedConv && selectedOther ? (
          <>
            <div className="p-3 border-b border-neutral-200 dark:border-white/5 flex items-center gap-3">
              <button onClick={() => setSelectedConv(null)} className="md:hidden p-1 text-neutral-400 hover:text-neutral-600 dark:hover:text-white">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <GlowAvatar user={selectedOther} size={32} onlineColor={isOnline(selectedOther.lastSeen) ? "green" : undefined} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-neutral-900 dark:text-white truncate">{selectedOther.name}</p>
                <p className="text-xs text-neutral-400">
                  {isOnline(selectedOther.lastSeen) ? "Онлайн" : `Был(а) ${timeAgo(selectedOther.lastSeen)}`}
                </p>
              </div>
              {e2eeReady && (
                <button
                  onClick={() => setE2eeEnabled(v => !v)}
                  title={e2eeEnabled ? "Шифрование включено — нажмите для отключения" : "Шифрование выключено — нажмите для включения"}
                  className={`flex items-center gap-1 px-2 py-1 rounded-lg transition-colors ${
                    e2eeEnabled
                      ? "bg-green-500/10 text-green-600 dark:text-green-400 hover:bg-green-500/20"
                      : "bg-neutral-100 dark:bg-white/5 text-neutral-400 hover:bg-neutral-200 dark:hover:bg-white/10"
                  }`}
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                    {e2eeEnabled
                      ? <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1s3.1 1.39 3.1 3.1v2z" />
                      : <path d="M20 8h-3V4a5 5 0 00-9.9-1H4a2 2 0 00-2 2v12a2 2 0 002 2h16a2 2 0 002-2v-8a2 2 0 00-2-2zm-9 7a2 2 0 110-4 2 2 0 010 4zm3-7H8V4a3 3 0 016 0v4z" />
                    }
                  </svg>
                  <span className="text-[10px] font-medium">{e2eeEnabled ? "E2EE" : "Открытый"}</span>
                </button>
              )}
            </div>

            {/* Channel mode banner */}
            <div className={`flex items-center gap-2 px-4 py-1.5 text-[11px] font-medium border-b transition-colors ${
              e2eeEnabled
                ? "bg-green-50 dark:bg-green-400/5 text-green-700 dark:text-green-400 border-green-100 dark:border-green-400/10"
                : "bg-neutral-50 dark:bg-white/3 text-neutral-500 dark:text-gray-500 border-neutral-100 dark:border-white/5"
            }`}>
              {e2eeEnabled ? (
                <>
                  <svg className="w-3 h-3 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1s3.1 1.39 3.1 3.1v2z"/>
                  </svg>
                  Зашифрованный канал — сообщения видны только участникам
                </>
              ) : (
                <>
                  <svg className="w-3 h-3 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20 8h-3V4a5 5 0 00-9.9-1H4a2 2 0 00-2 2v12a2 2 0 002 2h16a2 2 0 002-2v-8a2 2 0 00-2-2zm-9 7a2 2 0 110-4 2 2 0 010 4zm3-7H8V4a3 3 0 016 0v4z"/>
                  </svg>
                  Открытый канал
                </>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {nextCursor && (
                <button onClick={() => loadMessages(selectedConv, nextCursor ?? undefined, e2eeEnabled)} disabled={messagesLoading} className="mx-auto block text-xs text-violet-500 dark:text-cyan-400 hover:underline disabled:opacity-50">
                  {messagesLoading ? "Загрузка..." : "Загрузить ранние"}
                </button>
              )}
              {messages.map((msg) => (
                <div key={msg.id} className={`group/dm flex items-end gap-2 ${msg.userId === currentUserId ? "flex-row-reverse" : ""}`}>
                  <div className={`max-w-[70%] rounded-2xl px-3.5 py-2 ${
                    msg.userId === currentUserId
                      ? "bg-violet-500 dark:bg-cyan-600 text-white"
                      : "bg-neutral-100 dark:bg-white/10 text-neutral-900 dark:text-white"
                  }`}>
                    {msg.replyTo && (
                      <div className={`text-[11px] mb-1 pb-1 border-b ${msg.userId === currentUserId ? "border-white/20 text-white/70" : "border-neutral-200 dark:border-white/10 text-neutral-500 dark:text-neutral-400"}`}>
                        <span className="font-medium">{msg.replyTo.user.name}:</span> <span className="truncate inline-block max-w-[150px] align-bottom">{msg.replyTo.content?.slice(0, 50) || "[файл]"}</span>
                      </div>
                    )}
                    {editingId === msg.id ? (
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
                              <VoicePlayer url={att.url} duration={att.duration} isOwn={msg.userId === currentUserId} e2eeIv={(att as Attachment & { e2eeIv?: string }).e2eeIv} e2eeDecrypt={(att as Attachment & { e2eeIv?: string }).e2eeIv ? handleDecryptFile : undefined} />
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
                          {msg.userId === currentUserId && peerReadAt && new Date(peerReadAt) >= new Date(msg.createdAt) && (
                            <span className="text-[9px] text-white/50" title="Прочитано">✓✓</span>
                          )}
                          {(msg as Message & { _encrypted?: boolean })._encrypted && (
                            <svg className={`w-3 h-3 ${msg.userId === currentUserId ? "text-white/50" : "text-green-500"}`} viewBox="0 0 24 24" fill="currentColor">
                              <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1s3.1 1.39 3.1 3.1v2z" />
                            </svg>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                  {!msg.deleted && !editingId && (
                    <div className="flex gap-0.5 opacity-0 group-hover/dm:opacity-100 transition-opacity">
                      <button onClick={() => setReplyTo({ id: msg.id, name: msg.user.name, content: msg.content.slice(0, 50) })} className="p-1 text-neutral-400 hover:text-violet-500 dark:hover:text-cyan-400" title="Ответить">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg>
                      </button>
                      {msg.userId === currentUserId && (
                        <>
                          <button onClick={() => { setEditingId(msg.id); setEditContent(msg.content); }} className="p-1 text-neutral-400 hover:text-violet-500 dark:hover:text-cyan-400" title="Редактировать">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                          </button>
                          <button onClick={() => deleteMessage(msg.id)} className="p-1 text-neutral-400 hover:text-red-500" title="Удалить">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            <TypingIndicator names={dmTypingName ? [dmTypingName] : []} />
            {replyTo && (
              <div className="px-3 pt-2 pb-1 border-t border-neutral-200 dark:border-white/5 flex items-center gap-2 bg-violet-50 dark:bg-cyan-900/10">
                <svg className="w-4 h-4 text-violet-500 dark:text-cyan-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg>
                <span className="flex-1 text-xs text-neutral-600 dark:text-neutral-300 truncate">
                  Ответ для <strong>{replyTo.name}</strong>: {replyTo.content}
                </span>
                <button onClick={() => setReplyTo(null)} className="text-neutral-400 hover:text-neutral-600 dark:hover:text-white">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            )}
            <div className={`p-3 ${replyTo ? "" : "border-t border-neutral-200 dark:border-white/5"}`}>
              <form onSubmit={sendMessage} className="flex items-end gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={fileUploading}
                  className="p-2 text-neutral-400 hover:text-violet-500 dark:hover:text-cyan-400 transition-colors disabled:opacity-50 flex-shrink-0"
                  aria-label="Прикрепить файл"
                >
                  {fileUploading ? (
                    <Spinner size="sm" tone="current" />
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                    </svg>
                  )}
                </button>
                <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileUpload} accept="image/*,audio/*,.pdf,.doc,.docx,.txt,.zip,.rar" />
                <textarea
                  value={input}
                  onChange={(e) => {
                    setInput(e.target.value);
                    socketRef.current?.emit("dm-typing", { convId: selectedConv });
                    e.target.style.height = "auto";
                    e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
                  }}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(e); } }}
                  placeholder="Написать сообщение..."
                  className="flex-1 px-3 py-2 bg-[var(--cn-accent-dim)] border border-[var(--cn-border)] rounded-xl text-sm text-[var(--cn-text)] placeholder:text-[var(--cn-muted)] outline-none focus:border-[var(--cn-accent)] transition-colors resize-none overflow-y-auto"
                  rows={1}
                  style={{ maxHeight: 120 }}
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
      {dmErrorToast && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-red-500 text-white text-sm rounded-xl shadow-lg animate-fade-in">
          {dmErrorToast}
        </div>
      )}
    </div>
  );
}
