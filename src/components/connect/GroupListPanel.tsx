"use client";

import Image from "next/image";

interface Group {
  id: string;
  name: string;
  icon: string | null;
  description: string;
  isMain?: boolean;
  _count: { members: number; channels: number };
}

interface GroupListPanelProps {
  groups: Group[];
  selectedGroup: string | null;
  onSelectGroup: (id: string) => void;
  onCreateGroup: () => void;
  onJoinGroup: () => void;
}

function GroupAvatar({ icon, name, isMain }: { icon: string | null; name: string; isMain?: boolean }) {
  const size = isMain ? "w-12 h-12" : "w-10 h-10";
  const imgSize = isMain ? 48 : 40;
  const textSize = isMain ? "text-base" : "text-sm";

  if (icon?.startsWith("/")) {
    return (
      <div className={`${size} rounded-xl overflow-hidden flex-shrink-0${isMain ? " ring-2 ring-violet-500/50 dark:ring-cyan-400/50" : ""}`}>
        <Image src={icon} alt={name} width={imgSize} height={imgSize} className="object-cover w-full h-full" />
      </div>
    );
  }
  const initials = name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
  return (
    <div
      className={`${size} rounded-xl flex items-center justify-center flex-shrink-0 ${textSize} font-bold${isMain ? " ring-2 ring-violet-500/50 dark:ring-cyan-400/50" : ""}`}
      style={{
        background: "var(--cn-accent-dim)",
        color: "var(--cn-accent-text)",
        border: "1px solid color-mix(in srgb, var(--cn-accent) 20%, transparent)",
      }}
    >
      {initials || "?"}
    </div>
  );
}

export default function GroupListPanel({
  groups,
  selectedGroup,
  onSelectGroup,
  onCreateGroup,
  onJoinGroup,
}: GroupListPanelProps) {
  return (
    <div className="flex flex-col h-full cn-sidebar">
      {/* Header */}
      <div
        className="flex items-center justify-between px-4"
        style={{
          height: 48,
          borderBottom: "1px solid var(--cn-border)",
          flexShrink: 0,
        }}
      >
        <span
          className="font-bold text-sm"
          style={{ color: "var(--cn-text)" }}
        >
          Сообщества
        </span>
      </div>

      {/* Group list */}
      <nav className="flex-1 overflow-y-auto p-2 space-y-0.5" aria-label="Список сообществ">
        {groups.length === 0 ? (
          <div className="text-center py-10 px-4">
            <span className="text-3xl block mb-2">🏰</span>
            <p className="text-sm" style={{ color: "var(--cn-muted)" }}>
              Вы пока не в группах
            </p>
          </div>
        ) : (
          groups.map((g) => {
            const isActive = selectedGroup === g.id;
            return (
              <button
                key={g.id}
                onClick={() => onSelectGroup(g.id)}
                className="cn-channel-btn"
                style={
                  isActive
                    ? {
                        background: "var(--cn-accent-dim)",
                        color: "var(--cn-accent-text)",
                        borderLeftColor: "var(--cn-accent)",
                        fontWeight: 600,
                      }
                    : {}
                }
              >
                <GroupAvatar icon={g.icon} name={g.name} isMain={g.isMain} />
                <div className="min-w-0 flex-1 text-left">
                  <div
                    className="text-sm font-semibold truncate"
                    style={{ color: isActive ? "var(--cn-accent-text)" : "var(--cn-text)" }}
                  >
                    {g.name}
                  </div>
                  <div className="text-xs truncate" style={{ color: "var(--cn-muted)" }}>
                    {g._count.members} участников · {g._count.channels} каналов
                  </div>
                </div>
              </button>
            );
          })
        )}
      </nav>

      {/* Footer actions */}
      <div
        className="p-2 space-y-1"
        style={{ borderTop: "1px solid var(--cn-border)" }}
      >
        <button
          onClick={onCreateGroup}
          className="cn-channel-btn text-sm"
          style={{ color: "var(--cn-accent-text)", fontWeight: 500 }}
        >
          <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="16" />
            <line x1="8" y1="12" x2="16" y2="12" />
          </svg>
          Создать сообщество
        </button>
        <button
          onClick={onJoinGroup}
          className="cn-channel-btn text-sm"
          style={{ color: "var(--cn-muted)" }}
        >
          <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
            <polyline points="10 17 15 12 10 7" />
            <line x1="15" y1="12" x2="3" y2="12" />
          </svg>
          Присоединиться
        </button>
      </div>
    </div>
  );
}
