"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";
import ModalBackdrop from "./ModalBackdrop";
import type { Channel } from "./sidebarTypes";

/* ── Access helpers (single source of truth for block write-permission) ── */

export type Access = "ALL" | "MOD" | "ADMIN";

export function effectiveAccess(c: Channel): Access {
  // Legacy NEWS channels behave like MOD (admin + moderators)
  if (c.type === "NEWS" && (!c.postAccess || c.postAccess === "ALL")) return "MOD";
  const a = c.postAccess;
  return a === "ADMIN" || a === "MOD" ? a : "ALL";
}

const ICON_BG: Record<Access, string> = {
  ADMIN: "bg-cyan-400/12 text-cyan-300",
  MOD: "bg-violet-400/14 text-violet-300",
  ALL: "bg-emerald-400/14 text-emerald-300",
};

function defaultIcon(a: Access) {
  return a === "ADMIN" ? "ℹ️" : a === "MOD" ? "❓" : "💬";
}

/* ── Props ── */

interface SectionsPanelProps {
  channels: Channel[];
  generalChannelId: string | null;
  selectedChannel: string | null;
  unreadCounts: Record<string, number>;
  canManage: boolean;
  groupId: string;
  variant?: "desktop" | "mobile";
  onSelectChannel: (channel: Channel) => void;
  onRefresh: () => void;
}

