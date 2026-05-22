import { FACTIONS } from "./factions";
import { EDGES, NODES, NODES_BY_ID, citiesOfFaction, getNeighbors, isDiceGateNode } from "./map";
import type {
  BattleCard,
  FactionId,
  GameState,
  GodCard,
  GodCardId,
  LogEntry,
  Phase,
  Player,
  Unit,
} from "./types";

/* ───────────────────────── Утилиты ───────────────────────── */

const uid = (() => {
  let n = 1;
  return (p: string) => `${p}-${(n++).toString(36)}`;
})();

const now = () => Date.now();

function pushLog(state: GameState, text: string): GameState {
  const entry: LogEntry = { id: uid("log"), text, ts: now() };
  return { ...state, log: [...state.log, entry].slice(-200) };
}

function rollD6(): number {
  return 1 + Math.floor(Math.random() * 6);
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function makeBattleDeck(): BattleCard[] {
  const cards: BattleCard[] = [];
  // 8 копий каждого номинала = 40 карт
  for (let v = 1; v <= 5; v++) {
    for (let i = 0; i < 8; i++) {
      cards.push({ id: uid("c"), value: v as 1 | 2 | 3 | 4 | 5 });
    }
  }
  return shuffle(cards);
}

function drawCards(state: GameState, n: number): { cards: BattleCard[]; state: GameState } {
  let deck = state.battleDeck;
  let discard = state.battleDiscard;
  const out: BattleCard[] = [];
  for (let i = 0; i < n; i++) {
    if (deck.length === 0) {
      deck = shuffle(discard);
      discard = [];
    }
    const c = deck[0];
    if (!c) break;
    deck = deck.slice(1);
    out.push(c);
  }
  return { cards: out, state: { ...state, battleDeck: deck, battleDiscard: discard } };
}

function discardCards(state: GameState, cards: BattleCard[]): GameState {
  return { ...state, battleDiscard: [...state.battleDiscard, ...cards] };
}

function updatePlayer(state: GameState, playerId: string, patch: Partial<Player>): GameState {
  return {
    ...state,
    players: state.players.map((p) => (p.id === playerId ? { ...p, ...patch } : p)),
  };
}

function updateUnit(state: GameState, unitId: string, patch: Partial<Unit>): GameState {
  return {
    ...state,
    units: state.units.map((u) => (u.id === unitId ? { ...u, ...patch } : u)),
  };
}

function removeUnit(state: GameState, unitId: string): GameState {
  return { ...state, units: state.units.filter((u) => u.id !== unitId) };
}

function unitsOnNode(state: GameState, nodeId: string): Unit[] {
  return state.units.filter((u) => u.nodeId === nodeId);
}

function unitsOnNodeByFaction(state: GameState, nodeId: string, faction: FactionId): Unit[] {
  return state.units.filter((u) => u.nodeId === nodeId && u.faction === faction);
}

function findPlayerByFaction(state: GameState, faction: FactionId): Player | undefined {
  return state.players.find((p) => p.faction === faction);
}

function currentPlayer(state: GameState): Player | undefined {
  return state.players[state.currentPlayerIdx];
}

/* ───────────────────────── Инициализация ───────────────────────── */

export interface InitInput {
  players: { id: string; name: string; faction: FactionId }[];
}

export function createInitialState(input: InitInput): GameState {
  const players: Player[] = input.players.map((p) => ({
    id: p.id,
    name: p.name,
    faction: p.faction,
    reserveSquads: 4,
    reserveGuards: 2,
    hand: [],
    godCards: [],
    ghostCharges: 0,
    skipNextTurn: false,
    alive: true,
  }));

  const baseState: GameState = {
    phase: "setup",
    players,
    currentPlayerIdx: 0,
    round: 0,
    units: [],
    battleDeck: makeBattleDeck(),
    battleDiscard: [],
    pending: { kind: "none" },
    log: [],
    control: {},
    smugglerInTransit: [],
  };

  // Расставляем по 1 отряду на каждый стартовый город фракции, плюс 1 гвардию
  // в первом городе фракции.
  let state = baseState;
  for (const player of players) {
    const cities = citiesOfFaction(player.faction);
    cities.forEach((city, idx) => {
      const u: Unit = {
        id: uid("u"),
        faction: player.faction,
        kind: idx === 0 ? "guard" : "squad",
        nodeId: city.id,
        movesLeft: idx === 0 ? 1 : 2,
        sanctuaryUses: 0,
        specialUses: 0,
      };
      state = { ...state, units: [...state.units, u] };
    });
  }

  // Раздать каждому 5 боевых карт
  for (const player of players) {
    const { cards, state: nx } = drawCards(state, 5);
    state = nx;
    state = updatePlayer(state, player.id, { hand: cards });
  }

  state = pushLog(state, `Партия начата: ${players.length} игроков.`);
  state.phase = "round-start";
  state.round = 1;
  // Сразу выполняем стартовый раунд (без реинфорсов, т.к. в startRound он
  // выставит только если есть незанятые свободные города и резерв > 0).
  state = startRound(state);
  return state;
}

/* ───────────────────────── Доступные действия ───────────────────────── */

export type Action =
  | { type: "start-round" }
  | { type: "move-unit"; unitId: string; toNodeId: string }
  | { type: "confirm-dice-move"; result: number }
  | { type: "submit-combat-card"; playerId: string; cardId: string; guess: number }
  | { type: "resolve-combat" }
  | { type: "play-prebuff"; playerId: string; god: GodCardId }
  | { type: "roll-sanctuary"; unitId: string }
  | { type: "apply-god"; chosenRoll?: number; targetNodeId?: string; targetUnitId?: string; targetPlayerId?: string }
  | { type: "use-special"; unitId: string; targetUnitId: string; targetNodeId?: string }
  | { type: "use-smuggler"; unitId: string; toNodeId: string }
  | { type: "use-god-card"; playerId: string; cardId: string; targetNodeId?: string; targetUnitId?: string; targetPlayerId?: string }
  | { type: "skip-unit"; unitId: string }
  | { type: "end-turn" };

/* ───────────────────────── Геймплей ───────────────────────── */

export function applyAction(state: GameState, action: Action): GameState {
  if (state.phase === "ended") return state;
  switch (action.type) {
    case "start-round":
      return startRound(state);
    case "move-unit":
      return moveUnit(state, action.unitId, action.toNodeId);
    case "confirm-dice-move":
      return confirmDiceMove(state, action.result);
    case "submit-combat-card":
      return submitCombatCard(state, action.playerId, action.cardId, action.guess);
    case "resolve-combat":
      return resolveCombat(state);
    case "play-prebuff":
      return playPrebuff(state, action.playerId, action.god);
    case "roll-sanctuary":
      return rollSanctuary(state, action.unitId);
    case "apply-god":
      return applyGod(state, action);
    case "use-special":
      return doSpecial(state, action.unitId, action.targetUnitId);
    case "use-smuggler":
      return doSmuggler(state, action.unitId, action.toNodeId);
    case "use-god-card":
      return doGodCard(state, action);
    case "skip-unit":
      return skipUnit(state, action.unitId);
    case "end-turn":
      return endTurn(state);
    default:
      return state;
  }
}

/* ───────────────────────── Раунд / резерв ───────────────────────── */

function startRound(state: GameState): GameState {
  if (state.phase !== "round-start") return state;
  let next = state;

  // Каждому игроку — до 2 фишек в свои незахваченные города.
  for (const player of next.players) {
    let toPlace = 2;
    if (player.reserveSquads <= 0) continue;
    const cities = citiesOfFaction(player.faction);
    for (const city of cities) {
      if (toPlace <= 0) break;
      const occupants = unitsOnNode(next, city.id);
      const enemyHere = occupants.some((u) => u.faction !== player.faction);
      const ownCount = occupants.filter((u) => u.faction === player.faction).length;
      if (enemyHere) continue;
      if (ownCount >= 2) continue;
      const u: Unit = {
        id: uid("u"),
        faction: player.faction,
        kind: "squad",
        nodeId: city.id,
        movesLeft: 2,
        sanctuaryUses: 0,
        specialUses: 0,
      };
      next = { ...next, units: [...next.units, u] };
      next = updatePlayer(next, player.id, {
        reserveSquads: Math.max(0, (next.players.find((pp) => pp.id === player.id)?.reserveSquads ?? 0) - 1),
      });
      toPlace--;
    }
  }

  // Все фишки восстанавливают ходы
  next = {
    ...next,
    units: next.units.map((u) => ({
      ...u,
      movesLeft: u.kind === "guard" ? 1 : 2,
      specialUses: 0,
    })),
  };

  // Возвращаем контрабандистов
  const arrivedNow: typeof next.smugglerInTransit = [];
  const pending: typeof next.smugglerInTransit = [];
  for (const t of next.smugglerInTransit) {
    if (t.arrivesRound <= next.round) arrivedNow.push(t);
    else pending.push(t);
  }
  next = { ...next, smugglerInTransit: pending };
  for (const t of arrivedNow) {
    const unit = next.units.find((u) => u.id === t.unitId);
    if (unit) {
      next = updateUnit(next, unit.id, { nodeId: t.toNodeId });
      const port = NODES_BY_ID[t.toNodeId];
      next = pushLog(next, `${factionName(unit.faction)} высаживает отряд в порту «${port?.name ?? "?"}» через Логово.`);
    }
  }

  next.phase = "turn";
  next.currentPlayerIdx = findFirstAlivePlayerIdx(next, 0);
  next = pushLog(next, `Начался круг ${next.round}. Ход: ${currentPlayer(next)?.name}.`);
  next = handleSkipTurn(next);
  return next;
}

function findFirstAlivePlayerIdx(state: GameState, from: number): number {
  for (let i = 0; i < state.players.length; i++) {
    const idx = (from + i) % state.players.length;
    if (state.players[idx]?.alive) return idx;
  }
  return 0;
}

function handleSkipTurn(state: GameState): GameState {
  const cp = currentPlayer(state);
  if (!cp) return state;
  if (cp.skipNextTurn) {
    let next = updatePlayer(state, cp.id, { skipNextTurn: false });
    next = pushLog(next, `${cp.name} пропускает ход (Ситас).`);
    return endTurn(next);
  }
  return state;
}

/* ───────────────────────── Движение ───────────────────────── */

function canMove(state: GameState, unit: Unit, toNodeId: string): { ok: boolean; reason?: string } {
  if (unit.movesLeft <= 0) return { ok: false, reason: "Нет ходов" };
  if (!unit.nodeId) return { ok: false, reason: "Фишка не на карте" };
  const neighbors = getNeighbors(unit.nodeId);
  if (!neighbors.some((n) => n.nodeId === toNodeId)) {
    // проверим Суббгаров: «полёт» между своими городами или Шейбанидами
    const fac = FACTIONS[unit.faction];
    if (fac.canFly) {
      const target = NODES_BY_ID[toNodeId];
      if (
        target &&
        ((target.kind === "city" && target.faction === unit.faction) ||
          target.kind === "sheybanid-camp")
      ) {
        return { ok: true };
      }
    }
    return { ok: false, reason: "Нет связи" };
  }
  // Проверяем лимит 2 фишек игрока на узле
  const target = NODES_BY_ID[toNodeId];
  if (!target) return { ok: false, reason: "Нет узла" };
  const own = unitsOnNodeByFaction(state, toNodeId, unit.faction).length;
  if (own >= 2) return { ok: false, reason: "На узле уже 2 ваши фишки" };
  return { ok: true };
}

function moveUnit(state: GameState, unitId: string, toNodeId: string): GameState {
  const unit = state.units.find((u) => u.id === unitId);
  if (!unit) return state;
  const verdict = canMove(state, unit, toNodeId);
  if (!verdict.ok) return pushLog(state, `Нельзя двигаться: ${verdict.reason}`);
  const target = NODES_BY_ID[toNodeId];
  if (!target) return state;

  const gate = isDiceGateNode(target);
  if (gate) {
    return {
      ...state,
      pending: {
        kind: "dice-move",
        unitId,
        from: unit.nodeId ?? "",
        to: toNodeId,
        needed: gate,
      },
      phase: "dice",
    };
  }

  return doMove(state, unitId, toNodeId);
}

function doMove(state: GameState, unitId: string, toNodeId: string): GameState {
  const unit = state.units.find((u) => u.id === unitId);
  if (!unit) return state;

  // Если на узле есть вражеский отряд — стартует бой.
  const occupants = state.units.filter((u) => u.nodeId === toNodeId);
  const enemy = occupants.find((u) => u.faction !== unit.faction);
  if (enemy) {
    let nx = updateUnit(state, unitId, { nodeId: toNodeId, movesLeft: unit.movesLeft - 1 });
    nx = {
      ...nx,
      pending: {
        kind: "combat",
        attackerUnitId: unitId,
        defenderUnitId: enemy.id,
        nodeId: toNodeId,
        attackerSource: "normal",
        defenderSource: "normal",
      },
      phase: "combat",
    };
    nx = pushLog(nx, `Сражение на «${NODES_BY_ID[toNodeId]?.name}»: ${factionName(unit.faction)} атакует ${factionName(enemy.faction)}.`);
    return nx;
  }

  let nx = updateUnit(state, unitId, {
    nodeId: toNodeId,
    movesLeft: unit.movesLeft - 1,
    sanctuaryUses: 0,
  });
  nx = updateControlOnEnter(nx, unitId, toNodeId);
  nx = pushLog(nx, `${factionName(unit.faction)} занимает «${NODES_BY_ID[toNodeId]?.name}».`);
  return nx;
}

function updateControlOnEnter(state: GameState, unitId: string, nodeId: string): GameState {
  const unit = state.units.find((u) => u.id === unitId);
  if (!unit) return state;
  const node = NODES_BY_ID[nodeId];
  if (!node) return state;
  const ctrl = { ...state.control };
  const player = findPlayerByFaction(state, unit.faction);
  let next = state;

  if (node.kind === "pirate-cove") ctrl.pirateCove = unit.faction;
  if (node.kind === "smuggler-lair") ctrl.smugglerLair = unit.faction;
  if (node.kind === "ghost-temple") {
    ctrl.ghostTemple = unit.faction;
    if (player) {
      next = updatePlayer(next, player.id, { ghostCharges: 2 });
    }
  }
  if (node.kind === "sheybanid-camp") ctrl.sheybanidCamp = unit.faction;

  next = { ...next, control: ctrl };
  return next;
}

function confirmDiceMove(state: GameState, result: number): GameState {
  if (state.pending.kind !== "dice-move") return state;
  const { unitId, from, to, needed } = state.pending;
  const ok = needed === "even" ? result % 2 === 0 : result % 2 === 1;
  let next: GameState = { ...state, lastDice: result, pending: { kind: "none" }, phase: "turn" };
  if (ok) {
    next = pushLog(next, `Кубики: ${result} ✓ — проход разрешён.`);
    return doMove(next, unitId, to);
  }
  next = pushLog(next, `Кубики: ${result} ✗ — отряд возвращается на «${NODES_BY_ID[from]?.name}».`);
  // ход тратится в любом случае
  const unit = next.units.find((u) => u.id === unitId);
  if (unit) {
    next = updateUnit(next, unitId, { movesLeft: Math.max(0, unit.movesLeft - 1) });
  }
  return next;
}

/* ───────────────────────── Бой ───────────────────────── */

function submitCombatCard(
  state: GameState,
  playerId: string,
  cardId: string,
  guess: number,
): GameState {
  if (state.pending.kind !== "combat") return state;
  const pending = state.pending;
  const attacker = state.units.find((u) => u.id === pending.attackerUnitId);
  const defender = state.units.find((u) => u.id === pending.defenderUnitId);
  if (!attacker || !defender) return state;
  const attackerPlayer = findPlayerByFaction(state, attacker.faction);
  const defenderPlayer = findPlayerByFaction(state, defender.faction);
  if (!attackerPlayer || !defenderPlayer) return state;

  const isAttacker = playerId === attackerPlayer.id;
  const isDefender = playerId === defenderPlayer.id;
  if (!isAttacker && !isDefender) return state;

  // Для особых источников берём карту сверху колоды
  const source = isAttacker ? pending.attackerSource : pending.defenderSource;
  let card: BattleCard | undefined;
  let next = state;

  if (source === "normal") {
    const player = isAttacker ? attackerPlayer : defenderPlayer;
    card = player.hand.find((c) => c.id === cardId);
    if (!card) return state;
    next = updatePlayer(next, player.id, {
      hand: player.hand.filter((c) => c.id !== cardId),
    });
  } else {
    const drawn = drawCards(next, 1);
    next = drawn.state;
    card = drawn.cards[0];
    if (!card) return state;
  }

  const patch: Partial<typeof pending> = {};
  if (isAttacker) {
    patch.attackerCard = card;
    patch.attackerGuess = guess;
  } else {
    patch.defenderCard = card;
    patch.defenderGuess = guess;
  }
  next = {
    ...next,
    pending: { ...pending, ...patch },
  };
  return next;
}

function playPrebuff(state: GameState, playerId: string, god: GodCardId): GameState {
  if (state.pending.kind !== "combat") return state;
  const pending = state.pending;
  if (god !== "shentar" && god !== "giordg") return state;
  const player = state.players.find((p) => p.id === playerId);
  if (!player) return state;
  const card = player.godCards.find((c) => c.god === god);
  if (!card) return state;

  const attacker = state.units.find((u) => u.id === pending.attackerUnitId);
  if (!attacker) return state;
  const attackerPlayer = findPlayerByFaction(state, attacker.faction);
  const isAttacker = attackerPlayer?.id === player.id;

  let next = updatePlayer(state, player.id, {
    godCards: player.godCards.filter((c) => c.id !== card.id),
  });
  next = {
    ...next,
    pending: {
      ...pending,
      [isAttacker ? "attackerPrebuff" : "defenderPrebuff"]: god,
    },
  };
  next = pushLog(next, `${player.name} разыгрывает карту ${godRu(god)} перед боем.`);
  return next;
}

function godRu(g: GodCardId): string {
  switch (g) {
    case "avalais": return "Авалайс";
    case "sitas": return "Ситас";
    case "shentar": return "Шент’Ар";
    case "giordg": return "Гиордг";
    case "vyeronkh": return "Вьеронх";
  }
}

function resolveCombat(state: GameState): GameState {
  if (state.pending.kind !== "combat") return state;
  const p = state.pending;
  if (!p.attackerCard || !p.defenderCard) return state;
  const aValue = p.attackerCard.value;
  const dValue = p.defenderCard.value;
  const aGuess = p.attackerGuess ?? 0;
  const dGuess = p.defenderGuess ?? 0;

  const attackerGuessedExact = aGuess === dValue;
  const defenderGuessedExact = dGuess === aValue;

  let winner: "attacker" | "defender" | null = null;

  if (attackerGuessedExact && !defenderGuessedExact) winner = "attacker";
  else if (defenderGuessedExact && !attackerGuessedExact) winner = "defender";
  else if (!attackerGuessedExact && !defenderGuessedExact) {
    // По правилу: тот, чей номинал больше, побеждает,
    // если номинал противника в диапазоне ±1 от названного.
    const aClose = Math.abs(aGuess - dValue) <= 1;
    const dClose = Math.abs(dGuess - aValue) <= 1;
    if (aValue > dValue && aClose) winner = "attacker";
    else if (dValue > aValue && dClose) winner = "defender";
    else if (aValue === dValue) winner = null;
    else winner = null;
  }

  // карты в бито
  let next = discardCards(state, [p.attackerCard, p.defenderCard]);

  // добор по 1 карте для обычных
  if (p.attackerSource === "normal") {
    const aPlayer = findPlayerByFaction(next, next.units.find((u) => u.id === p.attackerUnitId)?.faction ?? "empire");
    if (aPlayer) {
      const drawn = drawCards(next, 1);
      next = drawn.state;
      next = updatePlayer(next, aPlayer.id, { hand: [...aPlayer.hand, ...drawn.cards] });
    }
  }
  if (p.defenderSource === "normal") {
    const dPlayer = findPlayerByFaction(next, next.units.find((u) => u.id === p.defenderUnitId)?.faction ?? "empire");
    if (dPlayer) {
      const drawn = drawCards(next, 1);
      next = drawn.state;
      next = updatePlayer(next, dPlayer.id, { hand: [...dPlayer.hand, ...drawn.cards] });
    }
  }

  const attackerUnit = next.units.find((u) => u.id === p.attackerUnitId);
  const defenderUnit = next.units.find((u) => u.id === p.defenderUnitId);

  if (winner === null) {
    // Ничья — переигрываем
    next = {
      ...next,
      pending: {
        kind: "combat",
        attackerUnitId: p.attackerUnitId,
        defenderUnitId: p.defenderUnitId,
        nodeId: p.nodeId,
        attackerSource: p.attackerSource,
        defenderSource: p.defenderSource,
      },
    };
    next = pushLog(next, `Бой завершился ничьёй (${aValue} vs ${dValue}, угадано: ${aGuess}/${dGuess}). Переигрываем.`);
    return next;
  }

  // Гиордг: проигравший игрок может сжечь карту и переиграть бой
  const loserUnit = winner === "attacker" ? defenderUnit : attackerUnit;
  const loserPrebuff = winner === "attacker" ? p.defenderPrebuff : p.attackerPrebuff;
  if (loserPrebuff === "giordg") {
    next = {
      ...next,
      pending: {
        kind: "combat",
        attackerUnitId: p.attackerUnitId,
        defenderUnitId: p.defenderUnitId,
        nodeId: p.nodeId,
        attackerSource: p.attackerSource,
        defenderSource: p.defenderSource,
      },
    };
    next = pushLog(next, `Гиордг защитил проигравшего — бой переигрывается.`);
    return next;
  }

  const winnerUnit = winner === "attacker" ? attackerUnit : defenderUnit;
  const winnerPrebuff = winner === "attacker" ? p.attackerPrebuff : p.defenderPrebuff;
  if (!winnerUnit || !loserUnit) return next;

  // Шент’Ар: победитель захватывает отряд проигравшего (если разыграл)
  if (winnerPrebuff === "shentar" && loserUnit.kind === "squad") {
    next = updateUnit(next, loserUnit.id, { faction: winnerUnit.faction });
    next = pushLog(next, `Шент’Ар обратил отряд ${factionName(loserUnit.faction)} в союзный для ${factionName(winnerUnit.faction)}!`);
  } else {
    // Если проигравший — особый «расходник» (pirate/ghost/sheybanid), фишка не теряется
    const loserSource = winner === "attacker" ? p.defenderSource : p.attackerSource;
    if (loserSource === "normal") {
      // Особые правила: при проигрыше с пиратами/призраками/Шейбанидами свою фишку не теряешь.
      // Сейчас loserSource=normal — значит это была фишка на карте, она удаляется.
      // Но если winnerSource=pirate/ghost/sheybanid — победитель «помогает», свою фишку не теряет,
      // а вражеская удаляется.
      next = removeUnit(next, loserUnit.id);
      next = pushLog(next, `${factionName(loserUnit.faction)} теряет фишку.`);
    } else {
      next = pushLog(next, `${factionName(loserUnit.faction)} проиграл бой с особым отрядом, но фишка цела.`);
    }
  }

  // Атакующий выиграл и был расходником — он не остаётся на узле
  const winnerSource = winner === "attacker" ? p.attackerSource : p.defenderSource;
  if (winnerSource !== "normal") {
    // Например, пиратская атака — атакующая фишка остаётся в бухте.
    // А «фактический атакующий unit» — это владельческая фишка особого узла. Она не двигается.
    // attackerUnitId в этом случае указывает на ту же фишку владельца локации — мы не трогаем её nodeId.
  } else if (winner === "attacker" && attackerUnit) {
    // Если атакующий выиграл, он остаётся на узле
    next = updateControlOnEnter(next, attackerUnit.id, p.nodeId);
  } else if (winner === "defender" && attackerUnit && attackerUnit.nodeId === p.nodeId) {
    // Защитник победил — атакующая фишка уже удалена выше (если loserSource=normal)
  }

  // Призрак: после исчерпания зарядов фишка в храме погибает
  if (p.attackerSource === "ghost" || p.defenderSource === "ghost") {
    const ghostFaction = p.attackerSource === "ghost" ? attackerUnit?.faction : defenderUnit?.faction;
    if (ghostFaction) {
      const player = findPlayerByFaction(next, ghostFaction);
      if (player) {
        const newCharges = Math.max(0, player.ghostCharges - 1);
        next = updatePlayer(next, player.id, { ghostCharges: newCharges });
        if (newCharges === 0) {
          // Найти фишку в храме и убить её
          const ghostUnit = next.units.find(
            (u) => u.faction === ghostFaction && NODES_BY_ID[u.nodeId ?? ""]?.kind === "ghost-temple",
          );
          if (ghostUnit) {
            next = removeUnit(next, ghostUnit.id);
            next = pushLog(next, `Дань Смерти: фишка ${player.name} в Призрачном Храме погибла.`);
          }
        }
      }
    }
  }

  // Учёт использований особых атак
  if (p.attackerSource === "pirate" || p.attackerSource === "sheybanid") {
    if (attackerUnit) {
      next = updateUnit(next, attackerUnit.id, { specialUses: attackerUnit.specialUses + 1 });
    }
  }

  next = { ...next, pending: { kind: "none" }, phase: "turn" };
  next = checkVictory(next);
  return next;
}

/* ───────────────────────── Святилища ───────────────────────── */

function rollSanctuary(state: GameState, unitId: string): GameState {
  const unit = state.units.find((u) => u.id === unitId);
  if (!unit) return state;
  if (unit.kind !== "guard") return pushLog(state, "Только Гвардия может призывать богов.");
  const node = NODES_BY_ID[unit.nodeId ?? ""];
  if (!node || node.kind !== "sanctuary") return state;
  if (unit.sanctuaryUses >= 2) return pushLog(state, "Это святилище исчерпано для этой Гвардии.");

  const d1 = rollD6();
  const d2 = rollD6();
  const total = d1 + d2;
  let next = pushLog(state, `Бросок кубиков: ${d1}+${d2}=${total}.`);
  next = updateUnit(next, unitId, { sanctuaryUses: unit.sanctuaryUses + 1 });
  next = {
    ...next,
    lastDice: total,
    phase: "sanctuary",
    pending: { kind: "sanctuary", unitId, nodeId: unit.nodeId ?? "", diceResult: total },
  };
  return next;
}

function applyGod(state: GameState, action: { type: "apply-god"; chosenRoll?: number; targetNodeId?: string; targetUnitId?: string; targetPlayerId?: string }): GameState {
  if (state.pending.kind !== "sanctuary") return state;
  const { unitId, nodeId } = state.pending;
  let total = state.pending.diceResult ?? 0;
  if (total === 12 && action.chosenRoll) total = action.chosenRoll;
  const unit = state.units.find((u) => u.id === unitId);
  if (!unit) return state;
  const player = findPlayerByFaction(state, unit.faction);
  if (!player) return state;
  let next = state;

  switch (total) {
    case 2: // Джалайна — воскрешает любой отряд игрока
      if (action.targetNodeId) {
        const u: Unit = {
          id: uid("u"),
          faction: unit.faction,
          kind: "squad",
          nodeId: action.targetNodeId,
          movesLeft: 0,
          sanctuaryUses: 0,
          specialUses: 0,
        };
        next = { ...next, units: [...next.units, u] };
        next = pushLog(next, `Джалайна воскрешает отряд ${factionName(unit.faction)} на «${NODES_BY_ID[action.targetNodeId]?.name}».`);
      }
      break;
    case 3: // Авалайс — карта
      next = giveGodCard(next, player.id, "avalais");
      break;
    case 4: // Стратос — уничтожает свою гвардию
      next = removeUnit(next, unitId);
      next = pushLog(next, `Стратос уничтожил Гвардию ${factionName(unit.faction)} на святилище.`);
      break;
    case 5: // Ситас — карта
      next = giveGodCard(next, player.id, "sitas");
      break;
    case 6: // Шент’Ар — 2 карты
      next = giveGodCard(next, player.id, "shentar");
      next = giveGodCard(next, player.id, "shentar");
      break;
    case 7: // Гиордг — 2 карты
      next = giveGodCard(next, player.id, "giordg");
      next = giveGodCard(next, player.id, "giordg");
      break;
    case 8: // Сихварис — перенести свой отряд
      if (action.targetUnitId && action.targetNodeId) {
        const target = next.units.find((u) => u.id === action.targetUnitId);
        if (target && target.faction === unit.faction) {
          next = updateUnit(next, target.id, { nodeId: action.targetNodeId });
          next = pushLog(next, `Сихварис перенёс ${target.kind === "guard" ? "Гвардию" : "отряд"} на «${NODES_BY_ID[action.targetNodeId]?.name}».`);
        }
      }
      break;
    case 9: // Вьеронх — карта
      next = giveGodCard(next, player.id, "vyeronkh");
      break;
    case 10: // Ангелона — призывает 2 вражеских отряда
      // Простейшая реализация: переносим до 2 ближайших чужих отрядов (по очереди targets)
      if (action.targetUnitId) {
        const enemy = next.units.find((u) => u.id === action.targetUnitId);
        if (enemy && enemy.faction !== unit.faction) {
          next = updateUnit(next, enemy.id, { nodeId });
          next = pushLog(next, `Ангелона призвала отряд ${factionName(enemy.faction)} к святилищу.`);
        }
      }
      break;
    case 11: // Антегриз — уничтожает вражеский отряд на суше
      if (action.targetUnitId) {
        const target = next.units.find((u) => u.id === action.targetUnitId);
        if (target && target.faction !== unit.faction) {
          const tNode = NODES_BY_ID[target.nodeId ?? ""];
          if (tNode && tNode.kind !== "sea" && tNode.kind !== "port") {
            next = removeUnit(next, target.id);
            next = pushLog(next, `Антегриз испепелил отряд ${factionName(target.faction)} на «${tNode.name}».`);
          }
        }
      }
      break;
    case 12: // Выбор любого
      // chosenRoll был обработан выше — total уже заменён
      break;
  }

  next = { ...next, phase: "turn", pending: { kind: "none" } };
  next = checkVictory(next);
  return next;
}

function giveGodCard(state: GameState, playerId: string, god: GodCardId): GameState {
  const player = state.players.find((p) => p.id === playerId);
  if (!player) return state;
  const card: GodCard = { id: uid("gc"), god };
  return updatePlayer(state, playerId, { godCards: [...player.godCards, card] });
}

/* ───────────────────────── Особые атаки (пираты/призраки/Шейбаниды) ───────────────────────── */

function doSpecial(
  state: GameState,
  unitId: string,
  targetUnitId: string,
): GameState {
  const unit = state.units.find((u) => u.id === unitId);
  const target = state.units.find((u) => u.id === targetUnitId);
  if (!unit || !target) return state;
  if (unit.faction === target.faction) return pushLog(state, "Нельзя атаковать свой отряд.");

  const node = NODES_BY_ID[unit.nodeId ?? ""];
  if (!node) return state;

  let source: "pirate" | "ghost" | "sheybanid" | null = null;
  const attackerLimit = 2;
  let canAttackHere = false;

  const targetNode = NODES_BY_ID[target.nodeId ?? ""];
  if (!targetNode) return state;

  if (node.kind === "pirate-cove") {
    source = "pirate";
    // пираты могут атаковать на морских путях/портах
    canAttackHere = targetNode.kind === "sea" || targetNode.kind === "port" || targetNode.kind === "pirate-cove";
  } else if (node.kind === "ghost-temple") {
    source = "ghost";
    canAttackHere = targetNode.kind !== "sanctuary";
  } else if (node.kind === "sheybanid-camp") {
    source = "sheybanid";
    // Шейбаниды атакуют на суше
    canAttackHere =
      targetNode.kind !== "sea" &&
      targetNode.kind !== "port" &&
      targetNode.kind !== "sanctuary";
  }

  if (!source) return pushLog(state, "Эта фишка не на особой локации.");
  if (!canAttackHere) return pushLog(state, "Цель недоступна для этой особой атаки.");
  if (unit.specialUses >= attackerLimit) return pushLog(state, "Лимит особых атак исчерпан.");
  if (source === "ghost") {
    const player = findPlayerByFaction(state, unit.faction);
    if (!player || player.ghostCharges <= 0) return pushLog(state, "Призрачные заряды кончились.");
  }

  // Стартуем бой со специальной картой
  let next: GameState = {
    ...state,
    pending: {
      kind: "combat",
      attackerUnitId: unit.id,
      defenderUnitId: target.id,
      nodeId: target.nodeId ?? "",
      attackerSource: source,
      defenderSource: "normal",
    },
    phase: "combat",
  };
  next = pushLog(next, `${factionName(unit.faction)} использует ${source === "pirate" ? "пиратов" : source === "ghost" ? "призраков" : "Шейбанидов"} против ${factionName(target.faction)}.`);
  return next;
}

/* ───────────────────────── Контрабандисты ───────────────────────── */

function doSmuggler(state: GameState, unitId: string, toNodeId: string): GameState {
  const unit = state.units.find((u) => u.id === unitId);
  if (!unit) return state;
  const node = NODES_BY_ID[unit.nodeId ?? ""];
  if (!node || node.kind !== "smuggler-lair") return pushLog(state, "Эта фишка не в Логове Контрабандистов.");
  const dest = NODES_BY_ID[toNodeId];
  if (!dest || dest.kind !== "port") return pushLog(state, "Цель — любой порт на карте.");
  let next = updateUnit(state, unitId, { nodeId: null });
  next = {
    ...next,
    smugglerInTransit: [
      ...next.smugglerInTransit,
      { unitId, arrivesRound: next.round + 1, toNodeId },
    ],
  };
  next = pushLog(next, `${factionName(unit.faction)} убирает фишку с карты — высадится в «${dest.name}» через круг.`);
  return next;
}

/* ───────────────────────── Карты богов ───────────────────────── */

function doGodCard(
  state: GameState,
  action: { type: "use-god-card"; playerId: string; cardId: string; targetNodeId?: string; targetUnitId?: string; targetPlayerId?: string },
): GameState {
  const player = state.players.find((p) => p.id === action.playerId);
  if (!player) return state;
  const card = player.godCards.find((c) => c.id === action.cardId);
  if (!card) return state;
  let next = updatePlayer(state, player.id, {
    godCards: player.godCards.filter((c) => c.id !== card.id),
  });
  switch (card.god) {
    case "avalais":
      // Утопить вражескую армию на морском пути
      if (action.targetUnitId) {
        const target = next.units.find((u) => u.id === action.targetUnitId);
        const tNode = NODES_BY_ID[target?.nodeId ?? ""];
        if (target && target.faction !== player.faction && tNode && (tNode.kind === "sea" || tNode.kind === "port")) {
          next = removeUnit(next, target.id);
          next = pushLog(next, `Авалайс утопила отряд ${factionName(target.faction)} на «${tNode.name}».`);
        }
      }
      break;
    case "sitas":
      if (action.targetPlayerId) {
        next = updatePlayer(next, action.targetPlayerId, { skipNextTurn: true });
        const target = next.players.find((p) => p.id === action.targetPlayerId);
        next = pushLog(next, `Ситас: ${target?.name} пропустит следующий ход.`);
      }
      break;
    case "vyeronkh":
      if (action.targetUnitId && action.targetNodeId) {
        next = updateUnit(next, action.targetUnitId, { nodeId: action.targetNodeId });
        const target = next.units.find((u) => u.id === action.targetUnitId);
        if (target) {
          next = pushLog(next, `Вьеронх перенёс отряд ${factionName(target.faction)} на «${NODES_BY_ID[action.targetNodeId]?.name}».`);
        }
      }
      break;
    case "shentar":
    case "giordg":
      // Эти карты разыгрываются в бою через play-prebuff — здесь нет эффекта
      next = pushLog(next, `Карта ${godRu(card.god)} разыгрывается перед боем.`);
      // вернём карту в руку
      next = updatePlayer(next, player.id, { godCards: [...next.players.find((p) => p.id === player.id)!.godCards, card] });
      break;
  }
  return next;
}

/* ───────────────────────── Прочее ───────────────────────── */

function skipUnit(state: GameState, unitId: string): GameState {
  return updateUnit(state, unitId, { movesLeft: 0 });
}

function endTurn(state: GameState): GameState {
  let next = state;
  // Обновляем живых
  next = recalcAlive(next);
  next = checkVictory(next);
  if (next.phase === "ended") return next;

  let idx = next.currentPlayerIdx;
  for (let i = 0; i < next.players.length; i++) {
    idx = (idx + 1) % next.players.length;
    if (next.players[idx]?.alive) break;
  }
  // Если вернулись на первого живого, значит круг закончен
  let newRound = next.round;
  let phase: Phase = "turn";
  const firstAlive = findFirstAlivePlayerIdx(next, 0);
  if (idx === firstAlive) {
    newRound += 1;
    phase = "round-start";
  }
  next = { ...next, currentPlayerIdx: idx, round: newRound, phase };
  if (phase === "round-start") {
    next = pushLog(next, `Круг ${newRound} начинается.`);
    return startRound(next);
  }
  next = pushLog(next, `Ход переходит к ${next.players[idx]?.name}.`);
  next = handleSkipTurn(next);
  return next;
}

function recalcAlive(state: GameState): GameState {
  return {
    ...state,
    players: state.players.map((p) => {
      const hasUnit = state.units.some((u) => u.faction === p.faction);
      const hasReserve = p.reserveSquads + p.reserveGuards > 0;
      return { ...p, alive: hasUnit || hasReserve };
    }),
  };
}

function checkVictory(state: GameState): GameState {
  const next = recalcAlive(state);
  const alivePlayers = next.players.filter((p) => p.alive);
  if (alivePlayers.length <= 1) {
    return {
      ...next,
      phase: "ended",
      winnerFactionId: alivePlayers[0]?.faction,
      log: [
        ...next.log,
        {
          id: uid("log"),
          ts: now(),
          text: alivePlayers[0]
            ? `Победа: ${factionName(alivePlayers[0].faction)}!`
            : "Партия завершилась без победителя.",
        },
      ],
    };
  }
  return next;
}

/* ───────────────────────── Хелперы для UI ───────────────────────── */

export function factionName(id: FactionId): string {
  return FACTIONS[id].name;
}

export function factionColor(id: FactionId): string {
  return FACTIONS[id].color;
}

export function listLegalMoves(state: GameState, unitId: string): string[] {
  const unit = state.units.find((u) => u.id === unitId);
  if (!unit || !unit.nodeId) return [];
  const out = new Set<string>();
  for (const e of EDGES) {
    if (e.a === unit.nodeId && canMove(state, unit, e.b).ok) out.add(e.b);
    if (e.b === unit.nodeId && canMove(state, unit, e.a).ok) out.add(e.a);
  }
  const fac = FACTIONS[unit.faction];
  if (fac.canFly) {
    for (const n of NODES) {
      if (n.kind === "city" && n.faction === unit.faction && canMove(state, unit, n.id).ok) out.add(n.id);
      if (n.kind === "sheybanid-camp" && canMove(state, unit, n.id).ok) out.add(n.id);
    }
  }
  return Array.from(out);
}

export { NODES, EDGES, NODES_BY_ID, getNeighbors };
