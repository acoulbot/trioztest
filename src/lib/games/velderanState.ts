import { MAP_NODES, getNeighbors } from "./velderanMap";

export interface GameUnit {
  id: string;
  playerId: string; // GamePlayer.id
  type: "ARMY" | "GUARD";
  position: string; // MapNode.id
  movesLeft: number;
}

export interface CombatState {
  attackerUnitId: string;
  defenderUnitId: string;
  attackerPlayerId: string;
  defenderPlayerId: string;
  attackerCard?: number; // 1-5
  defenderCard?: number;
  attackerGuess?: number;
  defenderGuess?: number;
  nodeId: string;
}

export interface GodResult {
  roll: [number, number];
  total: number;
  godName: string;
  effect: string;
  playerId: string;
  shrineId: string;
}

export interface VelderanGameState {
  round: number;
  currentPlayerIndex: number;
  phase: "PLACEMENT" | "MOVE" | "COMBAT" | "GOD_SUMMON" | "GAME_OVER";
  units: GameUnit[];
  combat?: CombatState;
  lastGodResult?: GodResult;
  log: string[];
  turnOrder: string[]; // array of GamePlayer.id in turn order
  eliminatedPlayers: string[]; // GamePlayer.ids
  winner?: string; // GamePlayer.id
  reserve: Record<string, number>; // playerId → army count in reserve
  cityOwners: Record<string, string>; // nodeId → playerId (captured cities)
}

const GODS: Record<number, { name: string; effect: string }> = {
  2: { name: "Джалайна", effect: "Воскрешает любой ваш отряд в любой точке карты" },
  3: { name: "Авалайс", effect: "Утопить любую армию противника на морских путях" },
  4: { name: "Стратос", effect: "Уничтожает ваш отряд на этом святилище" },
  5: { name: "Ситас", effect: "Пропустить ход любому игроку" },
  6: { name: "Шент'Ар", effect: "При победе побеждённый отряд становится союзным" },
  7: { name: "Гиордг", effect: "Божественная защита: при проигрыше переигровка" },
  8: { name: "Сихварис", effect: "Переносит ваш отряд в любую точку карты" },
  9: { name: "Вьеронх", effect: "Перенести армию соперника в любую точку карты" },
  10: { name: "Ангелона", effect: "Призывает к святилищу 2 вражеских отряда" },
  11: { name: "Антегриз", effect: "Уничтожить любой вражеский отряд на суше" },
  12: { name: "Выбор", effect: "Вы выбираете любое божество в помощь" },
};

export function createInitialState(
  players: { id: string; faction: string; turnOrder: number }[]
): VelderanGameState {
  const sorted = [...players].sort((a, b) => a.turnOrder - b.turnOrder);
  const units: GameUnit[] = [];
  let unitCounter = 0;

  for (const player of sorted) {
    const factionCities = MAP_NODES.filter(
      (n) => n.type === "city" && n.faction === player.faction
    );

    // Place 2 armies + 1 guard per city
    for (const city of factionCities) {
      for (let i = 0; i < 2; i++) {
        units.push({
          id: `u${unitCounter++}`,
          playerId: player.id,
          type: "ARMY",
          position: city.id,
          movesLeft: 2,
        });
      }
      units.push({
        id: `u${unitCounter++}`,
        playerId: player.id,
        type: "GUARD",
        position: city.id,
        movesLeft: 1,
      });
    }
  }

  // Initialize city ownership
  const cityOwners: Record<string, string> = {};
  for (const player of sorted) {
    const factionCities = MAP_NODES.filter(
      (n) => n.type === "city" && n.faction === player.faction
    );
    for (const city of factionCities) {
      cityOwners[city.id] = player.id;
    }
  }

  // Initialize reserve (2 per player)
  const reserve: Record<string, number> = {};
  for (const player of sorted) {
    reserve[player.id] = 2;
  }

  return {
    round: 1,
    currentPlayerIndex: 0,
    phase: "PLACEMENT",
    units,
    log: ["Игра началась! Расставьте подкрепления из резерва."],
    turnOrder: sorted.map((p) => p.id),
    eliminatedPlayers: [],
    reserve,
    cityOwners,
  };
}

export function getCurrentPlayerId(state: VelderanGameState): string {
  return state.turnOrder[state.currentPlayerIndex];
}

export function getPlayerUnits(state: VelderanGameState, playerId: string): GameUnit[] {
  return state.units.filter((u) => u.playerId === playerId);
}

