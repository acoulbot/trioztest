"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import GlowAvatar from "@/components/ui/GlowAvatar";
import { isOnline, timeAgo } from "@/lib/timeAgo";

interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string | null;
  imageUrl: string | null;
  rarity: string;
  awardedAt: string;
}

interface UserProfile {
  id: string;
  name: string;
  username: string;
  avatar: string | null;
  role: string;
  bio: string | null;
  socialLinks: { telegram?: string; vk?: string; github?: string; website?: string } | null;
  customStatus: string | null;
  statusEmoji: string | null;
  avatarGlowEnabled: boolean;
  avatarGlowColors: string | null;
  lastSeen: string | null;
  showOnline: boolean;
  createdAt: string;
  stats: { messages: number; friends: number; games: number };
  badges: Badge[];
  commonGroups: { id: string; name: string; icon: string | null }[];
  isFriend: boolean;
  isSelf: boolean;
  pendingRequest: { id: string; isSender: boolean } | null;
}

const ROLE_LABELS: Record<string, { label: string; color: string }> = {
  ADMIN: { label: "Администратор", color: "text-red-400" },
  EDITOR: { label: "Редактор", color: "text-violet-400" },
  CONSULTANT: { label: "Консультант", color: "text-blue-400" },
  USER: { label: "Пользователь", color: "text-gray-400" },
};

const RARITY_COLORS: Record<string, string> = {
  common: "border-gray-500/30 bg-gray-500/5",
  uncommon: "border-green-500/30 bg-green-500/5",
  rare: "border-blue-500/30 bg-blue-500/5",
  epic: "border-purple-500/30 bg-purple-500/5",
  legendary: "border-amber-500/30 bg-amber-500/5",
};

