"use client";

import { useEffect, useState } from "react";
import { FACTIONS } from "@/lib/games/veld-eran/factions";
import type { GameState, PendingPrompt } from "@/lib/games/veld-eran/types";
import { NODES_BY_ID } from "@/lib/games/veld-eran/map";

interface Props {
  state: GameState;
  onSubmitCard: (playerId: string, cardId: string, guess: number) => void;
  onResolve: () => void;
  onPlayPrebuff: (playerId: string, god: "shentar" | "giordg") => void;
}

export default function CombatModal({ state, onSubmitCard, onResolve, onPlayPrebuff }: Props) {
  const pending = state.pending;
  if (pending.kind !== "combat") return null;
  const attacker = state.units.find((u) => u.id === pending.attackerUnitId);
  const defender = state.units.find((u) => u.id === pending.defenderUnitId);
  if (!attacker || !defender) return null;
  const attackerPlayer = state.players.find((p) => p.faction === attacker.faction);
  const defenderPlayer = state.players.find((p) => p.faction === defender.faction);
  if (!attackerPlayer || !defenderPlayer) return null;
  const node = NODES_BY_ID[pending.nodeId];

  const aSubmitted = !!pending.attackerCard;
  const dSubmitted = !!pending.defenderCard;
  const both = aSubmitted && dSubmitted;

  return (
    <Modal title={`Сражение на «${node?.name ?? ""}»`}>
      <div className="text-sm text-gray-300 mb-4">
        {FACTIONS[attacker.faction].name} ({attackerPlayer.name}) атакует{" "}
        {FACTIONS[defender.faction].name} ({defenderPlayer.name}).{" "}
        Источник: {sourceLabel(pending.attackerSource)} → {sourceLabel(pending.defenderSource)}.
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <SidePanel
          label="Атакующий"
          player={attackerPlayer}
          source={pending.attackerSource}
          card={pending.attackerCard}
          guess={pending.attackerGuess}
          prebuff={pending.attackerPrebuff}
          onSubmit={(cardId, guess) => onSubmitCard(attackerPlayer.id, cardId, guess)}
          onPrebuff={(g) => onPlayPrebuff(attackerPlayer.id, g)}
          hideUntilReveal={both}
        />
        <SidePanel
          label="Защищающийся"
          player={defenderPlayer}
          source={pending.defenderSource}
          card={pending.defenderCard}
          guess={pending.defenderGuess}
          prebuff={pending.defenderPrebuff}
          onSubmit={(cardId, guess) => onSubmitCard(defenderPlayer.id, cardId, guess)}
          onPrebuff={(g) => onPlayPrebuff(defenderPlayer.id, g)}
          hideUntilReveal={both}
        />
      </div>

      {both && (
        <div className="mt-5 flex justify-end">
          <button
            onClick={onResolve}
            className="px-5 py-2 rounded-lg bg-gradient-to-r from-amber-500 to-rose-500 text-white text-sm font-semibold"
          >
            Вскрыть карты
          </button>
        </div>
      )}
    </Modal>
  );
}

function sourceLabel(s: PendingPrompt extends { kind: "combat" } ? "normal" | "pirate" | "ghost" | "sheybanid" : string): string {
  if (s === "normal") return "своя карта";
  if (s === "pirate") return "пираты";
  if (s === "ghost") return "призраки";
  if (s === "sheybanid") return "Шейбаниды";
  return s;
}

interface SidePanelProps {
  label: string;
  player: { id: string; name: string; faction: string; hand: { id: string; value: number }[]; godCards: { id: string; god: string }[] };
  source: "normal" | "pirate" | "ghost" | "sheybanid";
  card?: { id: string; value: number };
  guess?: number;
  prebuff?: string;
  onSubmit: (cardId: string, guess: number) => void;
  onPrebuff: (god: "shentar" | "giordg") => void;
  hideUntilReveal: boolean;
}