export function placeReserve(
  state: VelderanGameState,
  playerId: string,
  cityNodeId: string,
  playerNames: Record<string, string>
): VelderanGameState {
  const newState = structuredClone(state);
  const reserve = newState.reserve[playerId] || 0;
  if (reserve <= 0) return newState;

  const node = MAP_NODES.find((n) => n.id === cityNodeId);
  if (!node || node.type !== "city") return newState;

  // Can only place on own cities
  if (newState.cityOwners[cityNodeId] !== playerId) return newState;

  // Max 2 units per node
  const unitsAtNode = newState.units.filter(
    (u) => u.position === cityNodeId && u.playerId === playerId
  );
  if (unitsAtNode.length >= 2) return newState;

  const maxId = newState.units.reduce((max, u) => {
    const num = parseInt(u.id.replace("u", "")) || 0;
    return Math.max(max, num);
  }, 0);

  newState.units.push({
    id: `u${maxId + 1}`,
    playerId,
    type: "ARMY",
    position: cityNodeId,
    movesLeft: 2,
  });
  newState.reserve[playerId] = reserve - 1;

  const playerName = playerNames[playerId] || "Игрок";
  newState.log.push(`${playerName} выставил отряд из резерва в ${node.name}.`);

  return newState;
}

export function finishPlacement(
  state: VelderanGameState,
  playerNames: Record<string, string>
): VelderanGameState {
  const newState = structuredClone(state);
  const currentId = getCurrentPlayerId(newState);
  const playerName = playerNames[currentId] || "Игрок";

  // Move to next player for placement or move to MOVE phase
  let nextIdx = newState.currentPlayerIndex;
  let allPlaced = true;

  // Check if all subsequent players also have 0 reserve
  for (let i = 0; i < newState.turnOrder.length; i++) {
    const idx = (newState.currentPlayerIndex + 1 + i) % newState.turnOrder.length;
    const pid = newState.turnOrder[idx];
    if (newState.eliminatedPlayers.includes(pid)) continue;
    if ((newState.reserve[pid] || 0) > 0) {
      nextIdx = idx;
      allPlaced = false;
      break;
    }
  }

  if (allPlaced || (newState.reserve[currentId] || 0) <= 0) {
    // Check if current player is the last one who could place
    const anyReserve = newState.turnOrder.some(
      (pid) => !newState.eliminatedPlayers.includes(pid) && (newState.reserve[pid] || 0) > 0
    );
    if (!anyReserve) {
      newState.phase = "MOVE";
      newState.currentPlayerIndex = 0;
      // Skip eliminated
      while (newState.eliminatedPlayers.includes(newState.turnOrder[newState.currentPlayerIndex])) {
        newState.currentPlayerIndex = (newState.currentPlayerIndex + 1) % newState.turnOrder.length;
      }
      const nextName = playerNames[newState.turnOrder[newState.currentPlayerIndex]] || "Игрок";
      newState.log.push(`Фаза расстановки завершена. Ход ${nextName}.`);
      return newState;
    }
  }

  newState.currentPlayerIndex = nextIdx;
  const nextName = playerNames[newState.turnOrder[nextIdx]] || "Игрок";
  newState.log.push(`Расстановка: ход ${nextName}.`);
  return newState;
}

export function canMoveUnit(state: VelderanGameState, unitId: string, targetNodeId: string): boolean {
  const unit = state.units.find((u) => u.id === unitId);
  if (!unit || unit.movesLeft <= 0) return false;

  const neighbors = getNeighbors(unit.position);
  if (!neighbors.includes(targetNodeId)) return false;

  // Max 2 same-player units per node
  const unitsAtTarget = state.units.filter(
    (u) => u.position === targetNodeId && u.playerId === unit.playerId
  );
  if (unitsAtTarget.length >= 2) return false;

  return true;
}

export function moveUnit(
  state: VelderanGameState,
  unitId: string,
  targetNodeId: string,
  playerNames: Record<string, string>
): VelderanGameState {
  const newState = structuredClone(state);
  const unit = newState.units.find((u) => u.id === unitId);
  if (!unit) return newState;

  const fromNode = MAP_NODES.find((n) => n.id === unit.position);
  const toNode = MAP_NODES.find((n) => n.id === targetNodeId);
  unit.position = targetNodeId;
  unit.movesLeft--;

  const playerName = playerNames[unit.playerId] || "Игрок";
  newState.log.push(
    `${playerName}: ${unit.type === "GUARD" ? "Гвардия" : "Отряд"} ${fromNode?.name || ""} → ${toNode?.name || ""}`
  );

  // Check for enemy units at target — trigger combat
  const enemies = newState.units.filter(
    (u) => u.position === targetNodeId && u.playerId !== unit.playerId
  );
  if (enemies.length > 0) {
    newState.phase = "COMBAT";
    newState.combat = {
      attackerUnitId: unit.id,
      defenderUnitId: enemies[0].id,
      attackerPlayerId: unit.playerId,
      defenderPlayerId: enemies[0].playerId,
      nodeId: targetNodeId,
    };
    newState.log.push(`Сражение на ${toNode?.name || targetNodeId}!`);
  }

  // Capture city if undefended enemy city
  if (toNode?.type === "city" && !newState.combat) {
    const currentOwner = newState.cityOwners[targetNodeId];
    if (currentOwner && currentOwner !== unit.playerId) {
      newState.cityOwners[targetNodeId] = unit.playerId;
      const prevOwnerName = playerNames[currentOwner] || "Противник";
      newState.log.push(`${playerName} захватил город ${toNode.name} у ${prevOwnerName}!`);
    } else if (!currentOwner) {
      newState.cityOwners[targetNodeId] = unit.playerId;
      newState.log.push(`${playerName} занял нейтральный город ${toNode.name}.`);
    }
  }

  // Check if moved onto shrine with guard
  if (toNode?.type === "shrine" && unit.type === "GUARD" && !newState.combat) {
    newState.phase = "GOD_SUMMON";
    newState.log.push(`Гвардия на святилище ${toNode.name} — бросьте кубики!`);
  }

  return newState;
}

