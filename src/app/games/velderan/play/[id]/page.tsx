"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { MAP_NODES, FACTION_COLORS, getNeighbors, setMapEdges } from "@/lib/games/velderanMap";
import type { MapEdge } from "@/lib/games/velderanMap";
import type { VelderanGameState, GameUnit, CombatState } from "@/lib/games/velderanState";

interface Player {
  id: string;
  userId: string;
  faction: string | null;
  color: string | null;
  turnOrder: number;
  user: { id: string; name: string; username: string; avatar: string | null };
}

interface Room {
  id: string;
  name: string;
  hostId: string;
  status: string;
  gameState: string | null;
  players: Player[];
}

function CombatModal({
  combat,
  myPlayerId,
  playerNames,
  onPlayCard,
}: {
  combat: CombatState;
  myPlayerId: string;
  playerNames: Record<string, string>;
  onPlayCard: (card: number, guess: number) => void;
}) {
  const [card, setCard] = useState<number | null>(null);
  const [guess, setGuess] = useState<number | null>(null);
  const isAttacker = myPlayerId === combat.attackerPlayerId;
  const isDefender = myPlayerId === combat.defenderPlayerId;
  const isParticipant = isAttacker || isDefender;

  const alreadyPlayed = isAttacker ? !!combat.attackerCard : !!combat.defenderCard;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
    >
      <motion.div
        initial={{ scale: 0.9 }}
        animate={{ scale: 1 }}
        className="bg-neutral-900 border border-red-500/30 rounded-2xl p-6 max-w-md w-full shadow-2xl"
      >
        <h3 className="text-xl font-bold text-red-400 mb-1 text-center">⚔️ Сражение!</h3>
        <p className="text-center text-gray-400 text-sm mb-4">
          {playerNames[combat.attackerPlayerId]} vs {playerNames[combat.defenderPlayerId]}
        </p>

        {isParticipant && !alreadyPlayed ? (
          <>
            <p className="text-sm text-gray-300 mb-3">Выберите карту (1-5) и угадайте карту противника:</p>
            <div className="mb-3">
              <p className="text-xs text-gray-500 mb-1">Ваша карта:</p>
              <div className="flex gap-2 justify-center">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    onClick={() => setCard(n)}
                    className={`w-10 h-12 rounded-lg border text-lg font-bold transition-all ${
                      card === n
                        ? "border-red-500 bg-red-500/20 text-red-400"
                        : "border-white/10 bg-white/5 text-white hover:border-white/30"
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
            <div className="mb-4">
              <p className="text-xs text-gray-500 mb-1">Ваше предположение:</p>
              <div className="flex gap-2 justify-center">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    onClick={() => setGuess(n)}
                    className={`w-10 h-12 rounded-lg border text-lg font-bold transition-all ${
                      guess === n
                        ? "border-amber-500 bg-amber-500/20 text-amber-400"
                        : "border-white/10 bg-white/5 text-white hover:border-white/30"
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
            <button
              onClick={() => card && guess && onPlayCard(card, guess)}
              disabled={!card || !guess}
              className="w-full py-3 bg-gradient-to-r from-red-600 to-amber-600 text-white rounded-xl font-medium disabled:opacity-50 hover:shadow-lg transition-all"
            >
              Разыграть
            </button>
          </>
        ) : alreadyPlayed ? (
          <p className="text-center text-amber-400 text-sm py-8">Ожидание хода противника...</p>
        ) : (
          <p className="text-center text-gray-500 text-sm py-8">Идёт сражение между другими игроками...</p>
        )}
      </motion.div>
    </motion.div>
  );
}

export default function PlayPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const params = useParams();
  const roomId = params.id as string;
  const [room, setRoom] = useState<Room | null>(null);
  const [gameState, setGameState] = useState<VelderanGameState | null>(null);
  const [selectedUnit, setSelectedUnit] = useState<string | null>(null);
  const [validMoves, setValidMoves] = useState<string[]>([]);
  const [edgesLoaded, setEdgesLoaded] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);

  const fetchRoom = useCallback(async () => {
    const res = await fetch(`/api/games/rooms/${roomId}`);
    if (!res.ok) return;
    const data = await res.json();
    setRoom(data);
    if (data.gameState) {
      setGameState(JSON.parse(data.gameState));
    }
    if (data.status === "FINISHED" || data.status === "LOBBY") {
      // Redirect if not playing
    }
  }, [roomId]);

  // Load map edges from config
  useEffect(() => {
    fetch("/api/games/map-config")
      .then((r) => r.json())
      .then((data) => {
        if (data.edges) {
          setMapEdges(data.edges as MapEdge[]);
        }
        setEdgesLoaded(true);
      })
      .catch(() => setEdgesLoaded(true));
  }, []);

  useEffect(() => {
    fetchRoom();
    const interval = setInterval(fetchRoom, 2000);
    return () => clearInterval(interval);
  }, [fetchRoom]);

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [gameState?.log]);

  const userId = (session?.user as { id?: string })?.id;
  const myPlayer = room?.players.find((p) => p.userId === userId);
  const myPlayerId = myPlayer?.id;
  const isMyTurn = gameState && myPlayerId ? gameState.turnOrder[gameState.currentPlayerIndex] === myPlayerId : false;

  const playerNames: Record<string, string> = {};
  const playerFactions: Record<string, string> = {};
  if (room) {
    for (const p of room.players) {
      playerNames[p.id] = p.user.name;
      playerFactions[p.id] = p.faction || "";
    }
  }

  const selectUnit = (unitId: string) => {
    if (!gameState || !isMyTurn || gameState.phase !== "MOVE") return;
    const unit = gameState.units.find((u) => u.id === unitId);
    if (!unit || unit.playerId !== myPlayerId || unit.movesLeft <= 0) return;

    setSelectedUnit(unitId);
    const neighbors = getNeighbors(unit.position);
    const validTargets = neighbors.filter((nid) => {
      const samePlayerUnits = gameState.units.filter(
        (u) => u.position === nid && u.playerId === myPlayerId
      );
      return samePlayerUnits.length < 2;
    });
    setValidMoves(validTargets);
  };

  const doMove = async (targetNodeId: string) => {
    if (!selectedUnit) return;
    const res = await fetch(`/api/games/rooms/${roomId}/action`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "move", unitId: selectedUnit, targetNodeId }),
    });
    if (res.ok) {
      const newState = await res.json();
      setGameState(newState);
    }
    setSelectedUnit(null);
    setValidMoves([]);
  };

  const doEndTurn = async () => {
    const res = await fetch(`/api/games/rooms/${roomId}/action`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "end_turn" }),
    });
    if (res.ok) setGameState(await res.json());
  };

  const doCombatCard = async (card: number, guess: number) => {
    const res = await fetch(`/api/games/rooms/${roomId}/action`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "combat_card", card, guess }),
    });
    if (res.ok) setGameState(await res.json());
  };

  const doRollGod = async () => {
    const res = await fetch(`/api/games/rooms/${roomId}/action`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "roll_god" }),
    });
    if (res.ok) setGameState(await res.json());
  };

  const doPlaceReserve = async (cityNodeId: string) => {
    const res = await fetch(`/api/games/rooms/${roomId}/action`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "place_reserve", cityNodeId }),
    });
    if (res.ok) setGameState(await res.json());
  };

  const doFinishPlacement = async () => {
    const res = await fetch(`/api/games/rooms/${roomId}/action`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "finish_placement" }),
    });
    if (res.ok) setGameState(await res.json());
  };

  if (!room || !gameState) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  const currentPlayerId = gameState.turnOrder[gameState.currentPlayerIndex];
  const currentPlayerName = playerNames[currentPlayerId] || "?";

  // Group units by position
  const unitsByNode: Record<string, GameUnit[]> = {};
  for (const u of gameState.units) {
    if (!unitsByNode[u.position]) unitsByNode[u.position] = [];
    unitsByNode[u.position].push(u);
  }

  return (
    <div className="h-screen bg-neutral-950 flex flex-col overflow-hidden">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-neutral-900/90 border-b border-white/5 flex-shrink-0">
        <div className="flex items-center gap-3">
          <Link href="/games/velderan" className="text-gray-500 hover:text-gray-300 text-sm">← Назад</Link>
          <span className="text-white font-bold">{room.name}</span>
          <span className="text-gray-500 text-sm">Раунд {gameState.round}</span>
        </div>
        <div className="flex items-center gap-2">
          {gameState.phase === "PLACEMENT" && isMyTurn && (
            <>
              <span className="text-cyan-400 text-sm">
                Резерв: {gameState.reserve?.[myPlayerId || ""] || 0}
              </span>
              <button
                onClick={doFinishPlacement}
                className="px-4 py-1.5 bg-cyan-600 text-white rounded-lg text-sm font-medium hover:bg-cyan-500 transition-all"
              >
                Завершить расстановку
              </button>
            </>
          )}
          {gameState.phase === "GOD_SUMMON" && isMyTurn && (
            <button
              onClick={doRollGod}
              className="px-4 py-1.5 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-500 transition-all"
            >
              🎲 Бросить кубики
            </button>
          )}
          {isMyTurn && gameState.phase === "MOVE" && (
            <button
              onClick={doEndTurn}
              className="px-4 py-1.5 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-500 transition-all"
            >
              Завершить ход
            </button>
          )}
          <div
            className="px-3 py-1 rounded-lg text-sm font-medium"
            style={{
              backgroundColor: FACTION_COLORS[playerFactions[currentPlayerId]] + "20",
              color: FACTION_COLORS[playerFactions[currentPlayerId]],
              border: `1px solid ${FACTION_COLORS[playerFactions[currentPlayerId]]}40`,
            }}
          >
            {gameState.phase === "PLACEMENT"
              ? isMyTurn ? "Расстановка" : `Расстановка: ${currentPlayerName}`
              : isMyTurn ? "Ваш ход" : `Ход: ${currentPlayerName}`}
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Map area — fit to screen */}
        <div className="flex-1 relative flex items-center justify-center overflow-hidden">
          <div className="relative w-full" style={{ aspectRatio: "2400/1792", maxHeight: "100%" }}>
          <Image src="/games/velderan/map.png" alt="Карта" fill className="object-cover" unoptimized />

          {/* Nodes */}
          {MAP_NODES.map((node) => {
            const units = unitsByNode[node.id] || [];
            const isValidMove = validMoves.includes(node.id);
            const hasMyUnit = units.some((u) => u.playerId === myPlayerId);
            const cityOwner = gameState.cityOwners?.[node.id];
            const cityOwnerColor = cityOwner ? FACTION_COLORS[playerFactions[cityOwner]] : undefined;

            // Placement: highlight own cities
            const isPlacementTarget = gameState.phase === "PLACEMENT" && isMyTurn &&
              node.type === "city" && myPlayerId && gameState.cityOwners?.[node.id] === myPlayerId &&
              (gameState.reserve?.[myPlayerId] || 0) > 0 &&
              units.filter((u) => u.playerId === myPlayerId).length < 2;

            return (
              <div
                key={node.id}
                className="absolute transform -translate-x-1/2 -translate-y-1/2 group"
                style={{ left: `${node.x}%`, top: `${node.y}%` }}
              >
                {/* Valid move highlight */}
                {isValidMove && (
                  <motion.div
                    animate={{ scale: [1, 1.3, 1] }}
                    transition={{ repeat: Infinity, duration: 1 }}
                    className="absolute inset-0 -m-2 rounded-full border-2 border-green-400/60"
                  />
                )}

                {/* Placement highlight */}
                {isPlacementTarget && (
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ repeat: Infinity, duration: 1.5 }}
                    className="absolute inset-0 -m-2 rounded-full border-2 border-cyan-400/60"
                  />
                )}

                {/* City ownership ring */}
                {node.type === "city" && cityOwnerColor && (
                  <span
                    className="absolute inset-[-4px] rounded-full pointer-events-none"
                    style={{ border: `3px solid ${cityOwnerColor}80`, boxShadow: `0 0 8px ${cityOwnerColor}40` }}
                  />
                )}

                {/* Node button — invisible by default, map image shows symbols */}
                <button
                  onClick={() => {
                    if (isPlacementTarget) {
                      doPlaceReserve(node.id);
                    } else if (isValidMove && selectedUnit) {
                      doMove(node.id);
                    } else if (hasMyUnit && isMyTurn && gameState.phase === "MOVE") {
                      const myUnits = units.filter((u) => u.playerId === myPlayerId && u.movesLeft > 0);
                      if (myUnits.length > 0) selectUnit(myUnits[0].id);
                    }
                  }}
                  className={`relative w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                    isValidMove
                      ? "bg-green-500/40 border-2 border-green-400 cursor-pointer hover:bg-green-500/60"
                      : isPlacementTarget
                        ? "bg-cyan-500/30 border-2 border-cyan-400 cursor-pointer hover:bg-cyan-500/50"
                        : selectedUnit && units.some((u) => u.id === selectedUnit)
                          ? "bg-amber-500/30 border-2 border-amber-400"
                          : "cursor-pointer hover:bg-white/10"
                  }`}
                  title={node.name}
                />

                {/* Units on this node */}
                {units.length > 0 && (
                  <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 flex gap-1">
                    {units.map((unit) => {
                      const faction = playerFactions[unit.playerId];
                      const color = FACTION_COLORS[faction] || "#fff";
                      const isSelected = unit.id === selectedUnit;
                      const isGuard = unit.type === "GUARD";
                      return (
                        <button
                          key={unit.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (unit.playerId === myPlayerId && isMyTurn && gameState.phase === "MOVE") {
                              selectUnit(unit.id);
                            }
                          }}
                          className={`relative w-4 h-4 rounded-full flex items-center justify-center transition-all ${
                            isSelected ? "scale-150 z-10" : "hover:scale-125"
                          } ${unit.playerId === myPlayerId ? "cursor-pointer" : ""}`}
                          title={`${playerNames[unit.playerId]} — ${isGuard ? "Гвардия" : "Отряд"} (${unit.movesLeft} ходов)`}
                        >
                          {/* Glow halo for guards */}
                          {isGuard && (
                            <span
                              className="absolute inset-[-3px] rounded-full animate-pulse"
                              style={{
                                boxShadow: `0 0 6px 2px ${color}90, 0 0 12px 4px ${color}40`,
                                border: `1.5px solid ${color}80`,
                              }}
                            />
                          )}
                          {/* Circle body */}
                          <span
                            className="relative block w-full h-full rounded-full border"
                            style={{
                              backgroundColor: color,
                              borderColor: isSelected ? "#fff" : `${color}cc`,
                              boxShadow: isSelected ? `0 0 8px ${color}` : undefined,
                            }}
                          />
                          {/* Moves indicator dot */}
                          {unit.movesLeft > 0 && unit.playerId === myPlayerId && (
                            <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-green-400 border border-neutral-900" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Node label on hover */}
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-20">
                  <div className="bg-black/90 px-2 py-0.5 rounded text-[9px] text-white whitespace-nowrap">
                    {node.name}
                  </div>
                </div>
              </div>
            );
          })}
          </div>
        </div>

        {/* Right sidebar */}
        <div className="w-72 bg-neutral-900/90 border-l border-white/5 flex flex-col flex-shrink-0">
          {/* Players */}
          <div className="p-3 border-b border-white/5">
            <h3 className="text-sm font-bold text-gray-400 mb-2">Игроки</h3>
            <div className="space-y-1">
              {room.players.map((p) => {
                const faction = p.faction || "";
                const color = FACTION_COLORS[faction] || "#888";
                const isCurrent = p.id === currentPlayerId;
                const isEliminated = gameState.eliminatedPlayers.includes(p.id);
                const armies = gameState.units.filter((u) => u.playerId === p.id && u.type === "ARMY");
                const guards = gameState.units.filter((u) => u.playerId === p.id && u.type === "GUARD");
                const reserveCount = gameState.reserve?.[p.id] || 0;

                return (
                  <div
                    key={p.id}
                    className={`flex items-center gap-2 px-2 py-1.5 rounded-lg transition-all ${
                      isCurrent ? "bg-white/10" : "bg-white/[0.02]"
                    } ${isEliminated ? "opacity-40" : ""}`}
                  >
                    <div className="relative w-5 h-5 rounded-full flex-shrink-0" style={{ backgroundColor: color + "40" }}>
                      {isCurrent && (
                        <motion.div
                          animate={{ scale: [1, 1.2, 1] }}
                          transition={{ repeat: Infinity, duration: 1.5 }}
                          className="w-full h-full rounded-full border-2"
                          style={{ borderColor: color }}
                        />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-white truncate">
                        {p.user.name}
                        {p.userId === userId && " (вы)"}
                      </div>
                      {!isEliminated && (
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[9px] text-gray-500 flex items-center gap-0.5">
                            <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                            {armies.length}
                          </span>
                          <span className="text-[9px] text-gray-500 flex items-center gap-0.5">
                            <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: color, boxShadow: `0 0 4px ${color}` }} />
                            {guards.length}
                          </span>
                          {reserveCount > 0 && (
                            <span className="text-[9px] text-gray-600">+{reserveCount} рез.</span>
                          )}
                        </div>
                      )}
                    </div>
                    <span className="text-[10px] text-gray-500">{isEliminated ? "💀" : ""}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* God result */}
          <AnimatePresence>
            {gameState.lastGodResult && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="p-3 border-b border-white/5 bg-purple-500/5"
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg">🎲</span>
                  <span className="text-sm font-bold text-purple-400">
                    {gameState.lastGodResult.godName}
                  </span>
                  <span className="text-xs text-gray-500">
                    ({gameState.lastGodResult.roll[0]}+{gameState.lastGodResult.roll[1]})
                  </span>
                </div>
                <p className="text-[11px] text-gray-400">{gameState.lastGodResult.effect}</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Unit legend */}
          <div className="px-3 py-2 border-b border-white/5">
            <div className="flex items-center gap-3 text-[9px] text-gray-500">
              <span className="flex items-center gap-1">
                <span className="inline-block w-2.5 h-2.5 rounded-full bg-gray-400" /> Отряд
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block w-2.5 h-2.5 rounded-full bg-gray-400" style={{ boxShadow: "0 0 4px rgba(156,163,175,0.8)" }} /> Гвардия
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-400" /> Может ходить
              </span>
            </div>
          </div>

          {/* Game log */}
          <div className="flex-1 flex flex-col min-h-0">
            <h3 className="text-sm font-bold text-gray-400 p-3 pb-1">Журнал</h3>
            <div ref={logRef} className="flex-1 overflow-y-auto px-3 pb-3 space-y-1">
              {gameState.log.map((entry, i) => (
                <p key={i} className="text-[11px] text-gray-500 leading-relaxed">
                  {entry}
                </p>
              ))}
            </div>
          </div>

          {/* Selection info */}
          {selectedUnit && (
            <div className="p-3 border-t border-white/5 bg-amber-500/5">
              <p className="text-xs text-amber-400">Выберите точку для перемещения</p>
              <button
                onClick={() => { setSelectedUnit(null); setValidMoves([]); }}
                className="text-[10px] text-gray-500 hover:text-gray-300 mt-1"
              >
                Отменить
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Game Over overlay */}
      <AnimatePresence>
        {gameState.phase === "GAME_OVER" && gameState.winner && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              className="text-center bg-neutral-900 border border-amber-500/30 rounded-2xl p-8 max-w-sm"
            >
              <div className="text-6xl mb-4">👑</div>
              <h2 className="text-2xl font-bold text-amber-400 mb-2">Победа!</h2>
              <p className="text-white text-lg mb-6">{playerNames[gameState.winner]}</p>
              <Link
                href="/games/velderan"
                className="px-6 py-3 bg-gradient-to-r from-red-600 to-amber-600 text-white rounded-xl font-medium"
              >
                К списку игр
              </Link>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Combat modal */}
      <AnimatePresence>
        {gameState.combat && myPlayerId && (
          <CombatModal
            combat={gameState.combat}
            myPlayerId={myPlayerId}
            playerNames={playerNames}
            onPlayCard={doCombatCard}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
