"use client";

import GlowAvatar, { GlowAvatarUser } from "@/components/ui/GlowAvatar";

interface Channel {
  id: string;
  name: string;
  type: string;
  icon: string | null;
  groupId: string;
  _count: { members: number; messages: number };
}

interface GroupDetail {
  name: string;
  icon: string | null;
  description: string;
  myRole: string;
  channels: Channel[];
  members: { user: { id: string; name: string; username: string; avatar: string | null; role: string }; role: string }[];
}

interface ChannelSidebarProps {
  groupDetail: GroupDetail;
  selectedChannel: string | null;
  unreadCounts: Record<string, number>;
  canManage: boolean;
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
  memberCount: number;
  onBack?: () => void;
}

export default function ChannelSidebar({
  groupDetail, selectedChannel, unreadCounts, canManage,
  myProfileUser, userName, userUsername, userRole,
  onChannelClick, onDeleteChannel, onCreateChannel,
  onInvite, onToggleMembers, onProfileSettings, memberCount, onBack,
}: ChannelSidebarProps) {
  const textChannels = groupDetail.channels.filter((c) => c.type === "TEXT");
  const voiceChannels = groupDetail.channels.filter((c) => c.type === "VOICE");

  return (
    <aside className="w-60 max-md:w-full bg-white dark:bg-neutral-900 border-r border-neutral-200 dark:border-white/5 flex flex-col h-full flex-shrink-0">
      <div className="p-3 border-b border-neutral-200 dark:border-white/5 flex items-center gap-2">
        {onBack && (
          <button onClick={onBack} className="md:hidden p-1 text-neutral-400 hover:text-neutral-600 dark:hover:text-white" aria-label="Back">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        )}
        <div className="min-w-0">
          <h2 className="font-bold text-neutral-900 dark:text-white text-sm truncate">{groupDetail.name}</h2>
          {groupDetail.description && <p className="text-[11px] text-neutral-400 truncate mt-0.5">{groupDetail.description}</p>}
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto p-2 space-y-0.5" aria-label="Channels">
        <div className="flex items-center justify-between px-2 py-1">
          <span className="text-[11px] text-neutral-400 uppercase tracking-wider font-semibold">Текстовые</span>
          {canManage && (
            <button onClick={onCreateChannel} className="text-neutral-400 hover:text-violet-500 dark:hover:text-cyan-400 transition-colors" aria-label="Создать канал">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
          )}
        </div>
        {textChannels.map((ch) => (
          <div key={ch.id} className="group flex items-center">
            <button
              onClick={() => onChannelClick(ch)}
              className={`flex-1 text-left px-2.5 py-1.5 rounded-lg flex items-center gap-2 transition-all text-sm ${
                selectedChannel === ch.id
                  ? "bg-violet-50 dark:bg-cyan-400/10 text-violet-700 dark:text-cyan-400"
                  : "text-neutral-600 dark:text-gray-400 hover:bg-neutral-100 dark:hover:bg-white/5 hover:text-neutral-900 dark:hover:text-white"
              }`}
              aria-current={selectedChannel === ch.id ? "page" : undefined}
            >
              <span className="text-base">{ch.icon || "\uD83D\uDCAC"}</span>
              <span className="truncate flex-1">{ch.name}</span>
              {(unreadCounts[ch.id] ?? 0) > 0 && (
                <span className="ml-auto bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold min-w-[18px] text-center" aria-label={`${unreadCounts[ch.id]} unread`}>
                  {unreadCounts[ch.id]}
                </span>
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
        ))}

        {voiceChannels.length > 0 && (
          <>
            <div className="flex items-center justify-between px-2 py-1 mt-3">
              <span className="text-[11px] text-neutral-400 uppercase tracking-wider font-semibold">Голосовые</span>
            </div>
            {voiceChannels.map((ch) => (
              <div key={ch.id} className="group flex items-center">
                <button
                  onClick={() => onChannelClick(ch)}
                  className="flex-1 text-left px-2.5 py-1.5 rounded-lg flex items-center gap-2 text-neutral-600 dark:text-gray-400 hover:bg-neutral-100 dark:hover:bg-white/5 hover:text-neutral-900 dark:hover:text-white transition-all text-sm"
                >
                  <span className="text-base">{ch.icon || "\uD83C\uDF99\uFE0F"}</span>
                  <span className="truncate">{ch.name}</span>
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
            ))}
          </>
        )}
      </nav>

      <div className="p-2 border-t border-neutral-200 dark:border-white/5 space-y-1">
        {canManage && (
          <button onClick={onInvite} className="w-full px-3 py-1.5 text-left text-sm text-violet-600 dark:text-cyan-400 hover:bg-violet-50 dark:hover:bg-cyan-400/10 rounded-lg transition-colors flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
            Пригласить
          </button>
        )}
        <button onClick={onToggleMembers} className="w-full px-3 py-1.5 text-left text-sm text-neutral-600 dark:text-gray-400 hover:bg-neutral-100 dark:hover:bg-white/5 rounded-lg transition-colors flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
          Участники ({memberCount})
        </button>
      </div>

      <div className="p-2 border-t border-neutral-200 dark:border-white/5">
        <div className="flex items-center gap-2 px-2 py-1.5">
          <GlowAvatar user={myProfileUser} size={32} />
          <div className="min-w-0 flex-1">
            <div className="text-sm font-medium text-neutral-900 dark:text-white truncate">{userName}</div>
            <div className="text-[10px] text-neutral-400 truncate">@{userUsername}</div>
          </div>
          {userRole === "ADMIN" && (
            <button onClick={onProfileSettings} title="Настройки профиля" className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-white/10 text-neutral-400 hover:text-violet-500 dark:hover:text-violet-400 transition-colors flex-shrink-0" aria-label="Настройки профиля">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}