export function rollDiceForGod(
  state: VelderanGameState,
  playerId: string,
  shrineId: string,
  playerNames: Record<string, string>
): VelderanGameState {
  const newState = structuredClone(state);
  const d1 = Math.floor(Math.random() * 6) + 1;
  const d2 = Math.floor(Math.random() * 6) + 1;
  const total = d1 + d2;
  const god = GODS[total];
  const playerName = playerNames[playerId] || "Игрок";

  newState.lastGodResult = {
    roll: [d1, d2],
    total,
    godName: god.name,
    effect: god.effect,
    playerId,
    shrineId,
  };

  newState.log.push(`${playerName} бросил ${d1}+${d2}=${total} — ${god.name}: ${god.effect}`);

  // Apply simple god effects
  if (total === 4) {
    // Stratos — destroy own unit on shrine
    const idx = newState.units.findIndex(
      (u) => u.position === shrineId && u.playerId === playerId && u.type === "GUARD"
    );
    if (idx >= 0) {
      newState.units.splice(idx, 1);
      newState.log.push(`Стратос уничтожил гвардию ${playerName} на святилище!`);
    }
  } else if (total === 11) {
    // Antegriz — destroy random enemy army on land (auto-pick)
    const enemyArmies = newState.units.filter(
      (u) => u.playerId !== playerId && u.type === "ARMY"
    );
    if (enemyArmies.length > 0) {
      const target = enemyArmies[Math.floor(Math.random() * enemyArmies.length)];
      const targetName = playerNames[target.playerId] || "Противник";
      const node = MAP_NODES.find((n) => n.id === target.position);
      newState.units = newState.units.filter((u) => u.id !== target.id);
      newState.log.push(`Антегриз уничтожил отряд ${targetName} в ${node?.name || ""}!`);
    }
  }

  newState.phase = "MOVE";
  return newState;
}

