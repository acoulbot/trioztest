"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

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

export default function ConnectPage() {
  const { data: session, status } = useSession();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    fetch("/api/channels").then((r) => r.json()).then(setChannels);
  }, []);

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

    await fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: newMessage, channelId: selectedChannel }),
    });

    setNewMessage("");
    fetchMessages(selectedChannel);
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-900">
        <div className="animate-spin w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full" />
      </div>
    );
  }

  const selectedChannelData = channels.find((c) => c.id === selectedChannel);

  return (
    <div className="min-h-screen bg-dark-900 flex">
      {/* Sidebar */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.aside
            initial={{ x: -280, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -280, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="w-72 bg-dark-800 border-r border-white/5 flex flex-col h-[calc(100vh-64px)] fixed md:relative z-40"
          >
            <div className="p-4 border-b border-white/5">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span className="text-cyan-400">TZ</span>.Connect
              </h2>
              <p className="text-xs text-gray-500 mt-1">Каналы общения</p>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {channels.filter((c) => c.type === "TEXT").length > 0 && (
                <div className="px-2 py-1 text-xs text-gray-500 uppercase tracking-wider">Текстовые</div>
              )}
              {channels
                .filter((c) => c.type === "TEXT")
                .map((channel) => (
                  <button
                    key={channel.id}
                    onClick={() => setSelectedChannel(channel.id)}
                    className={`w-full text-left px-3 py-2.5 rounded-xl flex items-center gap-3 transition-all duration-300 ${
                      selectedChannel === channel.id
                        ? "bg-cyan-400/10 text-cyan-400 border border-cyan-400/20"
                        : "text-gray-400 hover:bg-white/5 hover:text-white border border-transparent"
                    }`}
                  >
                    <span className="text-lg">{channel.icon || "💬"}</span>
                    <div>
                      <div className="font-medium text-sm">{channel.name}</div>
                      <div className="text-xs opacity-60">{channel._count.messages} сообщений</div>
                    </div>
                  </button>
                ))}

              {channels.filter((c) => c.type === "VOICE").length > 0 && (
                <div className="px-2 py-1 mt-4 text-xs text-gray-500 uppercase tracking-wider">Голосовые</div>
              )}
              {channels
                .filter((c) => c.type === "VOICE")
                .map((channel) => (
                  <button
                    key={channel.id}
                    onClick={() => setSelectedChannel(channel.id)}
                    className={`w-full text-left px-3 py-2.5 rounded-xl flex items-center gap-3 transition-all duration-300 ${
                      selectedChannel === channel.id
                        ? "bg-fantasy-emerald/10 text-fantasy-emerald border border-fantasy-emerald/20"
                        : "text-gray-400 hover:bg-white/5 hover:text-white border border-transparent"
                    }`}
                  >
                    <span className="text-lg">{channel.icon || "🎙️"}</span>
                    <div>
                      <div className="font-medium text-sm">{channel.name}</div>
                      <div className="text-xs opacity-60">Голосовой канал</div>
                    </div>
                  </button>
                ))}
            </div>

            <div className="p-3 border-t border-white/5">
              <Link
                href="/connect/services"
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-fantasy-gold hover:bg-fantasy-gold/10 transition-all duration-300"
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
        <div className="h-14 bg-dark-800/50 border-b border-white/5 flex items-center px-4 gap-3">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          {selectedChannelData && (
            <div className="flex items-center gap-2">
              <span>{selectedChannelData.icon || "💬"}</span>
              <span className="font-medium text-white">{selectedChannelData.name}</span>
              <span className="text-xs text-gray-500">• {selectedChannelData._count.members} участников</span>
            </div>
          )}
        </div>

        {/* Messages or Welcome */}
        {selectedChannel ? (
          <>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 ? (
                <div className="flex items-center justify-center h-full text-gray-500">
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
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-cyan-400/30 to-fantasy-purple/30 flex items-center justify-center flex-shrink-0 text-sm font-bold text-white">
                      {msg.user.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2">
                        <span className="font-medium text-white text-sm">{msg.user.name}</span>
                        <span className="text-xs text-gray-600">
                          {new Date(msg.createdAt).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                      <p className="text-gray-300 text-sm mt-0.5 break-words">{msg.content}</p>
                    </div>
                  </motion.div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            {session ? (
              <form onSubmit={sendMessage} className="p-4 border-t border-white/5">
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
            ) : (
              <div className="p-4 border-t border-white/5 text-center">
                <Link href="/auth/signin" className="btn-secondary text-sm">
                  Войдите, чтобы писать сообщения
                </Link>
              </div>
            )}
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center max-w-md">
              <div className="w-20 h-20 bg-gradient-to-br from-cyan-400/20 to-fantasy-purple/20 rounded-3xl flex items-center justify-center mx-auto mb-6">
                <span className="text-4xl">🌐</span>
              </div>
              <h2 className="text-2xl font-bold text-white mb-3">Добро пожаловать в TZ.Connect</h2>
              <p className="text-gray-400 mb-6">
                Выберите канал для общения или ознакомьтесь с нашими IT-услугами для бизнеса
              </p>
              <div className="flex gap-3 justify-center">
                {!session && (
                  <Link href="/auth/signin" className="btn-primary text-sm">
                    Войти
                  </Link>
                )}
                <Link href="/connect/services" className="btn-secondary text-sm">
                  Наши услуги
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
