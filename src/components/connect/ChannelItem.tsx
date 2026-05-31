"use client";

import type { Channel } from "./sidebarTypes";

export function ChannelItem({ ch, selectedChannel, unreadCounts, mentionChannels = {}, canManage, onChannelClick, onDeleteChannel, onEditChannel, isMuted, onToggleMute }: {
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
