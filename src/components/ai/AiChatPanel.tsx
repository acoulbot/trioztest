"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";

interface AiMessage {
  id: string;
  role: string;
  content: string;
  createdAt: string;
}

interface AiChatData {
  id: string;
  title: string;
  messages: AiMessage[];
  updatedAt: string;
}

export default function AiChatPanel() {
  const { data: session } = useSession();
  const [isOpen, setIsOpen] = useState(false);

  const [chats, setChats] = useState<AiChatData[]>([]);
  const [activeChat, setActiveChat] = useState<AiChatData | null>(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (session?.user && isOpen) {
      fetch("/api/ai/chat").then((r) => r.json()).then(setChats).catch(() => {});
    }
  }, [session, isOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeChat?.messages]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const message = input;
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chatId: activeChat?.id, message }),
      });
      const data = await res.json();
      setActiveChat(data);

      if (!activeChat?.id) {
        setChats((prev) => [data, ...prev]);
      } else {
        setChats((prev) => prev.map((c) => (c.id === data.id ? data : c)));
      }
    } catch {
      // silently fail
    }

    setLoading(false);
  };

  const newChat = () => {
    setActiveChat(null);
    setShowHistory(false);
  };

  const loadChat = (chat: AiChatData) => {
    setActiveChat(chat);
    setShowHistory(false);
  };

  const deleteChat = async (chatId: string) => {
    await fetch(`/api/ai/chat?chatId=${chatId}`, { method: "DELETE" });
    setChats((prev) => prev.filter((c) => c.id !== chatId));
    if (activeChat?.id === chatId) setActiveChat(null);
  };

  if (!session) return null;

  return (
    <>
      {/* Hover trigger zone — desktop only */}
      <div
        className="fixed right-0 top-1/4 bottom-1/4 w-2 z-50 hidden md:block"
        onMouseEnter={() => setIsOpen(true)}
      />

      {/* Collapsed tab */}
      {!isOpen && (
        <motion.button
          className="fixed right-0 top-1/2 -translate-y-1/2 z-50 bg-gradient-to-l from-violet-600 to-indigo-600 text-white px-2 py-6 rounded-l-xl shadow-2xl"
          onClick={() => setIsOpen(true)}

          whileHover={{ x: -4 }}
          initial={{ x: 0 }}
        >
          <span className="[writing-mode:vertical-lr] text-xs font-medium tracking-wider">AI</span>
        </motion.button>
      )}

      {/* Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ x: 400 }}
            animate={{ x: 0 }}
            exit={{ x: 400 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 h-full w-full sm:w-[380px] z-50 flex flex-col
              bg-white dark:bg-neutral-900 border-l border-neutral-200 dark:border-white/10 shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-neutral-200 dark:border-white/10">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-neutral-900 dark:text-white">TZ.AI Ассистент</h3>
                  <p className="text-[10px] text-neutral-500">Нейросеть экосистемы</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setShowHistory(!showHistory)}
                  className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-white/10 text-neutral-500 transition-colors"
                  title="История"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </button>
                <button
                  onClick={newChat}
                  className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-white/10 text-neutral-500 transition-colors"
                  title="Новый диалог"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-white/10 text-neutral-500 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Chat history sidebar */}
            {showHistory ? (
              <div className="flex-1 overflow-y-auto p-3 space-y-1">
                <p className="text-xs text-neutral-400 px-2 mb-2">История диалогов</p>
                {chats.length === 0 ? (
                  <p className="text-sm text-neutral-500 text-center py-8">Нет диалогов</p>
                ) : (
                  chats.map((chat) => (
                    <div
                      key={chat.id}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors group ${
                        activeChat?.id === chat.id
                          ? "bg-violet-50 dark:bg-violet-500/10"
                          : "hover:bg-neutral-50 dark:hover:bg-white/5"
                      }`}
                    >
                      <button onClick={() => loadChat(chat)} className="flex-1 text-left min-w-0">
                        <p className="text-sm text-neutral-800 dark:text-neutral-200 truncate">{chat.title}</p>
                        <p className="text-[10px] text-neutral-400">
                          {new Date(chat.updatedAt).toLocaleDateString("ru-RU")}
                        </p>
                      </button>
                      <button
                        onClick={() => deleteChat(chat.id)}
                        className="opacity-0 group-hover:opacity-100 p-1 text-neutral-400 hover:text-red-500 transition-all"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  ))
                )}
              </div>
            ) : (
              <>
                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {(!activeChat || activeChat.messages.length === 0) && (
                    <div className="flex flex-col items-center justify-center h-full text-center">
                      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500/20 to-indigo-600/20 flex items-center justify-center mb-4">
                        <svg className="w-8 h-8 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                        </svg>
                      </div>
                      <h4 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-1">TZ.AI</h4>
                      <p className="text-xs text-neutral-400 max-w-[240px]">
                        Задайте вопрос — нейросеть экосистемы TrioZ готова помочь
                      </p>
                    </div>
                  )}

                  {activeChat?.messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
                          msg.role === "user"
                            ? "bg-violet-600 text-white rounded-br-md"
                            : "bg-neutral-100 dark:bg-white/10 text-neutral-800 dark:text-neutral-200 rounded-bl-md"
                        }`}
                      >
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                      </div>
                    </div>
                  ))}

                  {loading && (
                    <div className="flex justify-start">
                      <div className="bg-neutral-100 dark:bg-white/10 px-4 py-3 rounded-2xl rounded-bl-md">
                        <div className="flex gap-1.5">
                          <div className="w-2 h-2 bg-neutral-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                          <div className="w-2 h-2 bg-neutral-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                          <div className="w-2 h-2 bg-neutral-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <form onSubmit={sendMessage} className="p-3 border-t border-neutral-200 dark:border-white/10">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder="Напишите сообщение..."
                      className="flex-1 px-3 py-2.5 rounded-xl text-sm
                        bg-neutral-100 dark:bg-white/5 border border-neutral-200 dark:border-white/10
                        text-neutral-900 dark:text-white placeholder:text-neutral-400
                        focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500/50
                        transition-all"
                      disabled={loading}
                    />
                    <button
                      type="submit"
                      disabled={loading || !input.trim()}
                      className="px-3 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-xl
                        hover:shadow-lg hover:shadow-violet-500/20 disabled:opacity-40 transition-all"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                      </svg>
                    </button>
                  </div>
                </form>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
