"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import dynamic from "next/dynamic";

import { isOnline, timeAgo } from "@/lib/timeAgo";
import GlowAvatar, { GlowAvatarUser } from "@/components/ui/GlowAvatar";
import ProfileSettingsModal from "@/components/profile/ProfileSettingsModal";

const VoiceChannel = dynamic(() => import("@/components/voice/VoiceChannel"), { ssr: false });
const FriendsPanel = dynamic(() => import("@/components/friends/FriendsPanel"), { ssr: false });

/* ─── Types ─── */

interface Group {
  id: string;
  name: string;
  icon: string | null;
  description: string;
  ownerId: string;
  _count: { members: number; channels: number };
}

interface Channel {
  id: string;
  name: string;
  type: string;
  icon: string | null;
  groupId: string;
  _count: { members: number; messages: number };
}

interface Message {
  id: string;
  content: string;
  createdAt: string;
  user: { id: string; name: string; username?: string; avatar: string | null; role: string; avatarGlowEnabled?: boolean; avatarGlowColors?: string | null };
}

interface GroupDetail extends Group {
  myRole: string;
  channels: Channel[];
  members: { user: { id: string; name: string; username: string; avatar: string | null; role: string; lastSeen?: string | null; avatarGlowEnabled?: boolean; avatarGlowColors?: string | null }; role: string }[];
  invites?: { code: string; uses: number; maxUses: number; expiresAt: string | null }[];
}

/* ─── Modals ─── */

function CreateGroupModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("");

  const handleCreate = async () => {
    if (!name.trim()) return;
    await fetch("/api/groups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, icon: icon || null }),
    });
    onCreated();
    onClose();
  };

  return (
    <ModalBackdrop onClose={onClose}>
      <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4">Создать группу</h3>
      <div className="space-y-3">
        <input type="text" value={name} onChange={(e) => setName(e.target.value)}
          placeholder="Название группы..." className="w-full bg-neutral-50 dark:bg-neutral-700 border border-neutral-200 dark:border-white/10 rounded-xl px-3 py-2.5 text-sm text-neutral-900 dark:text-white placeholder:text-neutral-400" autoFocus />
        <input type="text" value={icon} onChange={(e) => setIcon(e.target.value)}
          placeholder="Иконка (emoji)..." className="w-full bg-neutral-50 dark:bg-neutral-700 border border-neutral-200 dark:border-white/10 rounded-xl px-3 py-2.5 text-sm text-neutral-900 dark:text-white placeholder:text-neutral-400" />
        <div className="flex gap-2 pt-1">
          <button onClick={handleCreate} className="flex-1 px-4 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 dark:from-cyan-500 dark:to-cyan-400 text-white dark:text-neutral-900 rounded-xl hover:shadow-lg transition-all text-sm font-medium">
            Создать
          </button>
          <button onClick={onClose} className="flex-1 px-4 py-2.5 bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-gray-400 rounded-xl hover:bg-neutral-200 dark:hover:bg-neutral-600 transition-all text-sm">
            Отмена
          </button>
        </div>
      </div>
    </ModalBackdrop>
  );
}

function JoinGroupModal({ onClose, onJoined }: { onClose: () => void; onJoined: () => void }) {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleJoin = async () => {
    if (!code.trim()) return;
    setError("");
    setLoading(true);
    const res = await fetch(`/api/invites/${code.trim()}`, { method: "POST" });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Ошибка");
      return;
    }
    onJoined();
    onClose();
  };

  return (
    <ModalBackdrop onClose={onClose}>
      <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4">Присоединиться по приглашению</h3>
      <div className="space-y-3">
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <input type="text" value={code} onChange={(e) => setCode(e.target.value)}
          placeholder="Код приглашения..." className="w-full bg-neutral-50 dark:bg-neutral-700 border border-neutral-200 dark:border-white/10 rounded-xl px-3 py-2.5 text-sm text-neutral-900 dark:text-white placeholder:text-neutral-400" autoFocus />
        <div className="flex gap-2 pt-1">
          <button onClick={handleJoin} disabled={loading} className="flex-1 px-4 py-2.5 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl hover:shadow-lg transition-all text-sm font-medium disabled:opacity-50">
            {loading ? "..." : "Присоединиться"}
          </button>
          <button onClick={onClose} className="flex-1 px-4 py-2.5 bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-gray-400 rounded-xl hover:bg-neutral-200 dark:hover:bg-neutral-600 transition-all text-sm">
            Отмена
          </button>
        </div>
      </div>
    </ModalBackdrop>
  );
}

