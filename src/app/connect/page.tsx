"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { AnimatePresence } from "framer-motion";
import Link from "next/link";
import dynamic from "next/dynamic";

import GlowAvatar, { GlowAvatarUser } from "@/components/ui/GlowAvatar";
import { isOnline, timeAgo } from "@/lib/timeAgo";
import ProfileSettingsModal from "@/components/profile/ProfileSettingsModal";

import GroupSidebar from "@/components/connect/GroupSidebar";
import ChannelSidebar from "@/components/connect/ChannelSidebar";
import MessageArea from "@/components/connect/MessageArea";
import MobileGroupList from "@/components/connect/MobileGroupList";
import ModalBackdrop from "@/components/connect/ModalBackdrop";

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
            Текстовый
          </button>
          <button onClick={() => setType("VOICE")} className={`flex-1 px-3 py-2 rounded-xl text-sm transition-all ${type === "VOICE" ? "bg-emerald-50 dark:bg-emerald-400/20 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-400/30" : "bg-neutral-50 dark:bg-neutral-700 text-neutral-500 dark:text-gray-400 border border-neutral-200 dark:border-white/5"}`}>
            Голосовой
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
    const res = await fetch("/api/invites", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ groupId }) });
    const data = await res.json();
    setInviteCode(data.code);
    setLoading(false);
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
              <button onClick={() => navigator.clipboard.writeText(inviteCode)} className="px-4 py-2.5 bg-violet-100 dark:bg-cyan-400/20 text-violet-600 dark:text-cyan-400 rounded-xl text-sm font-medium hover:bg-violet-200 dark:hover:bg-cyan-400/30 transition-all">
                Копировать
              </button>
            </div>
          </div>
        ) : (
          <button onClick={createInvite} disabled={loading} className="w-full px-4 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 dark:from-cyan-500 dark:to-cyan-400 text-white dark:text-neutral-900 rounded-xl text-sm font-medium disabled:opacity-50">
            {loading ? "..." : "Создать приглашение"}
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
    <aside className="w-60 max-md:absolute max-md:right-0 max-md:top-0 max-md:h-full max-md:z-40 bg-white dark:bg-neutral-900 border-l border-neutral-200 dark:border-white/5 flex flex-col h-full">
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
            {m.role === "OWNER" && <span className="text-[10px] text-amber-500 ml-auto flex-shrink-0" aria-label="Owner">{"👑"}</span>}
            {m.role === "ADMIN" && <span className="text-[10px] text-violet-500 ml-auto flex-shrink-0" aria-label="Admin">{"⚡"}</span>}
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
  const { data: session, status } = useSession();
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [groupDetail, setGroupDetail] = useState<GroupDetail | null>(null);
  const [selectedChannel, setSelectedChannel] = useState<string | null>(null);
  const [activeVoiceChannel, setActiveVoiceChannel] = useState<{ id: string; name: string } | null>(null);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showJoinGroup, setShowJoinGroup] = useState(false);
  const [showCreateChannel, setShowCreateChannel] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [showFriends, setShowFriends] = useState(false);
  const [showProfileSettings, setShowProfileSettings] = useState(false);
  const [myGlowSettings, setMyGlowSettings] = useState<{ avatarGlowEnabled: boolean; avatarGlowColors: string | null; avatar: string | null } | null>(null);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [mobileView, setMobileView] = useState<MobileView>("groups");

  const isBanned = session?.user?.banned && (!session.user.bannedUntil || new Date(session.user.bannedUntil) > new Date());
  const canManage = groupDetail?.myRole === "OWNER" || groupDetail?.myRole === "ADMIN";

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
      const interval = setInterval(fetchUnread, 15000);
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

  useEffect(() => {
    if (selectedGroup) {
      fetchGroupDetail(selectedGroup);
      setSelectedChannel(null);
    }
  }, [selectedGroup, fetchGroupDetail]);

  const handleSelectGroup = (id: string) => {
    setSelectedGroup(id);
    setMobileView("channels");
  };

  const handleChannelClick = (channel: Channel) => {
    if (channel.type === "VOICE") {
      setActiveVoiceChannel({ id: channel.id, name: channel.name });
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
  const userRole = (session.user as { role?: string }).role ?? "USER";

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 flex h-[calc(100vh-64px)]">
      {/* Desktop: Group sidebar always visible */}
      <GroupSidebar
        groups={groups}
        selectedGroup={selectedGroup}
        showFriends={showFriends}
        onSelectGroup={handleSelectGroup}
        onCreateGroup={() => setShowCreateGroup(true)}
        onJoinGroup={() => setShowJoinGroup(true)}
        onToggleFriends={() => setShowFriends(!showFriends)}
      />

      {/* Mobile: Show group list */}
      <div className="md:hidden flex-1 flex flex-col h-full">
        {mobileView === "groups" && (
          <MobileGroupList
            groups={groups}
            onSelectGroup={handleSelectGroup}
            onCreateGroup={() => setShowCreateGroup(true)}
            onJoinGroup={() => setShowJoinGroup(true)}
            onToggleFriends={() => setShowFriends(!showFriends)}
          />
        )}
        {mobileView === "channels" && selectedGroup && groupDetail && (
          <ChannelSidebar
            groupDetail={groupDetail}
            selectedChannel={selectedChannel}
            unreadCounts={unreadCounts}
            canManage={!!canManage}
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
            memberCount={groupDetail.members.length}
            onBack={() => { setSelectedGroup(null); setMobileView("groups"); }}
          />
        )}
        {mobileView === "chat" && selectedChannel && selectedChannelData && (
          <MessageArea
            channelId={selectedChannel}
            channelName={selectedChannelData.name}
            channelIcon={selectedChannelData.icon}
            currentUserId={userId}
            currentUserRole={userRole}
            isBanned={!!isBanned}
            onBack={() => setMobileView("channels")}
          />
        )}
      </div>

      {/* Desktop: Channel sidebar + message area */}
      <div className="max-md:hidden flex flex-1 h-full">
        {selectedGroup && groupDetail && (
          <ChannelSidebar
            groupDetail={groupDetail}
            selectedChannel={selectedChannel}
            unreadCounts={unreadCounts}
            canManage={!!canManage}
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
            memberCount={groupDetail.members.length}
          />
        )}

        {selectedChannel && selectedChannelData ? (
          <MessageArea
            channelId={selectedChannel}
            channelName={selectedChannelData.name}
            channelIcon={selectedChannelData.icon}
            currentUserId={userId}
            currentUserRole={userRole}
            isBanned={!!isBanned}
          />
        ) : selectedGroup ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <span className="text-5xl block mb-4">{groupDetail?.icon || "\uD83D\uDCAC"}</span>
              <h2 className="text-xl font-bold text-neutral-900 dark:text-white mb-1">{groupDetail?.name}</h2>
              <p className="text-neutral-400 text-sm">Выберите канал для общения</p>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center max-w-sm px-6">
              <span className="text-6xl block mb-4">{"\uD83D\uDCAC"}</span>
              <h2 className="text-xl font-bold text-neutral-900 dark:text-white mb-2">TZ.Connect</h2>
              <p className="text-neutral-400 text-sm mb-6">Выберите группу слева или создайте новую</p>
              <div className="flex gap-3 justify-center">
                <button onClick={() => setShowCreateGroup(true)} className="btn-primary text-sm">Создать группу</button>
                <button onClick={() => setShowJoinGroup(true)} className="btn-secondary text-sm">Присоединиться</button>
              </div>
            </div>
          </div>
        )}

        {showMembers && groupDetail && (
          <MembersPanel group={groupDetail} onClose={() => setShowMembers(false)} />
        )}
      </div>

      {showFriends && <FriendsPanel onClose={() => setShowFriends(false)} />}

      {/* Ban notice */}
      {isBanned && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 px-4 py-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-500/30 rounded-xl">
          <p className="text-red-600 dark:text-red-400 text-sm font-medium">
            Аккаунт ограничен {session.user.bannedUntil ? `до ${new Date(session.user.bannedUntil).toLocaleString("ru-RU")}` : "бессрочно"}
          </p>
        </div>
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
              setMyGlowSettings((prev) => ({ avatar: prev?.avatar ?? null, ...settings }));
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {activeVoiceChannel && (
          <VoiceChannel channelId={activeVoiceChannel.id} channelName={activeVoiceChannel.name} onClose={() => setActiveVoiceChannel(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}
