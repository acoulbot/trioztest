"use client";

import { useState, useEffect } from "react";
import { io } from "socket.io-client";
import GlowAvatar, { GlowAvatarUser } from "@/components/ui/GlowAvatar";
import AudioBars from "@/components/ui/AudioBars";

/* ─── Types ─── */

interface Channel {
  id: string;
  name: string;
  type: string;
  icon: string | null;
  groupId: string;
  serviceId?: string | null;
  parentId?: string | null;
  _count: { members: number; messages: number };
}

interface VoiceUser {
  socketId: string;
  userId: string;
  userName: string;
  muted: boolean;
}

interface GroupDetail {
  name: string;
  icon: string | null;
  description: string;
  myRole: string;
  channels: Channel[];
  members: { user: { id: string; name: string; username: string; avatar: string | null; role: string }; role: string }[];
}

interface VoiceState {
  isConnected: boolean;
  voiceStatus: "idle" | "connecting" | "connected" | "reconnecting" | "error";
  channelId: string | null;
  channelName: string | null;
  isMuted: boolean;
  isDeafened: boolean;
  users: VoiceUser[];
  speakingUsers: Set<string>;
  localSpeaking: boolean;
  nsEnabled: boolean;
  nsStatus: string;
  isSharingScreen: boolean;
  screenSharerId: string | null;
  userVolumes: Map<string, number>;
  connectionQuality: Map<string, "good" | "medium" | "poor" | "unknown">;
  localPing: number | null;
}

interface VoiceActions {
  joinVoice: (channelId: string, channelName: string) => Promise<void>;
  leaveVoice: () => void;
  toggleMute: () => void;
  toggleDeafen: () => void;
  toggleNS: () => void;
  startScreenShare: () => Promise<void>;
  stopScreenShare: () => Promise<void>;
  setUserVolume: (socketId: string, volume: number) => void;
}

interface ChannelSidebarProps {
  groupDetail: GroupDetail;
  selectedChannel: string | null;
  unreadCounts: Record<string, number>;
  mentionChannels?: Record<string, boolean>;
  canManage: boolean;
  isMainCommunity?: boolean;
  myProfileUser: GlowAvatarUser;
  userName: string;
  userUsername: string;
  userRole: string;
  onChannelClick: (channel: Channel) => void;
  onDeleteChannel: (channelId: string) => void;
  onCreateChannel: () => void;
  onInvite: () => void;
  onToggleMembers: () => void;
  onProfileSettings: () => void;
  onOpenSettings?: () => void;
  memberCount: number;
  onBack?: () => void;
  voiceState?: VoiceState;
  voiceActions?: VoiceActions;
  onVoiceExpand?: () => void;
  onGroupRefresh?: () => void;
}

