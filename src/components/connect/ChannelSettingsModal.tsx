"use client";

import { useState, useEffect } from "react";
import type { Channel } from "./sidebarTypes";

export function ChannelSettingsModal({ channel, groupId, allChannels, onClose, onUpdated }: {
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

