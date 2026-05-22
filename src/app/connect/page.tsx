"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import VoiceChannel from "@/components/voice/VoiceChannel";

interface Channel {
  id: string;
  name: string;
  type: string;
  icon: string | null;
  _count: { members: number; messages: number };
}

interface Message {
  id: string;
  content: string;
  createdAt: string;
  user: { id: string; name: string; avatar: string | null };
}

function CreateChannelModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState("");
  const [type, setType] = useState("TEXT");

  const handleCreate = async () => {
    if (!name.trim()) return;
    await fetch("/api/channels", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, type }),
    });
    onCreated();
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white dark:bg-neutral-800 rounded-2xl border border-neutral-200 dark:border-white/10 p-6 max-w-sm w-full shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4">Создать канал</h3>
        <div className="space-y-3">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Название канала..."
            className="w-full bg-neutral-50 dark:bg-neutral-700 border border-neutral-200 dark:border-white/10 rounded-xl px-3 py-2.5 text-sm text-neutral-900 dark:text-white placeholder:text-neutral-400"
          />
          <div className="flex gap-2">
            <button
              onClick={() => setType("TEXT")}
              className={`flex-1 px-3 py-2 rounded-xl text-sm transition-all ${
                type === "TEXT"
                  ? "bg-violet-50 dark:bg-cyan-400/20 text-violet-600 dark:text-cyan-400 border border-violet-200 dark:border-cyan-400/30"
                  : "bg-neutral-50 dark:bg-neutral-700 text-neutral-500 dark:text-gray-400 border border-neutral-200 dark:border-white/5"
              }`}
            >
              💬 Текстовый
            </button>
            <button
              onClick={() => setType("VOICE")}
              className={`flex-1 px-3 py-2 rounded-xl text-sm transition-all ${
                type === "VOICE"
                  ? "bg-emerald-50 dark:bg-fantasy-emerald/20 text-emerald-600 dark:text-fantasy-emerald border border-emerald-200 dark:border-fantasy-emerald/30"
                  : "bg-neutral-50 dark:bg-neutral-700 text-neutral-500 dark:text-gray-400 border border-neutral-200 dark:border-white/5"
              }`}
            >
              🎙️ Голосовой
            </button>
          </div>
          <div className="flex gap-2 pt-1">
            <button onClick={handleCreate} className="flex-1 px-4 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 dark:from-cyan-500 dark:to-cyan-400 text-white dark:text-neutral-900 rounded-xl hover:shadow-lg transition-all text-sm font-medium">
              Создать
            </button>
            <button onClick={onClose} className="flex-1 px-4 py-2.5 bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-gray-400 rounded-xl hover:bg-neutral-200 dark:hover:bg-neutral-600 transition-all text-sm">
              Отмена
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function ConnectPage() {
  const { data: session, status } = useSession();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingChannel, setEditingChannel] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [activeVoiceChannel, setActiveVoiceChannel] = useState<{ id: string; name: string } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  const canManageChannels = session?.user && ["ADMIN", "EDITOR"].includes(session.user.role);
  const isBanned = session?.user?.banned && (!session.user.bannedUntil || new Date(session.user.bannedUntil) > new Date());

  const fetchChannels = useCallback(() => {
    fetch("/api/channels").then((r) => r.json()).then(setChannels);
  }, []);

  useEffect(() => {
    fetchChannels();
  }, [fetchChannels]);

  const fetchMessages = useCallback(async (channelId: string) => {
    const res = await fetch(`/api/messages?channelId=${channelId}`);
    const data = await res.json();
    setMessages(data);
  }, []);

  useEffect(() => {
    if (selectedChannel) {
      fetchMessages(selectedChannel);
      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = setInterval(() => fetchMessages(selectedChannel), 3000);
    }
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [selectedChannel, fetchMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedChannel) return;

    const res = await fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: newMessage, channelId: selectedChannel }),
    });

    if (!res.ok) {
      const data = await res.json();
      alert(data.error || "Ошибка отправки");
      return;
    }

    setNewMessage("");
    fetchMessages(selectedChannel);
  };

  const deleteChannel = async (channelId: string) => {
    if (!confirm("Удалить канал? Все сообщения будут удалены.")) return;
    await fetch(`/api/channels/${channelId}`, { method: "DELETE" });
    if (selectedChannel === channelId) setSelectedChannel(null);
    fetchChannels();
  };

  const renameChannel = async (channelId: string) => {
    if (!editName.trim()) return;
    await fetch(`/api/channels/${channelId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editName }),
    });
    setEditingChannel(null);
    fetchChannels();
  };

  const handleChannelClick = (channel: Channel) => {
    if (channel.type === "VOICE") {
      setActiveVoiceChannel({ id: channel.id, name: channel.name });
    } else {
      setSelectedChannel(channel.id);
    }
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-neutral-950">
        <div className="animate-spin w-8 h-8 border-2 border-violet-500 dark:border-cyan-400 border-t-transparent rounded-full" />
      </div>
    );
  }

  const selectedChannelData = channels.find((c) => c.id === selectedChannel);

  const renderChannelItem = (channel: Channel, isVoice: boolean) => (
    <div key={channel.id} className="group flex items-center gap-1">
      {editingChannel === channel.id ? (
        <form
          onSubmit={(e) => { e.preventDefault(); renameChannel(channel.id); }}
          className="flex-1 flex gap-1"
        >
          <input
            type="text"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            className="flex-1 bg-neutral-100 dark:bg-neutral-700 border border-neutral-300 dark:border-white/10 rounded-lg px-2 py-1.5 text-sm text-neutral-900 dark:text-white"
            autoFocus
          />
          <button type="submit" className="text-violet-500 dark:text-cyan-400 text-xs px-2">&#x2713;</button>
          <button type="button" onClick={() => setEditingChannel(null)} className="text-neutral-400 dark:text-gray-500 text-xs px-2">&#x2715;</button>
        </form>
      ) : (
        <>
          <button
            onClick={() => handleChannelClick(channel)}
            className={`flex-1 text-left px-3 py-2.5 rounded-xl flex items-center gap-3 transition-all duration-300 ${
              selectedChannel === channel.id && !isVoice
                ? "bg-violet-50 dark:bg-cyan-400/10 text-violet-700 dark:text-cyan-400 border border-violet-200 dark:border-cyan-400/20"
                : "text-neutral-600 dark:text-gray-400 hover:bg-neutral-100 dark:hover:bg-white/5 hover:text-neutral-900 dark:hover:text-white border border-transparent"
            }`}
          >
            <span className="text-lg">{channel.icon || (isVoice ? "🎙️" : "💬")}</span>
            <div>
              <div className="font-medium text-sm">{channel.name}</div>
              <div className="text-xs opacity-60">
                {isVoice ? "Голосовой канал" : `${channel._count.messages} сообщений`}
              </div>
            </div>
          </button>
          {canManageChannels && (
            <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-0.5">
              <button
                onClick={() => { setEditingChannel(channel.id); setEditName(channel.name); }}
                className="p-1 text-neutral-400 dark:text-gray-500 hover:text-violet-500 dark:hover:text-cyan-400 transition-colors"
                title="Переименовать"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
              <button
                onClick={() => deleteChannel(channel.id)}
                className="p-1 text-neutral-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                title="Удалить"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 flex">
      {/* Sidebar */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.aside
            initial={{ x: -280, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -280, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="w-72 bg-white dark:bg-neutral-900 border-r border-neutral-200 dark:border-white/5 flex flex-col h-[calc(100vh-64px)] fixed md:relative z-40"
          >
            <div className="p-4 border-b border-neutral-200 dark:border-white/5">
              <h2 className="text-lg font-display font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                <span className="text-violet-600 dark:text-cyan-400">TZ</span>.Connect
              </h2>
              <p className="text-xs text-neutral-400 mt-1">Каналы общения</p>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {/* Text channels */}
              <div className="flex items-center justify-between px-2 py-1">
                <span className="text-xs text-neutral-400 uppercase tracking-wider font-medium">Текстовые</span>
                {canManageChannels && (
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="text-neutral-400 hover:text-violet-500 dark:hover:text-cyan-400 transition-colors"
                    title="Создать канал"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </button>
                )}
              </div>
              {channels.filter((c) => c.type === "TEXT").map((ch) => renderChannelItem(ch, false))}

              {/* Voice channels */}
              <div className="flex items-center justify-between px-2 py-1 mt-4">
                <span className="text-xs text-neutral-400 uppercase tracking-wider font-medium">Голосовые</span>
              </div>
              {channels.filter((c) => c.type === "VOICE").map((ch) => renderChannelItem(ch, true))}
            </div>

            <div className="p-3 border-t border-neutral-200 dark:border-white/5">
              <Link
                href="/connect/services"
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-amber-600 dark:text-fantasy-gold hover:bg-amber-50 dark:hover:bg-fantasy-gold/10 transition-all duration-300"
              >
                <span>⚡</span>
                <span className="text-sm font-medium">Наши услуги</span>
              </Link>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-[calc(100vh-64px)]">
        {/* Header */}
        <div className="h-14 bg-white/50 dark:bg-neutral-900/50 border-b border-neutral-200 dark:border-white/5 flex items-center px-4 gap-3 backdrop-blur-sm">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1.5 text-neutral-500 dark:text-gray-400 hover:text-neutral-900 dark:hover:text-white rounded-lg hover:bg-neutral-100 dark:hover:bg-white/5 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          {selectedChannelData && (
            <div className="flex items-center gap-2">
              <span>{selectedChannelData.icon || "💬"}</span>
              <span className="font-medium text-neutral-900 dark:text-white">{selectedChannelData.name}</span>
              <span className="text-xs text-neutral-400">&#x2022; {selectedChannelData._count.members} участников</span>
            </div>
          )}
        </div>

        {/* Ban notice */}
        {isBanned && (
          <div className="mx-4 mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-500/30 rounded-xl text-center">
            <p className="text-red-600 dark:text-red-400 text-sm font-medium">
              Ваш аккаунт ограничен
              {session?.user?.bannedUntil
                ? ` до ${new Date(session.user.bannedUntil).toLocaleString("ru-RU")}`
                : " бессрочно"}
            </p>
            {session?.user?.banReason && (
              <p className="text-red-500/60 dark:text-red-400/70 text-xs mt-1">Причина: {session.user.banReason}</p>
            )}
          </div>
        )}

        {/* Messages or Welcome */}
        {selectedChannel ? (
          <>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 ? (
                <div className="flex items-center justify-center h-full text-neutral-400">
                  <div className="text-center">
                    <span className="text-4xl block mb-3">💬</span>
                    <p>Нет сообщений. Начните общение!</p>
                  </div>
                </div>
              ) : (
                messages.map((msg) => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex gap-3 group"
                  >
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-400/30 dark:from-cyan-400/30 to-indigo-400/30 dark:to-fantasy-purple/30 flex items-center justify-center flex-shrink-0 text-sm font-bold text-neutral-700 dark:text-white">
                      {msg.user.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2">
                        <span className="font-medium text-neutral-900 dark:text-white text-sm">{msg.user.name}</span>
                        <span className="text-xs text-neutral-400 dark:text-gray-600">
                          {new Date(msg.createdAt).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                      <p className="text-neutral-700 dark:text-gray-300 text-sm mt-0.5 break-words">{msg.content}</p>
                    </div>
                  </motion.div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            {session && !isBanned ? (
              <form onSubmit={sendMessage} className="p-4 border-t border-neutral-200 dark:border-white/5">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder={`Написать в #${selectedChannelData?.name || "канал"}...`}
                    className="input-field flex-1"
                  />
                  <button type="submit" className="btn-primary !px-4">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                  </button>
                </div>
              </form>
            ) : session && isBanned ? (
              <div className="p-4 border-t border-neutral-200 dark:border-white/5">
                <div className="text-center text-red-400/60 text-sm py-2">
                  Отправка сообщений ограничена
                </div>
              </div>
            ) : (
              <div className="p-4 border-t border-neutral-200 dark:border-white/5">
                <Link href="/auth/signin" className="block text-center text-violet-600 dark:text-cyan-400 hover:text-violet-500 dark:hover:text-cyan-300 text-sm transition-colors">
                  Войдите, чтобы писать сообщения
                </Link>
              </div>
            )}
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <span className="text-6xl block mb-4">💬</span>
              <h2 className="text-xl font-display font-bold text-neutral-900 dark:text-white mb-2">TZ.Connect</h2>
              <p className="text-neutral-400">Выберите канал для общения</p>
            </div>
          </div>
        )}
      </div>

      {/* Create Channel Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <CreateChannelModal
            onClose={() => setShowCreateModal(false)}
            onCreated={fetchChannels}
          />
        )}
      </AnimatePresence>

      {/* Voice Channel Modal */}
      <AnimatePresence>
        {activeVoiceChannel && (
          <VoiceChannel
            channelId={activeVoiceChannel.id}
            channelName={activeVoiceChannel.name}
            onClose={() => setActiveVoiceChannel(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