function CreateChannelModal({ groupId, onClose, onCreated }: { groupId: string; onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState("");
  const [type, setType] = useState("TEXT");

  const handleCreate = async () => {
    if (!name.trim()) return;
    await fetch("/api/channels", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, type, groupId }),
    });
    onCreated();
    onClose();
  };

  return (
    <ModalBackdrop onClose={onClose}>
      <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4">Создать канал</h3>
      <div className="space-y-3">
        <input type="text" value={name} onChange={(e) => setName(e.target.value)}
          placeholder="Название канала..." className="w-full bg-neutral-50 dark:bg-neutral-700 border border-neutral-200 dark:border-white/10 rounded-xl px-3 py-2.5 text-sm text-neutral-900 dark:text-white placeholder:text-neutral-400" autoFocus />
        <div className="flex gap-2">
          <button onClick={() => setType("TEXT")} className={`flex-1 px-3 py-2 rounded-xl text-sm transition-all ${type === "TEXT" ? "bg-violet-50 dark:bg-cyan-400/20 text-violet-600 dark:text-cyan-400 border border-violet-200 dark:border-cyan-400/30" : "bg-neutral-50 dark:bg-neutral-700 text-neutral-500 dark:text-gray-400 border border-neutral-200 dark:border-white/5"}`}>
            💬 Текстовый
          </button>
          <button onClick={() => setType("VOICE")} className={`flex-1 px-3 py-2 rounded-xl text-sm transition-all ${type === "VOICE" ? "bg-emerald-50 dark:bg-emerald-400/20 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-400/30" : "bg-neutral-50 dark:bg-neutral-700 text-neutral-500 dark:text-gray-400 border border-neutral-200 dark:border-white/5"}`}>
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
    </ModalBackdrop>
  );
}

function InviteModal({ groupId, onClose }: { groupId: string; onClose: () => void }) {
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const createInvite = async () => {
    setLoading(true);
    const res = await fetch("/api/invites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ groupId }),
    });
    const data = await res.json();
    setInviteCode(data.code);
    setLoading(false);
  };

  const copyCode = () => {
    if (inviteCode) {
      navigator.clipboard.writeText(inviteCode);
    }
  };

  return (
    <ModalBackdrop onClose={onClose}>
      <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4">Пригласить в группу</h3>
      <div className="space-y-3">
        {inviteCode ? (
          <div className="space-y-2">
            <p className="text-sm text-neutral-500">Код приглашения:</p>
            <div className="flex gap-2">
              <input type="text" value={inviteCode} readOnly className="flex-1 bg-neutral-50 dark:bg-neutral-700 border border-neutral-200 dark:border-white/10 rounded-xl px-3 py-2.5 text-sm text-neutral-900 dark:text-white font-mono" />
              <button onClick={copyCode} className="px-4 py-2.5 bg-violet-100 dark:bg-cyan-400/20 text-violet-600 dark:text-cyan-400 rounded-xl text-sm font-medium hover:bg-violet-200 dark:hover:bg-cyan-400/30 transition-all">
                Копировать
              </button>
            </div>
            <p className="text-xs text-neutral-400">Отправьте этот код другим пользователям</p>
          </div>
        ) : (
          <button onClick={createInvite} disabled={loading} className="w-full px-4 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 dark:from-cyan-500 dark:to-cyan-400 text-white dark:text-neutral-900 rounded-xl hover:shadow-lg transition-all text-sm font-medium disabled:opacity-50">
            {loading ? "Создание..." : "Создать приглашение"}
          </button>
        )}
        <button onClick={onClose} className="w-full px-4 py-2.5 bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-gray-400 rounded-xl hover:bg-neutral-200 dark:hover:bg-neutral-600 transition-all text-sm">
          Закрыть
        </button>
      </div>
    </ModalBackdrop>
  );
}

