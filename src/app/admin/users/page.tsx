"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { isOnline, timeAgo } from "@/lib/timeAgo";

interface User {
  id: string;
  email: string;
  name: string;
  username: string;
  avatar: string | null;
  role: string;
  banned: boolean;
  banReason: string | null;
  bannedUntil: string | null;
  lastSeen: string | null;
  createdAt: string;
  _count: { messages: number };
}

const BAN_DURATIONS = [
  { label: "1 минута", minutes: 1 },
  { label: "5 минут", minutes: 5 },
  { label: "15 минут", minutes: 15 },
  { label: "30 минут", minutes: 30 },
  { label: "1 час", minutes: 60 },
  { label: "6 часов", minutes: 360 },
  { label: "1 день", minutes: 1440 },
  { label: "3 дня", minutes: 4320 },
  { label: "7 дней", minutes: 10080 },
  { label: "30 дней", minutes: 43200 },
  { label: "Перманентный", minutes: 0 },
];

function BanModal({ user, onClose, onBan }: {
  user: User;
  onClose: () => void;
  onBan: (userId: string, reason: string, bannedUntil: string | null) => void;
}) {
  const [reason, setReason] = useState("");
  const [selectedDuration, setSelectedDuration] = useState(1440);

  const handleBan = () => {
    let bannedUntil: string | null = null;
    if (selectedDuration > 0) {
      const date = new Date();
      date.setMinutes(date.getMinutes() + selectedDuration);
      bannedUntil = date.toISOString();
    }
    onBan(user.id, reason, bannedUntil);
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
        className="glass-card p-6 max-w-md w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-bold text-white mb-4">
          Забанить пользователя: <span className="text-red-400">{user.name}</span>
        </h3>

        <div className="space-y-4">
          <div>
            <label className="text-sm text-gray-400 mb-1 block">Причина бана</label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Укажите причину..."
              className="w-full bg-dark-700 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-600"
            />
          </div>

          <div>
            <label className="text-sm text-gray-400 mb-2 block">Срок бана</label>
            <div className="grid grid-cols-3 gap-2">
              {BAN_DURATIONS.map((d) => (
                <button
                  key={d.minutes}
                  onClick={() => setSelectedDuration(d.minutes)}
                  className={`px-2 py-1.5 rounded-lg text-xs transition-all ${
                    selectedDuration === d.minutes
                      ? d.minutes === 0
                        ? "bg-red-600/30 text-red-400 border border-red-500/40"
                        : "bg-cyan-400/20 text-cyan-400 border border-cyan-400/30"
                      : "bg-dark-700 text-gray-400 border border-white/5 hover:border-white/20"
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={handleBan}
              className="flex-1 px-4 py-2 bg-red-600/20 text-red-400 rounded-lg hover:bg-red-600/40 transition-all text-sm font-medium"
            >
              Забанить
            </button>
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-dark-700 text-gray-400 rounded-lg hover:bg-dark-600 transition-all text-sm"
            >
              Отмена
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function AdminUsersPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [banTarget, setBanTarget] = useState<User | null>(null);
  const [editingUsername, setEditingUsername] = useState<string | null>(null);
  const [newUsername, setNewUsername] = useState("");
  const [usernameError, setUsernameError] = useState("");

  useEffect(() => {
    if (status === "authenticated" && session?.user?.role !== "ADMIN") {
      router.push("/");
    }
  }, [session, status, router]);

  const fetchUsers = async () => {
    const res = await fetch("/api/users");
    const data = await res.json();
    setUsers(data);
    setLoading(false);
  };

  useEffect(() => {
    if (session?.user?.role === "ADMIN") fetchUsers();
  }, [session]);

  const handleBan = async (userId: string, reason: string, bannedUntil: string | null) => {
    await fetch(`/api/users/${userId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ banned: true, banReason: reason, bannedUntil }),
    });
    fetchUsers();
  };

  const handleUnban = async (userId: string) => {
    await fetch(`/api/users/${userId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ banned: false }),
    });
    fetchUsers();
  };

  const changeRole = async (userId: string, role: string) => {
    await fetch(`/api/users/${userId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    fetchUsers();
  };

  const deleteUser = async (userId: string) => {
    if (!confirm("Удалить пользователя? Это действие необратимо.")) return;
    await fetch(`/api/users/${userId}`, { method: "DELETE" });
    fetchUsers();
  };

  const startEditUsername = (user: User) => {
    setEditingUsername(user.id);
    setNewUsername(user.username);
    setUsernameError("");
  };

  const saveUsername = async (userId: string) => {
    setUsernameError("");
    const res = await fetch(`/api/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: newUsername }),
    });
    if (!res.ok) {
      const data = await res.json();
      setUsernameError(data.error || "Ошибка");
      return;
    }
    setEditingUsername(null);
    fetchUsers();
  };

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-dark-900">
        <div className="animate-spin w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (session?.user?.role !== "ADMIN") return null;

  const formatBanUntil = (date: string | null) => {
    if (!date) return "перманентно";
    const d = new Date(date);
    if (d < new Date()) return "истёк";
    return d.toLocaleString("ru-RU");
  };

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-dark-900 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <Link href="/admin" className="text-cyan-400 hover:text-cyan-300 text-sm mb-2 inline-flex items-center gap-1 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Админ-панель
            </Link>
            <h1 className="text-2xl font-bold text-white">Управление пользователями</h1>
          </div>
          <span className="text-gray-400">{users.length} пользователей</span>
        </div>

        <div className="space-y-3">
          {users.map((user, i) => (
            <motion.div
              key={user.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className={`glass-card p-4 flex flex-col sm:flex-row items-start sm:items-center gap-4 ${
                user.banned ? "border-red-500/30 bg-red-900/10" : ""
              }`}
            >
              <div className="relative flex-shrink-0">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-400/30 to-fantasy-purple/30 flex items-center justify-center text-sm font-bold text-white">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-dark-800 ${isOnline(user.lastSeen) ? "bg-green-500" : "bg-gray-500"}`} title={isOnline(user.lastSeen) ? "Онлайн" : user.lastSeen ? timeAgo(user.lastSeen) : "Не был в сети"} />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-white">{user.name}</span>
                  {editingUsername === user.id ? (
                    <div className="flex items-center gap-1">
                      <input
                        type="text"
                        value={newUsername}
                        onChange={(e) => setNewUsername(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") saveUsername(user.id);
                          if (e.key === "Escape") setEditingUsername(null);
                        }}
                        className="bg-dark-700 border border-cyan-400/30 rounded px-2 py-0.5 text-xs text-white w-32"
                        autoFocus
                      />
                      <button onClick={() => saveUsername(user.id)} className="text-cyan-400 hover:text-cyan-300 text-xs">✓</button>
                      <button onClick={() => setEditingUsername(null)} className="text-gray-500 hover:text-gray-300 text-xs">✕</button>
                      {usernameError && <span className="text-red-400 text-xs">{usernameError}</span>}
                    </div>
                  ) : (
                    <button
                      onClick={() => startEditUsername(user)}
                      className="text-xs text-cyan-400/60 hover:text-cyan-400 transition-colors cursor-pointer"
                      title="Изменить логин"
                    >
                      @{user.username}
                    </button>
                  )}
                  <span className="text-xs text-gray-500">{user.email}</span>
                  <span className={`px-2 py-0.5 rounded text-xs ${
                    user.role === "ADMIN" ? "bg-fantasy-gold/20 text-fantasy-gold" :
                    user.role === "EDITOR" ? "bg-fantasy-purple/20 text-fantasy-purple" :
                    user.role === "CONSULTANT" ? "bg-cyan-400/20 text-cyan-400" :
                    "bg-gray-700 text-gray-400"
                  }`}>
                    {user.role}
                  </span>
                  {user.banned && (
                    <span className="px-2 py-0.5 bg-red-500/20 text-red-400 rounded text-xs">
                      ЗАБАНЕН
                    </span>
                  )}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {user._count.messages} сообщений • Регистрация: {new Date(user.createdAt).toLocaleDateString("ru-RU")}
                  {" • "}
                  <span className={isOnline(user.lastSeen) ? "text-green-400" : ""}>
                    {isOnline(user.lastSeen) ? "Онлайн" : user.lastSeen ? timeAgo(user.lastSeen) : "Не был в сети"}
                  </span>
                  {user.banned && user.banReason && (
                    <span className="text-red-400"> • Причина: {user.banReason}</span>
                  )}
                  {user.banned && (
                    <span className="text-red-400"> • До: {formatBanUntil(user.bannedUntil)}</span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <select
                  value={user.role}
                  onChange={(e) => changeRole(user.id, e.target.value)}
                  className="bg-dark-700 border border-white/10 rounded-lg px-2 py-1 text-sm text-white"
                >
                  <option value="USER">USER</option>
                  <option value="CONSULTANT">CONSULTANT</option>
                  <option value="EDITOR">EDITOR</option>
                  <option value="ADMIN">ADMIN</option>
                </select>

                {/* Hide ban button for ADMIN users */}
                {user.role !== "ADMIN" && (
                  user.banned ? (
                    <button
                      onClick={() => handleUnban(user.id)}
                      className="px-3 py-1 rounded-lg text-sm transition-all bg-green-600/20 text-green-400 hover:bg-green-600/40"
                    >
                      Разбанить
                    </button>
                  ) : (
                    <button
                      onClick={() => setBanTarget(user)}
                      className="px-3 py-1 rounded-lg text-sm transition-all bg-red-600/20 text-red-400 hover:bg-red-600/40"
                    >
                      Бан
                    </button>
                  )
                )}

                <button
                  onClick={() => deleteUser(user.id)}
                  className="p-1 text-gray-500 hover:text-red-400 transition-colors"
                  title="Удалить"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Ban Modal */}
      <AnimatePresence>
        {banTarget && (
          <BanModal
            user={banTarget}
            onClose={() => setBanTarget(null)}
            onBan={handleBan}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
