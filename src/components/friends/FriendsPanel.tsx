"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface Friend {
  id: string;
  name: string;
  username: string;
  avatar: string | null;
  friendshipId: string;
  role?: string;
}

interface PendingRequest {
  id: string;
  sender: { id: string; name: string; username: string; avatar: string | null };
  createdAt: string;
}

interface SentRequest {
  id: string;
  receiver: { id: string; name: string; username: string; avatar: string | null };
  createdAt: string;
}

interface FriendsData {
  friends: Friend[];
  pending: PendingRequest[];
  sent: SentRequest[];
}

type Tab = "friends" | "pending" | "add";

export default function FriendsPanel({ onClose }: { onClose: () => void }) {
  const [data, setData] = useState<FriendsData>({ friends: [], pending: [], sent: [] });
  const [tab, setTab] = useState<Tab>("friends");
  const [username, setUsername] = useState("");
  const [message, setMessage] = useState<{ text: string; type: "ok" | "err" } | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchFriends = useCallback(async () => {
    const res = await fetch("/api/friends");
    if (res.ok) {
      const d = await res.json();
      setData(d);
    }
  }, []);

  useEffect(() => {
    fetchFriends();
    const interval = setInterval(fetchFriends, 5000);
    return () => clearInterval(interval);
  }, [fetchFriends]);

  const sendRequest = async () => {
    if (!username.trim()) return;
    setLoading(true);
    setMessage(null);
    const res = await fetch("/api/friends", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: username.trim() }),
    });
    const d = await res.json();
    if (res.ok) {
      setMessage({ text: "Запрос отправлен!", type: "ok" });
      setUsername("");
      fetchFriends();
    } else {
      setMessage({ text: d.error || "Ошибка", type: "err" });
    }
    setLoading(false);
  };

  const acceptRequest = async (id: string) => {
    await fetch(`/api/friends/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "accept" }),
    });
    fetchFriends();
  };

  const declineRequest = async (id: string) => {
    await fetch(`/api/friends/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "decline" }),
    });
    fetchFriends();
  };

  const removeFriend = async (friendshipId: string) => {
    if (!confirm("Удалить из друзей?")) return;
    await fetch(`/api/friends/${friendshipId}`, { method: "DELETE" });
    fetchFriends();
  };

  const tabs: { key: Tab; label: string; count?: number }[] = [
    { key: "friends", label: "Друзья", count: data.friends.length },
    { key: "pending", label: "Входящие", count: data.pending.length },
    { key: "add", label: "Добавить" },
  ];

  return (
    <div className="w-80 bg-white dark:bg-neutral-900 border-l border-neutral-200 dark:border-white/5 flex flex-col h-full">
      {/* Header */}
      <div className="p-3 border-b border-neutral-200 dark:border-white/5 flex items-center justify-between">
        <span className="text-sm font-semibold text-neutral-900 dark:text-white">Друзья</span>
        <button onClick={onClose} className="text-neutral-400 hover:text-neutral-600 dark:hover:text-white transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-neutral-200 dark:border-white/5">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 px-2 py-2 text-xs font-medium transition-colors relative ${
              tab === t.key
                ? "text-violet-600 dark:text-cyan-400"
                : "text-neutral-400 hover:text-neutral-600 dark:hover:text-gray-300"
            }`}
          >
            {t.label}
            {t.count !== undefined && t.count > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full bg-violet-100 dark:bg-cyan-400/20 text-violet-600 dark:text-cyan-400 text-[10px]">
                {t.count}
              </span>
            )}
            {tab === t.key && (
              <motion.div layoutId="friends-tab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-violet-500 dark:bg-cyan-400" />
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-2">
        <AnimatePresence mode="wait">
          {tab === "friends" && (
            <motion.div key="friends" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-0.5">
              {data.friends.length === 0 ? (
                <div className="text-center py-8 text-neutral-400 text-sm">
                  <p>Пока нет друзей</p>
                  <button onClick={() => setTab("add")} className="text-violet-500 dark:text-cyan-400 mt-2 text-xs hover:underline">
                    Добавить друга
                  </button>
                </div>
              ) : (
                data.friends.map((f) => (
                  <div key={f.id} className="flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-white/5 transition-colors group">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-400/30 to-indigo-400/30 flex items-center justify-center text-xs font-bold text-neutral-700 dark:text-white flex-shrink-0">
                      {f.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-neutral-900 dark:text-white truncate">{f.name}</div>
                      <div className="text-[10px] text-neutral-400">@{f.username}</div>
                    </div>
                    <button
                      onClick={() => removeFriend(f.friendshipId)}
                      className="opacity-0 group-hover:opacity-100 p-1 text-neutral-400 hover:text-red-500 transition-all"
                      title="Удалить из друзей"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))
              )}
            </motion.div>
          )}

          {tab === "pending" && (
            <motion.div key="pending" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-2">
              {data.pending.length === 0 && data.sent.length === 0 ? (
                <div className="text-center py-8 text-neutral-400 text-sm">Нет запросов</div>
              ) : (
                <>
                  {data.pending.map((r) => (
                    <div key={r.id} className="px-2 py-2 rounded-lg bg-neutral-50 dark:bg-white/5 space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-green-400/30 to-emerald-400/30 flex items-center justify-center text-xs font-bold text-neutral-700 dark:text-white flex-shrink-0">
                          {r.sender.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm text-neutral-900 dark:text-white truncate">{r.sender.name}</div>
                          <div className="text-[10px] text-neutral-400">@{r.sender.username}</div>
                        </div>
                      </div>
                      <div className="flex gap-1.5">
                        <button onClick={() => acceptRequest(r.id)}
                          className="flex-1 px-2 py-1 bg-green-500/10 text-green-600 dark:text-green-400 rounded-lg text-xs font-medium hover:bg-green-500/20 transition-colors">
                          Принять
                        </button>
                        <button onClick={() => declineRequest(r.id)}
                          className="flex-1 px-2 py-1 bg-red-500/10 text-red-500 dark:text-red-400 rounded-lg text-xs font-medium hover:bg-red-500/20 transition-colors">
                          Отклонить
                        </button>
                      </div>
                    </div>
                  ))}
                  {data.sent.length > 0 && (
                    <>
                      <div className="text-[11px] text-neutral-400 uppercase tracking-wider px-2 pt-2">Отправленные</div>
                      {data.sent.map((r) => (
                        <div key={r.id} className="flex items-center gap-2 px-2 py-2 rounded-lg bg-neutral-50 dark:bg-white/5">
                          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-amber-400/30 to-orange-400/30 flex items-center justify-center text-xs font-bold text-neutral-700 dark:text-white flex-shrink-0">
                            {r.receiver.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm text-neutral-900 dark:text-white truncate">{r.receiver.name}</div>
                            <div className="text-[10px] text-neutral-400">@{r.receiver.username} · Ожидание</div>
                          </div>
                        </div>
                      ))}
                    </>
                  )}
                </>
              )}
            </motion.div>
          )}

          {tab === "add" && (
            <motion.div key="add" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-2 space-y-3">
              <p className="text-sm text-neutral-500">Введите username друга:</p>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendRequest()}
                placeholder="@username"
                className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-white/10 rounded-xl px-3 py-2.5 text-sm text-neutral-900 dark:text-white placeholder:text-neutral-400"
                autoFocus
              />
              <button
                onClick={sendRequest}
                disabled={loading || !username.trim()}
                className="w-full px-4 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 dark:from-cyan-500 dark:to-cyan-400 text-white dark:text-neutral-900 rounded-xl hover:shadow-lg transition-all text-sm font-medium disabled:opacity-50"
              >
                {loading ? "..." : "Отправить запрос"}
              </button>
              {message && (
                <p className={`text-xs ${message.type === "ok" ? "text-green-500" : "text-red-500"}`}>
                  {message.text}
                </p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
