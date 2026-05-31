import { getActiveNodes, getNeighbors } from "./velderanMap";

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

export interface InventoryUnit {
  id: string;
  type: "ARMY" | "GUARD";
}

export interface BattleCardState {
  deck: number[];           // shared draw pile (values 1-5)
  hands: Record<string, number[]>; // playerId → cards in hand
  discard: number[];        // discard pile ("бито")
}

export interface VelderanGameState {
  round: number;
  currentPlayerIndex: number;
  phase: "PLACEMENT" | "MOVE" | "COMBAT" | "GOD_SUMMON" | "GAME_OVER";
  units: GameUnit[];
  combat?: CombatState;
  lastGodResult?: GodResult;
  battleCards?: BattleCardState;
  log: string[];
  turnOrder: string[]; // array of GamePlayer.id in turn order
  eliminatedPlayers: string[]; // GamePlayer.ids
  winner?: string; // GamePlayer.id
  reserve: Record<string, number>; // playerId → army count in reserve (legacy, kept for compat)
  inventory: Record<string, InventoryUnit[]>; // playerId → unplaced units
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

const TOTAL_ARMIES = 8;
const TOTAL_GUARDS = 3;

/** Shuffle array in place (Fisher-Yates) */
function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/** Create a deck of 100 battle cards: 20 each of values 1-5 */
function createDeck(): number[] {
  const deck: number[] = [];
  for (let v = 1; v <= 5; v++) {
    for (let i = 0; i < 20; i++) deck.push(v);
  }
  return shuffle(deck);
}

/** Draw N cards from deck; if deck is empty, reshuffle discard into deck */
function drawCards(bc: BattleCardState, count: number): number[] {
  const drawn: number[] = [];
  for (let i = 0; i < count; i++) {
    if (bc.deck.length === 0) {
      if (bc.discard.length === 0) break;
      bc.deck = shuffle([...bc.discard]);
      bc.discard = [];
    }
    drawn.push(bc.deck.pop()!);
  }
  return drawn;
}

export function createInitialState(
  players: { id: string; faction: string; turnOrder: number }[]
): VelderanGameState {
  const sorted = [...players].sort((a, b) => a.turnOrder - b.turnOrder);
  const units: GameUnit[] = [];
  const inventory: Record<string, InventoryUnit[]> = {};
  let unitCounter = 0;

  // Initialize city ownership
  const cityOwners: Record<string, string> = {};
  for (const player of sorted) {
    const factionCities = getActiveNodes().filter(
      (n) => n.type === "city" && n.faction === player.faction
    );
    for (const city of factionCities) {
      cityOwners[city.id] = player.id;
    }
  }

  // Each player gets 8 armies + 3 guards total
  // All start in inventory — player places them during PLACEMENT phase
  for (const player of sorted) {
    const inv: InventoryUnit[] = [];
    for (let i = 0; i < TOTAL_ARMIES; i++) {
      inv.push({ id: `u${unitCounter++}`, type: "ARMY" });
    }
    for (let i = 0; i < TOTAL_GUARDS; i++) {
      inv.push({ id: `u${unitCounter++}`, type: "GUARD" });
    }
    inventory[player.id] = inv;
  }

  const reserve: Record<string, number> = {};
  for (const player of sorted) {
    reserve[player.id] = 0;
  }

  // Random turn order
  const randomOrder = shuffle(sorted.map((p) => p.id));

  // Create battle cards deck and deal 5 to each player
  const deck = createDeck();
  const bc: BattleCardState = { deck, hands: {}, discard: [] };
  for (const pid of randomOrder) {
    bc.hands[pid] = drawCards(bc, 5);
  }

  return {
    round: 1,
    currentPlayerIndex: 0,
    phase: "PLACEMENT",
    units,
    battleCards: bc,
    log: ["Игра началась! Расставьте фишки из инвентаря на свои города (по 1 на город)."],
    turnOrder: randomOrder,
    eliminatedPlayers: [],
    reserve,
    inventory,
    cityOwners,
  };
}

export function getCurrentPlayerId(state: VelderanGameState): string {
  return state.turnOrder[state.currentPlayerIndex];
}

export function getPlayerUnits(state: VelderanGameState, playerId: string): GameUnit[] {
  return state.units.filter((u) => u.playerId === playerId);
}

export function placeFromInventory(
  state: VelderanGameState,
  playerId: string,
  cityNodeId: string,
  inventoryUnitId: string,
  playerNames: Record<string, string>
): VelderanGameState {
  const newState = structuredClone(state);
  if (!newState.inventory) newState.inventory = {};
  const inv = newState.inventory[playerId] || [];
  const invIdx = inv.findIndex((u) => u.id === inventoryUnitId);
  if (invIdx < 0) return newState;

  const node = getActiveNodes().find((n) => n.id === cityNodeId);
  if (!node || node.type !== "city") return newState;

  // Can only place on own cities
  if (newState.cityOwners[cityNodeId] !== playerId) return newState;

  const unitsAtNode = newState.units.filter(
    (u) => u.position === cityNodeId && u.playerId === playerId
  );

  // Round 1: max 1 unit per city
  if (newState.round === 1 && unitsAtNode.length >= 1) return newState;
  // Round 2+: max 2 units per city
  if (newState.round > 1 && unitsAtNode.length >= 2) return newState;

  const invUnit = inv[invIdx];
  newState.units.push({
    id: invUnit.id,
    playerId,
    type: invUnit.type,
    position: cityNodeId,
    movesLeft: invUnit.type === "ARMY" ? 2 : 1,
  });
  newState.inventory[playerId] = inv.filter((_, i) => i !== invIdx);

  const playerName = playerNames[playerId] || "Игрок";
  const typeName = invUnit.type === "GUARD" ? "Гвардию" : "Отряд";
  newState.log.push(`${playerName} поставил ${typeName} в ${node.name}.`);

  return newState;
}

/** Undo a placement — move a unit from the map back to inventory */
export function undoPlacement(
  state: VelderanGameState,
  playerId: string,
  unitId: string,
  playerNames: Record<string, string>
): VelderanGameState {
  if (state.phase !== "PLACEMENT") return state;
  const newState = structuredClone(state);
  const unitIdx = newState.units.findIndex(
    (u) => u.id === unitId && u.playerId === playerId
  );
  if (unitIdx < 0) return newState;

  const unit = newState.units[unitIdx];
  if (!newState.inventory) newState.inventory = {};
  if (!newState.inventory[playerId]) newState.inventory[playerId] = [];
  newState.inventory[playerId].push({ id: unit.id, type: unit.type });
  newState.units.splice(unitIdx, 1);

  const playerName = playerNames[playerId] || "Игрок";
  const typeName = unit.type === "GUARD" ? "Гвардию" : "Отряд";
  newState.log.push(`${playerName} убрал ${typeName} обратно в инвентарь.`);

  return newState;
}

/** Legacy placeReserve — now places from inventory */
export function placeReserve(
  state: VelderanGameState,
  playerId: string,
  cityNodeId: string,
  playerNames: Record<string, string>
): VelderanGameState {
  const newState = structuredClone(state);
  if (!newState.inventory) newState.inventory = {};
  const inv = newState.inventory[playerId] || [];

  // Try to place first available army from inventory
  const armyIdx = inv.findIndex((u) => u.type === "ARMY");
  if (armyIdx < 0) {
    // Fallback: use reserve counter (legacy)
    const reserve = newState.reserve[playerId] || 0;
    if (reserve <= 0) return newState;

    const node = getActiveNodes().find((n) => n.id === cityNodeId);
    if (!node || node.type !== "city") return newState;
    if (newState.cityOwners[cityNodeId] !== playerId) return newState;

    const unitsAtNode = newState.units.filter(
      (u) => u.position === cityNodeId && u.playerId === playerId
    );
    if (newState.round === 1 && unitsAtNode.length >= 1) return newState;
    if (newState.round > 1 && unitsAtNode.length >= 2) return newState;

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

  return placeFromInventory(newState, playerId, cityNodeId, inv[armyIdx].id, playerNames);
}

function hasPlaceableUnits(state: VelderanGameState, playerId: string): boolean {
  if (!state.inventory) return (state.reserve[playerId] || 0) > 0;
  const inv = state.inventory[playerId] || [];
  if (inv.length === 0 && (state.reserve[playerId] || 0) === 0) return false;

  // Check if there are any city slots available
  const maxPerCity = state.round === 1 ? 1 : 2;
  const ownCities = Object.entries(state.cityOwners || {})
    .filter(([, owner]) => owner === playerId)
    .map(([nodeId]) => nodeId);

  for (const cityId of ownCities) {
    const unitsAtCity = state.units.filter(
      (u) => u.position === cityId && u.playerId === playerId
    );
    if (unitsAtCity.length < maxPerCity) return true;
  }

  return false;
}

export function finishPlacement(
  state: VelderanGameState,
  playerNames: Record<string, string>
): VelderanGameState {
  const newState = structuredClone(state);

  // Move to next player for placement or move to MOVE phase
  let nextIdx = newState.currentPlayerIndex;
  let allPlaced = true;

  // Check if any subsequent player still has placeable units
  for (let i = 0; i < newState.turnOrder.length; i++) {
    const idx = (newState.currentPlayerIndex + 1 + i) % newState.turnOrder.length;
    const pid = newState.turnOrder[idx];
    if (newState.eliminatedPlayers.includes(pid)) continue;
    if (hasPlaceableUnits(newState, pid)) {
      nextIdx = idx;
      allPlaced = false;
      break;
    }
  }

  const currentId = getCurrentPlayerId(newState);
  if (allPlaced || !hasPlaceableUnits(newState, currentId)) {
    // Check if any active player can still place
    const anyCanPlace = newState.turnOrder.some(
      (pid) => !newState.eliminatedPlayers.includes(pid) && hasPlaceableUnits(newState, pid)
    );
    if (!anyCanPlace) {
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

  // Only guards can enter shrines
  const targetNode = getActiveNodes().find((n) => n.id === targetNodeId);
  if (targetNode?.type === "shrine" && unit.type !== "GUARD") return false;

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

  const fromNode = getActiveNodes().find((n) => n.id === unit.position);
  const toNode = getActiveNodes().find((n) => n.id === targetNodeId);
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
      const node = getActiveNodes().find((n) => n.id === target.position);
      newState.units = newState.units.filter((u) => u.id !== target.id);
      newState.log.push(`Антегриз уничтожил отряд ${targetName} в ${node?.name || ""}!`);
    }
  }

  newState.phase = "MOVE";
  return newState;
}

/** Play a combat card from hand (one side at a time) */
export function playCombatCard(
  state: VelderanGameState,
  playerId: string,
  card: number,
  guess: number,
): VelderanGameState {
  const newState = structuredClone(state);
  if (!newState.combat || !newState.battleCards) return newState;

  const { attackerPlayerId, defenderPlayerId } = newState.combat;
  const isAttacker = playerId === attackerPlayerId;
  const isDefender = playerId === defenderPlayerId;
  if (!isAttacker && !isDefender) return newState;

  // Remove card from hand
  const hand = newState.battleCards.hands[playerId] || [];
  const cardIdx = hand.indexOf(card);
  if (cardIdx < 0) return newState; // card not in hand
  hand.splice(cardIdx, 1);
  newState.battleCards.hands[playerId] = hand;

  if (isAttacker) {
    newState.combat.attackerCard = card;
    newState.combat.attackerGuess = guess;
  } else {
    newState.combat.defenderCard = card;
    newState.combat.defenderGuess = guess;
  }

  // If both have played, resolve
  if (newState.combat.attackerCard != null && newState.combat.defenderCard != null) {
    return resolveCombat(newState);
  }

  return newState;
}

function resolveCombat(
  newState: VelderanGameState,
): VelderanGameState {
  if (!newState.combat) return newState;

  const {
    attackerUnitId, defenderUnitId, attackerPlayerId, defenderPlayerId,
    nodeId, attackerCard, defenderCard, attackerGuess, defenderGuess,
  } = newState.combat;
  if (attackerCard == null || defenderCard == null || attackerGuess == null || defenderGuess == null) return newState;

  const node = getActiveNodes().find((n) => n.id === nodeId);

  // Discard played cards
  if (newState.battleCards) {
    newState.battleCards.discard.push(attackerCard, defenderCard);
  }

  // Exact guess wins
  const attackerGuessedRight = attackerGuess === defenderCard;
  const defenderGuessedRight = defenderGuess === attackerCard;

  let winnerId: string | null = null;
  let loserId: string | null = null;

  if (attackerGuessedRight && !defenderGuessedRight) {
    winnerId = attackerPlayerId;
    loserId = defenderPlayerId;
    newState.log.push(`Атакующий угадал карту ${defenderCard}! Победа.`);
  } else if (defenderGuessedRight && !attackerGuessedRight) {
    winnerId = defenderPlayerId;
    loserId = attackerPlayerId;
    newState.log.push(`Защитник угадал карту ${attackerCard}! Победа.`);
  } else if (attackerGuessedRight && defenderGuessedRight) {
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
      newState.log.push(`Карта ${attackerCard} > ${defenderCard} (±1). Победа атакующего.`);
    } else if (defenderCard > attackerCard && defenderNear) {
      winnerId = defenderPlayerId;
      loserId = attackerPlayerId;
      newState.log.push(`Карта ${defenderCard} > ${attackerCard} (±1). Победа защитника.`);
    } else {
      // Draw — replay (keep combat but reset cards)
      newState.log.push(`Ничья (${attackerCard} vs ${defenderCard}). Переигровка!`);
      newState.combat.attackerCard = undefined;
      newState.combat.defenderCard = undefined;
      newState.combat.attackerGuess = undefined;
      newState.combat.defenderGuess = undefined;
      // Draw replacement cards
      if (newState.battleCards) {
        const atkNew = drawCards(newState.battleCards, 1);
        const defNew = drawCards(newState.battleCards, 1);
        if (atkNew.length > 0) newState.battleCards.hands[attackerPlayerId].push(...atkNew);
        if (defNew.length > 0) newState.battleCards.hands[defenderPlayerId].push(...defNew);
      }
      return newState;
    }
  }

  if (loserId) {
    const loserUnitId = loserId === attackerPlayerId ? attackerUnitId : defenderUnitId;
    const actualWinnerId = loserId === attackerPlayerId ? defenderPlayerId : attackerPlayerId;
    newState.units = newState.units.filter((u) => u.id !== loserUnitId);
    newState.log.push(`Проигравший отряд уничтожен.`);

    // Capture city if attacker won and city belongs to defender
    if (!newState.cityOwners) newState.cityOwners = {};
    if (node?.type === "city" && actualWinnerId === attackerPlayerId) {
      const prevOwner = newState.cityOwners[nodeId];
      if (prevOwner && prevOwner !== actualWinnerId) {
        newState.cityOwners[nodeId] = actualWinnerId;
        newState.log.push(`Город ${node.name} захвачен!`);
      }
    }

    // Check elimination
    const remaining = newState.units.filter((u) => u.playerId === loserId);
    const invRemaining = newState.inventory?.[loserId]?.length || 0;
    if (remaining.length === 0 && invRemaining === 0 && loserId) {
      newState.eliminatedPlayers.push(loserId);
      newState.log.push(`Игрок выбыл из игры!`);
    }
  }

  // Draw replacement cards (each player draws 1 to replace the played card)
  if (newState.battleCards) {
    const atkNew = drawCards(newState.battleCards, 1);
    const defNew = drawCards(newState.battleCards, 1);
    if (atkNew.length > 0) newState.battleCards.hands[attackerPlayerId].push(...atkNew);
    if (defNew.length > 0) newState.battleCards.hands[defenderPlayerId].push(...defNew);
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
    newState.log.push(`Победа! Игра окончена.`);
  }

  return newState;
}

export function endTurn(
  state: VelderanGameState,
  playerNames: Record<string, string>
): VelderanGameState {
  const newState = structuredClone(state);
  // Ensure reserve/cityOwners/inventory exist (backward compat)
  if (!newState.reserve) newState.reserve = {};
  if (!newState.cityOwners) newState.cityOwners = {};
  if (!newState.inventory) newState.inventory = {};

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

    // Reinforcements: +2 armies to inventory per player (per rules: 2 фишки за круг)
    let anyHasReinforcements = false;
    const maxId = newState.units.reduce((max, u) => {
      const num = parseInt(u.id.replace("u", "")) || 0;
      return Math.max(max, num);
    }, 0);
    let nextUnitId = maxId + 1;

    for (const pid of newState.turnOrder) {
      if (newState.eliminatedPlayers.includes(pid)) continue;
      const ownCities = Object.entries(newState.cityOwners).filter(
        ([, owner]) => owner === pid
      );
      if (ownCities.length === 0) continue;
      const reinforcements = 2; // 2 фишки за круг
      if (!newState.inventory[pid]) newState.inventory[pid] = [];
      for (let i = 0; i < reinforcements; i++) {
        newState.inventory[pid].push({ id: `u${nextUnitId++}`, type: "ARMY" });
      }
      anyHasReinforcements = true;
      const pName = playerNames[pid] || "Игрок";
      newState.log.push(`${pName} получил +${reinforcements} отрядов в инвентарь.`);
    }

    newState.log.push(`Раунд ${newState.round}. Расставьте подкрепления.`);

    if (anyHasReinforcements) {
      newState.phase = "PLACEMENT";
    }
  }

  newState.currentPlayerIndex = nextIdx;
  const nextName = playerNames[newState.turnOrder[nextIdx]] || "Игрок";
  newState.log.push(`Ход ${nextName}.`);

  return newState;
}