export function resolveCombat(
  state: VelderanGameState,
  attackerCard: number,
  attackerGuess: number,
  defenderCard: number,
  defenderGuess: number,
  playerNames: Record<string, string>
): VelderanGameState {
  const newState = structuredClone(state);
  if (!newState.combat) return newState;

  const { attackerUnitId, defenderUnitId, attackerPlayerId, defenderPlayerId, nodeId } = newState.combat;
  const attackerName = playerNames[attackerPlayerId] || "Атакующий";
  const defenderName = playerNames[defenderPlayerId] || "Защитник";
  const node = MAP_NODES.find((n) => n.id === nodeId);

  // Exact guess wins
  const attackerGuessedRight = attackerGuess === defenderCard;
  const defenderGuessedRight = defenderGuess === attackerCard;

  let winnerId: string | null = null;
  let loserId: string | null = null;

  if (attackerGuessedRight && !defenderGuessedRight) {
    winnerId = attackerPlayerId;
    loserId = defenderPlayerId;
    newState.log.push(`${attackerName} угадал карту! Победа атакующего на ${node?.name || ""}.`);
  } else if (defenderGuessedRight && !attackerGuessedRight) {
    winnerId = defenderPlayerId;
    loserId = attackerPlayerId;
    newState.log.push(`${defenderName} угадал карту! Победа защитника на ${node?.name || ""}.`);
  } else if (attackerGuessedRight && defenderGuessedRight) {
    // Both guessed — higher card wins
    if (attackerCard > defenderCard) {
      winnerId = attackerPlayerId;
      loserId = defenderPlayerId;
    } else if (defenderCard > attackerCard) {
      winnerId = defenderPlayerId;
      loserId = attackerPlayerId;
    }
    newState.log.push(`Оба угадали! Карта ${attackerCard} vs ${defenderCard}.`);
  } else {
    // Neither guessed exactly — check proximity rule
    const attackerNear = Math.abs(attackerGuess - defenderCard) <= 1;
    const defenderNear = Math.abs(defenderGuess - attackerCard) <= 1;

    if (attackerCard > defenderCard && attackerNear) {
      winnerId = attackerPlayerId;
      loserId = defenderPlayerId;
      newState.log.push(`${attackerName} побеждает (карта ${attackerCard} > ${defenderCard}, ±1).`);
    } else if (defenderCard > attackerCard && defenderNear) {
      winnerId = defenderPlayerId;
      loserId = attackerPlayerId;
      newState.log.push(`${defenderName} побеждает (карта ${defenderCard} > ${attackerCard}, ±1).`);
    } else {
      // Draw — no losses
      newState.log.push(`Ничья на ${node?.name || ""}. Переигровка не требуется.`);
    }
  }

  if (loserId) {
    const loserUnitId = loserId === attackerPlayerId ? attackerUnitId : defenderUnitId;
    const winnerId = loserId === attackerPlayerId ? defenderPlayerId : attackerPlayerId;
    newState.units = newState.units.filter((u) => u.id !== loserUnitId);
    const loserName = loserId === attackerPlayerId ? attackerName : defenderName;
    newState.log.push(`Отряд ${loserName} уничтожен.`);

    // Capture city if attacker won and city belongs to defender
    if (!newState.cityOwners) newState.cityOwners = {};
    if (node?.type === "city" && winnerId === attackerPlayerId) {
      const prevOwner = newState.cityOwners[nodeId];
      if (prevOwner && prevOwner !== winnerId) {
        newState.cityOwners[nodeId] = winnerId;
        const winName = playerNames[winnerId] || "Игрок";
        newState.log.push(`${winName} захватил город ${node.name}!`);
      }
    }

    // Check elimination
    const remaining = newState.units.filter((u) => u.playerId === loserId);
    if (remaining.length === 0 && loserId) {
      newState.eliminatedPlayers.push(loserId);
      newState.log.push(`${loserName} выбыл из игры!`);
    }
  }

  newState.combat = undefined;
  newState.phase = "MOVE";

  // Check win condition — last player standing
  const activePlayers = newState.turnOrder.filter(
    (pid) => !newState.eliminatedPlayers.includes(pid)
  );
  if (activePlayers.length === 1) {
    newState.winner = activePlayers[0];
    newState.phase = "GAME_OVER";
    const winName = playerNames[activePlayers[0]] || "Игрок";
    newState.log.push(`${winName} победил! Игра окончена.`);
  }

  return newState;
}

export function endTurn(
  state: VelderanGameState,
  playerNames: Record<string, string>
): VelderanGameState {
  const newState = structuredClone(state);
  // Ensure reserve/cityOwners exist (backward compat)
  if (!newState.reserve) newState.reserve = {};
  if (!newState.cityOwners) newState.cityOwners = {};

  const currentId = getCurrentPlayerId(newState);
  const playerName = playerNames[currentId] || "Игрок";

  // Find next active player
  let nextIdx = newState.currentPlayerIndex;
  let roundEnd = false;
  do {
    nextIdx = (nextIdx + 1) % newState.turnOrder.length;
    if (nextIdx === 0) roundEnd = true;
  } while (newState.eliminatedPlayers.includes(newState.turnOrder[nextIdx]));

  if (roundEnd) {
    newState.round++;
    // Reset moves for all units
    for (const unit of newState.units) {
      unit.movesLeft = unit.type === "ARMY" ? 2 : 1;
    }

    // Reinforcements: 2 reserves per own city without enemy
    for (const pid of newState.turnOrder) {
      if (newState.eliminatedPlayers.includes(pid)) continue;
      const ownCities = Object.entries(newState.cityOwners).filter(
        ([, owner]) => owner === pid
      );
      const reinforcements = Math.min(ownCities.length, 2);
      newState.reserve[pid] = (newState.reserve[pid] || 0) + reinforcements;
      if (reinforcements > 0) {
        const pName = playerNames[pid] || "Игрок";
        newState.log.push(`${pName} получил +${reinforcements} в резерв (${ownCities.length} городов).`);
      }
    }

    newState.log.push(`Раунд ${newState.round}. Расставьте подкрепления.`);

    // Go to placement phase if anyone has reserves
    const anyReserve = newState.turnOrder.some(
      (pid) => !newState.eliminatedPlayers.includes(pid) && (newState.reserve[pid] || 0) > 0
    );
    if (anyReserve) {
      newState.phase = "PLACEMENT";
    }
  }

  newState.currentPlayerIndex = nextIdx;
  const nextName = playerNames[newState.turnOrder[nextIdx]] || "Игрок";
  newState.log.push(`Ход ${nextName}.`);

  return newState;
}
