"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import { AnimatePresence } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import dynamic from "next/dynamic";

import GlowAvatar, { GlowAvatarUser } from "@/components/ui/GlowAvatar";
import { isOnline, timeAgo } from "@/lib/timeAgo";
import ProfileSettingsModal from "@/components/profile/ProfileSettingsModal";

import NavRail from "@/components/connect/NavRail";
import { NavSection } from "@/components/connect/NavRail";
import SwipeBackWrapper from "@/components/mobile/SwipeBackWrapper";
import BottomSheet from "@/components/mobile/BottomSheet";
import GroupListPanel from "@/components/connect/GroupListPanel";
import ChannelSidebar from "@/components/connect/ChannelSidebar";
import MessageArea from "@/components/connect/MessageArea";
import MobileGroupList from "@/components/connect/MobileGroupList";
import ModalBackdrop from "@/components/connect/ModalBackdrop";
import ConnectSplash from "@/components/connect/ConnectSplash";
// ThemeProvider is now in global Providers

const ScreenShareWindow = dynamic(() => import("@/components/voice/ScreenShareWindow"), { ssr: false });
const VoiceExpandedPanel = dynamic(() => import("@/components/voice/VoiceExpandedPanel"), { ssr: false });
const FriendsPanel = dynamic(() => import("@/components/friends/FriendsPanel"), { ssr: false });
const DMPanel = dynamic(() => import("@/components/dm/DMPanel"), { ssr: false });
const AiChatPanel = dynamic(() => import("@/components/ai/AiChatPanel"), { ssr: false });
import { useVoice } from "@/contexts/VoiceContext";

/* ─── Types ─── */

interface Group {
  id: string;
  name: string;
  icon: string | null;
  description: string;
  ownerId: string;
  isMain?: boolean;
  _count: { members: number; channels: number };
}

interface Channel {
  id: string;
  name: string;
  type: string;
  icon: string | null;
  groupId: string;
  serviceId?: string | null;
  _count: { members: number; messages: number };
}

interface GroupMember {
  id: string;
  role: string;
  user: { id: string; name: string; username: string; avatar: string | null; role: string; lastSeen?: string | null; avatarGlowEnabled?: boolean; avatarGlowColors?: string | null };
}

interface GroupDetail extends Group {
  myRole: string;
  rules: string;
  rulesAccepted: boolean;
  createdAt: string;
  owner: { id: string; name: string; username: string };
  channels: Channel[];
  members: GroupMember[];
  invites?: { code: string; uses: number; maxUses: number; expiresAt: string | null }[];
}

/* ─── Modals ─── */

function CreateGroupModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState("");
  const [iconFile, setIconFile] = useState<File | null>(null);
  const [iconPreview, setIconPreview] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleIconChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setError("Файл слишком большой (макс. 2MB)");
      return;
    }
    setIconFile(file);
    setIconPreview(URL.createObjectURL(file));
    setError("");
  };

  const handleCreate = async () => {
    if (!name.trim()) return;
    setError("");
    setLoading(true);

    try {
      let iconUrl: string | null = null;

      if (iconFile) {
        const formData = new FormData();
        formData.append("icon", iconFile);
        const uploadRes = await fetch("/api/groups/icon", { method: "POST", body: formData });
        if (!uploadRes.ok) {
          const data = await uploadRes.json();
          setError(data.error || "Ошибка загрузки иконки");
          setLoading(false);
          return;
        }
        const uploadData = await uploadRes.json();
        iconUrl = uploadData.icon;
      }

      const res = await fetch("/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, icon: iconUrl }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Ошибка создания группы");
        setLoading(false);
        return;
      }

      onCreated();
      onClose();
    } catch {
      setError("Ошибка сети. Попробуйте позже.");
      setLoading(false);
    }
  };

  return (
    <ModalBackdrop onClose={onClose}>
      <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4">Создать группу</h3>
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <label className="relative cursor-pointer group flex-shrink-0">
            <div className="w-14 h-14 rounded-xl bg-neutral-200 dark:bg-neutral-700 flex items-center justify-center overflow-hidden border-2 border-dashed border-neutral-300 dark:border-white/20 group-hover:border-violet-400 dark:group-hover:border-cyan-400 transition-colors">
              {iconPreview ? (
                <img src={iconPreview} alt="Icon" className="w-full h-full object-cover" />
              ) : (
                <svg className="w-6 h-6 text-neutral-400 group-hover:text-violet-500 dark:group-hover:text-cyan-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              )}
            </div>
            <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={handleIconChange} className="hidden" />
          </label>
          <div className="flex-1 min-w-0">
            <input type="text" value={name} onChange={(e) => setName(e.target.value)}
              placeholder="Название группы..." className="w-full bg-neutral-50 dark:bg-neutral-700 border border-neutral-200 dark:border-white/10 rounded-xl px-3 py-2.5 text-sm text-neutral-900 dark:text-white placeholder:text-neutral-400" autoFocus />
            <p className="text-[11px] text-neutral-400 mt-1">Иконка необязательна</p>
          </div>
        </div>
        {error && <p className="text-xs text-red-500 dark:text-red-400">{error}</p>}
        <div className="flex gap-2 pt-1">
          <button onClick={handleCreate} disabled={loading || !name.trim()} className="flex-1 px-4 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 dark:from-cyan-500 dark:to-cyan-400 text-white dark:text-neutral-900 rounded-xl hover:shadow-lg transition-all text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed">
            {loading ? "Создание..." : "Создать"}
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
    if (!res.ok) { setError(data.error || "Ошибка"); return; }
    onJoined();
    onClose();
  };

  return (
    <ModalBackdrop onClose={onClose}>
      <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4">Присоединиться по приглашению</h3>
      <div className="space-y-3">
        {error && <p className="text-red-500 text-sm" role="alert">{error}</p>}
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleCreate = async () => {
    if (!name.trim()) return;
    setLoading(true);
    setError("");
    const res = await fetch("/api/channels", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), type, groupId }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Ошибка создания канала");
      return;
    }
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
            Текстовый
          </button>
          <button onClick={() => setType("VOICE")} className={`flex-1 px-3 py-2 rounded-xl text-sm transition-all ${type === "VOICE" ? "bg-emerald-50 dark:bg-emerald-400/20 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-400/30" : "bg-neutral-50 dark:bg-neutral-700 text-neutral-500 dark:text-gray-400 border border-neutral-200 dark:border-white/5"}`}>
            Голосовой
          </button>
        </div>
        {error && <p className="text-xs text-red-500 dark:text-red-400">{error}</p>}
        <div className="flex gap-2 pt-1">
          <button onClick={handleCreate} disabled={loading || !name.trim()} className="flex-1 px-4 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 dark:from-cyan-500 dark:to-cyan-400 text-white dark:text-neutral-900 rounded-xl hover:shadow-lg transition-all text-sm font-medium disabled:opacity-50">
            {loading ? "Создание..." : "Создать"}
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
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const createInvite = async () => {
    setLoading(true);
    setError("");
    const res = await fetch("/api/invites", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ groupId }) });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) { setError(data.error || "Ошибка создания приглашения"); return; }
    setInviteCode(data.code);
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
              <button onClick={() => { navigator.clipboard.writeText(inviteCode); setCopied(true); setTimeout(() => setCopied(false), 2000); }} className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${copied ? "bg-green-100 dark:bg-green-400/20 text-green-600 dark:text-green-400" : "bg-violet-100 dark:bg-cyan-400/20 text-violet-600 dark:text-cyan-400 hover:bg-violet-200 dark:hover:bg-cyan-400/30"}`}>
                {copied ? "Скопировано!" : "Копировать"}
              </button>
            </div>
          </div>
        ) : (
          <button onClick={createInvite} disabled={loading} className="w-full px-4 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 dark:from-cyan-500 dark:to-cyan-400 text-white dark:text-neutral-900 rounded-xl text-sm font-medium disabled:opacity-50">
            {loading ? "..." : "Создать приглашение"}
          </button>
        )}
        {error && <p className="text-xs text-red-500 dark:text-red-400">{error}</p>}
        <button onClick={onClose} className="w-full px-4 py-2.5 bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-gray-400 rounded-xl hover:bg-neutral-200 dark:hover:bg-neutral-600 transition-all text-sm">
          Закрыть
        </button>
      </div>
    </ModalBackdrop>
  );
}

function GroupRulesGate({ group, onAccept }: { group: GroupDetail; onAccept: () => void }) {
  const [loading, setLoading] = useState(false);
  const [imgError, setImgError] = useState(false);

  return (
    <div className="max-w-lg w-full mx-4 p-6 bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-white/10 shadow-lg">
      <div className="text-center mb-4">
        {group.icon && group.icon.startsWith("/") && !imgError ? (
          <div className="w-16 h-16 rounded-xl overflow-hidden mx-auto mb-3">
            <Image src={group.icon} alt={group.name} width={64} height={64} className="w-full h-full object-cover" onError={() => setImgError(true)} />
          </div>
        ) : (
          <div className="w-16 h-16 rounded-xl bg-violet-100 dark:bg-cyan-400/10 flex items-center justify-center mx-auto mb-3">
            <svg className="w-8 h-8 text-violet-500 dark:text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
            </svg>
          </div>
        )}
        <h2 className="text-lg font-bold text-neutral-900 dark:text-white">{group.name}</h2>
        <p className="text-xs text-neutral-400 mt-1">Ознакомьтесь с правилами сообщества</p>
      </div>
      <div className="bg-neutral-50 dark:bg-neutral-800 rounded-xl p-4 mb-4 max-h-60 overflow-y-auto">
        <p className="text-sm text-neutral-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">{group.rules}</p>
      </div>
      <button
        onClick={async () => {
          setLoading(true);
          try {
            await onAccept();
          } finally {
            setLoading(false);
          }
        }}
        disabled={loading}
        className="w-full px-4 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 dark:from-cyan-500 dark:to-cyan-400 text-white dark:text-neutral-900 rounded-xl hover:shadow-lg transition-all text-sm font-medium disabled:opacity-50"
      >
        {loading ? "..." : "Принимаю правила"}
      </button>
    </div>
  );
}

function GroupInfoPanel({ group, canManage, onUpdateRules, onAutoSelectChannel }: { group: GroupDetail; canManage: boolean; onUpdateRules: (rules: string) => Promise<void>; onAutoSelectChannel?: () => void }) {
  const [editingRules, setEditingRules] = useState(false);
  const [rulesText, setRulesText] = useState(group.rules || "");
  const [saving, setSaving] = useState(false);
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    if (onAutoSelectChannel) onAutoSelectChannel();
  }, [onAutoSelectChannel]);

  const onlineCount = group.members.filter(m => m.user.lastSeen && (Date.now() - new Date(m.user.lastSeen).getTime()) < 60000).length;
  const created = new Date(group.createdAt).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" });

  const handleSaveRules = async () => {
    setSaving(true);
    await onUpdateRules(rulesText);
    setEditingRules(false);
    setSaving(false);
  };

  return (
    <div className="max-w-md w-full mx-4 py-8">
      <div className="text-center mb-6">
        {group.icon && group.icon.startsWith("/") && !imgError ? (
          <div className="w-20 h-20 rounded-2xl overflow-hidden mx-auto mb-4 shadow-lg">
            <Image src={group.icon} alt={group.name} width={80} height={80} className="w-full h-full object-cover" onError={() => setImgError(true)} />
          </div>
        ) : (
          <div className="w-20 h-20 rounded-2xl bg-violet-100 dark:bg-cyan-400/10 flex items-center justify-center mx-auto mb-4">
            <svg className="w-10 h-10 text-violet-500 dark:text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
            </svg>
          </div>
        )}
        <h2 className="text-xl font-bold text-neutral-900 dark:text-white">{group.name}</h2>
        {group.description && <p className="text-sm text-neutral-500 dark:text-gray-400 mt-1">{group.description}</p>}
      </div>

      <div className="space-y-3 mb-6">
        <div className="flex items-center gap-3 p-3 bg-neutral-50 dark:bg-neutral-800/50 rounded-xl">
          <svg className="w-4 h-4 text-neutral-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
          </svg>
          <div className="text-sm">
            <span className="text-neutral-900 dark:text-white font-medium">Владелец:</span>{" "}
            <span className="text-neutral-500 dark:text-gray-400">@{group.owner.username}</span>
          </div>
        </div>
        <div className="flex items-center gap-3 p-3 bg-neutral-50 dark:bg-neutral-800/50 rounded-xl">
          <svg className="w-4 h-4 text-neutral-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
          </svg>
          <div className="text-sm">
            <span className="text-neutral-900 dark:text-white font-medium">{group.members.length}</span>{" "}
            <span className="text-neutral-500 dark:text-gray-400">участников</span>
            {onlineCount > 0 && (
              <span className="text-green-500 ml-2">({onlineCount} онлайн)</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3 p-3 bg-neutral-50 dark:bg-neutral-800/50 rounded-xl">
          <svg className="w-4 h-4 text-neutral-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
          </svg>
          <div className="text-sm">
            <span className="text-neutral-500 dark:text-gray-400">Создана {created}</span>
          </div>
        </div>
      </div>

      {/* Rules section */}
      {canManage ? (
        <div className="border border-neutral-200 dark:border-white/10 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-neutral-900 dark:text-white">Правила сообщества</h3>
            {!editingRules && (
              <button onClick={() => { setRulesText(group.rules || ""); setEditingRules(true); }} className="text-xs text-violet-500 dark:text-cyan-400 hover:underline">
                {group.rules ? "Редактировать" : "Добавить"}
              </button>
            )}
          </div>
          {editingRules ? (
            <div className="space-y-2">
              <textarea
                value={rulesText}
                onChange={(e) => setRulesText(e.target.value)}
                placeholder="Напишите правила вашего сообщества..."
                className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-neutral-900 dark:text-white placeholder:text-neutral-400 resize-none h-32"
                autoFocus
              />
              <div className="flex gap-2">
                <button onClick={handleSaveRules} disabled={saving} className="px-3 py-1.5 bg-violet-500 dark:bg-cyan-500 text-white dark:text-neutral-900 rounded-lg text-xs font-medium disabled:opacity-50">
                  {saving ? "..." : "Сохранить"}
                </button>
                <button onClick={() => setEditingRules(false)} className="px-3 py-1.5 bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-gray-400 rounded-lg text-xs">
                  Отмена
                </button>
              </div>
            </div>
          ) : group.rules ? (
            <p className="text-sm text-neutral-600 dark:text-gray-400 whitespace-pre-wrap leading-relaxed">{group.rules}</p>
          ) : (
            <p className="text-xs text-neutral-400 italic">Правила не установлены. Новые участники увидят их при первом входе.</p>
          )}
        </div>
      ) : group.rules ? (
        <div className="border border-neutral-200 dark:border-white/10 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-neutral-900 dark:text-white mb-2">Правила сообщества</h3>
          <p className="text-sm text-neutral-600 dark:text-gray-400 whitespace-pre-wrap leading-relaxed">{group.rules}</p>
        </div>
      ) : null}

      <p className="text-center text-neutral-400 text-xs mt-6">Выберите канал для общения</p>
    </div>
  );
}

function GroupSettingsModal({ group, onClose, onUpdated, onDelete }: { group: GroupDetail; onClose: () => void; onUpdated: () => void; onDelete: () => void }) {
  const [tab, setTab] = useState<"general" | "rules" | "members">("general");
  const [name, setName] = useState(group.name);
  const [description, setDescription] = useState(group.description || "");
  const [iconFile, setIconFile] = useState<File | null>(null);
  const [iconPreview, setIconPreview] = useState<string | null>(group.icon && group.icon.startsWith("/") ? group.icon : null);
  const [rules, setRules] = useState(group.rules || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const isOwner = group.myRole === "OWNER";

  const handleIconChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { setError("Файл макс 2MB"); return; }
    setIconFile(file);
    setIconPreview(URL.createObjectURL(file));
  };

  const handleSaveGeneral = async () => {
    setSaving(true);
    setError("");
    try {
      let iconUrl = group.icon;
      if (iconFile) {
        const formData = new FormData();
        formData.append("icon", iconFile);
        const uploadRes = await fetch("/api/groups/icon", { method: "POST", body: formData });
        if (!uploadRes.ok) { setError("Ошибка загрузки иконки"); setSaving(false); return; }
        iconUrl = (await uploadRes.json()).icon;
      }
      await fetch(`/api/groups/${group.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), description: description.trim(), icon: iconUrl }),
      });
      onUpdated();
      onClose();
    } catch { setError("Ошибка сети"); }
    setSaving(false);
  };

  const handleSaveRules = async () => {
    setSaving(true);
    await fetch(`/api/groups/${group.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rules }),
    });
    onUpdated();
    setSaving(false);
    onClose();
  };

  const handleRoleChange = async (memberId: string, role: string) => {
    await fetch(`/api/groups/${group.id}/members/${memberId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    onUpdated();
  };

  const handleKick = async (memberId: string) => {
    if (!confirm("Исключить участника?")) return;
    await fetch(`/api/groups/${group.id}/members/${memberId}`, { method: "DELETE" });
    onUpdated();
  };

  const tabs = [
    { key: "general" as const, label: "Основное" },
    { key: "rules" as const, label: "Правила" },
    { key: "members" as const, label: "Участники" },
  ];

  const roleLabel = (r: string) => r === "OWNER" ? "Создатель" : r === "MODERATOR" ? "Модератор" : "Участник";

  return (
    <ModalBackdrop onClose={onClose}>
      <div className="w-full max-w-lg">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">Настройки группы</h3>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-600 dark:hover:text-white">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="flex gap-1 mb-4 bg-neutral-100 dark:bg-neutral-800 rounded-xl p-1">
          {tabs.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${tab === t.key ? "bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-sm" : "text-neutral-500 dark:text-gray-400 hover:text-neutral-700 dark:hover:text-gray-300"}`}>
              {t.label}
            </button>
          ))}
        </div>

        {error && <p className="text-xs text-red-500 mb-3">{error}</p>}

        {tab === "general" && (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <label className="relative cursor-pointer group flex-shrink-0">
                <div className="w-14 h-14 rounded-xl bg-neutral-200 dark:bg-neutral-700 flex items-center justify-center overflow-hidden border-2 border-dashed border-neutral-300 dark:border-white/20 group-hover:border-violet-400 dark:group-hover:border-cyan-400 transition-colors">
                  {iconPreview ? (
                    <img src={iconPreview} alt="Icon" className="w-full h-full object-cover" />
                  ) : (
                    <svg className="w-6 h-6 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  )}
                </div>
                <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={handleIconChange} className="hidden" />
              </label>
              <div className="flex-1 min-w-0">
                <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Название..."
                  className="w-full bg-neutral-50 dark:bg-neutral-700 border border-neutral-200 dark:border-white/10 rounded-xl px-3 py-2 text-sm text-neutral-900 dark:text-white" />
              </div>
            </div>
            <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Описание группы..."
              className="w-full bg-neutral-50 dark:bg-neutral-700 border border-neutral-200 dark:border-white/10 rounded-xl px-3 py-2 text-sm text-neutral-900 dark:text-white placeholder:text-neutral-400 resize-none h-20" />
            <div className="flex gap-2">
              <button onClick={handleSaveGeneral} disabled={saving || !name.trim()} className="flex-1 px-4 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 dark:from-cyan-500 dark:to-cyan-400 text-white dark:text-neutral-900 rounded-xl text-sm font-medium disabled:opacity-50">
                {saving ? "..." : "Сохранить"}
              </button>
              {isOwner && (
                <button onClick={onDelete} className="px-4 py-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-500/30 rounded-xl text-sm font-medium hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors">
                  Удалить
                </button>
              )}
            </div>
          </div>
        )}

        {tab === "rules" && (
          <div className="space-y-3">
            <p className="text-xs text-neutral-400">Новые участники увидят эти правила и должны будут их принять при первом входе.</p>
            <textarea value={rules} onChange={e => setRules(e.target.value)} placeholder="Напишите правила сообщества..."
              className="w-full bg-neutral-50 dark:bg-neutral-700 border border-neutral-200 dark:border-white/10 rounded-xl px-3 py-2 text-sm text-neutral-900 dark:text-white placeholder:text-neutral-400 resize-none h-40" />
            <button onClick={handleSaveRules} disabled={saving} className="w-full px-4 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 dark:from-cyan-500 dark:to-cyan-400 text-white dark:text-neutral-900 rounded-xl text-sm font-medium disabled:opacity-50">
              {saving ? "..." : "Сохранить правила"}
            </button>
          </div>
        )}

        {tab === "members" && (
          <div className="space-y-1 max-h-72 overflow-y-auto">
            {group.members.map(m => (
              <div key={m.id} className="flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-neutral-50 dark:hover:bg-white/5">
                <GlowAvatar user={m.user} size={28} />
                <div className="min-w-0 flex-1">
                  <div className="text-sm text-neutral-900 dark:text-white truncate">{m.user.name}</div>
                  <div className="text-[10px] text-neutral-400">@{m.user.username} — {roleLabel(m.role)}</div>
                </div>
                {isOwner && m.role !== "OWNER" && (
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <select
                      value={m.role}
                      onChange={e => handleRoleChange(m.id, e.target.value)}
                      className="text-[11px] bg-neutral-100 dark:bg-neutral-700 border border-neutral-200 dark:border-white/10 rounded-lg px-1.5 py-1 text-neutral-700 dark:text-gray-300"
                    >
                      <option value="MEMBER">Участник</option>
                      <option value="MODERATOR">Модератор</option>
                    </select>
                    <button onClick={() => handleKick(m.id)} className="p-1 text-neutral-400 hover:text-red-500 transition-colors" title="Исключить">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </ModalBackdrop>
  );
}

function MembersPanel({ group, onClose }: { group: GroupDetail; onClose: () => void }) {
  return (
    <aside className="w-60 flex-shrink-0 max-lg:absolute max-lg:right-0 max-lg:top-0 max-lg:h-full max-lg:z-40 max-lg:shadow-xl max-lg:animate-slide-in-right bg-white dark:bg-neutral-900 border-l border-neutral-200 dark:border-white/5 flex flex-col h-full transition-all duration-200">
      <div className="p-3 border-b border-neutral-200 dark:border-white/5 flex items-center justify-between">
        <span className="text-sm font-medium text-neutral-900 dark:text-white">Участники — {group.members.length}</span>
        <button onClick={onClose} className="text-neutral-400 hover:text-neutral-600 dark:hover:text-white transition-colors" aria-label="Close members panel">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-0.5" role="list" aria-label="Group members">
        {group.members.map((m) => (
          <div key={m.user.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-white/5 transition-colors" role="listitem">
            <div className="relative flex-shrink-0">
              <GlowAvatar user={m.user} size={28} onlineColor={isOnline(m.user.lastSeen) ? "green" : "gray"} />
            </div>
            <div className="min-w-0">
              <div className="text-sm text-neutral-900 dark:text-white truncate">{m.user.name}</div>
              <div className="text-[10px] text-neutral-400 truncate">
                @{m.user.username}
                {!isOnline(m.user.lastSeen) && m.user.lastSeen && <span className="text-neutral-400/70"> &middot; {timeAgo(m.user.lastSeen)}</span>}
              </div>
            </div>
            {m.role === "OWNER" && <span className="text-[10px] text-amber-500 ml-auto flex-shrink-0" aria-label="Owner">{"\ud83d\udc51"}</span>}
            {m.role === "MODERATOR" && <span className="text-[10px] text-violet-500 ml-auto flex-shrink-0" aria-label="Moderator">{"\u2699\ufe0f"}</span>}
          </div>
        ))}
      </div>
    </aside>
  );
}

/* ─── Mobile view state ─── */
type MobileView = "groups" | "channels" | "chat";

/* ─── Main Page ─── */

export default function ConnectPage() {
  return <ConnectPageInner />;
}

function ConnectPageInner() {
  const { data: session, status } = useSession();

  /* ── Splash screen — once per session ── */
  const [splashDone, setSplashDone] = useState(() => {
    if (typeof window === "undefined") return true;
    return sessionStorage.getItem("tz-connect-splash") === "1";
  });
  const handleSplashDone = () => {
    sessionStorage.setItem("tz-connect-splash", "1");
    setSplashDone(true);
  };

  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [groupDetail, setGroupDetail] = useState<GroupDetail | null>(null);
  const [selectedChannel, setSelectedChannel] = useState<string | null>(null);
  const voice = useVoice();
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showJoinGroup, setShowJoinGroup] = useState(false);
  const [showCreateChannel, setShowCreateChannel] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [activeSection, setActiveSection] = useState<NavSection>("communities");
  const [dmFriendId, setDmFriendId] = useState<string | null>(null);
  const [showProfileSettings, setShowProfileSettings] = useState(false);
  const [showGroupSettings, setShowGroupSettings] = useState(false);
  const [myGlowSettings, setMyGlowSettings] = useState<{ avatarGlowEnabled: boolean; avatarGlowColors: string | null; avatar: string | null } | null>(null);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [mentionChannels, setMentionChannels] = useState<Record<string, boolean>>({});
  const [mobileView, setMobileView] = useState<MobileView>("groups");
  const [showVoicePanel, setShowVoicePanel] = useState(false);

  const isBanned = session?.user?.banned && (!session.user.bannedUntil || new Date(session.user.bannedUntil) > new Date());
  const canManage = groupDetail?.myRole === "OWNER" || groupDetail?.myRole === "MODERATOR";
  const userRole = (session?.user as { role?: string } | undefined)?.role ?? "USER";
  const hideMembersForMain = !!groupDetail?.isMain && !canManage && userRole !== "ADMIN";

  const fetchGroups = useCallback(() => {
    fetch("/api/groups").then((r) => r.json()).then((data) => {
      if (Array.isArray(data)) setGroups(data);
    });
  }, []);

  const fetchGroupDetail = useCallback(async (groupId: string) => {
    const res = await fetch(`/api/groups/${groupId}`);
    if (res.ok) setGroupDetail(await res.json());
  }, []);

  const fetchUnread = useCallback(() => {
    fetch("/api/channels/unread").then((r) => r.json()).then((data) => {
      if (data.unread) setUnreadCounts(data.unread);
      if (data.mentions) setMentionChannels(data.mentions);
    }).catch(() => {});
  }, []);

  const myProfileUser: GlowAvatarUser = {
    id: (session?.user as { id?: string } | undefined)?.id ?? "",
    name: session?.user?.name ?? "",
    role: (session?.user as { role?: string } | undefined)?.role ?? "USER",
    avatar: myGlowSettings?.avatar ?? null,
    avatarGlowEnabled: myGlowSettings?.avatarGlowEnabled ?? false,
    avatarGlowColors: myGlowSettings?.avatarGlowColors ?? null,
  };

  useEffect(() => {
    if (session?.user) {
      fetchGroups();
      fetchUnread();
      if (typeof Notification !== "undefined" && Notification.permission === "default") {
        Notification.requestPermission().catch(() => {});
      }
      const interval = setInterval(() => {
        if (!document.hidden) fetchUnread();
      }, 60000);
      return () => clearInterval(interval);
    }
  }, [session, fetchGroups, fetchUnread]);

  useEffect(() => {
    if (session?.user) {
      fetch("/api/profile/me")
        .then((r) => r.json())
        .then((d) => setMyGlowSettings({ avatarGlowEnabled: d.avatarGlowEnabled ?? false, avatarGlowColors: d.avatarGlowColors ?? null, avatar: d.avatar ?? null }))
        .catch(() => {});
    }
  }, [session]);

  // Listen for profile updates (avatar/glow) via Socket.IO
  const profileSocketRef = useRef<import("socket.io-client").Socket | null>(null);
  useEffect(() => {
    if (!session?.user) return;
    const uid = (session.user as { id?: string }).id;
    if (!uid) return;
    import("socket.io-client").then(({ io: ioClient }) => {
      const sock = ioClient({ path: "/api/socketio", withCredentials: true });
      profileSocketRef.current = sock;
      sock.on("profile-updated", (data: { id: string; avatar?: string | null; avatarGlowEnabled?: boolean; avatarGlowColors?: string | null }) => {
        if (data.id === uid) {
          setMyGlowSettings((prev) => ({
            avatar: data.avatar ?? prev?.avatar ?? null,
            avatarGlowEnabled: data.avatarGlowEnabled ?? prev?.avatarGlowEnabled ?? false,
            avatarGlowColors: data.avatarGlowColors ?? prev?.avatarGlowColors ?? null,
          }));
        }
      });
      sock.on("channel-deleted", (data: { channelId: string; groupId: string }) => {
        setSelectedChannel((prev) => prev === data.channelId ? null : prev);
        setSelectedGroup((prevGroup) => {
          if (prevGroup === data.groupId) {
            fetchGroupDetail(data.groupId);
          }
          return prevGroup;
        });
      });
      
    });
    return () => {
      profileSocketRef.current?.disconnect();
      profileSocketRef.current = null;
    };
  }, [session, fetchGroupDetail]);

  useEffect(() => {
    if (selectedGroup) {
      fetchGroupDetail(selectedGroup);
      setSelectedChannel(null);
    }
  }, [selectedGroup, fetchGroupDetail]);

  const handleSelectGroup = (id: string) => {
    setSelectedGroup(id);
    setActiveSection("communities");
    setMobileView("channels");
  };

  const handleMessageFriend = (friendId: string) => {
    setDmFriendId(friendId);
    setActiveSection("dm");
  };

  const voiceState = {
    isConnected: voice.isConnected,
    voiceStatus: voice.voiceStatus,
    channelId: voice.channelId,
    channelName: voice.channelName,
    isMuted: voice.isMuted,
    isDeafened: voice.isDeafened,
    users: voice.users,
    speakingUsers: voice.speakingUsers,
    localSpeaking: voice.localSpeaking,
    nsEnabled: voice.nsEnabled,
    nsStatus: voice.nsStatus,
    isSharingScreen: voice.isSharingScreen,
    screenSharerId: voice.screenSharerId,
    userVolumes: voice.userVolumes,
    connectionQuality: voice.connectionQuality,
    localPing: voice.localPing,
  };

  const voiceActions = {
    joinVoice: voice.joinVoice,
    leaveVoice: voice.leaveVoice,
    toggleMute: voice.toggleMute,
    toggleDeafen: voice.toggleDeafen,
    toggleNS: voice.toggleNS,
    startScreenShare: voice.startScreenShare,
    stopScreenShare: voice.stopScreenShare,
    setUserVolume: voice.setUserVolume,
  };

  const handleChannelClick = (channel: Channel) => {
    if (channel.type === "VOICE") {
      voice.joinVoice(channel.id, channel.name);
    } else {
      setSelectedChannel(channel.id);
      setMobileView("chat");
    }
  };

  const deleteChannel = async (channelId: string) => {
    if (!confirm("Удалить канал?")) return;
    await fetch(`/api/channels/${channelId}`, { method: "DELETE" });
    if (selectedChannel === channelId) setSelectedChannel(null);
    if (selectedGroup) fetchGroupDetail(selectedGroup);
  };

  const deleteGroup = async () => {
    if (!selectedGroup || !confirm("Удалить группу? Это действие нельзя отменить.")) return;
    const res = await fetch(`/api/groups/${selectedGroup}`, { method: "DELETE" });
    if (res.ok) {
      setSelectedGroup(null);
      setGroupDetail(null);
      setShowGroupSettings(false);
      fetchGroups();
    }
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-neutral-950">
        <div className="animate-spin w-8 h-8 border-2 border-violet-500 dark:border-cyan-400 border-t-transparent rounded-full" role="status" aria-label="Loading" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-neutral-950">
        <div className="text-center max-w-md px-6">
          <span className="text-6xl block mb-4">{"\uD83D\uDCAC"}</span>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white mb-3">TZ.Connect</h1>
          <p className="text-neutral-500 mb-6">Войдите или зарегистрируйтесь, чтобы присоединиться к группам и общаться</p>
          <Link href="/auth/signin" className="btn-primary">Войти</Link>
        </div>
      </div>
    );
  }

  const selectedChannelData = groupDetail?.channels.find((c) => c.id === selectedChannel);
  const userId = (session.user as { id?: string }).id ?? "";

  return (
    <>
    {!splashDone && <ConnectSplash onDone={handleSplashDone} />}
    <div className="cn-main flex h-[calc(100vh-64px)] max-md:h-dvh overflow-hidden">

      {/* ── COL 1: NavRail (desktop only) ── */}
      <NavRail
        activeSection={activeSection}
        onChangeSection={(section) => {
          if (section === activeSection && section === "communities") {
            setSelectedGroup(null);
            setSelectedChannel(null);
            setMobileView("groups");
          }
          setActiveSection(section);
          if (section !== "dm") setDmFriendId(null);
          if (section !== "communities") setSelectedChannel(null);
        }}
        myProfileUser={myProfileUser}
        userName={session.user.name ?? ""}
        userUsername={session.user.username ?? ""}
        onProfileSettings={() => setShowProfileSettings(true)}
      />

      {/* ── Mobile view (full width, stacked) ── */}
      <div className="md:hidden flex-1 flex flex-col h-full overflow-hidden">
        {/* Mobile content area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {activeSection === "communities" && (
            <>
              {mobileView === "groups" && (
                <MobileGroupList
                  groups={groups}
                  onSelectGroup={handleSelectGroup}
                  onCreateGroup={() => setShowCreateGroup(true)}
                  onJoinGroup={() => setShowJoinGroup(true)}
                  onToggleFriends={() => setActiveSection("friends")}
                />
              )}
              {mobileView === "channels" && selectedGroup && groupDetail && (
                <SwipeBackWrapper onSwipeBack={() => { setSelectedGroup(null); setMobileView("groups"); }} className="flex-1 flex flex-col h-full overflow-hidden">
                  <ChannelSidebar
                    groupDetail={groupDetail}
                    selectedChannel={selectedChannel}
                    unreadCounts={unreadCounts}
                    mentionChannels={mentionChannels}
                    canManage={!!canManage}
                    isMainCommunity={!!groupDetail.isMain}
                    myProfileUser={myProfileUser}
                    userName={session.user.name ?? ""}
                    userUsername={session.user.username ?? ""}
                    userRole={userRole}
                    onChannelClick={handleChannelClick}
                    onDeleteChannel={deleteChannel}
                    onCreateChannel={() => setShowCreateChannel(true)}
                    onInvite={() => setShowInvite(true)}
                    onToggleMembers={() => setShowMembers(!showMembers)}
                    onProfileSettings={() => setShowProfileSettings(true)}
                    onOpenSettings={() => setShowGroupSettings(true)}
                    memberCount={groupDetail.members.length}
                    onBack={() => { setSelectedGroup(null); setMobileView("groups"); }}
                    voiceState={voiceState}
                    voiceActions={voiceActions}
                    onVoiceExpand={() => setShowVoicePanel(true)}
                    onGroupRefresh={() => selectedGroup && fetchGroupDetail(selectedGroup)}
                  />
                </SwipeBackWrapper>
              )}
              {mobileView === "chat" && selectedChannel && selectedChannelData && (
                <SwipeBackWrapper onSwipeBack={() => setMobileView("channels")} className="flex-1 flex flex-col h-full overflow-hidden">
                  <MessageArea
                    channelId={selectedChannel}
                    channelName={selectedChannelData.name}
                    channelIcon={selectedChannelData.icon}
                    channelType={selectedChannelData.type}
                    currentUserId={userId}
                    currentUserName={session.user.name ?? ""}
                    currentUserRole={userRole}
                    isBanned={!!isBanned}
                    onBack={() => setMobileView("channels")}
                  />
                </SwipeBackWrapper>
              )}
            </>
          )}

          {activeSection === "friends" && (
            <div className="flex-1 flex flex-col h-full overflow-hidden">
              <FriendsPanel onMessageFriend={(friendId) => { handleMessageFriend(friendId); }} />
            </div>
          )}

          {activeSection === "dm" && (
            <div className="flex-1 flex flex-col h-full overflow-hidden">
              <DMPanel
                currentUserId={userId}
                onClose={() => { setActiveSection("communities"); setDmFriendId(null); }}
                initialFriendId={dmFriendId}
              />
            </div>
          )}
        </div>

        {/* Mobile Connect bottom bar — Сообщества/Друзья/Сообщения (only on groups level) */}
        {mobileView === "groups" && (
          <div className="flex-shrink-0 flex items-center border-t border-neutral-200 dark:border-white/5 bg-white/95 dark:bg-neutral-950/95 backdrop-blur-lg"
            style={{ height: 48 }}>
            {([
              { key: "communities" as NavSection, label: "Сообщества", icon: <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="12" width="4" height="10" rx="0.5" /><rect x="18" y="12" width="4" height="10" rx="0.5" /><rect x="8" y="8" width="8" height="14" rx="0.5" /><path d="M8 8l1.5-3h5L16 8" /><rect x="10.5" y="15" width="3" height="7" rx="0.5" /></svg> },
              { key: "friends" as NavSection, label: "Друзья", icon: <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="7" r="3" /><path d="M12 13c-3.31 0-6 1.79-6 4v1h12v-1c0-2.21-2.69-4-6-4z" /><circle cx="4.5" cy="9" r="2" /><path d="M4.5 13C2.57 13 1 14.34 1 16v1h4" /><circle cx="19.5" cy="9" r="2" /><path d="M19.5 13c1.93 0 3.5 1.34 3.5 3v1h-4" /></svg> },
              { key: "dm" as NavSection, label: "Сообщения", icon: <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg> },
            ]).map(({ key, label, icon }) => (
              <button
                key={key}
                onClick={() => {
                  setActiveSection(key);
                  if (key !== "dm") setDmFriendId(null);
                  if (key !== "communities") { setSelectedChannel(null); }
                  if (key === "communities") { setSelectedGroup(null); setMobileView("groups"); }
                }}
                className={`flex-1 flex flex-col items-center justify-center gap-0.5 h-full transition-colors active:scale-95
                  ${activeSection === key ? "text-violet-600 dark:text-cyan-400" : "text-neutral-400 dark:text-neutral-500"}`}
              >
                {icon}
                <span className="text-[10px] font-medium">{label}</span>
              </button>
            ))}
          </div>
        )}

        {/* Mobile back bar — Каналы уровень */}
        {mobileView === "channels" && (
          <div className="flex-shrink-0 flex items-center gap-2 px-3 border-t border-neutral-200 dark:border-white/5 bg-white/95 dark:bg-neutral-950/95 backdrop-blur-lg"
            style={{ height: 48 }}>
            <button
              onClick={() => { setSelectedGroup(null); setMobileView("groups"); }}
              className="flex items-center gap-1.5 text-violet-600 dark:text-cyan-400 text-sm font-medium active:opacity-60"
            >
              <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 12H5m0 0l7 7m-7-7l7-7" />
              </svg>
              Группы
            </button>
            {groupDetail && (
              <span className="text-sm text-neutral-500 dark:text-gray-400 truncate ml-1">· {groupDetail.name}</span>
            )}
          </div>
        )}

        {/* Mobile back bar — Чат уровень */}
        {mobileView === "chat" && (
          <div className="flex-shrink-0 flex items-center gap-2 px-3 border-t border-neutral-200 dark:border-white/5 bg-white/95 dark:bg-neutral-950/95 backdrop-blur-lg"
            style={{ height: 48 }}>
            <button
              onClick={() => setMobileView("channels")}
              className="flex items-center gap-1.5 text-violet-600 dark:text-cyan-400 text-sm font-medium active:opacity-60"
            >
              <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 12H5m0 0l7 7m-7-7l7-7" />
              </svg>
              Каналы
            </button>
            {selectedChannelData && (
              <span className="text-sm text-neutral-500 dark:text-gray-400 truncate ml-1">· {selectedChannelData.name}</span>
            )}
          </div>
        )}

        {/* Mobile Members bottom sheet */}
        <BottomSheet open={showMembers && !!groupDetail && !hideMembersForMain} onClose={() => setShowMembers(false)} height="70%" title={`Участники — ${groupDetail?.members.length ?? 0}`}>
          {groupDetail && (
            <div className="p-3 space-y-0.5">
              {groupDetail.members.map((m) => (
                <div key={m.user.id} className="flex items-center gap-2 px-2 py-2 rounded-lg active:bg-neutral-100 dark:active:bg-white/5 transition-colors">
                  <GlowAvatar user={m.user} size={32} onlineColor={isOnline(m.user.lastSeen) ? "green" : "gray"} />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm text-neutral-900 dark:text-white truncate">{m.user.name}</div>
                    <div className="text-[10px] text-neutral-400">@{m.user.username}</div>
                  </div>
                  {m.role === "OWNER" && <span className="text-xs">👑</span>}
                  {m.role === "MODERATOR" && <span className="text-xs">⚙️</span>}
                </div>
              ))}
            </div>
          )}
        </BottomSheet>
      </div>

      {/* ── Desktop: COL 2 + COL 3 ── */}
      <div className="max-md:hidden flex flex-1 h-full overflow-hidden">

        {/* ═══════════ COMMUNITIES ═══════════ */}
        {activeSection === "communities" && (
          <>
            {/* COL 2 — group list OR channel list */}
            <div className="flex-shrink-0 w-60 flex flex-col h-full" style={{ borderRight: "1px solid var(--cn-border)" }}>
              {selectedGroup && groupDetail ? (
                /* Sub-nav: channels inside selected group */
                <ChannelSidebar
                  groupDetail={groupDetail}
                  selectedChannel={selectedChannel}
                  unreadCounts={unreadCounts}
                  mentionChannels={mentionChannels}
                  canManage={!!canManage}
                  isMainCommunity={!!groupDetail.isMain}
                  myProfileUser={myProfileUser}
                  userName={session.user.name ?? ""}
                  userUsername={session.user.username ?? ""}
                  userRole={userRole}
                  onChannelClick={handleChannelClick}
                  onDeleteChannel={deleteChannel}
                  onCreateChannel={() => setShowCreateChannel(true)}
                  onInvite={() => setShowInvite(true)}
                  onToggleMembers={() => setShowMembers(!showMembers)}
                  onProfileSettings={() => setShowProfileSettings(true)}
                  onOpenSettings={() => setShowGroupSettings(true)}
                  memberCount={groupDetail.members.length}
                  voiceState={voiceState}
                  voiceActions={voiceActions}
                  onVoiceExpand={() => setShowVoicePanel(true)}
                  onGroupRefresh={() => selectedGroup && fetchGroupDetail(selectedGroup)}
                />
              ) : (
                /* Top-level group list */
                <GroupListPanel
                  groups={groups}
                  selectedGroup={selectedGroup}
                  onSelectGroup={handleSelectGroup}
                  onCreateGroup={() => setShowCreateGroup(true)}
                  onJoinGroup={() => setShowJoinGroup(true)}
                />
              )}
            </div>

            {/* COL 3 — chat area */}
            <div className="flex flex-1 flex-col h-full cn-main overflow-hidden">
              {selectedChannel && selectedChannelData ? (
                <MessageArea
                  channelId={selectedChannel}
                  channelName={selectedChannelData.name}
                  channelIcon={selectedChannelData.icon}
                  channelType={selectedChannelData.type}
                  currentUserId={userId}
                  currentUserName={session.user.name ?? ""}
                  currentUserRole={userRole}
                  isBanned={!!isBanned}
                  onNewMessage={fetchUnread}
                />
              ) : selectedGroup && groupDetail ? (
                <div className="flex-1 flex items-center justify-center overflow-y-auto">
                  {groupDetail.rules && !groupDetail.rulesAccepted && groupDetail.myRole === "MEMBER" ? (
                    <GroupRulesGate group={groupDetail} onAccept={async () => {
                      await fetch(`/api/groups/${groupDetail.id}/accept-rules`, { method: "POST" });
                      setGroupDetail({ ...groupDetail, rulesAccepted: true });
                    }} />
                  ) : (
                    <GroupInfoPanel
                      group={groupDetail}
                      canManage={groupDetail.myRole === "OWNER" || groupDetail.myRole === "MODERATOR"}
                      onUpdateRules={async (rules: string) => {
                        await fetch(`/api/groups/${groupDetail.id}`, {
                          method: "PUT",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ rules }),
                        });
                        setGroupDetail({ ...groupDetail, rules });
                      }}
                      onAutoSelectChannel={() => {
                        const firstText = groupDetail.channels.find(c => c.type === "TEXT");
                        if (firstText) handleChannelClick(firstText);
                      }}
                    />
                  )}
                </div>
              ) : (
                /* Empty state — no group selected */
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center max-w-sm px-6">
                    <span className="text-6xl block mb-4">⚔️</span>
                    <h2 className="text-xl font-bold mb-2" style={{ color: "var(--cn-text)" }}>TZ.Connect</h2>
                    <p className="text-sm mb-6" style={{ color: "var(--cn-muted)" }}>
                      Выберите сообщество слева или создайте новое
                    </p>
                    <div className="flex gap-3 justify-center">
                      <button onClick={() => setShowCreateGroup(true)} className="btn-primary text-sm">Создать</button>
                      <button onClick={() => setShowJoinGroup(true)} className="btn-secondary text-sm">Присоединиться</button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {showMembers && groupDetail && !hideMembersForMain && (
              <MembersPanel group={groupDetail} onClose={() => setShowMembers(false)} />
            )}
          </>
        )}

        {/* ═══════════ FRIENDS ═══════════ */}
        {activeSection === "friends" && (
          <>
            {/* COL 2 — friends list */}
            <FriendsPanel onMessageFriend={handleMessageFriend} />

            {/* COL 3 — hint */}
            <div className="flex-1 flex items-center justify-center cn-main">
              <div className="text-center">
                <span className="text-4xl block mb-3">👥</span>
                <p className="text-sm" style={{ color: "var(--cn-muted)" }}>
                  Выберите друга чтобы написать
                </p>
              </div>
            </div>
          </>
        )}

        {/* ═══════════ MESSAGES (DM) ═══════════ */}
        {activeSection === "dm" && (
          /* DMPanel contains both COL 2 (dialog list) and COL 3 (chat) */
          <DMPanel
            currentUserId={userId}
            onClose={() => { setActiveSection("communities"); setDmFriendId(null); }}
            initialFriendId={dmFriendId}
          />
        )}
      </div>

      {/* AI Assistant */}
      <AiChatPanel />

      {/* Ban notice */}
      {isBanned && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 px-4 py-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-500/30 rounded-xl">
          <p className="text-red-600 dark:text-red-400 text-sm font-medium">
            Аккаунт ограничен {session.user.bannedUntil
              ? `до ${new Date(session.user.bannedUntil).toLocaleString("ru-RU")}`
              : "бессрочно"}
          </p>
        </div>
      )}

      {/* Modals */}
      <AnimatePresence>
        {showCreateGroup && <CreateGroupModal onClose={() => setShowCreateGroup(false)} onCreated={fetchGroups} />}
        {showJoinGroup && <JoinGroupModal onClose={() => setShowJoinGroup(false)} onJoined={fetchGroups} />}
        {showCreateChannel && selectedGroup && (
          <CreateChannelModal
            groupId={selectedGroup}
            onClose={() => setShowCreateChannel(false)}
            onCreated={() => { if (selectedGroup) fetchGroupDetail(selectedGroup); }}
          />
        )}
        {showInvite && selectedGroup && (
          <InviteModal groupId={selectedGroup} onClose={() => setShowInvite(false)} />
        )}
        {showGroupSettings && groupDetail && (
          <GroupSettingsModal
            group={groupDetail}
            onClose={() => setShowGroupSettings(false)}
            onUpdated={() => { if (selectedGroup) fetchGroupDetail(selectedGroup); fetchGroups(); }}
            onDelete={deleteGroup}
          />
        )}
        {showProfileSettings && session?.user && (
          <ProfileSettingsModal
            user={myProfileUser}
            userRole={userRole}
            onClose={() => setShowProfileSettings(false)}
            onSaved={(settings) => {
              setMyGlowSettings((prev) => ({ avatar: prev?.avatar ?? null, ...settings }));
            }}
          />
        )}
        {showVoicePanel && voice.isConnected && (
          <VoiceExpandedPanel onClose={() => setShowVoicePanel(false)} />
        )}
      </AnimatePresence>

      {/* Floating screen share window */}
      {voice.isConnected && (voice.isSharingScreen || voice.screenSharerId) && (
        <ScreenShareWindow
          stream={voice.screenStream}
          sharerName={voice.isSharingScreen ? "Вы" : voice.screenShareName || "Участник"}
          isLocal={voice.isSharingScreen}
          onStop={voice.stopScreenShare}
        />
      )}
    </div>
    </>
  );
}