/* ── Channel Settings Modal ── */
function ChannelSettingsModal({ channel, groupId, allChannels, onClose, onUpdated }: {
  channel: Channel;
  groupId: string;
  allChannels: Channel[];
  onClose: () => void;
  onUpdated: () => void;
}) {
  const [name, setName] = useState(channel.name);
  const [icon, setIcon] = useState(channel.icon || "");
  const type = channel.type;
  const [parentId, setParentId] = useState(channel.parentId || "");
  const [isRestricted, setIsRestricted] = useState(false);
  const [roles, setRoles] = useState<{ id: string; name: string; color: string }[]>([]);
  const [selectedRoles, setSelectedRoles] = useState<Set<string>>(new Set());
  const [slowmode, setSlowmode] = useState(0);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const possibleParents = allChannels.filter(c => c.id !== channel.id && !c.parentId && (c.type === "TEXT" || c.type === "NEWS"));

  useEffect(() => {
    Promise.all([
      fetch(`/api/channels/${channel.id}`).then(r => r.json()),
      fetch(`/api/groups/${groupId}/roles`).then(r => r.json()),
    ]).then(([chData, rolesData]) => {
      if (chData.isRestricted !== undefined) setIsRestricted(chData.isRestricted);
      if (chData.slowmode !== undefined) setSlowmode(chData.slowmode);
      if (chData.roleIds) setSelectedRoles(new Set(chData.roleIds));
      if (Array.isArray(rolesData)) setRoles(rolesData);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [channel.id, groupId]);

  const handleSave = async () => {
    setSaving(true);
    await fetch(`/api/channels/${channel.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        icon: icon.trim() || null,
        type,
        isRestricted,
        slowmode,
        roleIds: isRestricted ? Array.from(selectedRoles) : [],
        parentId: parentId || null,
      }),
    });
    setSaving(false);
    onUpdated();
    onClose();
  };

  const toggleRole = (roleId: string) => {
    setSelectedRoles(prev => {
      const next = new Set(prev);
      if (next.has(roleId)) next.delete(roleId);
      else next.add(roleId);
      return next;
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-white/10 rounded-2xl shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100 dark:border-white/5">
          <h2 className="text-base font-semibold text-neutral-900 dark:text-white">Настройки канала</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-white/10 text-neutral-400 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {loading ? (
          <div className="p-8 text-center text-neutral-400 text-sm">Загрузка...</div>
        ) : (
          <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
            <div>
              <label className="text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1 block">Название</label>
              <input value={name} onChange={e => setName(e.target.value)} className="w-full px-3 py-2 bg-neutral-50 dark:bg-white/5 border border-neutral-200 dark:border-white/10 rounded-xl text-sm text-neutral-900 dark:text-white outline-none focus:border-violet-500 dark:focus:border-cyan-400" />
            </div>

            <div>
              <label className="text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1 block">Иконка (emoji)</label>
              <input value={icon} onChange={e => setIcon(e.target.value)} placeholder="💬" className="w-full px-3 py-2 bg-neutral-50 dark:bg-white/5 border border-neutral-200 dark:border-white/10 rounded-xl text-sm text-neutral-900 dark:text-white outline-none focus:border-violet-500 dark:focus:border-cyan-400" />
            </div>

            <div>
              <label className="text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1 block">Тип канала</label>
              <div className="px-3 py-2 bg-neutral-100 dark:bg-white/5 border border-neutral-200 dark:border-white/10 rounded-xl text-sm text-neutral-600 dark:text-neutral-300">
                {type === "TEXT" ? "💬 Текстовый" : type === "NEWS" ? "📰 Новости" : "🎙️ Голосовой"}
              </div>
            </div>

            {possibleParents.length > 0 && (
              <div>
                <label className="text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1 block">Родительский канал</label>
                <select
                  value={parentId}
                  onChange={e => setParentId(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-50 dark:bg-white/5 border border-neutral-200 dark:border-white/10 rounded-xl text-sm text-neutral-900 dark:text-white outline-none focus:border-violet-500 dark:focus:border-cyan-400"
                >
                  <option value="">Нет (корневой)</option>
                  {possibleParents.map(p => (
                    <option key={p.id} value={p.id}>{p.icon || "💬"} {p.name}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-900 dark:text-white">Ограничить доступ</p>
                <p className="text-xs text-neutral-400 mt-0.5">Только выбранные теги видят канал</p>
              </div>
              <button onClick={() => setIsRestricted(!isRestricted)} className={`relative w-11 h-6 rounded-full transition-colors ${isRestricted ? "bg-violet-600 dark:bg-cyan-500" : "bg-neutral-300 dark:bg-neutral-600"}`}>
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${isRestricted ? "translate-x-5" : "translate-x-0"}`} />
              </button>
            </div>

            {isRestricted && roles.length > 0 && (
              <div>
                <label className="text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1.5 block">Теги с доступом</label>
                <div className="flex flex-wrap gap-2">
                  {roles.map(role => (
                    <button key={role.id} onClick={() => toggleRole(role.id)} className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${selectedRoles.has(role.id) ? "text-white border-transparent" : "bg-neutral-50 dark:bg-white/5 border-neutral-200 dark:border-white/10 text-neutral-600 dark:text-neutral-300"}`} style={selectedRoles.has(role.id) ? { backgroundColor: role.color } : undefined}>
                      {role.name}
                    </button>
                  ))}
                </div>
                {selectedRoles.size === 0 && (
                  <p className="text-[11px] text-amber-500 mt-1">Никто не сможет видеть канал. Выберите хотя бы один тег.</p>
                )}
              </div>
            )}
            {isRestricted && roles.length === 0 && (
              <p className="text-xs text-neutral-400">Нет тегов. Создайте теги в настройках группы.</p>
            )}

            {/* Slowmode */}
            <div>
              <label className="text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1 block">Слоумод (секунды между сообщениями)</label>
              <select value={slowmode} onChange={e => setSlowmode(Number(e.target.value))} className="w-full px-3 py-2 bg-neutral-50 dark:bg-white/5 border border-neutral-200 dark:border-white/10 rounded-xl text-sm text-neutral-900 dark:text-white outline-none">
                <option value={0}>Выкл</option>
                <option value={5}>5 сек</option>
                <option value={10}>10 сек</option>
                <option value={15}>15 сек</option>
                <option value={30}>30 сек</option>
                <option value={60}>1 мин</option>
                <option value={120}>2 мин</option>
                <option value={300}>5 мин</option>
                <option value={600}>10 мин</option>
              </select>
              <p className="text-[11px] text-neutral-400 mt-1">Не влияет на админов и модераторов</p>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2 px-5 py-4 border-t border-neutral-100 dark:border-white/5">
          <button onClick={onClose} className="px-4 py-2 text-sm text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300">Отмена</button>
          <button onClick={handleSave} disabled={saving || !name.trim()} className="px-4 py-2 bg-violet-500 dark:bg-cyan-600 text-white text-sm rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50">
            {saving ? "Сохранение..." : "Сохранить"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Reusable channel item ── */
function ChannelItem({ ch, selectedChannel, unreadCounts, mentionChannels = {}, canManage, onChannelClick, onDeleteChannel, onEditChannel, isMuted, onToggleMute }: {
  ch: Channel;
  selectedChannel: string | null;
  unreadCounts: Record<string, number>;
  mentionChannels?: Record<string, boolean>;
  canManage: boolean;
  onChannelClick: (channel: Channel) => void;
  onDeleteChannel: (channelId: string) => void;
  onEditChannel?: (channel: Channel) => void;
  isMuted?: boolean;
  onToggleMute?: (channelId: string, muted: boolean) => void;
}) {
  return (
    <div className="group flex items-center">
      <button
        onClick={() => {
          if (selectedChannel === ch.id && canManage && onEditChannel) {
            onEditChannel(ch);
          } else {
            onChannelClick(ch);
          }
        }}
        className={`cn-channel-btn flex-1 text-left px-2.5 py-1.5 rounded-lg flex items-center gap-2 transition-all text-sm ${
          selectedChannel === ch.id ? "active" : ""
        }`}
        aria-current={selectedChannel === ch.id ? "page" : undefined}
      >
        <span className="text-base">{ch.icon || "💬"}</span>
        <span className="truncate flex-1">{ch.name}</span>
        {isMuted && <span className="text-[10px] text-neutral-400" title="Уведомления отключены">🔕</span>}
        {(unreadCounts[ch.id] ?? 0) > 0 && (
          mentionChannels[ch.id] ? (
            <span className="ml-auto w-2 h-2 rounded-full bg-red-500 flex-shrink-0" title="Вас упомянули" />
          ) : (
            <span className="ml-auto w-2 h-2 rounded-full bg-neutral-400 dark:bg-white flex-shrink-0" title="Непрочитано" />
          )
        )}
      </button>
      <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-all">
        {onToggleMute && (
          <button
            onClick={() => onToggleMute(ch.id, !isMuted)}
            className="p-1 text-neutral-400 hover:text-violet-500 dark:hover:text-cyan-400 transition-colors"
            aria-label={isMuted ? "Включить уведомления" : "Отключить уведомления"}
            title={isMuted ? "Включить уведомления" : "Отключить уведомления"}
          >
            <span className="text-[11px]">{isMuted ? "🔕" : "🔔"}</span>
          </button>
        )}
        
        {canManage && (
          <button
            onClick={() => onDeleteChannel(ch.id)}
            className="p-1 text-neutral-400 hover:text-red-500 transition-colors"
            aria-label={`Delete ${ch.name}`}
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */

export default function ChannelSidebar({
  groupDetail, selectedChannel, unreadCounts, mentionChannels = {}, canManage, isMainCommunity,
  myProfileUser, userName, userUsername, userRole,
  onChannelClick, onDeleteChannel, onCreateChannel,
  onInvite, onToggleMembers, onProfileSettings, onOpenSettings, memberCount, onBack,
  voiceState, voiceActions, onVoiceExpand, onGroupRefresh,
}: ChannelSidebarProps) {
  const textChannels = groupDetail.channels.filter((c) => c.type === "TEXT" || c.type === "NEWS");
  const voiceChannels = groupDetail.channels.filter((c) => c.type === "VOICE");

  /* ── Channel settings modal ── */
  const [editingChannel, setEditingChannel] = useState<Channel | null>(null);
  const [showReorder, setShowReorder] = useState(false);
  const [reorderChannels, setReorderChannels] = useState<Channel[]>([]);
  const [reorderSaving, setReorderSaving] = useState(false);

  /* ── Mute state ── */
  const [groupMuted, setGroupMuted] = useState(false);
  const [channelMutes, setChannelMutes] = useState<Record<string, boolean>>({});
  const groupId = groupDetail.channels[0]?.groupId;

  useEffect(() => {
    if (!groupId) return;
    fetch(`/api/channels/mute?groupId=${groupId}`)
      .then(r => r.json())
      .then(data => {
        setGroupMuted(data.groupMuted ?? false);
        setChannelMutes(data.channels ?? {});
      })
      .catch(() => {});
  }, [groupId]);

  const handleToggleGroupMute = async () => {
    if (!groupId) return;
    const newVal = !groupMuted;
    setGroupMuted(newVal);
    await fetch("/api/channels/mute", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ groupId, muted: newVal }),
    });
  };

  const handleToggleChannelMute = async (channelId: string, muted: boolean) => {
    setChannelMutes(prev => ({ ...prev, [channelId]: muted }));
    await fetch("/api/channels/mute", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ channelId, muted }),
    });
  };

  /* ── Collapsible category state ── */
  const [textOpen,  setTextOpen]  = useState(true);
  const [voiceOpen, setVoiceOpen] = useState(true);

  /* ── Service group collapse state (for main community) ── */
  const [collapsedServices, setCollapsedServices] = useState<Record<string, boolean>>({});

  const toggleServiceGroup = (serviceId: string) => {
    setCollapsedServices(prev => ({ ...prev, [serviceId]: !prev[serviceId] }));
  };

  /* ── Group channels by serviceId for main community ── */
  const serviceGroups = (() => {
    if (!isMainCommunity) return null;
    const groups: { serviceId: string; serviceName: string; channels: typeof textChannels }[] = [];
    const ungrouped: typeof textChannels = [];
    const serviceMap = new Map<string, typeof textChannels>();
    const serviceNames = new Map<string, string>();

    for (const ch of textChannels) {
      if (ch.serviceId) {
        const arr = serviceMap.get(ch.serviceId) ?? [];
        arr.push(ch);
        serviceMap.set(ch.serviceId, arr);
        // Derive service name from the NEWS channel or first channel
        if (ch.type === "NEWS" || !serviceNames.has(ch.serviceId)) {
          // Strip " — Обсуждение" / " — Вопросы" suffix to get base name
          const baseName = ch.name.replace(/ — (Обсуждение|Вопросы)$/, "");
          serviceNames.set(ch.serviceId, baseName);
        }
      } else {
        ungrouped.push(ch);
      }
    }

    for (const [sId, chs] of serviceMap) {
      groups.push({ serviceId: sId, serviceName: serviceNames.get(sId) || "Услуга", channels: chs });
    }

    return { groups, ungrouped };
  })();

  /* ── Track voice channel occupants via separate socket ── */
  const [channelUsersMap, setChannelUsersMap] = useState<Record<string, VoiceUser[]>>({});
  const [volumeOpen, setVolumeOpen] = useState<string | null>(null);

  useEffect(() => {
    const sock = io({ path: "/api/socketio", transports: ["websocket", "polling"] });
    const handle = ({ channelId, users }: { channelId: string; users: VoiceUser[] }) => {
      setChannelUsersMap(prev => ({ ...prev, [channelId]: users }));
    };
    sock.on("voice-channel-users", handle);
    sock.on("connect", () => {
      voiceChannels.forEach(ch => sock.emit("get-voice-channel-users", { channelId: ch.id }));
    });
    return () => { sock.disconnect(); };
  }, [groupDetail.channels.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const isInVoice = voiceState?.isConnected && voiceState?.channelId;
  const currentVoiceChannelId = voiceState?.channelId;

  return (
    <aside className="cn-sidebar w-60 max-md:w-full flex flex-col h-full flex-shrink-0">
      {/* ── Header ── */}
      <div className="p-3 flex items-center gap-2" style={{ borderBottom: "1px solid var(--cn-border)", flexShrink: 0 }}>
        {onBack && (
          <button onClick={onBack} className="md:hidden p-1 text-neutral-400 hover:text-neutral-600 dark:hover:text-white" aria-label="Back">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        )}
        <div className="min-w-0 flex-1">
          <h2 className="font-bold text-neutral-900 dark:text-white text-sm truncate">{groupDetail.name}</h2>
          {groupDetail.description && <p className="text-[11px] text-neutral-400 truncate mt-0.5">{groupDetail.description}</p>}
        </div>
        <button
          onClick={handleToggleGroupMute}
          className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-white/10 text-neutral-400 hover:text-violet-500 dark:hover:text-cyan-400 transition-colors flex-shrink-0"
          aria-label={groupMuted ? "Включить уведомления группы" : "Отключить уведомления группы"}
          title={groupMuted ? "Включить уведомления группы" : "Отключить уведомления группы"}
        >
          <span className="text-sm">{groupMuted ? "🔕" : "🔔"}</span>
        </button>
        {canManage && onOpenSettings && (
          <button onClick={onOpenSettings} className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-white/10 text-neutral-400 hover:text-violet-500 dark:hover:text-cyan-400 transition-colors flex-shrink-0" aria-label="Настройки группы">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        )}
      </div>

      {/* ── Channels ── */}
      <nav className="flex-1 overflow-y-auto p-2 space-y-0.5" aria-label="Каналы">
        {/* ── Main community: group by service ── */}
        {isMainCommunity && serviceGroups ? (
          <>
            {/* Ungrouped channels (no serviceId) */}
            {serviceGroups.ungrouped.length > 0 && (
              <>
                <div className="flex items-center justify-between px-2 py-1 group/cat">
                  <button
                    onClick={() => setTextOpen(o => !o)}
                    className="flex items-center gap-1.5 flex-1 text-left text-[11px] text-neutral-400 uppercase tracking-wider font-semibold hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors"
                    aria-expanded={textOpen}
                  >
                    <svg className={`w-2.5 h-2.5 flex-shrink-0 transition-transform duration-200 ${textOpen ? "rotate-90" : "rotate-0"}`} fill="none" viewBox="0 0 6 10">
                      <path d="M1 1l4 4-4 4" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    Общие
                  </button>
                  {canManage && textOpen && (
                    <button onClick={onCreateChannel} className="text-neutral-400 hover:text-violet-500 dark:hover:text-cyan-400 transition-colors opacity-0 group-hover/cat:opacity-100" aria-label="Создать канал">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                    </button>
                  )}
                </div>
                {textOpen && serviceGroups.ungrouped.map((ch) => (
                  <ChannelItem key={ch.id} ch={ch} selectedChannel={selectedChannel} unreadCounts={unreadCounts} mentionChannels={mentionChannels} canManage={canManage} onChannelClick={onChannelClick} onDeleteChannel={onDeleteChannel} onEditChannel={canManage ? setEditingChannel : undefined} isMuted={channelMutes[ch.id] ?? (groupMuted && channelMutes[ch.id] !== false)} onToggleMute={handleToggleChannelMute} />
                ))}
              </>
            )}

            {/* Service-grouped channels */}
            {serviceGroups.groups.map((sg) => {
              const isCollapsed = !!collapsedServices[sg.serviceId];
              const hasUnread = sg.channels.some(c => (unreadCounts[c.id] ?? 0) > 0);
              return (
                <div key={sg.serviceId} className="mt-2">
                  <div className="flex items-center justify-between px-2 py-1 group/cat">
                    <button
                      onClick={() => toggleServiceGroup(sg.serviceId)}
                      className="flex items-center gap-1.5 flex-1 text-left text-[11px] text-neutral-400 uppercase tracking-wider font-semibold hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors"
                      aria-expanded={!isCollapsed}
                    >
                      <svg className={`w-2.5 h-2.5 flex-shrink-0 transition-transform duration-200 ${!isCollapsed ? "rotate-90" : "rotate-0"}`} fill="none" viewBox="0 0 6 10">
                        <path d="M1 1l4 4-4 4" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      {sg.serviceName}
                      {isCollapsed && hasUnread && (
                        <span className="ml-auto w-1.5 h-1.5 rounded-full bg-violet-500 dark:bg-cyan-400 flex-shrink-0" />
                      )}
                    </button>
                  </div>
                  {!isCollapsed && sg.channels.map((ch) => (
                    <ChannelItem key={ch.id} ch={ch} selectedChannel={selectedChannel} unreadCounts={unreadCounts} mentionChannels={mentionChannels} canManage={canManage} onChannelClick={onChannelClick} onDeleteChannel={onDeleteChannel} onEditChannel={canManage ? setEditingChannel : undefined} isMuted={channelMutes[ch.id] ?? (groupMuted && channelMutes[ch.id] !== false)} onToggleMute={handleToggleChannelMute} />
                  ))}
                </div>
              );
            })}
          </>
        ) : (
          <>
            {/* Regular group: flat text channels list */}
            <div className="flex items-center justify-between px-2 py-1 group/cat">
              <button
                onClick={() => setTextOpen(o => !o)}
                className="flex items-center gap-1.5 flex-1 text-left text-[11px] text-neutral-400 uppercase tracking-wider font-semibold hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors"
                aria-expanded={textOpen}
              >
                <svg className={`w-2.5 h-2.5 flex-shrink-0 transition-transform duration-200 ${textOpen ? "rotate-90" : "rotate-0"}`} fill="currentColor" viewBox="0 0 6 10">
                  <path d="M1 1l4 4-4 4" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" fill="none" />
                </svg>
                Текстовые
                {!textOpen && textChannels.some(c => (unreadCounts[c.id] ?? 0) > 0) && (
                  <span className="ml-auto w-1.5 h-1.5 rounded-full bg-violet-500 dark:bg-cyan-400 flex-shrink-0" />
                )}
              </button>
              {canManage && textOpen && (
                <div className="flex gap-0.5 opacity-0 group-hover/cat:opacity-100">
                  <button onClick={() => { setReorderChannels([...groupDetail.channels]); setShowReorder(true); }} className="text-neutral-400 hover:text-violet-500 dark:hover:text-cyan-400 transition-colors" aria-label="Порядок каналов" title="Порядок каналов">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                    </svg>
                  </button>
                  <button onClick={onCreateChannel} className="text-neutral-400 hover:text-violet-500 dark:hover:text-cyan-400 transition-colors" aria-label="Создать канал">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </button>
                </div>
              )}
            </div>
            {textOpen && (() => {
              const rootChannels = textChannels.filter(c => !c.parentId);
              const childMap = new Map<string, Channel[]>();
              for (const c of textChannels) {
                if (c.parentId) {
                  const arr = childMap.get(c.parentId) || [];
                  arr.push(c);
                  childMap.set(c.parentId, arr);
                }
              }
              return rootChannels.map(ch => (
                <div key={ch.id}>
                  <ChannelItem ch={ch} selectedChannel={selectedChannel} unreadCounts={unreadCounts} mentionChannels={mentionChannels} canManage={canManage} onChannelClick={onChannelClick} onDeleteChannel={onDeleteChannel} onEditChannel={canManage ? setEditingChannel : undefined} isMuted={channelMutes[ch.id] ?? (groupMuted && channelMutes[ch.id] !== false)} onToggleMute={handleToggleChannelMute} />
                  {childMap.get(ch.id)?.map(sub => (
                    <div key={sub.id} className="ml-4 border-l border-neutral-200 dark:border-white/5">
                      <ChannelItem ch={sub} selectedChannel={selectedChannel} unreadCounts={unreadCounts} mentionChannels={mentionChannels} canManage={canManage} onChannelClick={onChannelClick} onDeleteChannel={onDeleteChannel} onEditChannel={canManage ? setEditingChannel : undefined} isMuted={channelMutes[sub.id] ?? (groupMuted && channelMutes[sub.id] !== false)} onToggleMute={handleToggleChannelMute} />
                    </div>
                  ))}
                </div>
              ));
            })()}
          </>
        )}

        {/* Voice channels — collapsible */}
        {voiceChannels.length > 0 && (
          <>
            <div className="flex items-center justify-between px-2 py-1 mt-3 group/cat">
              <button
                onClick={() => setVoiceOpen(o => !o)}
                className="flex items-center gap-1.5 flex-1 text-left text-[11px] text-neutral-400 uppercase tracking-wider font-semibold hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors"
                aria-expanded={voiceOpen}
              >
                <svg
                  className={`w-2.5 h-2.5 flex-shrink-0 transition-transform duration-200 ${voiceOpen ? "rotate-90" : "rotate-0"}`}
                  fill="none" viewBox="0 0 6 10"
                >
                  <path d="M1 1l4 4-4 4" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Голосовые
              </button>
            </div>
            {voiceOpen && voiceChannels.map((ch) => {
              const isActive = currentVoiceChannelId === ch.id;
              const previewUsers = channelUsersMap[ch.id] ?? [];
              const connectedUsers = isActive && voiceState ? voiceState.users : [];
              const displayUsers = isActive ? connectedUsers : previewUsers;

              return (
                <div key={ch.id}>
                  {/* Channel button */}
                  <div className="group flex items-center">
                    <button
                      onClick={() => {
                        if (isActive && onVoiceExpand) {
                          onVoiceExpand();
                        } else if (voiceActions && !isActive) {
                          voiceActions.joinVoice(ch.id, ch.name);
                        }
                      }}
                      className={`cn-channel-btn flex-1 text-left px-2.5 py-1.5 rounded-lg flex items-center gap-2 transition-all text-sm ${
                        isActive ? "active" : ""
                      }`}
                    >
                      <span className="text-base">{ch.icon || "\uD83C\uDF99\uFE0F"}</span>
                      <span className="truncate flex-1">{ch.name}</span>
                      {displayUsers.length > 0 && !isActive && (
                        <span className="text-[10px] text-neutral-400">{displayUsers.length}</span>
                      )}
                    </button>
                    {canManage && (
                      <button
                        onClick={() => onDeleteChannel(ch.id)}
                        className="opacity-0 group-hover:opacity-100 p-1 text-neutral-400 hover:text-red-500 transition-all"
                        aria-label={`Delete ${ch.name}`}
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>

                  {/* Connection status indicator */}
                  {isActive && voiceState && voiceState.voiceStatus === "connecting" && (
                    <div className="ml-5 pl-2.5 border-l-2 border-yellow-400/30 py-1">
                      <span className="text-[11px] text-yellow-400 animate-pulse flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
                        Подключение к серверу...
                      </span>
                    </div>
                  )}
                  {isActive && voiceState && voiceState.voiceStatus === "reconnecting" && (
                    <div className="ml-5 pl-2.5 border-l-2 border-orange-400/30 py-1">
                      <span className="text-[11px] text-orange-400 animate-pulse flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-orange-400 animate-pulse" />
                        Переподключение...
                      </span>
                    </div>
                  )}

                  {/* Users in voice channel (Discord style: vertical list under channel) */}
                  {displayUsers.length > 0 && (
                    <div className="ml-5 pl-2.5 border-l-2 border-neutral-200 dark:border-white/10 space-y-0.5 mb-1">
                      {/* Local user shown first if connected */}
                      {isActive && voiceState && (
                        <VoiceUserRow
                          name={userName}
                          muted={voiceState.isMuted}
                          speaking={voiceState.localSpeaking && !voiceState.isMuted}
                          isLocal
                        />
                      )}
                      {displayUsers
                        .filter(u => !(isActive && u.userId === myProfileUser.id))
                        .map(u => (
                        <div key={u.socketId} className="group/user relative">
                          <VoiceUserRow
                            name={u.userName}
                            muted={u.muted}
                            speaking={isActive ? voiceState?.speakingUsers.has(u.socketId) ?? false : false}
                            quality={isActive ? voiceState?.connectionQuality.get(u.socketId) : undefined}
                          />
                          {/* Per-user volume control (only when connected) */}
                          {isActive && voiceActions && (
                            <button
                              onClick={() => setVolumeOpen(volumeOpen === u.socketId ? null : u.socketId)}
                              className="absolute right-0 top-0.5 opacity-0 group-hover/user:opacity-100 p-0.5 text-neutral-400 hover:text-neutral-600 dark:hover:text-white transition-all"
                              title="Громкость"
                            >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072M12 6v12m0 0l-4-4m4 4l4-4" />
                              </svg>
                            </button>
                          )}
                          {/* Volume slider popup */}
                          {volumeOpen === u.socketId && voiceActions && voiceState && (
                            <div className="absolute left-full top-0 ml-2 z-50 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-white/10 rounded-lg shadow-lg p-2 w-36">
                              <div className="text-[10px] text-neutral-400 mb-1 truncate">{u.userName}</div>
                              <div className="flex items-center gap-2">
                                <input
                                  type="range"
                                  min={10}
                                  max={100}
                                  value={voiceState.userVolumes.get(u.socketId) ?? 100}
                                  onChange={(e) => voiceActions.setUserVolume(u.socketId, Number(e.target.value))}
                                  className="flex-1 h-1 accent-violet-500 dark:accent-cyan-400"
                                />
                                <span className="text-[10px] text-neutral-500 w-7 text-right">
                                  {voiceState.userVolumes.get(u.socketId) ?? 100}%
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </>
        )}
      </nav>

      {/* ── Bottom actions ── */}
      <div className="p-2 border-t border-neutral-200 dark:border-white/5 space-y-1">
        {canManage && (
          <button onClick={onInvite} className="w-full px-3 py-1.5 text-left text-sm text-violet-600 dark:text-cyan-400 hover:bg-violet-50 dark:hover:bg-cyan-400/10 rounded-lg transition-colors flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
            Пригласить
          </button>
        )}
        {!(isMainCommunity && !canManage && userRole !== "ADMIN") && (
        <button onClick={onToggleMembers} className="w-full px-3 py-1.5 text-left text-sm text-neutral-600 dark:text-gray-400 hover:bg-neutral-100 dark:hover:bg-white/5 rounded-lg transition-colors flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
          Участники ({memberCount})
        </button>
        )}
      </div>

      {/* ── Voice controls bar (when connected) ── */}
      {isInVoice && voiceState && voiceActions && (
        <div className="border-t border-neutral-200 dark:border-white/5 bg-neutral-50 dark:bg-white/[0.02]">
          <div className="px-3 py-1.5 flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            <span className="text-[11px] text-green-600 dark:text-green-400 font-medium truncate flex-1">
              {voiceState.channelName}
            </span>
          </div>
          <div className="flex items-center justify-center gap-1.5 px-3 pb-2">
            {/* Mute */}
            <VoiceControlBtn
              active={voiceState.isMuted}
              color="red"
              onClick={voiceActions.toggleMute}
              title={voiceState.isMuted ? "Вкл. микрофон" : "Выкл. микрофон"}
            >
              {voiceState.isMuted ? <MutedMicIcon /> : <MicIcon />}
            </VoiceControlBtn>
            {/* Deafen */}
            <VoiceControlBtn
              active={voiceState.isDeafened}
              color="red"
              onClick={voiceActions.toggleDeafen}
              title={voiceState.isDeafened ? "Вкл. звук" : "Выкл. звук"}
            >
              {voiceState.isDeafened ? <DeafenOnIcon /> : <DeafenOffIcon />}
            </VoiceControlBtn>
            {/* Noise suppressor */}
            <VoiceControlBtn
              active={voiceState.nsEnabled && voiceState.nsStatus === "ready"}
              color="green"
              onClick={voiceActions.toggleNS}
              title={voiceState.nsEnabled ? "Выкл. шумодав" : "Вкл. шумодав"}
            >
              <NsIcon />
            </VoiceControlBtn>
            {/* Screen share */}
            <VoiceControlBtn
              active={voiceState.isSharingScreen}
              color="green"
              onClick={voiceState.isSharingScreen ? voiceActions.stopScreenShare : voiceActions.startScreenShare}
              title={voiceState.isSharingScreen ? "Стоп демонстрация" : "Демонстрация экрана"}
              disabled={!voiceState.isSharingScreen && voiceState.screenSharerId !== null}
            >
              <ScreenShareIcon />
            </VoiceControlBtn>
            {/* Disconnect */}
            <button
              onClick={voiceActions.leaveVoice}
              className="p-1.5 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors"
              title="Отключиться"
            >
              <HangupIcon />
            </button>
          </div>
        </div>
      )}

      {editingChannel && (
        <ChannelSettingsModal
          channel={editingChannel}
          groupId={groupDetail.channels[0]?.groupId ?? ""}
          allChannels={groupDetail.channels}
          onClose={() => setEditingChannel(null)}
          onUpdated={() => { onGroupRefresh?.(); }}
        />
      )}

      {/* Reorder modal */}
      {showReorder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setShowReorder(false)}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div className="relative z-10 w-full max-w-sm bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-white/10 rounded-2xl shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100 dark:border-white/5">
              <h2 className="text-base font-semibold text-neutral-900 dark:text-white">Порядок каналов</h2>
              <button onClick={() => setShowReorder(false)} className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-white/10 text-neutral-400 transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-3 max-h-[60vh] overflow-y-auto space-y-1">
              {reorderChannels.map((ch, idx) => (
                <div key={ch.id} className="flex items-center gap-2 px-3 py-2 bg-neutral-50 dark:bg-white/5 rounded-xl">
                  <span className="text-base">{ch.icon || (ch.type === "VOICE" ? "🎙️" : "💬")}</span>
                  <span className="text-sm text-neutral-900 dark:text-white truncate flex-1">{ch.name}</span>
                  <div className="flex gap-1">
                    <button
                      onClick={() => {
                        if (idx === 0) return;
                        const arr = [...reorderChannels];
                        [arr[idx - 1], arr[idx]] = [arr[idx], arr[idx - 1]];
                        setReorderChannels(arr);
                      }}
                      disabled={idx === 0}
                      className="p-1 text-neutral-400 hover:text-violet-500 dark:hover:text-cyan-400 disabled:opacity-30 transition-colors"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
                    </button>
                    <button
                      onClick={() => {
                        if (idx === reorderChannels.length - 1) return;
                        const arr = [...reorderChannels];
                        [arr[idx], arr[idx + 1]] = [arr[idx + 1], arr[idx]];
                        setReorderChannels(arr);
                      }}
                      disabled={idx === reorderChannels.length - 1}
                      className="p-1 text-neutral-400 hover:text-violet-500 dark:hover:text-cyan-400 disabled:opacity-30 transition-colors"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-2 px-5 py-4 border-t border-neutral-100 dark:border-white/5">
              <button onClick={() => setShowReorder(false)} className="px-4 py-2 text-sm text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300">Отмена</button>
              <button
                onClick={async () => {
                  setReorderSaving(true);
                  await fetch("/api/channels/reorder", {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ channelIds: reorderChannels.map(c => c.id), groupId }),
                  });
                  setReorderSaving(false);
                  setShowReorder(false);
                  onGroupRefresh?.();
                }}
                disabled={reorderSaving}
                className="px-4 py-2 bg-violet-500 dark:bg-cyan-600 text-white text-sm rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {reorderSaving ? "Сохранение..." : "Сохранить"}
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  Voice User Row (Discord-style inline list item)                            */
/* ═══════════════════════════════════════════════════════════════════════════ */

function VoiceUserRow({ name, muted, speaking, isLocal, quality }: {
  name: string; muted: boolean; speaking: boolean; isLocal?: boolean; quality?: "good" | "medium" | "poor" | "unknown";
}) {
  const qColor = quality === "good" ? "bg-green-400" : quality === "medium" ? "bg-yellow-400" : quality === "poor" ? "bg-red-400" : "bg-neutral-500";
  return (
    <div className="flex items-center gap-2 py-0.5 px-1 rounded group/row hover:bg-neutral-100 dark:hover:bg-white/5 transition-colors">
      <div className="relative">
        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all ${
          speaking
            ? "bg-green-400/20 text-green-600 dark:text-green-400 ring-2 ring-green-400"
            : "bg-neutral-200 dark:bg-white/10 text-neutral-600 dark:text-neutral-400"
        }`}>
          {name.charAt(0).toUpperCase()}
        </div>
        {muted && (
          <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-red-400 flex items-center justify-center">
            <svg className="w-2 h-2 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6" />
            </svg>
          </div>
        )}
      </div>
      <span className={`text-[12px] truncate flex-1 ${
        speaking ? "text-green-600 dark:text-green-400 font-medium" : "text-neutral-600 dark:text-neutral-400"
      }`}>
        {name}{isLocal ? " (Вы)" : ""}
      </span>
      {quality && <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${qColor}`} />}
      {speaking && <AudioBars bars={3} color="bg-green-400" maxH={10} />}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  Voice Control Button                                                       */
/* ═══════════════════════════════════════════════════════════════════════════ */

function VoiceControlBtn({ onClick, active, color, title, children, disabled }: {
  onClick: () => void; active: boolean; color: "red" | "green"; title: string; children: React.ReactNode; disabled?: boolean;
}) {
  const cls = active
    ? color === "red"
      ? "bg-red-100 dark:bg-red-500/20 text-red-500"
      : "bg-green-100 dark:bg-green-500/20 text-green-500"
    : "bg-neutral-100 dark:bg-white/8 text-neutral-500 dark:text-neutral-400";
  return (
    <button
      onClick={onClick}
      title={title}
      disabled={disabled}
      className={`p-1.5 rounded-lg transition-colors disabled:opacity-40 ${cls}`}
    >
      {children}
    </button>
  );
}

/* ── Icons ── */

function MicIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
    </svg>
  );
}
function MutedMicIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
    </svg>
  );
}
function DeafenOffIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
    </svg>
  );
}
function DeafenOnIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
    </svg>
  );
}
function NsIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
    </svg>
  );
}
function ScreenShareIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  );
}
function HangupIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M5 3a2 2 0 00-2 2v1c0 8.284 6.716 15 15 15h1a2 2 0 002-2v-3.28a1 1 0 00-.684-.948l-4.493-1.498a1 1 0 00-1.21.502l-1.13 2.257a11.042 11.042 0 01-5.516-5.517l2.257-1.128a1 1 0 00.502-1.21L9.228 3.683A1 1 0 008.279 3H5z" />
    </svg>
  );
}