export default function UserProfilePage() {
  const { username } = useParams<{ username: string }>();
  const { data: session } = useSession();
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [friendLoading, setFriendLoading] = useState(false);

  useEffect(() => {
    if (!username) return;
    setLoading(true);
    fetch(`/api/profile/public?username=${username}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) setError(data.error);
        else setProfile(data);
      })
      .catch(() => setError("Ошибка загрузки"))
      .finally(() => setLoading(false));
  }, [username]);

  const handleAddFriend = async () => {
    if (!profile) return;
    setFriendLoading(true);
    const res = await fetch("/api/friends", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: profile.username }),
    });
    if (res.ok) {
      setProfile((p) => p ? { ...p, pendingRequest: { id: "", isSender: true } } : p);
    }
    setFriendLoading(false);
  };

  const handleStartDM = async () => {
    if (!profile) return;
    const res = await fetch("/api/dm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: profile.username }),
    });
    if (res.ok) {
      router.push("/connect?dm=true");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-neutral-950">
        <div className="animate-spin w-8 h-8 border-2 border-violet-500 dark:border-cyan-400 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-neutral-950">
        <div className="text-center">
          <span className="text-5xl block mb-4">😕</span>
          <h1 className="text-xl font-bold text-neutral-900 dark:text-white mb-2">Пользователь не найден</h1>
          <p className="text-neutral-400 mb-4">{error || "Такого пользователя не существует"}</p>
          <Link href="/" className="text-violet-500 dark:text-cyan-400 hover:underline text-sm">На главную</Link>
        </div>
      </div>
    );
  }

  const role = ROLE_LABELS[profile.role] ?? ROLE_LABELS.USER;

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 pt-20 pb-12 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Back */}
        <Link href="/" className="inline-flex items-center gap-1 text-sm text-violet-600 dark:text-cyan-400 hover:opacity-70 transition-opacity">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Назад
        </Link>

        {/* Profile card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-white/10 rounded-2xl p-6 space-y-5"
        >
          <div className="flex items-start gap-5">
            <GlowAvatar user={profile} size={80} onlineColor={profile.showOnline && isOnline(profile.lastSeen) ? "green" : undefined} />
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold text-neutral-900 dark:text-white">{profile.name}</h1>
              <p className="text-sm text-neutral-500 dark:text-gray-400">@{profile.username}</p>
              <span className={`text-xs font-medium ${role.color}`}>{role.label}</span>

              {profile.customStatus && (
                <div className="mt-2 flex items-center gap-1.5 text-sm text-neutral-600 dark:text-gray-400">
                  {profile.statusEmoji && <span>{profile.statusEmoji}</span>}
                  <span>{profile.customStatus}</span>
                </div>
              )}

              {profile.showOnline && profile.lastSeen && (
                <p className="text-xs text-neutral-400 mt-1">
                  {isOnline(profile.lastSeen) ? "🟢 Онлайн" : `Был(а) ${timeAgo(profile.lastSeen)}`}
                </p>
              )}
            </div>
          </div>

          {profile.bio && (
            <p className="text-sm text-neutral-600 dark:text-gray-400 leading-relaxed">{profile.bio}</p>
          )}

          {/* Actions */}
          {!profile.isSelf && session && (
            <div className="flex gap-2">
              {profile.isFriend ? (
                <button onClick={handleStartDM} className="px-4 py-2 bg-violet-600 dark:bg-cyan-600 text-white rounded-xl text-sm font-medium hover:opacity-90 transition-opacity">
                  Написать
                </button>
              ) : profile.pendingRequest ? (
                <span className="px-4 py-2 bg-neutral-100 dark:bg-white/5 text-neutral-500 rounded-xl text-sm">
                  {profile.pendingRequest.isSender ? "Запрос отправлен" : "Ожидает принятия"}
                </span>
              ) : (
                <button onClick={handleAddFriend} disabled={friendLoading} className="px-4 py-2 bg-green-500 text-white rounded-xl text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50">
                  {friendLoading ? "..." : "Добавить в друзья"}
                </button>
              )}
            </div>
          )}

          {/* Social links */}
          {profile.socialLinks && Object.values(profile.socialLinks).some(Boolean) && (
            <div className="flex flex-wrap gap-2">
              {profile.socialLinks.telegram && (
                <a href={profile.socialLinks.telegram} target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 bg-blue-500/10 text-blue-500 rounded-lg text-xs font-medium hover:bg-blue-500/20 transition-colors">
                  Telegram
                </a>
              )}
              {profile.socialLinks.vk && (
                <a href={profile.socialLinks.vk} target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 bg-blue-600/10 text-blue-600 rounded-lg text-xs font-medium hover:bg-blue-600/20 transition-colors">
                  VK
                </a>
              )}
              {profile.socialLinks.github && (
                <a href={profile.socialLinks.github} target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 bg-neutral-500/10 text-neutral-600 dark:text-gray-400 rounded-lg text-xs font-medium hover:bg-neutral-500/20 transition-colors">
                  GitHub
                </a>
              )}
              {profile.socialLinks.website && (
                <a href={profile.socialLinks.website} target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 bg-violet-500/10 text-violet-500 rounded-lg text-xs font-medium hover:bg-violet-500/20 transition-colors">
                  Сайт
                </a>
              )}
            </div>
          )}
        </motion.div>

        {/* Stats */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-white/10 rounded-2xl p-6"
        >
          <h2 className="text-sm font-semibold text-neutral-900 dark:text-white mb-3">Статистика</h2>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Сообщений", value: profile.stats.messages },
              { label: "Друзей", value: profile.stats.friends },
              { label: "Игр сыграно", value: profile.stats.games },
            ].map((stat) => (
              <div key={stat.label} className="bg-neutral-100 dark:bg-white/5 rounded-xl p-3 text-center">
                <p className="text-lg font-bold text-neutral-900 dark:text-white">{stat.value}</p>
                <p className="text-xs text-neutral-500 dark:text-gray-500">{stat.label}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-neutral-400 mt-3">
            На платформе с {new Date(profile.createdAt).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" })}
          </p>
        </motion.div>

        {/* Badges */}
        {profile.badges.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-white/10 rounded-2xl p-6"
          >
            <h2 className="text-sm font-semibold text-neutral-900 dark:text-white mb-3">Достижения</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {profile.badges.map((badge) => (
                <div key={badge.id} className={`rounded-xl border p-3 text-center ${RARITY_COLORS[badge.rarity] || RARITY_COLORS.common}`} title={badge.description}>
                  {badge.imageUrl ? (
                    <Image src={badge.imageUrl} alt={badge.name} width={48} height={48} className="w-12 h-12 mx-auto mb-2 object-contain" />
                  ) : (
                    <span className="text-3xl block mb-2">{badge.icon || "🏅"}</span>
                  )}
                  <p className="text-xs font-medium text-neutral-900 dark:text-white truncate">{badge.name}</p>
                  <p className="text-[10px] text-neutral-400 mt-0.5 truncate">{badge.description}</p>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Common groups */}
        {profile.commonGroups.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
            className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-white/10 rounded-2xl p-6"
          >
            <h2 className="text-sm font-semibold text-neutral-900 dark:text-white mb-3">Общие группы</h2>
            <div className="space-y-2">
              {profile.commonGroups.map((g) => (
                <div key={g.id} className="flex items-center gap-2 px-3 py-2 bg-neutral-100 dark:bg-white/5 rounded-xl">
                  {g.icon && g.icon.startsWith("/") ? (
                    <img src={g.icon} alt="" className="w-7 h-7 rounded-lg object-cover" />
                  ) : (
                    <span className="text-lg">{g.icon || "💬"}</span>
                  )}
                  <span className="text-sm text-neutral-900 dark:text-white">{g.name}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
