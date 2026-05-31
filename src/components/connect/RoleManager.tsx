"use client";

import { useState, useEffect, useCallback } from "react";

interface GroupRole {
  id: string;
  name: string;
  color: string;
  _count?: { members: number };
}

interface RoleManagerProps {
  groupId: string;
  canManage: boolean;
}

export default function RoleManager({ groupId, canManage }: RoleManagerProps) {
  const [roles, setRoles] = useState<GroupRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState("#808080");

  const fetchRoles = useCallback(async () => {
    const res = await fetch(`/api/groups/${groupId}/roles`);
    if (res.ok) setRoles(await res.json());
    setLoading(false);
  }, [groupId]);

  useEffect(() => { fetchRoles(); }, [fetchRoles]);

  const createRole = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    const res = await fetch(`/api/groups/${groupId}/roles`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName.trim(), color: newColor }),
    });
    if (res.ok) {
      setNewName("");
      setNewColor("#808080");
      fetchRoles();
    }
    setCreating(false);
  };

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const deleteRole = async (roleId: string) => {
    await fetch(`/api/groups/${groupId}/roles/${roleId}`, { method: "DELETE" });
    setConfirmDeleteId(null);
    fetchRoles();
  };

  if (loading) {
    return <div className="text-sm text-neutral-400 py-2 text-center">Загрузка...</div>;
  }

  return (
    <div className="space-y-3">
      <div className="text-xs text-neutral-400 uppercase tracking-wider font-semibold px-1">
        Роли-теги ({roles.length})
      </div>

      {/* Role list */}
      <div className="space-y-1">
        {roles.map((role) => (
          <div
            key={role.id}
            className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-[var(--cn-hover)] transition-colors group"
          >
            <div
              className="w-3 h-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: role.color }}
            />
            <span className="text-sm text-neutral-900 dark:text-white flex-1 truncate">{role.name}</span>
            <span className="text-[10px] text-neutral-400">{role._count?.members ?? 0}</span>
            {canManage && (
              <button
                onClick={() => setConfirmDeleteId(role.id)}
                className="opacity-0 group-hover:opacity-100 text-neutral-400 hover:text-red-500 transition-all"
                aria-label="Delete role"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        ))}
        {roles.length === 0 && (
          <p className="text-xs text-neutral-400 text-center py-2">Нет ролей</p>
        )}
      </div>

      {/* Create role form */}
      {canManage && (
        <div className="flex gap-2 items-end">
          <div className="flex-1 space-y-1">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Название роли"
              maxLength={32}
              className="w-full bg-[var(--cn-accent-dim)] border border-[var(--cn-border)] rounded-lg px-2.5 py-1.5 text-sm text-neutral-900 dark:text-white placeholder-neutral-400"
              onKeyDown={(e) => { if (e.key === "Enter") createRole(); }}
            />
          </div>
          <input
            type="color"
            value={newColor}
            onChange={(e) => setNewColor(e.target.value)}
            className="w-8 h-8 rounded-lg border border-[var(--cn-border)] cursor-pointer"
            title="Цвет роли"
          />
          <button
            onClick={createRole}
            disabled={creating || !newName.trim()}
            className="px-3 py-1.5 bg-violet-500 dark:bg-cyan-500 text-white dark:text-neutral-900 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-40"
          >
            +
          </button>
        </div>
      )}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" onClick={() => setConfirmDeleteId(null)}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div className="relative z-10 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-white/10 rounded-2xl shadow-2xl p-5 max-w-sm w-full" onClick={e => e.stopPropagation()}>
            <p className="text-sm text-neutral-900 dark:text-white mb-4">Удалить роль?</p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setConfirmDeleteId(null)} className="px-4 py-2 text-sm text-neutral-500 rounded-xl hover:bg-neutral-100 dark:hover:bg-white/5">Отмена</button>
              <button onClick={() => deleteRole(confirmDeleteId)} className="px-4 py-2 text-sm bg-red-500 text-white rounded-xl hover:bg-red-600">Подтвердить</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* Inline role tag badge */
export function RoleTag({ name, color }: { name: string; color: string }) {
  return (
    <span
      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium"
      style={{ backgroundColor: color + "20", color, border: `1px solid ${color}40` }}
    >
      {name}
    </span>
  );
}
