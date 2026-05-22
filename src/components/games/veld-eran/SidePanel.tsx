"use client";

import { useState } from "react";
import { FACTIONS } from "@/lib/games/veld-eran/factions";
import type { GameState, Unit } from "@/lib/games/veld-eran/types";
import { NODES, NODES_BY_ID } from "@/lib/games/veld-eran/map";

interface Props {
  state: GameState;
  selectedUnit: Unit | null;
  onEndTurn: () => void;
  onRollSanctuary: (unitId: string) => void;
  onUseSpecial: (unitId: string, targetUnitId: string) => void;
  onUseSmuggler: (unitId: string, toNodeId: string) => void;
  onUseGodCard: (
    playerId: string,
    cardId: string,
    args: { targetNodeId?: string; targetUnitId?: string; targetPlayerId?: string },
  ) => void;
}

export default function SidePanel({
  state,
  selectedUnit,
  onEndTurn,
  onRollSanctuary,
  onUseSpecial,
  onUseSmuggler,
  onUseGodCard,
}: Props) {
  const cp = state.players[state.currentPlayerIdx];
  if (!cp) return null;
  const fac = FACTIONS[cp.faction];

  const node = selectedUnit ? NODES_BY_ID[selectedUnit.nodeId ?? ""] : null;
  const isOnSanctuary = node?.kind === "sanctuary" && selectedUnit?.kind === "guard";
  const isOnSmuggler = node?.kind === "smuggler-lair";
  const isOnSpecial =
    node?.kind === "pirate-cove" ||
    node?.kind === "ghost-temple" ||
    node?.kind === "sheybanid-camp";

  const cityCount = state.units.filter(
    (u) => u.faction === cp.faction && NODES_BY_ID[u.nodeId ?? ""]?.kind === "city",
  ).length;
  const totalUnits = state.units.filter((u) => u.faction === cp.faction).length;

  return (
    <div className="space-y-4 text-sm text-gray-200">
      <div
        className="rounded-xl p-4 border bg-gradient-to-br from-white/5 to-transparent"
        style={{ borderColor: fac.borderColor }}
      >
        <div className="text-xs text-gray-400">Круг {state.round} · ход</div>
        <div className="flex items-center gap-2 mt-1">
          <div
            className="w-4 h-4 rounded-sm"
            style={{ background: fac.color, border: `1px solid ${fac.borderColor}` }}
          />
          <div className="text-lg font-bold" style={{ color: fac.color === "#f8fafc" ? "#cbd5e1" : fac.color }}>
            {cp.name}
          </div>
          <div className="text-xs text-gray-500">· {fac.name}</div>
        </div>
        <div className="mt-2 text-xs text-gray-400 grid grid-cols-2 gap-y-1">
          <div>Фишек на карте:</div>
          <div className="text-right text-gray-200">{totalUnits}</div>
          <div>Городов:</div>
          <div className="text-right text-gray-200">{cityCount}</div>
          <div>Резерв:</div>
          <div className="text-right text-gray-200">
            {cp.reserveSquads} ▢ + {cp.reserveGuards} ★
          </div>
          <div>Карт в руке:</div>
          <div className="text-right text-gray-200">{cp.hand.length}</div>
          {cp.godCards.length > 0 && (
            <>
              <div>Карт богов:</div>
              <div className="text-right text-gray-200">{cp.godCards.length}</div>
            </>
          )}
          {cp.ghostCharges > 0 && (
            <>
              <div>Призрачные заряды:</div>
              <div className="text-right text-gray-200">{cp.ghostCharges}</div>
            </>
          )}
        </div>
      </div>

      {cp.hand.length > 0 && (
        <div className="rounded-xl p-3 bg-white/5 border border-white/10">
          <div className="text-xs text-gray-400 mb-2">Боевые карты</div>
          <div className="flex flex-wrap gap-1">
            {cp.hand.map((c) => (
              <div
                key={c.id}
                className="w-8 h-10 rounded-sm bg-slate-700 border border-slate-500 text-cyan-100 text-center font-bold flex items-center justify-center text-sm"
              >
                {c.value}
              </div>
            ))}
          </div>
        </div>
      )}

      {cp.godCards.length > 0 && (
        <div className="rounded-xl p-3 bg-amber-500/5 border border-amber-500/20">
          <div className="text-xs text-amber-300 mb-2">Карты богов</div>
          <div className="space-y-1">
            {cp.godCards.map((c) => (
              <GodCardRow
                key={c.id}
                godId={c.god}
                onUse={(args) => onUseGodCard(cp.id, c.id, args)}
                state={state}
              />
            ))}
          </div>
        </div>
      )}

      {selectedUnit && (
        <div className="rounded-xl p-3 bg-white/5 border border-white/10">
          <div className="text-xs text-gray-400 mb-2">Выбрано</div>
          <div className="text-gray-200">
            {selectedUnit.kind === "guard" ? "Гвардия ★" : "Отряд"}{" "}
            <span style={{ color: FACTIONS[selectedUnit.faction].color }}>
              {FACTIONS[selectedUnit.faction].name}
            </span>
          </div>
          <div className="text-xs text-gray-500">
            на «{node?.name ?? "—"}» · ходов: {selectedUnit.movesLeft}
          </div>

          {isOnSanctuary && (
            <button
              onClick={() => onRollSanctuary(selectedUnit.id)}
              disabled={selectedUnit.sanctuaryUses >= 2}
              className="mt-3 w-full px-3 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-medium disabled:opacity-40"
            >
              Призвать божество ({2 - selectedUnit.sanctuaryUses} попытка ост.)
            </button>
          )}

          {isOnSmuggler && (
            <SmugglerPicker
              onPick={(toNodeId) => onUseSmuggler(selectedUnit.id, toNodeId)}
            />
          )}

          {isOnSpecial && selectedUnit.faction === cp.faction && (
            <SpecialAttackPanel
              state={state}
              unit={selectedUnit}
              onUse={(targetUnitId) => onUseSpecial(selectedUnit.id, targetUnitId)}
            />
          )}
        </div>
      )}

      <button
        onClick={onEndTurn}
        className="w-full px-4 py-3 rounded-xl bg-gradient-to-r from-rose-600 to-orange-600 hover:from-rose-500 hover:to-orange-500 text-white font-semibold"
      >
        Закончить ход
      </button>

      <div className="rounded-xl p-3 bg-black/30 border border-white/5 max-h-56 overflow-y-auto text-xs text-gray-400 space-y-1">
        <div className="text-gray-300 font-medium mb-2">Лог</div>
        {state.log.slice(-30).map((l) => (
          <div key={l.id}>{l.text}</div>
        ))}
      </div>
    </div>
  );
}

