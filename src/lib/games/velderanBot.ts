import { VelderanGameState, getCurrentPlayerId, moveUnit, endTurn, placeReserve, finishPlacement, canMoveUnit, rollDiceForGod, resolveCombat } from "./velderanState";
import { getActiveNodes, getNeighbors } from "./velderanMap";

const BOT_USER_PREFIX = "bot-velderan-";

export function isBotPlayer(userId: string): boolean {
  return userId.startsWith(BOT_USER_PREFIX);
}

export function getBotUserId(index: number): string {
  return `${BOT_USER_PREFIX}${index}`;
}

export function getBotEmail(index: number): string {
  return `bot${index}@velderan.local`;
}

export function getBotUsername(index: number): string {
  return `velderan_bot_${index}`;
}

export function getBotName(index: number): string {
  const names = ["Страж", "Воин", "Мудрец", "Рыцарь", "Следопыт", "Берсерк", "Чародей", "Лорд", "Каратель", "Провидец"];
  return `Бот ${names[index % names.length]}`;
}

/**
 * Execute bot turn(s) on the current game state.
 * Returns the new state after the bot has finished its turn(s).
 * May process multiple consecutive bot turns.
 */
export function executeBotTurns(
  state: VelderanGameState,
  playerNames: Record<string, string>,
  botPlayerIds: Set<string>,
  maxIterations = 50
): VelderanGameState {
  let newState = structuredClone(state);
  let iterations = 0;

  while (iterations < maxIterations) {
    iterations++;
    if (newState.phase === "GAME_OVER") break;

    const currentId = getCurrentPlayerId(newState);
    if (!botPlayerIds.has(currentId)) break;

    if (newState.phase === "PLACEMENT") {
      newState = botPlacement(newState, currentId, playerNames);
    } else if (newState.phase === "MOVE") {
      newState = botMove(newState, currentId, playerNames);
    } else if (newState.phase === "COMBAT") {
      newState = botCombat(newState, currentId, playerNames);
    } else if (newState.phase === "GOD_SUMMON") {
      newState = botGodSummon(newState, currentId, playerNames);
    } else {
      break;
    }
  }

  return newState;
}

function botPlacement(
  state: VelderanGameState,
  botId: string,
  playerNames: Record<string, string>
): VelderanGameState {
  let newState = structuredClone(state);
  const reserve = newState.reserve[botId] || 0;

  if (reserve <= 0) {
    return finishPlacement(newState, playerNames);
  }

  // Find own cities to place reserves
  const ownCities = Object.entries(newState.cityOwners)
    .filter(([, owner]) => owner === botId)
    .map(([nodeId]) => nodeId);

  for (const cityId of ownCities) {
    if ((newState.reserve[botId] || 0) <= 0) break;
    const unitsAtCity = newState.units.filter(
      (u) => u.position === cityId && u.playerId === botId
    );
    if (unitsAtCity.length < 2) {
      newState = placeReserve(newState, botId, cityId, playerNames);
    }
  }

  return finishPlacement(newState, playerNames);
}

function botMove(
  state: VelderanGameState,
  botId: string,
  playerNames: Record<string, string>
): VelderanGameState {
  let newState = structuredClone(state);

  // Get bot's units with moves left
  const myUnits = newState.units.filter(
    (u) => u.playerId === botId && u.movesLeft > 0
  );

  for (const unit of myUnits) {
    if (newState.phase !== "MOVE") break;
    if (getCurrentPlayerId(newState) !== botId) break;

    const neighbors = getNeighbors(unit.position);
    if (neighbors.length === 0) continue;

    // Priority: capture undefended enemy cities > move toward enemy > random
    const targetPriorities: { nodeId: string; priority: number }[] = [];

    for (const neighborId of neighbors) {
      if (!canMoveUnit(newState, unit.id, neighborId)) continue;

      const node = getActiveNodes().find((n) => n.id === neighborId);
      if (!node) continue;

      let priority = 1; // base

      // Enemy city → highest priority
      if (node.type === "city") {
        const owner = newState.cityOwners[neighborId];
        if (owner && owner !== botId) {
          const defenders = newState.units.filter(
            (u) => u.position === neighborId && u.playerId !== botId
          );
          priority = defenders.length === 0 ? 10 : 5;
        } else if (!owner) {
          priority = 8;
        }
      }

      // Shrine → medium priority for guards
      if (node.type === "shrine" && unit.type === "GUARD") {
        priority = 6;
      }

      // Avoid nodes with friendly units already (max 2)
      const friendlyAtNode = newState.units.filter(
        (u) => u.position === neighborId && u.playerId === botId
      );
      if (friendlyAtNode.length >= 2) continue;

      targetPriorities.push({ nodeId: neighborId, priority });
    }

    if (targetPriorities.length === 0) continue;

    // Sort by priority descending, pick best (with some randomness)
    targetPriorities.sort((a, b) => b.priority - a.priority);
    const best = targetPriorities[0];
    
    // Refresh unit reference after potential state changes
    const currentUnit = newState.units.find((u) => u.id === unit.id);
    if (!currentUnit || currentUnit.movesLeft <= 0) continue;
    if (getCurrentPlayerId(newState) !== botId) break;
    if (newState.phase !== "MOVE") break;

    newState = moveUnit(newState, unit.id, best.nodeId, playerNames);

    // If combat started, handle it
    if (newState.phase === "COMBAT") {
      newState = botCombat(newState, botId, playerNames);
    }
  }

  // End turn if still in MOVE phase
  if (newState.phase === "MOVE" && getCurrentPlayerId(newState) === botId) {
    newState = endTurn(newState, playerNames);
  }

  return newState;
}

function botCombat(
  state: VelderanGameState,
  botId: string,
  playerNames: Record<string, string>
): VelderanGameState {
  let newState = structuredClone(state);
  if (!newState.combat) return newState;

  const combat = newState.combat;
  const isAttacker = combat.attackerPlayerId === botId;
  const isDefender = combat.defenderPlayerId === botId;

  if (!isAttacker && !isDefender) return newState;

  // Bot picks random card and guess
  const card = Math.floor(Math.random() * 5) + 1;
  const guess = Math.floor(Math.random() * 5) + 1;

  if (isAttacker && !combat.attackerCard) {
    newState.combat!.attackerCard = card;
    newState.combat!.attackerGuess = guess;
  }
  if (isDefender && !combat.defenderCard) {
    newState.combat!.defenderCard = card;
    newState.combat!.defenderGuess = guess;
  }

  // If both sides have played, resolve
  if (newState.combat!.attackerCard && newState.combat!.defenderCard) {
    newState = resolveCombat(
      newState,
      newState.combat!.attackerCard,
      newState.combat!.attackerGuess!,
      newState.combat!.defenderCard,
      newState.combat!.defenderGuess!,
      playerNames
    );
  }

  return newState;
}

function botGodSummon(
  state: VelderanGameState,
  botId: string,
  playerNames: Record<string, string>
): VelderanGameState {
  const guard = state.units.find(
    (u) => u.playerId === botId && u.type === "GUARD"
  );
  const shrineId = guard?.position || "";
  return rollDiceForGod(state, botId, shrineId, playerNames);
}
