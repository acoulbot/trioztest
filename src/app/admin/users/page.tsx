"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";

interface User {
  id: string;
  email: string;
  name: string;
  avatar: string | null;
  role: string;
  banned: boolean;
  banReason: string | null;
  createdAt: string;
  _count: { messages: number };
}

export default function AdminUsersPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

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

  const toggleBan = async (userId: string, currentBanned: boolean) => {
    const reason = !currentBanned ? prompt("Причина бана:") : null;
    await fetch(`/api/users/${userId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ banned: !currentBanned, banReason: reason }),
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

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-900">
        <div className="animate-spin w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (session?.user?.role !== "ADMIN") return null;

  return (
    <div className="min-h-screen bg-dark-900 py-8 px-4">
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
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-400/30 to-fantasy-purple/30 flex items-center justify-center flex-shrink-0 text-sm font-bold text-white">
                {user.name.charAt(0).toUpperCase()}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-white">{user.name}</span>
                  <span className="text-xs text-gray-500">{user.email}</span>
                  <span className={`px-2 py-0.5 rounded text-xs ${
                    user.role === "ADMIN" ? "bg-fantasy-gold/20 text-fantasy-gold" :
                    user.role === "MODERATOR" ? "bg-fantasy-purple/20 text-fantasy-purple" :
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
                  {user.banReason && <span className="text-red-400"> • Причина бана: {user.banReason}</span>}
                </div>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <select
                  value={user.role}
                  onChange={(e) => changeRole(user.id, e.target.value)}
                  className="bg-dark-700 border border-white/10 rounded-lg px-2 py-1 text-sm text-white"
                >
                  <option value="USER">USER</option>
                  <option value="MODERATOR">MODERATOR</option>
                  <option value="ADMIN">ADMIN</option>
                </select>
                <button
                  onClick={() => toggleBan(user.id, user.banned)}
                  className={`px-3 py-1 rounded-lg text-sm transition-all ${
                    user.banned
                      ? "bg-green-600/20 text-green-400 hover:bg-green-600/40"
                      : "bg-red-600/20 text-red-400 hover:bg-red-600/40"
                  }`}
                >
                  {user.banned ? "Разбанить" : "Бан"}
                </button>
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
    </div>
  );
}
