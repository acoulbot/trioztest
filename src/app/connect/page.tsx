"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Spinner from "@/components/ui/Spinner";
import { useSession } from "next-auth/react";
import { AnimatePresence } from "framer-motion";
import Link from "next/link";
import dynamic from "next/dynamic";

import GlowAvatar, { GlowAvatarUser } from "@/components/ui/GlowAvatar";
import { isOnline } from "@/lib/timeAgo";
import ProfileSettingsModal from "@/components/profile/ProfileSettingsModal";

import NavRail from "@/components/connect/NavRail";
import { NavSection } from "@/components/connect/NavRail";
import SwipeBackWrapper from "@/components/mobile/SwipeBackWrapper";
import BottomSheet from "@/components/mobile/BottomSheet";
import GroupListPanel from "@/components/connect/GroupListPanel";
import ChannelSidebar from "@/components/connect/ChannelSidebar";
import MessageArea from "@/components/connect/MessageArea";
import MobileGroupList from "@/components/connect/MobileGroupList";
import ConnectSplash from "@/components/connect/ConnectSplash";
// ThemeProvider is now in global Providers

const ScreenShareWindow = dynamic(() => import("@/components/voice/ScreenShareWindow"), { ssr: false });
const VoiceExpandedPanel = dynamic(() => import("@/components/voice/VoiceExpandedPanel"), { ssr: false });
const FriendsPanel = dynamic(() => import("@/components/friends/FriendsPanel"), { ssr: false });
const DMPanel = dynamic(() => import("@/components/dm/DMPanel"), { ssr: false });
const AiChatPanel = dynamic(() => import("@/components/ai/AiChatPanel"), { ssr: false });
import { useVoice } from "@/contexts/VoiceContext";


import { CreateGroupModal, JoinGroupModal, CreateChannelModal, InviteModal, GroupRulesGate, GroupInfoPanel, GroupSettingsModal, MembersPanel } from "@/components/connect/GroupDialogs";
import type { Group, Channel, GroupDetail } from "@/components/connect/groupTypes";

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
  const [pageConfirm, setPageConfirm] = useState<{ message: string; onConfirm: () => void } | null>(null);

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

  const deleteChannel = (channelId: string) => {
    setPageConfirm({
      message: "Удалить канал?",
      onConfirm: async () => {
        await fetch(`/api/channels/${channelId}`, { method: "DELETE" });
        if (selectedChannel === channelId) setSelectedChannel(null);
        if (selectedGroup) fetchGroupDetail(selectedGroup);
        setPageConfirm(null);
      },
    });
  };

  const deleteGroup = () => {
    if (!selectedGroup) return;
    setPageConfirm({
      message: "Удалить группу? Это действие нельзя отменить.",
      onConfirm: async () => {
        const res = await fetch(`/api/groups/${selectedGroup}`, { method: "DELETE" });
        if (res.ok) {
          setSelectedGroup(null);
          setGroupDetail(null);
          setShowGroupSettings(false);
          fetchGroups();
        }
        setPageConfirm(null);
      },
    });
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-neutral-950">
        <Spinner />
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
                  ${activeSection === key ? "text-accent" : "text-neutral-400 dark:text-neutral-500"}`}
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
              className="flex items-center gap-1.5 text-accent text-sm font-medium active:opacity-60"
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
              className="flex items-center gap-1.5 text-accent text-sm font-medium active:opacity-60"
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

      {/* Confirm modal */}
      {pageConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" onClick={() => setPageConfirm(null)}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div className="relative z-10 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-white/10 rounded-2xl shadow-2xl p-5 max-w-sm w-full" onClick={e => e.stopPropagation()}>
            <p className="text-sm text-neutral-900 dark:text-white mb-4">{pageConfirm.message}</p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setPageConfirm(null)} className="px-4 py-2 text-sm text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 rounded-xl hover:bg-neutral-100 dark:hover:bg-white/5">Отмена</button>
              <button onClick={pageConfirm.onConfirm} className="px-4 py-2 text-sm bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors">Подтвердить</button>
            </div>
          </div>
        </div>
      )}
    </div>
    </>
  );
}
