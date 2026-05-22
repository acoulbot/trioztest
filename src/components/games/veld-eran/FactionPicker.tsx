"use client";

import { FACTIONS, FACTION_ORDER } from "@/lib/games/veld-eran/factions";
import type { FactionId } from "@/lib/games/veld-eran/types";

interface Props {
  selected: { id: string; name: string; faction: FactionId }[];
  onChange: (next: { id: string; name: string; faction: FactionId }[]) => void;
  onStart: () => void;
}

export default function FactionPicker({ selected, onChange, onStart }: Props) {
  const taken = new Set(selected.map((p) => p.faction));

  const updateName = (id: string, name: string) => {
    onChange(selected.map((p) => (p.id === id ? { ...p, name } : p)));
  };
  const updateFaction = (id: string, faction: FactionId) => {
    onChange(selected.map((p) => (p.id === id ? { ...p, faction } : p)));
  };
  const addPlayer = () => {
    if (selected.length >= 10) return;
    const free = FACTION_ORDER.find((f) => !taken.has(f));
    if (!free) return;
    onChange([
      ...selected,
      { id: `p-${Math.random().toString(36).slice(2, 7)}`, name: `Игрок ${selected.length + 1}`, faction: free },
    ]);
  };
  const removePlayer = (id: string) => {
    onChange(selected.filter((p) => p.id !== id));
  };

  return (
    <div className="space-y-6 text-gray-200">
      <div>
        <h2 className="text-2xl font-bold mb-1">Выбор фракций</h2>
        <p className="text-sm text-gray-400">
          2–10 игроков. Каждый выбирает уникальную фракцию. Стартовые города расставляются автоматически.
        </p>
      </div>

      <div className="space-y-3">
        {selected.map((player, idx) => {
          const fac = FACTIONS[player.faction];
          return (
            <div
              key={player.id}
              className="flex flex-col md:flex-row md:items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10"
            >
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center font-bold text-white shrink-0"
                style={{ background: fac.color, color: contrastText(fac.color) }}
              >
                {idx + 1}
              </div>
              <input
                className="flex-1 px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-sm focus:outline-none focus:border-cyan-400/50"
                value={player.name}
                onChange={(e) => updateName(player.id, e.target.value)}
              />
              <select
                value={player.faction}
                onChange={(e) => updateFaction(player.id, e.target.value as FactionId)}
                className="px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-sm focus:outline-none focus:border-cyan-400/50"
              >
                {FACTION_ORDER.map((f) => (
                  <option key={f} value={f} disabled={taken.has(f) && f !== player.faction}>
                    {FACTIONS[f].name}
                  </option>
                ))}
              </select>
              <span className="text-xs text-gray-400 md:max-w-[280px]">{fac.tagline}</span>
              {selected.length > 2 && (
                <button
                  onClick={() => removePlayer(player.id)}
                  className="text-xs text-red-400 hover:text-red-300 px-2"
                  title="Убрать игрока"
                >
                  ✕
                </button>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          onClick={addPlayer}
          disabled={selected.length >= 10}
          className="px-4 py-2 rounded-lg bg-white/10 border border-white/15 text-sm hover:bg-white/15 disabled:opacity-40"
        >
          + Добавить игрока
        </button>
        <button
          onClick={onStart}
          disabled={selected.length < 2}
          className="px-5 py-2 rounded-lg bg-gradient-to-r from-fuchsia-600 to-indigo-600 text-white text-sm font-medium hover:from-fuchsia-500 hover:to-indigo-500 disabled:opacity-40"
        >
          Начать партию
        </button>
      </div>

      <details className="text-xs text-gray-400 bg-black/30 p-3 rounded-lg border border-white/5">
        <summary className="cursor-pointer text-gray-300 font-medium">Описания фракций</summary>
        <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2">
          {FACTION_ORDER.map((f) => (
            <div key={f} className="flex items-start gap-2">
              <div
                className="w-3 h-3 mt-1 rounded-sm shrink-0"
                style={{ background: FACTIONS[f].color, border: `1px solid ${FACTIONS[f].borderColor}` }}
              />
              <div>
                <div className="text-gray-200 font-semibold">{FACTIONS[f].name}</div>
                <div className="text-gray-500">{FACTIONS[f].lore}</div>
              </div>
            </div>
          ))}
        </div>
      </details>
    </div>
  );
}

function contrastText(bg: string): string {
  // very light backgrounds get dark text
  const hex = bg.replace("#", "");
  if (hex.length !== 6) return "#fff";
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.6 ? "#0f172a" : "#fff";
}
