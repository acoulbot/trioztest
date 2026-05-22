"use client";

import { useMemo, useReducer, useState } from "react";
import FactionPicker from "@/components/games/veld-eran/FactionPicker";
import GameBoard from "@/components/games/veld-eran/GameBoard";
import SidePanel from "@/components/games/veld-eran/SidePanel";
import CombatModal from "@/components/games/veld-eran/CombatModal";
import DiceModal from "@/components/games/veld-eran/DiceModal";
import SanctuaryModal from "@/components/games/veld-eran/SanctuaryModal";
import { applyAction, createInitialState, listLegalMoves } from "@/lib/games/veld-eran/rules";
import type { GameState, FactionId, Unit } from "@/lib/games/veld-eran/types";
import { FACTIONS } from "@/lib/games/veld-eran/factions";
import Link from "next/link";

function reducer(state: GameState | null, action: { type: "set"; state: GameState } | { type: "apply"; payload: Parameters<typeof applyAction>[1] } | { type: "reset" }) {
  if (action.type === "reset") return null;
  if (action.type === "set") return action.state;
  if (!state) return null;
  return applyAction(state, action.payload);
}

export default function VeldEranGame() {
  const [state, dispatch] = useReducer(reducer, null);
  const [lobbyPlayers, setLobbyPlayers] = useState<{ id: string; name: string; faction: FactionId }[]>([
    { id: "p-1", name: "Игрок 1", faction: "empire" },
    { id: "p-2", name: "Игрок 2", faction: "republic" },
  ]);
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);
  const [showRules, setShowRules] = useState(false);

  const legalMoves = useMemo(
    () => (state && selectedUnitId ? listLegalMoves(state, selectedUnitId) : []),
    [state, selectedUnitId],
  );
  const selectedUnit = state && selectedUnitId ? state.units.find((u) => u.id === selectedUnitId) ?? null : null;

  const startGame = () => {
    if (lobbyPlayers.length < 2) return;
    const init = createInitialState({ players: lobbyPlayers });
    dispatch({ type: "set", state: init });
    setSelectedUnitId(null);
  };

  if (!state) {
    return (
      <div className="min-h-screen bg-neutral-950 text-gray-100 px-4 py-10">
        <div className="max-w-4xl mx-auto">
          <div className="mb-6 flex items-center justify-between">
            <Link href="/pero" className="text-sm text-gray-400 hover:text-white">
              ← Перо Измерений
            </Link>
            <button
              onClick={() => setShowRules((s) => !s)}
              className="text-sm text-cyan-300 hover:text-cyan-200"
            >
              {showRules ? "Скрыть правила" : "Показать правила"}
            </button>
          </div>
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-fuchsia-400 via-indigo-300 to-cyan-300 bg-clip-text text-transparent">
            Перо Измерений · Мир Вельд&apos;Эран
          </h1>
          <p className="text-gray-400 mb-8">
            Браузерная адаптация настольной стратегии. Hot-seat для 2–10 игроков на одном устройстве.
          </p>

          {showRules && <RulesBox />}

          <div className="rounded-2xl bg-white/5 border border-white/10 p-6">
            <FactionPicker selected={lobbyPlayers} onChange={setLobbyPlayers} onStart={startGame} />
          </div>
        </div>
      </div>
    );
  }

  const cp = state.players[state.currentPlayerIdx];

  const handleClickUnit = (u: Unit) => {
    if (!cp) return;
    if (u.faction !== cp.faction) {
      // вражеский — попытка атаковать через выбранную фишку, если выбрана своя
      if (selectedUnit && state.phase === "turn") {
        // Если выбранная фишка может в особую атаку — попытаемся
        // (обработается через SidePanel SpecialAttackPanel при необходимости)
      }
      return;
    }
    setSelectedUnitId(u.id);
  };

  const handleClickNode = (nodeId: string) => {
    if (!selectedUnitId || state.phase !== "turn") return;
    dispatch({ type: "apply", payload: { type: "move-unit", unitId: selectedUnitId, toNodeId: nodeId } });
  };

  const handleEndTurn = () => {
    setSelectedUnitId(null);
    dispatch({ type: "apply", payload: { type: "end-turn" } });
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-gray-100">
      <div className="px-4 py-4 border-b border-white/5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/pero" className="text-xs text-gray-400 hover:text-white">
            ← Перо Измерений
          </Link>
          <h1 className="text-base font-bold">Мир Вельд&apos;Эран</h1>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">
            Круг {state.round} · ход:
          </span>
          <span className="text-sm font-bold" style={{ color: cp ? FACTIONS[cp.faction].color : "#fff" }}>
            {cp?.name}
          </span>
          <button
            onClick={() => {
              if (confirm("Начать новую партию?")) {
                dispatch({ type: "reset" });
                setSelectedUnitId(null);
              }
            }}
            className="ml-3 text-xs text-rose-300 hover:text-rose-200"
          >
            Сброс
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4 p-4">
        <div>
          <GameBoard
            state={state}
            selectedUnitId={selectedUnitId}
            legalMoveNodeIds={legalMoves}
            onClickNode={handleClickNode}
            onClickUnit={handleClickUnit}
          />
          <RoundInfo />
        </div>

        <SidePanel
          state={state}
          selectedUnit={selectedUnit}
          onEndTurn={handleEndTurn}
          onRollSanctuary={(unitId) =>
            dispatch({ type: "apply", payload: { type: "roll-sanctuary", unitId } })
          }
          onUseSpecial={(unitId, targetUnitId) =>
            dispatch({ type: "apply", payload: { type: "use-special", unitId, targetUnitId } })
          }
          onUseSmuggler={(unitId, toNodeId) =>
            dispatch({ type: "apply", payload: { type: "use-smuggler", unitId, toNodeId } })
          }
          onUseGodCard={(playerId, cardId, args) =>
            dispatch({
              type: "apply",
              payload: {
                type: "use-god-card",
                playerId,
                cardId,
                targetNodeId: args.targetNodeId,
                targetUnitId: args.targetUnitId,
                targetPlayerId: args.targetPlayerId,
              },
            })
          }
        />
      </div>

      {state.pending.kind === "combat" && (
        <CombatModal
          state={state}
          onSubmitCard={(playerId, cardId, guess) =>
            dispatch({ type: "apply", payload: { type: "submit-combat-card", playerId, cardId, guess } })
          }
          onResolve={() => dispatch({ type: "apply", payload: { type: "resolve-combat" } })}
          onPlayPrebuff={(playerId, god) =>
            dispatch({ type: "apply", payload: { type: "play-prebuff", playerId, god } })
          }
        />
      )}

      {state.pending.kind === "dice-move" && (
        <DiceModal
          pending={state.pending}
          onRoll={(result) =>
            dispatch({ type: "apply", payload: { type: "confirm-dice-move", result } })
          }
        />
      )}

      {state.pending.kind === "sanctuary" && (
        <SanctuaryModal
          state={state}
          onApply={(args) => dispatch({ type: "apply", payload: { type: "apply-god", ...args } })}
        />
      )}

      {state.phase === "ended" && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-white/10 rounded-2xl p-8 max-w-md text-center">
            <div className="text-3xl mb-2">🏆</div>
            <h3 className="text-2xl font-bold mb-2">Партия завершена</h3>
            <p className="text-gray-300 mb-4">
              {state.winnerFactionId
                ? `Победа фракции ${FACTIONS[state.winnerFactionId].name}!`
                : "Без победителя."}
            </p>
            <button
              onClick={() => {
                dispatch({ type: "reset" });
                setSelectedUnitId(null);
              }}
              className="px-5 py-2 rounded-lg bg-cyan-500 text-slate-900 font-semibold"
            >
              Новая партия
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function RoundInfo() {
  return (
    <div className="mt-3 rounded-lg p-3 bg-white/5 border border-white/10 text-xs text-gray-300">
      <div className="font-medium text-gray-200 mb-1">Подсказки</div>
      <ul className="space-y-1 list-disc list-inside text-gray-400">
        <li>Кликните по своей фишке, затем по подсвеченной соседней точке для хода.</li>
        <li>Гвардии (★) на алмазах могут призывать богов (до 2 раз на одно святилище).</li>
        <li>Пески Сихвариса требуют чётное число на кубике, Твердь Гиортда — нечётное.</li>
        <li>Контроль особых локаций даёт пиратскую/призрачную/наёмническую атаку — по 2 заряда.</li>
      </ul>
    </div>
  );
}

function RulesBox() {
  return (
    <div className="mb-6 rounded-2xl bg-white/5 border border-white/10 p-5 text-sm text-gray-300 space-y-3 max-h-[60vh] overflow-y-auto">
      <h3 className="text-lg font-bold text-gray-100">Правила вкратце</h3>
      <p>
        Каждый игрок выбирает фракцию и расставляет фишки по своим стартовым городам. Цель —
        остаться единственным игроком, у которого есть фишки на карте.
      </p>
      <ul className="list-disc list-inside space-y-1 text-gray-400">
        <li>Отряд — 2 хода в круг, Гвардия (★) — 1 ход и доступ к святилищам.</li>
        <li>Бой: оба игрока кладут карту 1–5 рубашкой вверх и угадывают карту соперника. Точное угадывание побеждает; иначе побеждает большее число при попадании ±1.</li>
        <li>Святилища: бросок 2d6, эффект по таблице богов (Джалайна, Шент’Ар, Гиордг…).</li>
        <li>Пески Сихвариса — чётное на кубике для прохода; Твердь Гиортда — нечётное.</li>
        <li>Морской ход возможен с порта/«Розы Ветров» на ближайшую точку или порт.</li>
        <li>Особые локации (Пиратская бухта, Логово, Призрачный Храм, Шейбаниды) дают разовые атаки.</li>
      </ul>
    </div>
  );
}
