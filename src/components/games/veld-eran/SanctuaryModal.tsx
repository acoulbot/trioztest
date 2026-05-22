"use client";

import { useState } from "react";
import { GODS, FACTIONS } from "@/lib/games/veld-eran/factions";
import type { GameState } from "@/lib/games/veld-eran/types";
import { NODES, NODES_BY_ID } from "@/lib/games/veld-eran/map";

interface Props {
  state: GameState;
  onApply: (args: { chosenRoll?: number; targetNodeId?: string; targetUnitId?: string; targetPlayerId?: string }) => void;
}

export default function SanctuaryModal({ state, onApply }: Props) {
  const [chosenRoll, setChosenRoll] = useState<number | null>(null);
  const [targetNode, setTargetNode] = useState<string>("");
  const [targetUnit, setTargetUnit] = useState<string>("");

  if (state.pending.kind !== "sanctuary") return null;
  const pending = state.pending;
  const total = pending.diceResult ?? 0;
  const effectiveRoll = total === 12 ? (chosenRoll ?? 12) : total;
  const god = GODS.find((g) => g.roll === effectiveRoll);
  const unit = state.units.find((u) => u.id === pending.unitId);
  if (!unit || !god) return null;

  const player = state.players.find((p) => p.faction === unit.faction);

  const needsNode = total === 2 || total === 8 || total === 9 || total === 10;
  const needsUnit = total === 8 || total === 9 || total === 10 || total === 11;

  const targetableUnits = state.units.filter((u) => {
    if (effectiveRoll === 8) return u.faction === unit.faction;
    if (effectiveRoll === 9 || effectiveRoll === 10 || effectiveRoll === 11)
      return u.faction !== unit.faction;
    return true;
  });

  const targetableNodes = NODES.filter((n) => {
    if (effectiveRoll === 2 || effectiveRoll === 8) return n.kind !== "sanctuary";
    return true;
  });

  const submit = () => {
    onApply({
      chosenRoll: total === 12 ? effectiveRoll : undefined,
      targetNodeId: targetNode || undefined,
      targetUnitId: targetUnit || undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-neutral-900 border border-white/10 rounded-2xl p-6 max-w-xl w-full text-gray-100">
        <h3 className="text-xl font-bold mb-1">Святилище</h3>
        <p className="text-sm text-gray-400 mb-4">
          {player?.name} призывает божество. Сумма кубиков: <span className="text-amber-300 font-bold">{total}</span>.
        </p>

        {total === 12 && (
          <div className="mb-4 p-3 rounded-lg bg-amber-500/10 border border-amber-400/30">
            <div className="text-xs text-amber-200 mb-2">Выберите любое божество (2–11):</div>
            <div className="flex flex-wrap gap-1">
              {GODS.filter((g) => g.roll !== 12).map((g) => (
                <button
                  key={g.roll}
                  onClick={() => setChosenRoll(g.roll)}
                  className={`px-2 py-1 text-xs rounded-md border ${
                    chosenRoll === g.roll
                      ? "bg-amber-400 text-slate-900 border-amber-200"
                      : "bg-slate-800 border-slate-600 hover:bg-slate-700"
                  }`}
                >
                  {g.roll}. {g.name}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-400/30 mb-4">
          <div className="text-base font-semibold text-purple-200">
            {effectiveRoll}. {god.name}
          </div>
          <div className="text-sm text-gray-300 mt-1">{god.description}</div>
        </div>

        {needsUnit && (
          <div className="mb-3">
            <label className="text-xs text-gray-400 block mb-1">
              Целевой отряд ({effectiveRoll === 8 ? "ваш" : "противника"}):
            </label>
            <select
              value={targetUnit}
              onChange={(e) => setTargetUnit(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-sm"
            >
              <option value="">— выбрать —</option>
              {targetableUnits.map((u) => {
                const n = NODES_BY_ID[u.nodeId ?? ""];
                return (
                  <option key={u.id} value={u.id}>
                    {FACTIONS[u.faction].name} {u.kind === "guard" ? "★" : ""} на {n?.name ?? "?"}
                  </option>
                );
              })}
            </select>
          </div>
        )}

        {needsNode && (
          <div className="mb-3">
            <label className="text-xs text-gray-400 block mb-1">Целевая точка:</label>
            <select
              value={targetNode}
              onChange={(e) => setTargetNode(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-sm"
            >
              <option value="">— выбрать —</option>
              {targetableNodes.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.name} ({n.kind})
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="flex justify-end gap-2 mt-4">
          <button
            onClick={() => onApply({})}
            className="px-4 py-2 rounded-lg bg-white/10 text-sm hover:bg-white/15"
          >
            Пропустить эффект
          </button>
          <button
            onClick={submit}
            disabled={(needsUnit && !targetUnit) || (needsNode && !targetNode) || (total === 12 && chosenRoll === null)}
            className="px-5 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white text-sm font-semibold disabled:opacity-40"
          >
            Применить
          </button>
        </div>
      </div>
    </div>
  );
}