function GodCardRow({
  godId,
  state,
  onUse,
}: {
  godId: string;
  state: GameState;
  onUse: (args: { targetNodeId?: string; targetUnitId?: string; targetPlayerId?: string }) => void;
}) {
  const name =
    godId === "avalais"
      ? "Авалайс — утопить отряд на море"
      : godId === "sitas"
        ? "Ситас — пропустить ход игроку"
        : godId === "vyeronkh"
          ? "Вьеронх — перенести вражеский отряд"
          : godId === "shentar"
            ? "Шент’Ар — играется в бою"
            : godId === "giordg"
              ? "Гиордг — играется в бою"
              : godId;

  if (godId === "shentar" || godId === "giordg") {
    return <div className="text-xs text-amber-100/80">{name}</div>;
  }

  return (
    <div className="bg-amber-500/10 rounded-md p-2">
      <div className="text-xs text-amber-100 mb-1">{name}</div>
      {godId === "avalais" && (
        <select
          onChange={(e) => e.target.value && onUse({ targetUnitId: e.target.value })}
          className="w-full px-2 py-1 text-xs rounded bg-black/40 border border-white/10"
        >
          <option value="">— цель —</option>
          {state.units
            .filter((u) => {
              const n = NODES_BY_ID[u.nodeId ?? ""];
              return n && (n.kind === "sea" || n.kind === "port");
            })
            .map((u) => (
              <option key={u.id} value={u.id}>
                {FACTIONS[u.faction].name} на {NODES_BY_ID[u.nodeId ?? ""]?.name}
              </option>
            ))}
        </select>
      )}
      {godId === "sitas" && (
        <select
          onChange={(e) => e.target.value && onUse({ targetPlayerId: e.target.value })}
          className="w-full px-2 py-1 text-xs rounded bg-black/40 border border-white/10"
        >
          <option value="">— игрок —</option>
          {state.players.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} ({FACTIONS[p.faction].name})
            </option>
          ))}
        </select>
      )}
      {godId === "vyeronkh" && (
        <VyeronkhPicker state={state} onPick={onUse} />
      )}
    </div>
  );
}