export default function SectionsPanel({
  channels, generalChannelId, selectedChannel, unreadCounts, canManage, groupId,
  variant = "desktop", onSelectChannel, onRefresh,
}: SectionsPanelProps) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [createParent, setCreateParent] = useState<string | null | undefined>(undefined);
  // undefined = closed, null = new top-level block, string = new list item under block id

  // Top-level "разделы" = non-voice channels that aren't the general chat and have no parent
  const blocks = channels
    .filter((c) => c.type !== "VOICE" && !c.parentId && c.id !== generalChannelId)
    .sort((a, b) => a.name.localeCompare(b.name));

  const childrenOf = (blockId: string) =>
    channels.filter((c) => c.parentId === blockId && c.type !== "VOICE");

  const unreadFor = (c: Channel) => {
    let n = unreadCounts[c.id] ?? 0;
    for (const ch of childrenOf(c.id)) n += unreadCounts[ch.id] ?? 0;
    return n;
  };

  const isMobile = variant === "mobile";

  return (
    <div
      className={isMobile ? "" : "flex-shrink-0 w-[330px] flex flex-col h-full"}
      style={isMobile ? undefined : { borderLeft: "1px solid var(--cn-border)", background: "var(--cn-sidebar)" }}
    >
      {/* Header */}
      <div className={isMobile ? "flex items-center justify-between mb-2" : "flex items-center justify-between px-4 py-3.5"}
        style={isMobile ? undefined : { borderBottom: "1px solid var(--cn-border)" }}>
        <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: "var(--cn-muted)" }}>Разделы</span>
        {canManage && (
          <button
            onClick={() => setCreateParent(null)}
            className="text-xs font-medium text-accent border border-[var(--cn-border)] rounded-lg px-2.5 py-1 hover:bg-[var(--cn-hover)] transition-colors"
          >
            ＋ блок
          </button>
        )}
      </div>

      {/* Block tiles */}
      <div className={isMobile ? "grid grid-cols-2 gap-2.5" : "flex-1 overflow-y-auto p-3 space-y-2.5"}>
        {blocks.length === 0 && (
          <div className="col-span-2 text-center text-sm py-6" style={{ color: "var(--cn-muted)" }}>
            {canManage ? "Пока нет разделов. Создайте первый блок." : "Разделов пока нет."}
          </div>
        )}
        {blocks.map((block) => {
          const access = effectiveAccess(block);
          const kids = childrenOf(block.id);
          const unread = unreadFor(block);
          const active = selectedChannel === block.id || kids.some((k) => k.id === selectedChannel);
          const isOpen = expanded[block.id] ?? false;
          return (
            <div
              key={block.id}
              className="rounded-2xl border transition-colors"
              style={{
                borderColor: active ? "var(--cn-accent)" : "var(--cn-border)",
                background: "linear-gradient(180deg, rgba(255,255,255,0.025), rgba(255,255,255,0))",
                boxShadow: active ? "0 0 0 1px var(--cn-accent-dim)" : undefined,
              }}
            >
              <button
                onClick={() => {
                  if (kids.length > 0 && !isMobile) {
                    setExpanded((p) => ({ ...p, [block.id]: !isOpen }));
                  }
                  onSelectChannel(block);
                }}
                className="w-full text-left p-3.5 rounded-2xl"
              >
                <div className="flex items-start gap-3">
                  <span className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-none ${ICON_BG[access]}`}>
                    {block.icon || defaultIcon(access)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-sm leading-snug" style={{ color: "var(--cn-text)" }}>{block.name}</div>
                  </div>
                  {unread > 0 && (
                    <span className="ml-auto flex-none bg-accent text-[11px] font-extrabold rounded-full px-2 py-0.5" style={{ color: "#04121a" }}>
                      {unread}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-2.5 flex-wrap">
                  {kids.length > 0 && (
                    <span className="text-[11px]" style={{ color: "var(--cn-muted)" }}>{kids.length} в списке</span>
                  )}
                </div>
              </button>

              {/* Child "list" items */}
              {(isMobile || isOpen) && kids.length > 0 && (
                <div className="px-3 pb-2.5 space-y-1">
                  {kids.map((kid) => {
                    const kAccess = effectiveAccess(kid);
                    const kActive = selectedChannel === kid.id;
                    const kUnread = unreadCounts[kid.id] ?? 0;
                    return (
                      <button
                        key={kid.id}
                        onClick={() => onSelectChannel(kid)}
                        className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-sm transition-colors"
                        style={{
                          color: kActive ? "var(--cn-text)" : "var(--cn-muted)",
                          background: kActive ? "var(--cn-accent-dim)" : undefined,
                        }}
                      >
                        <span className="text-xs flex-none">{kid.icon || (kAccess === "ALL" ? "💬" : "📄")}</span>
                        <span className="truncate flex-1 text-left">{kid.name}</span>
                        {kUnread > 0 && (
                          <span className="bg-accent text-[10px] font-extrabold rounded-full px-1.5" style={{ color: "#04121a" }}>{kUnread}</span>
                        )}
                      </button>
                    );
                  })}
                  {canManage && (
                    <button
                      onClick={() => setCreateParent(block.id)}
                      className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs text-accent hover:bg-[var(--cn-hover)] transition-colors"
                    >
                      ＋ пункт списка
                    </button>
                  )}
                </div>
              )}

              {/* Admin: add list item even when block has no children yet */}
              {canManage && kids.length === 0 && (isMobile || isOpen || active) && (
                <div className="px-3 pb-2.5">
                  <button
                    onClick={() => setCreateParent(block.id)}
                    className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs text-accent hover:bg-[var(--cn-hover)] transition-colors"
                  >
                    ＋ пункт списка
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {createParent !== undefined && (
        <BlockModal
          groupId={groupId}
          parentId={createParent ?? null}
          parentName={createParent ? blocks.find((b) => b.id === createParent)?.name : undefined}
          onClose={() => setCreateParent(undefined)}
          onCreated={() => { setCreateParent(undefined); onRefresh(); }}
        />
      )}
    </div>
  );
}

/* ── Create block / list modal (admin only) ── */

function BlockModal({
  groupId, parentId, parentName, onClose, onCreated,
}: {
  groupId: string;
  parentId: string | null;
  parentName?: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const isList = !!parentId;
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("");
  const [access, setAccess] = useState<Access>(isList ? "ALL" : "ADMIN");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const create = async () => {
    if (!name.trim()) return;
    setLoading(true);
    setError("");
    const res = await fetch("/api/channels", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        type: "TEXT",
        groupId,
        postAccess: access,
        parentId: parentId || null,
      }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Ошибка создания");
      setLoading(false);
      return;
    }
    // Optionally set custom icon via PUT
    if (icon.trim()) {
      const created = await res.json().catch(() => null);
      if (created?.id) {
        await fetch(`/api/channels/${created.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ icon: icon.trim() }),
        }).catch(() => {});
      }
    }
    setLoading(false);
    onCreated();
  };

  const ACCESS_OPTIONS: { value: Access; label: string; hint: string }[] = [
    { value: "ADMIN", label: "Только чтение", hint: "пишет администратор" },
    { value: "MOD", label: "Админ + модераторы", hint: "вопросы-ответы" },
    { value: "ALL", label: "Для всех", hint: "пишут все участники" },
  ];

  return (
    <ModalBackdrop onClose={onClose}>
      <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-1">
        {isList ? "Новый пункт списка" : "Новый блок-раздел"}
      </h3>
      {isList && parentName && (
        <p className="text-xs text-neutral-500 dark:text-gray-400 mb-3">в блоке «{parentName}»</p>
      )}
      <div className="space-y-3 mt-3">
        <div className="flex gap-2">
          <input
            type="text" value={icon} onChange={(e) => setIcon(e.target.value)} maxLength={2}
            placeholder="🙂" aria-label="Иконка (эмодзи)"
            className="w-14 text-center bg-neutral-50 dark:bg-neutral-700 border border-neutral-200 dark:border-white/10 rounded-xl px-2 py-2.5 text-lg"
          />
          <input
            type="text" value={name} onChange={(e) => setName(e.target.value)} autoFocus
            onKeyDown={(e) => { if (e.key === "Enter" && name.trim() && !loading) create(); }}
            placeholder={isList ? "Название пункта…" : "Название раздела…"}
            className="flex-1 bg-neutral-50 dark:bg-neutral-700 border border-neutral-200 dark:border-white/10 rounded-xl px-3 py-2.5 text-sm text-neutral-900 dark:text-white placeholder:text-neutral-400"
          />
        </div>
        <div>
          <p className="text-xs font-medium text-neutral-500 dark:text-gray-400 mb-1.5">Кто может писать</p>
          <div className="space-y-1.5">
            {ACCESS_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setAccess(opt.value)}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-all border ${
                  access === opt.value
                    ? "bg-violet-50 dark:bg-cyan-400/15 text-accent border-violet-200 dark:border-cyan-400/30"
                    : "bg-neutral-50 dark:bg-neutral-700 text-neutral-600 dark:text-gray-300 border-neutral-200 dark:border-white/5"
                }`}
              >
                <span className="font-medium">{opt.label}</span>
                <span className="text-[11px] opacity-70">· {opt.hint}</span>
              </button>
            ))}
          </div>
        </div>
        {error && <p className="text-xs text-red-500 dark:text-red-400">{error}</p>}
        <div className="flex gap-2 pt-1">
          <Button onClick={create} disabled={loading || !name.trim()} size="md" className="flex-1">
            {loading ? "Создание…" : "Создать"}
          </Button>
          <button onClick={onClose} className="flex-1 px-4 py-2.5 bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-gray-400 rounded-xl hover:bg-neutral-200 dark:hover:bg-neutral-600 transition-all text-sm">
            Отмена
          </button>
        </div>
      </div>
    </ModalBackdrop>
  );
}
