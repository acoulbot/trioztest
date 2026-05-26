"use client";

import { useState, useRef, useCallback } from "react";
import Image from "next/image";

interface Group {
  id: string;
  name: string;
  icon: string | null;
  description: string;
  isMain?: boolean;
  sortOrder?: number;
  _count: { members: number; channels: number };
}

interface GroupListPanelProps {
  groups: Group[];
  selectedGroup: string | null;
  onSelectGroup: (id: string) => void;
  onCreateGroup: () => void;
  onJoinGroup: () => void;
  onReorder?: (groupIds: string[]) => void;
}

function GroupAvatar({ icon, name }: { icon: string | null; name: string }) {
  if (icon?.startsWith("/")) {
    return (
      <div className="w-10 h-10 rounded-xl overflow-hidden flex-shrink-0">
        <Image src={icon} alt={name} width={40} height={40} className="object-cover w-full h-full" />
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
      className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-sm font-bold"
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
  onReorder,
}: GroupListPanelProps) {
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const dragItemRef = useRef<string | null>(null);

  const handleDragStart = useCallback((groupId: string) => {
    dragItemRef.current = groupId;
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, groupId: string) => {
    e.preventDefault();
    if (dragItemRef.current && dragItemRef.current !== groupId) {
      setDragOverId(groupId);
    }
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOverId(null);
  }, []);

  const handleDrop = useCallback((targetId: string) => {
    setDragOverId(null);
    const sourceId = dragItemRef.current;
    dragItemRef.current = null;
    if (!sourceId || sourceId === targetId || !onReorder) return;

    // Separate pinned (isMain) from draggable groups
    const pinned = groups.filter((g) => g.isMain);
    const draggable = groups.filter((g) => !g.isMain);

    const sourceIdx = draggable.findIndex((g) => g.id === sourceId);
    const targetIdx = draggable.findIndex((g) => g.id === targetId);
    if (sourceIdx === -1 || targetIdx === -1) return;

    const reordered = [...draggable];
    const [moved] = reordered.splice(sourceIdx, 1);
    reordered.splice(targetIdx, 0, moved);

    const newOrder = [...pinned, ...reordered].map((g) => g.id);
    onReorder(newOrder);
  }, [groups, onReorder]);

  const handleDragEnd = useCallback(() => {
    dragItemRef.current = null;
    setDragOverId(null);
  }, []);

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
            const isDraggable = !g.isMain;
            const isDragOver = dragOverId === g.id;

            return (
              <div
                key={g.id}
                draggable={isDraggable}
                onDragStart={isDraggable ? () => handleDragStart(g.id) : undefined}
                onDragOver={isDraggable ? (e) => handleDragOver(e, g.id) : undefined}
                onDragLeave={isDraggable ? handleDragLeave : undefined}
                onDrop={isDraggable ? () => handleDrop(g.id) : undefined}
                onDragEnd={handleDragEnd}
                className={`transition-all ${isDragOver ? "border-t-2 border-cyan-400 dark:border-cyan-400" : "border-t-2 border-transparent"}`}
                style={{ cursor: isDraggable ? "grab" : undefined }}
              >
                <button
                  onClick={() => onSelectGroup(g.id)}
                  className="cn-channel-btn w-full"
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
                  <GroupAvatar icon={g.icon} name={g.name} />
                  <div className="min-w-0 flex-1 text-left">
                    <div className="flex items-center gap-1">
                      <span
                        className="text-sm font-semibold truncate"
                        style={{ color: isActive ? "var(--cn-accent-text)" : "var(--cn-text)" }}
                      >
                        {g.name}
                      </span>
                      {g.isMain && (
                        <span className="text-[9px] px-1 py-0.5 rounded bg-violet-100 dark:bg-cyan-400/10 text-violet-600 dark:text-cyan-400 font-medium flex-shrink-0">
                          Главное
                        </span>
                      )}
                    </div>
                    <div className="text-xs truncate" style={{ color: "var(--cn-muted)" }}>
                      {g._count.members} участников · {g._count.channels} каналов
                    </div>
                  </div>
                  {isDraggable && (
                    <svg className="w-4 h-4 flex-shrink-0 opacity-30" viewBox="0 0 24 24" fill="currentColor">
                      <circle cx="9" cy="6" r="1.5" />
                      <circle cx="15" cy="6" r="1.5" />
                      <circle cx="9" cy="12" r="1.5" />
                      <circle cx="15" cy="12" r="1.5" />
                      <circle cx="9" cy="18" r="1.5" />
                      <circle cx="15" cy="18" r="1.5" />
                    </svg>
                  )}
                </button>
              </div>
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