function SidePanel({ label, player, source, card, guess, prebuff, onSubmit, onPrebuff, hideUntilReveal }: SidePanelProps) {
  const [selectedCard, setSelectedCard] = useState<string>("");
  const [g, setG] = useState<number>(3);
  const fac = FACTIONS[player.faction as keyof typeof FACTIONS];

  useEffect(() => {
    setSelectedCard("");
    setG(3);
  }, [card?.id, player.id]);

  const submitted = !!card;
  const hand = player.hand;

  const goLabel = (g: string) => (g === "shentar" ? "Шент’Ар" : g === "giordg" ? "Гиордг" : g);
  const prebuffOptions = player.godCards.filter((c) => c.god === "shentar" || c.god === "giordg");

  return (
    <div className="rounded-xl p-4 border" style={{ borderColor: fac.borderColor, background: `${fac.color}10` }}>
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="text-xs text-gray-400">{label}</div>
          <div className="text-base font-bold" style={{ color: fac.color === "#f8fafc" ? "#cbd5e1" : fac.color }}>
            {player.name} · {fac.name}
          </div>
        </div>
        <div className="text-xs text-gray-400 text-right">
          В руке: {hand.length}
          <br />
          Карт богов: {player.godCards.length}
        </div>
      </div>

      {prebuff && (
        <div className="text-xs text-amber-300 mb-2">Сыграна карта: {goLabel(prebuff)}</div>
      )}

      {!submitted && source === "normal" && (
        <>
          {prebuffOptions.length > 0 && (
            <div className="mb-2 flex gap-2 flex-wrap">
              {prebuffOptions.map((c) => (
                <button
                  key={c.id}
                  onClick={() => onPrebuff(c.god as "shentar" | "giordg")}
                  className="px-2 py-1 text-xs rounded-md bg-amber-500/20 text-amber-200 border border-amber-400/40 hover:bg-amber-500/30"
                >
                  Сыграть {goLabel(c.god)} перед боем
                </button>
              ))}
            </div>
          )}
          <div className="text-xs text-gray-400 mb-1">Выбрать карту (рубашкой вверх):</div>
          <div className="flex flex-wrap gap-2 mb-3">
            {hand.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedCard(c.id)}
                className={`w-10 h-14 rounded-md font-bold border text-base ${
                  selectedCard === c.id
                    ? "bg-cyan-400 text-slate-900 border-cyan-200"
                    : "bg-slate-800 text-cyan-100 border-slate-600 hover:bg-slate-700"
                }`}
              >
                {c.value}
              </button>
            ))}
          </div>
          <div className="text-xs text-gray-400 mb-1">Предположение о карте соперника:</div>
          <div className="flex gap-2 mb-3">
            {[1, 2, 3, 4, 5].map((v) => (
              <button
                key={v}
                onClick={() => setG(v)}
                className={`w-8 h-8 rounded-md text-sm border ${
                  g === v
                    ? "bg-fuchsia-500 text-white border-fuchsia-300"
                    : "bg-slate-800 text-gray-200 border-slate-600 hover:bg-slate-700"
                }`}
              >
                {v}
              </button>
            ))}
          </div>
          <button
            disabled={!selectedCard}
            onClick={() => onSubmit(selectedCard, g)}
            className="w-full px-3 py-2 rounded-lg bg-emerald-600 disabled:opacity-40 text-white text-sm font-medium hover:bg-emerald-500"
          >
            Подтвердить
          </button>
        </>
      )}

      {!submitted && source !== "normal" && (
        <>
          <div className="text-xs text-amber-200 mb-2">
            Источник: {sourceLabel(source)}. Карта берётся сверху общей колоды.
          </div>
          <div className="text-xs text-gray-400 mb-1">Предположение о карте соперника:</div>
          <div className="flex gap-2 mb-3">
            {[1, 2, 3, 4, 5].map((v) => (
              <button
                key={v}
                onClick={() => setG(v)}
                className={`w-8 h-8 rounded-md text-sm border ${
                  g === v
                    ? "bg-fuchsia-500 text-white border-fuchsia-300"
                    : "bg-slate-800 text-gray-200 border-slate-600 hover:bg-slate-700"
                }`}
              >
                {v}
              </button>
            ))}
          </div>
          <button
            onClick={() => onSubmit("", g)}
            className="w-full px-3 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-500"
          >
            Тянуть карту и подтвердить
          </button>
        </>
      )}

      {submitted && (
        <div className="text-center">
          <div className="text-xs text-gray-400">Карта подана:</div>
          {hideUntilReveal ? (
            <div className="my-2 w-12 h-16 mx-auto bg-slate-800 border-2 border-slate-500 rounded-md flex items-center justify-center text-lg">
              🂠
            </div>
          ) : (
            <div className="my-2 w-12 h-16 mx-auto bg-cyan-100 border-2 border-cyan-300 rounded-md flex items-center justify-center text-2xl font-bold text-slate-900">
              {card?.value}
            </div>
          )}
          <div className="text-xs text-gray-400">Предположение: {guess}</div>
        </div>
      )}
    </div>
  );
}

function Modal({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-neutral-900 border border-white/10 rounded-2xl p-6 max-w-3xl w-full shadow-2xl">
        <h3 className="text-xl font-bold mb-4 text-gray-100">{title}</h3>
        {children}
      </div>
    </div>
  );
}