function VyeronkhPicker({ state, onPick }: { state: GameState; onPick: (args: { targetUnitId: string; targetNodeId: string }) => void }) {
  return (
    <div className="space-y-1">
      <select
        id="vyeronkh-unit"
        className="w-full px-2 py-1 text-xs rounded bg-black/40 border border-white/10"
      >
        <option value="">— отряд противника —</option>
        {state.units
          .filter((u) => u.faction !== state.players[state.currentPlayerIdx]?.faction)
          .map((u) => (
            <option key={u.id} value={u.id}>
              {FACTIONS[u.faction].name} на {NODES_BY_ID[u.nodeId ?? ""]?.name}
            </option>
          ))}
      </select>
      <select
        id="vyeronkh-node"
        className="w-full px-2 py-1 text-xs rounded bg-black/40 border border-white/10"
      >
        <option value="">— куда —</option>
        {NODES.map((n) => (
          <option key={n.id} value={n.id}>
            {n.name}
          </option>
        ))}
      </select>
      <button
        onClick={() => {
          const u = (document.getElementById("vyeronkh-unit") as HTMLSelectElement)?.value;
          const n = (document.getElementById("vyeronkh-node") as HTMLSelectElement)?.value;
          if (u && n) onPick({ targetUnitId: u, targetNodeId: n });
        }}
        className="w-full px-2 py-1 text-xs rounded bg-amber-500 text-slate-900 font-medium hover:bg-amber-400"
      >
        Применить Вьеронх
      </button>
    </div>
  );
}

function SmugglerPicker({ onPick }: { onPick: (toNodeId: string) => void }) {
  const [port, setPort] = useState<string>("");
  const ports = NODES.filter((n) => n.kind === "port");
  return (
    <div className="mt-3 p-2 rounded-lg bg-indigo-500/10 border border-indigo-400/30 space-y-2">
      <div className="text-xs text-indigo-200">
        Логово Контрабандистов: выберите порт, фишка вернётся туда через круг.
      </div>
      <select
        value={port}
        onChange={(e) => setPort(e.target.value)}
        className="w-full px-2 py-1 text-xs rounded bg-black/40 border border-white/10"
      >
        <option value="">— порт назначения —</option>
        {ports.map((n) => (
          <option key={n.id} value={n.id}>
            {n.name}
          </option>
        ))}
      </select>
      <button
        disabled={!port}
        onClick={() => onPick(port)}
        className="w-full px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-xs font-medium"
      >
        Уйти через контрабандистов
      </button>
    </div>
  );
}

function SpecialAttackPanel({  state,
  unit,
  onUse,
}: {
  state: GameState;
  unit: Unit;
  onUse: (targetUnitId: string) => void;
}) {
  const node = NODES_BY_ID[unit.nodeId ?? ""];
  if (!node) return null;
  const sourceLabel =
    node.kind === "pirate-cove"
      ? "Пиратская атака"
      : node.kind === "ghost-temple"
        ? "Призрачная атака"
        : "Атака Шейбанидов";

  const targetable = state.units.filter((u) => {
    if (u.faction === unit.faction) return false;
    const tNode = NODES_BY_ID[u.nodeId ?? ""];
    if (!tNode) return false;
    if (node.kind === "pirate-cove") {
      return tNode.kind === "sea" || tNode.kind === "port";
    }
    if (node.kind === "ghost-temple") {
      return tNode.kind !== "sanctuary";
    }
    return tNode.kind !== "sea" && tNode.kind !== "port" && tNode.kind !== "sanctuary";
  });

  return (
    <div className="mt-3 p-2 rounded-lg bg-rose-500/10 border border-rose-400/30">
      <div className="text-xs text-rose-200 mb-1">{sourceLabel}</div>
      <div className="text-[10px] text-gray-400 mb-2">
        Использовано: {unit.specialUses} / 2
      </div>
      <select
        onChange={(e) => e.target.value && onUse(e.target.value)}
        defaultValue=""
        className="w-full px-2 py-1 text-xs rounded bg-black/40 border border-white/10"
      >
        <option value="">— цель —</option>
        {targetable.map((u) => (
          <option key={u.id} value={u.id}>
            {FACTIONS[u.faction].name} на {NODES_BY_ID[u.nodeId ?? ""]?.name}
          </option>
        ))}
      </select>
    </div>
  );
}