function MembersPanel({ group, onClose }: { group: GroupDetail; onClose: () => void }) {
  return (
    <div className="w-60 bg-white dark:bg-neutral-900 border-l border-neutral-200 dark:border-white/5 flex flex-col h-full">
      <div className="p-3 border-b border-neutral-200 dark:border-white/5 flex items-center justify-between">
        <span className="text-sm font-medium text-neutral-900 dark:text-white">Участники — {group.members.length}</span>
        <button onClick={onClose} className="text-neutral-400 hover:text-neutral-600 dark:hover:text-white transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
        {group.members.map((m) => (
          <div key={m.user.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-white/5 transition-colors">
            <div className="relative flex-shrink-0">
              <GlowAvatar
                user={m.user}
                size={28}
                onlineColor={isOnline(m.user.lastSeen) ? "green" : "gray"}
              />
            </div>
            <div className="min-w-0">
              <div className="text-sm text-neutral-900 dark:text-white truncate">{m.user.name}</div>
              <div className="text-[10px] text-neutral-400 truncate">
                @{m.user.username}
                {!isOnline(m.user.lastSeen) && m.user.lastSeen && <span className="text-neutral-400/70"> · {timeAgo(m.user.lastSeen)}</span>}
              </div>
            </div>
            {m.role === "OWNER" && <span className="text-[10px] text-amber-500 ml-auto flex-shrink-0">👑</span>}
            {m.role === "ADMIN" && <span className="text-[10px] text-violet-500 ml-auto flex-shrink-0">⚡</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

function ModalBackdrop({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white dark:bg-neutral-800 rounded-2xl border border-neutral-200 dark:border-white/10 p-6 max-w-sm w-full shadow-2xl"
        onClick={(e) => e.stopPropagation()}>
        {children}
      </motion.div>
    </motion.div>
  );
}

/* ─── Main Page ─── */

export default function ConnectPage() {
  const { data: session, status } = useSession();
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [groupDetail, setGroupDetail] = useState<GroupDetail | null>(null);
  const [selectedChannel, setSelectedChannel] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [activeVoiceChannel, setActiveVoiceChannel] = useState<{ id: string; name: string } | null>(null);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showJoinGroup, setShowJoinGroup] = useState(false);
  const [showCreateChannel, setShowCreateChannel] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [showFriends, setShowFriends] = useState(false);
  const [showProfileSettings, setShowProfileSettings] = useState(false);
  const [myGlowSettings, setMyGlowSettings] = useState<{ avatarGlowEnabled: boolean; avatarGlowColors: string | null } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  const isBanned = session?.user?.banned && (!session.user.bannedUntil || new Date(session.user.bannedUntil) > new Date());
  const canManage = groupDetail?.myRole === "OWNER" || groupDetail?.myRole === "ADMIN";

  const fetchGroups = useCallback(() => {
    fetch("/api/groups").then((r) => r.json()).then((data) => {
      if (Array.isArray(data)) setGroups(data);
    });
  }, []);

  const fetchGroupDetail = useCallback(async (groupId: string) => {
    const res = await fetch(`/api/groups/${groupId}`);
    if (res.ok) {
      const data = await res.json();
      setGroupDetail(data);
    }
  }, []);

  const fetchMessages = useCallback(async (channelId: string) => {
    const res = await fetch(`/api/messages?channelId=${channelId}`);
    if (res.ok) {
      const data = await res.json();
      setMessages(data);
    }
  }, []);

  // Fetch own glow settings (ADMINs only, lazy)
  useEffect(() => {
    if (session?.user && (session.user as { role?: string }).role === "ADMIN") {
      fetch("/api/profile/me")
        .then((r) => r.json())
        .then((d) => setMyGlowSettings({ avatarGlowEnabled: d.avatarGlowEnabled, avatarGlowColors: d.avatarGlowColors }))
        .catch(() => {});
    }
  }, [session]);

  // Build a GlowAvatarUser for the current session user
  const myProfileUser: GlowAvatarUser = {
    id: (session?.user as { id?: string } | undefined)?.id ?? "",
    name: session?.user?.name ?? "",
    role: (session?.user as { role?: string } | undefined)?.role ?? "USER",
    avatar: null,
    avatarGlowEnabled: myGlowSettings?.avatarGlowEnabled ?? false,
    avatarGlowColors: myGlowSettings?.avatarGlowColors ?? null,
  };

  useEffect(() => {
    if (session?.user) fetchGroups();
  }, [session, fetchGroups]);

  useEffect(() => {
    if (selectedGroup) {
      fetchGroupDetail(selectedGroup);
      setSelectedChannel(null);
      setMessages([]);
    }
  }, [selectedGroup, fetchGroupDetail]);

  useEffect(() => {
    if (selectedChannel) {
      fetchMessages(selectedChannel);
      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = setInterval(() => fetchMessages(selectedChannel), 3000);
    }
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
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

  const handleChannelClick = (channel: Channel) => {
    if (channel.type === "VOICE") {
      setActiveVoiceChannel({ id: channel.id, name: channel.name });
    } else {
      setSelectedChannel(channel.id);
    }
  };

  const deleteChannel = async (channelId: string) => {
    if (!confirm("Удалить канал?")) return;
    await fetch(`/api/channels/${channelId}`, { method: "DELETE" });
    if (selectedChannel === channelId) setSelectedChannel(null);
    if (selectedGroup) fetchGroupDetail(selectedGroup);
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-neutral-950">
        <div className="animate-spin w-8 h-8 border-2 border-violet-500 dark:border-cyan-400 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-neutral-950">
        <div className="text-center max-w-md px-6">
          <span className="text-6xl block mb-4">💬</span>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white mb-3">TZ.Connect</h1>
          <p className="text-neutral-500 mb-6">Войдите или зарегистрируйтесь, чтобы присоединиться к группам и общаться</p>
          <Link href="/auth/signin" className="btn-primary">Войти</Link>
        </div>
      </div>
    );
  }

  const selectedChannelData = groupDetail?.channels.find((c) => c.id === selectedChannel);
  const textChannels = groupDetail?.channels.filter((c) => c.type === "TEXT") || [];
  const voiceChannels = groupDetail?.channels.filter((c) => c.type === "VOICE") || [];

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 flex">
      {/* Group Sidebar (narrow icon strip like Discord) */}
      <div className="w-[72px] bg-neutral-100 dark:bg-neutral-950 border-r border-neutral-200 dark:border-white/5 flex flex-col items-center py-3 gap-2 h-[calc(100vh-64px)] overflow-y-auto">
        {groups.map((group) => (
          <button key={group.id} onClick={() => setSelectedGroup(group.id)}
            className={`w-12 h-12 rounded-2xl flex items-center justify-center text-lg transition-all duration-300 hover:rounded-xl ${
              selectedGroup === group.id
                ? "bg-violet-500 dark:bg-cyan-500 text-white rounded-xl shadow-lg"
                : "bg-neutral-200 dark:bg-neutral-800 text-neutral-600 dark:text-gray-400 hover:bg-violet-200 dark:hover:bg-cyan-400/20 hover:text-violet-700 dark:hover:text-cyan-400"
            }`}
            title={group.name}
          >
            {group.icon || group.name.charAt(0).toUpperCase()}
          </button>
        ))}

        <div className="w-8 h-px bg-neutral-300 dark:bg-white/10 my-1" />

        <button onClick={() => setShowCreateGroup(true)}
          className="w-12 h-12 rounded-2xl bg-neutral-200 dark:bg-neutral-800 text-green-600 dark:text-green-400 flex items-center justify-center hover:bg-green-100 dark:hover:bg-green-400/20 hover:rounded-xl transition-all duration-300"
          title="Создать группу">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
        </button>

        <button onClick={() => setShowJoinGroup(true)}
          className="w-12 h-12 rounded-2xl bg-neutral-200 dark:bg-neutral-800 text-blue-600 dark:text-blue-400 flex items-center justify-center hover:bg-blue-100 dark:hover:bg-blue-400/20 hover:rounded-xl transition-all duration-300"
          title="Присоединиться">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg>
        </button>

        <div className="w-8 h-px bg-neutral-300 dark:bg-white/10 my-1" />

        <button onClick={() => setShowFriends(!showFriends)}
          className={`w-12 h-12 rounded-2xl flex items-center justify-center hover:rounded-xl transition-all duration-300 ${
            showFriends
              ? "bg-amber-500 dark:bg-amber-500 text-white rounded-xl shadow-lg"
              : "bg-neutral-200 dark:bg-neutral-800 text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-400/20"
          }`}
          title="Друзья">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
        </button>
      </div>

      {/* Channel Sidebar */}
      {selectedGroup && groupDetail && (
        <div className="w-60 bg-white dark:bg-neutral-900 border-r border-neutral-200 dark:border-white/5 flex flex-col h-[calc(100vh-64px)]">
          <div className="p-3 border-b border-neutral-200 dark:border-white/5">
            <h2 className="font-bold text-neutral-900 dark:text-white text-sm truncate">{groupDetail.name}</h2>
            {groupDetail.description && <p className="text-[11px] text-neutral-400 truncate mt-0.5">{groupDetail.description}</p>}
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
            {/* Text channels */}
            <div className="flex items-center justify-between px-2 py-1">
              <span className="text-[11px] text-neutral-400 uppercase tracking-wider font-semibold">Текстовые</span>
              {canManage && (
                <button onClick={() => setShowCreateChannel(true)} className="text-neutral-400 hover:text-violet-500 dark:hover:text-cyan-400 transition-colors">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                </button>
              )}
            </div>
            {textChannels.map((ch) => (
              <div key={ch.id} className="group flex items-center">
                <button onClick={() => handleChannelClick(ch)}
                  className={`flex-1 text-left px-2.5 py-1.5 rounded-lg flex items-center gap-2 transition-all text-sm ${
                    selectedChannel === ch.id
                      ? "bg-violet-50 dark:bg-cyan-400/10 text-violet-700 dark:text-cyan-400"
                      : "text-neutral-600 dark:text-gray-400 hover:bg-neutral-100 dark:hover:bg-white/5 hover:text-neutral-900 dark:hover:text-white"
                  }`}>
                  <span className="text-base">{ch.icon || "💬"}</span>
                  <span className="truncate">{ch.name}</span>
                </button>
                {canManage && (
                  <button onClick={() => deleteChannel(ch.id)} className="opacity-0 group-hover:opacity-100 p-1 text-neutral-400 hover:text-red-500 transition-all">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                )}
              </div>
            ))}

            {/* Voice channels */}
            {voiceChannels.length > 0 && (
              <>
                <div className="flex items-center justify-between px-2 py-1 mt-3">
                  <span className="text-[11px] text-neutral-400 uppercase tracking-wider font-semibold">Голосовые</span>
                </div>
                {voiceChannels.map((ch) => (
                  <div key={ch.id} className="group flex items-center">
                    <button onClick={() => handleChannelClick(ch)}
                      className="flex-1 text-left px-2.5 py-1.5 rounded-lg flex items-center gap-2 text-neutral-600 dark:text-gray-400 hover:bg-neutral-100 dark:hover:bg-white/5 hover:text-neutral-900 dark:hover:text-white transition-all text-sm">
                      <span className="text-base">{ch.icon || "🎙️"}</span>
                      <span className="truncate">{ch.name}</span>
                    </button>
                    {canManage && (
                      <button onClick={() => deleteChannel(ch.id)} className="opacity-0 group-hover:opacity-100 p-1 text-neutral-400 hover:text-red-500 transition-all">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                    )}
                  </div>
                ))}
              </>
            )}
          </div>

          {/* Group bottom bar: invite + members */}
          <div className="p-2 border-t border-neutral-200 dark:border-white/5 space-y-1">
            {canManage && (
              <button onClick={() => setShowInvite(true)} className="w-full px-3 py-1.5 text-left text-sm text-violet-600 dark:text-cyan-400 hover:bg-violet-50 dark:hover:bg-cyan-400/10 rounded-lg transition-colors flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                Пригласить
              </button>
            )}
            <button onClick={() => setShowMembers(!showMembers)} className="w-full px-3 py-1.5 text-left text-sm text-neutral-600 dark:text-gray-400 hover:bg-neutral-100 dark:hover:bg-white/5 rounded-lg transition-colors flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
              Участники ({groupDetail.members.length})
            </button>
          </div>

          {/* User info */}
          <div className="p-2 border-t border-neutral-200 dark:border-white/5">
            <div className="flex items-center gap-2 px-2 py-1.5">
              <GlowAvatar user={myProfileUser} size={32} />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-neutral-900 dark:text-white truncate">{session.user.name}</div>
                <div className="text-[10px] text-neutral-400 truncate">@{session.user.username}</div>
              </div>
              {(session.user as { role?: string }).role === "ADMIN" && (
                <button
                  onClick={() => setShowProfileSettings(true)}
                  title="Настройки профиля"
                  className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-white/10 text-neutral-400 hover:text-violet-500 dark:hover:text-violet-400 transition-colors flex-shrink-0"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-[calc(100vh-64px)]">
        {/* Header */}
        {selectedChannelData && (
          <div className="h-12 bg-white/50 dark:bg-neutral-900/50 border-b border-neutral-200 dark:border-white/5 flex items-center px-4 gap-2 backdrop-blur-sm">
            <span>{selectedChannelData.icon || "💬"}</span>
            <span className="font-medium text-neutral-900 dark:text-white text-sm">{selectedChannelData.name}</span>
            <span className="text-xs text-neutral-400">&#x2022; {selectedChannelData._count.messages} сообщений</span>
          </div>
        )}

        {/* Ban notice */}
        {isBanned && (
          <div className="mx-4 mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-500/30 rounded-xl text-center">
            <p className="text-red-600 dark:text-red-400 text-sm font-medium">
              Ваш аккаунт ограничен {session.user.bannedUntil ? `до ${new Date(session.user.bannedUntil).toLocaleString("ru-RU")}` : "бессрочно"}
            </p>
          </div>
        )}

        {/* Messages / Welcome */}
        {selectedChannel && selectedChannelData ? (
          <>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.length === 0 ? (
                <div className="flex items-center justify-center h-full text-neutral-400">
                  <div className="text-center">
                    <span className="text-4xl block mb-3">💬</span>
                    <p className="text-sm">Нет сообщений. Начните общение!</p>
                  </div>
                </div>
              ) : (
                messages.map((msg) => (
                  <motion.div key={msg.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="flex gap-3 group">
                    <GlowAvatar user={msg.user} size={36} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2">
                        <span className="font-medium text-neutral-900 dark:text-white text-sm">{msg.user.name}</span>
                        {msg.user.username && <span className="text-[11px] text-neutral-400">@{msg.user.username}</span>}
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

            {/* Input */}
            {!isBanned ? (
              <form onSubmit={sendMessage} className="p-3 border-t border-neutral-200 dark:border-white/5">
                <div className="flex gap-2">
                  <input type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)}
                    placeholder={`Написать в #${selectedChannelData.name}...`} className="input-field flex-1 !py-2.5" />
                  <button type="submit" className="btn-primary !px-4 !py-2.5">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                  </button>
                </div>
              </form>
            ) : (
              <div className="p-3 border-t border-neutral-200 dark:border-white/5 text-center text-red-400/60 text-sm">
                Отправка сообщений ограничена
              </div>
            )}
          </>
        ) : selectedGroup ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <span className="text-5xl block mb-4">{groupDetail?.icon || "💬"}</span>
              <h2 className="text-xl font-bold text-neutral-900 dark:text-white mb-1">{groupDetail?.name}</h2>
              <p className="text-neutral-400 text-sm">Выберите канал для общения</p>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center max-w-sm px-6">
              <span className="text-6xl block mb-4">💬</span>
              <h2 className="text-xl font-bold text-neutral-900 dark:text-white mb-2">TZ.Connect</h2>
              <p className="text-neutral-400 text-sm mb-6">Выберите группу слева или создайте новую</p>
              <div className="flex gap-3 justify-center">
                <button onClick={() => setShowCreateGroup(true)} className="btn-primary text-sm">Создать группу</button>
                <button onClick={() => setShowJoinGroup(true)} className="btn-secondary text-sm">Присоединиться</button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Members Panel */}
      {showMembers && groupDetail && (
        <MembersPanel group={groupDetail} onClose={() => setShowMembers(false)} />
      )}

      {/* Friends Panel */}
      {showFriends && (
        <FriendsPanel onClose={() => setShowFriends(false)} />
      )}

      {/* Modals */}
      <AnimatePresence>
        {showCreateGroup && <CreateGroupModal onClose={() => setShowCreateGroup(false)} onCreated={fetchGroups} />}
        {showJoinGroup && <JoinGroupModal onClose={() => setShowJoinGroup(false)} onJoined={fetchGroups} />}
        {showCreateChannel && selectedGroup && <CreateChannelModal groupId={selectedGroup} onClose={() => setShowCreateChannel(false)} onCreated={() => { if (selectedGroup) fetchGroupDetail(selectedGroup); }} />}
        {showInvite && selectedGroup && <InviteModal groupId={selectedGroup} onClose={() => setShowInvite(false)} />}
        {showProfileSettings && session?.user && (
          <ProfileSettingsModal
            user={myProfileUser}
            onClose={() => setShowProfileSettings(false)}
            onSaved={(settings) => {
              setMyGlowSettings(settings);
            }}
          />
        )}
      </AnimatePresence>

      {/* Voice Channel Modal */}
      <AnimatePresence>
        {activeVoiceChannel && (
          <VoiceChannel channelId={activeVoiceChannel.id} channelName={activeVoiceChannel.name} onClose={() => setActiveVoiceChannel(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}
