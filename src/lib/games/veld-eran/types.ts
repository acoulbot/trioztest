/**
 * Перо Измерений: Мир Вельд'Эран — типы для настольной игры.
 *
 * Этот файл описывает все основные сущности: фракции, узлы карты, фишки,
 * фазы партии, состояние и события. Бизнес-логика живёт в rules.ts.
 */

export type FactionId =
  | "empire"
  | "republic"
  | "subbgars"
  | "dwarves"
  | "delions"
  | "avayns"
  | "ancients"
  | "trolls"
  | "dark"
  | "rebellion";

export interface FactionDef {
  id: FactionId;
  name: string;
  /** Прилагательное / описание для UI. */
  tagline: string;
  /** Цвет в HEX для маркеров фишек. */
  color: string;
  /** Цвет рамки (немного темнее). */
  borderColor: string;
  /** Краткий лор. */
  lore: string;
  /** Может «летать» между своими городами и Шейбанидами (только Суббгары). */
  canFly?: boolean;
}

/** Тип узла карты. */
export type NodeKind =
  | "city" //  Круг с цветом фракции, точка хода.
  | "battle" //  Скрещенные мечи на дороге.
  | "sanctuary" //  Алмаз, где Гвардии призывают богов.
  | "port" //  Якорь, морской порт.
  | "sea" //  Открытый морской хаб (роза ветров).
  | "pirate-cove" //  Пиратская бухта (флаг).
  | "smuggler-lair" //  Логово контрабандистов (штурвал).
  | "ghost-temple" //  Призрачный Храм (руины).
  | "sheybanid-camp" //  Лагерь пустынных наёмников (палатка).
  | "sands-of-sikhvaris" //  Пески Сихвариса (кубик чёт).
  | "solid-of-giordt"; //  Твердь Гиортда (кубик нечёт).

/** Узел карты. */
export interface MapNode {
  id: string;
  name: string;
  kind: NodeKind;
  /** Нормированные координаты 0..1 относительно ширины/высоты карты. */
  x: number;
  y: number;
  /** Стартовая фракция, если это её город. */
  faction?: FactionId;
  /** Доп. флаги: суша/море. По умолчанию вычисляется из kind. */
  isSea?: boolean;
}

/** Связь между узлами. */
export interface MapEdge {
  /** ID узла A. */
  a: string;
  /** ID узла B. */
  b: string;
  /**
   * Тип связи:
   *  - "road": сухопутная дорога.
   *  - "sea": морской путь.
   *  - "flight": воздушный путь Суббгаров (виртуальный, не показывается всем).
   */
  kind: "road" | "sea" | "flight";
}

/** Тип фишки игрока. */
export type UnitKind = "squad" | "guard"; //  Отряд / Гвардия.

/** Фишка игрока. */
export interface Unit {
  id: string;
  faction: FactionId;
  kind: UnitKind;
  /** ID узла, на котором стоит фишка. null = в резерве/убрана. */
  nodeId: string | null;
  /** Сколько ходов осталось у этой фишки в текущем круге. */
  movesLeft: number;
  /** Сколько раз эта Гвардия призывала бога на текущем святилище. */
  sanctuaryUses: number;
  /** Сколько раз использовалась атака пиратов/призраков с этой фишки. */
  specialUses: number;
}

/** Карта в руке игрока (для боёв) — номинал 1..5. */
export interface BattleCard {
  id: string;
  value: 1 | 2 | 3 | 4 | 5;
}

/** Карта божества (Авалайс/Ситас/Шент’Ар/Гиордг/Вьеронх). */
export type GodCardId =
  | "avalais" //  утопить армию на морских путях
  | "sitas" //  пропустить ход любому игроку
  | "shentar" //  обратить отряд в союзный после победы (до боя)
  | "giordg" //  переиграть проигрыш (до боя)
  | "vyeronkh"; //  перенести армию соперника

