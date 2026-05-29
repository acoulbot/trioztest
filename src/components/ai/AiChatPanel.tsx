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

interface LimitInfo {
  unlimited: boolean;
  used: number;
  limit: number | null;
  remaining?: number;
}

const UNLIMITED_ROLES = ["ADMIN", "EDITOR", "CONSULTANT"];

export default function AiChatPanel() {
  const { data: session } = useSession();
  const [isOpen, setIsOpen] = useState(false);

  const [chats, setChats] = useState<AiChatData[]>([]);
  const [activeChat, setActiveChat] = useState<AiChatData | null>(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [limitInfo, setLimitInfo] = useState<LimitInfo | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const userRole = (session?.user as { role?: string } | undefined)?.role ?? "USER";
  const isUnlimited = UNLIMITED_ROLES.includes(userRole);

  useEffect(() => {
    if (session?.user && isOpen) {
      fetch("/api/ai/chat").then((r) => r.json()).then(setChats).catch(() => {});
      if (!isUnlimited) {
        fetch("/api/ai/limit").then((r) => r.json()).then(setLimitInfo).catch(() => {});
      }
    }
  }, [session, isOpen, isUnlimited]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeChat?.messages]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    setErrorMsg(null);
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

      if (!res.ok) {
        // Restore input on error so user doesn't lose their message
        setInput(message);
        setErrorMsg(data.error ?? "Произошла ошибка. Попробуйте ещё раз.");
        if (data.limitReached) {
          setLimitInfo({ unlimited: false, used: data.used, limit: data.limit, remaining: 0 });
        }
      } else {
        setActiveChat(data);
        if (!activeChat?.id) {
          setChats((prev) => [data, ...prev]);
        } else {
          setChats((prev) => prev.map((c) => (c.id === data.id ? data : c)));
        }
        // Refresh limit counter after successful send
        if (!isUnlimited) {
          fetch("/api/ai/limit").then((r) => r.json()).then(setLimitInfo).catch(() => {});
        }
      }
    } catch {
      setInput(message);
      setErrorMsg("Ошибка сети. Проверьте соединение.");
    }

    setLoading(false);
  };

  const newChat = () => {
    setActiveChat(null);
    setShowHistory(false);
    setErrorMsg(null);
  };

  const loadChat = (chat: AiChatData) => {
    setActiveChat(chat);
    setShowHistory(false);
    setErrorMsg(null);
  };

  const deleteChat = async (chatId: string) => {
    await fetch(`/api/ai/chat?chatId=${chatId}`, { method: "DELETE" });
    setChats((prev) => prev.filter((c) => c.id !== chatId));
    if (activeChat?.id === chatId) setActiveChat(null);
  };

  if (!session) return null;

  const limitExhausted = !isUnlimited && limitInfo && limitInfo.remaining === 0;

  return (
    <>
      {/* AI toggle tab — right edge, rectangular */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="hidden md:flex fixed right-0 top-1/2 -translate-y-1/2 z-40 bg-gradient-to-b from-violet-600 to-indigo-600 text-white shadow-lg hover:shadow-xl transition-all items-center justify-center px-1.5 py-3 rounded-l-lg"
          title="TZ.AI Ассистент"
        >
          <span className="text-[10px] font-bold tracking-wider" style={{ writingMode: "vertical-rl" }}>TZ.AI</span>
        </button>
      )}

      {/* AI panel — right side, inline, no overlaps */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.2 }}
            className="w-full sm:w-[360px] h-full flex-shrink-0 flex flex-col
              bg-white dark:bg-neutral-900 border-l border-neutral-200 dark:border-white/10"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-neutral-200 dark:border-white/10 flex-shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
                  <span className="text-[9px] font-bold text-white leading-none">TZ.AI</span>
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-neutral-900 dark:text-white">TZ.AI Ассистент</h3>
                  <p className="text-[10px] text-neutral-500">
                    {isUnlimited
                      ? "Безлимитный доступ"
                      : limitInfo
                      ? `${limitInfo.remaining ?? 0} из ${limitInfo.limit} запросов сегодня`
                      : "Нейросеть экосистемы"}
                  </p>
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

            {/* Limit progress bar (only for limited users) */}
            {!isUnlimited && limitInfo && (
              <div className="px-4 pt-2 pb-1">
                <div className="flex justify-between text-[10px] text-neutral-400 mb-1">
                  <span>Запросов сегодня</span>
                  <span className={limitExhausted ? "text-red-500 font-medium" : ""}>
                    {limitInfo.used} / {limitInfo.limit}
                  </span>
                </div>
                <div className="h-1 bg-neutral-200 dark:bg-white/10 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      limitExhausted
                        ? "bg-red-500"
                        : (limitInfo.used / (limitInfo.limit ?? 1)) > 0.7
                        ? "bg-amber-400"
                        : "bg-violet-500"
                    }`}
                    style={{ width: `${Math.min(100, ((limitInfo.used ?? 0) / (limitInfo.limit ?? 1)) * 100)}%` }}
                  />
                </div>
              </div>
            )}

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

                {/* Error message */}
                {errorMsg && (
                  <div className="mx-3 mb-1 px-3 py-2 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-xs text-red-600 dark:text-red-400 flex items-start gap-2">
                    <svg className="w-3.5 h-3.5 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>{errorMsg}</span>
                  </div>
                )}

                {/* Input */}
                <form onSubmit={sendMessage} className="p-3 border-t border-neutral-200 dark:border-white/10">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder={limitExhausted ? "Лимит исчерпан — сбросится в полночь" : "Напишите сообщение..."}
                      className="flex-1 px-3 py-2.5 rounded-xl text-sm
                        bg-neutral-100 dark:bg-white/5 border border-neutral-200 dark:border-white/10
                        text-neutral-900 dark:text-white placeholder:text-neutral-400
                        focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500/50
                        disabled:opacity-50 transition-all"
                      disabled={loading || !!limitExhausted}
                    />
                    <button
                      type="submit"
                      disabled={loading || !input.trim() || !!limitExhausted}
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