export interface GodCard {
  id: string;
  god: GodCardId;
}

/** Игрок. */
export interface Player {
  id: string;
  name: string;
  faction: FactionId;
  reserveSquads: number; //  фишки в запасе (по 2 в круг)
  reserveGuards: number;
  hand: BattleCard[];
  godCards: GodCard[];
  /** Карты призрачного отряда (расходник). */
  ghostCharges: number; //  сколько ещё призрачных боёв доступно
  /** Пропустить следующий ход (карта Ситаса). */
  skipNextTurn: boolean;
  /** Жив (есть ли фишки на карте или в резерве). Обновляется автоматически. */
  alive: boolean;
}

/** Фаза партии. */
export type Phase =
  | "lobby" //  выбор фракций
  | "setup" //  расстановка стартовых фишек
  | "round-start" //  начало круга: реинфорсы
  | "turn" //  ход текущего игрока
  | "combat" //  идёт бой
  | "dice" //  ожидание броска кубиков
  | "sanctuary" //  выбор божества после броска
  | "ended"; //  победа

/** Активный диалог-нарезка для UI. */
export type PendingPrompt =
  | { kind: "none" }
  | {
      kind: "combat";
      attackerUnitId: string;
      defenderUnitId: string;
      nodeId: string;
      /** Источник бойцов — обычный отряд или особый (карта берётся сверху колоды). */
      attackerSource: "normal" | "pirate" | "ghost" | "sheybanid";
      defenderSource: "normal" | "pirate" | "ghost" | "sheybanid";
      attackerCard?: BattleCard;
      defenderCard?: BattleCard;
      attackerGuess?: number;
      defenderGuess?: number;
      attackerPrebuff?: GodCardId; //  Гиордг/Шент’Ар сыграны перед боем
      defenderPrebuff?: GodCardId;
    }
  | {
      kind: "dice-move";
      unitId: string;
      from: string;
      to: string;
      needed: "even" | "odd";
    }
  | {
      kind: "sanctuary";
      unitId: string;
      nodeId: string;
      diceResult?: number;
    }
  | {
      kind: "god-effect";
      god: GodCardId;
      /** ID игрока, выбирающего цели. */
      playerId: string;
    }
  | {
      kind: "pirate-attack";
      attackerPlayerId: string;
      attackerUnitId: string;
    }
  | {
      kind: "ghost-attack";
      attackerPlayerId: string;
      attackerUnitId: string;
    }
  | {
      kind: "sheybanid-attack";
      attackerPlayerId: string;
      attackerUnitId: string;
    };

/** Сообщения в логе игры. */
export interface LogEntry {
  id: string;
  text: string;
  ts: number;
}

/** Состояние всей партии. */
export interface GameState {
  phase: Phase;
  players: Player[];
  /** Чей сейчас ход (индекс в players). */
  currentPlayerIdx: number;
  /** Номер круга (1..). */
  round: number;
  units: Unit[];
  /** Колода боевых карт. */
  battleDeck: BattleCard[];
  battleDiscard: BattleCard[];
  /** Текущий запрос UI. */
  pending: PendingPrompt;
  /** Кубик: значение последнего броска (для отладки/UI). */
  lastDice?: number;
  /** Лог событий. */
  log: LogEntry[];
  /** Победитель. */
  winnerFactionId?: FactionId;
  /** Контроль особых локаций. */
  control: {
    pirateCove?: FactionId;
    smugglerLair?: FactionId;
    ghostTemple?: FactionId;
    sheybanidCamp?: FactionId;
  };
  /** Карты контрабандистов "в полёте": снятые фишки, которые вернутся через круг. */
  smugglerInTransit: { unitId: string; arrivesRound: number; toNodeId: string }[];
}

/** Описание божества (для UI таблицы). */
export interface GodEntry {
  roll: number;
  name: string;
  description: string;
  /** Эффект применяется сразу или даёт карту в руку. */
  effect: "instant" | "card";
}
