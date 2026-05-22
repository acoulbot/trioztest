import type { MapEdge, MapNode } from "./types";

/**
 * Узлы карты Вельд'Эран. Координаты (x, y) нормированы 0..1 относительно
 * исходного изображения карты (landscape).
 *
 * Структурно карта поделена на регионы:
 *  - North (Нортвилд / Вайн’Вуделл север)
 *  - Center (центральный континент / Вестфолл)
 *  - West (Алвинд / Твердь Гиортда)
 *  - East (Алдесвинд / Шейбаниды / Сихварис)
 *  - South (Алвинд эльфийский)
 *  - Islands (центральные мелкие острова)
 *  - Sea (открытые морские хабы)
 */
export const NODES: MapNode[] = [
  // ───────── Север (Нортвилд) ─────────
  { id: "n-anc1", name: "Нортвилд I", kind: "city", faction: "ancients", x: 0.30, y: 0.07 },
  { id: "n-anc2", name: "Нортвилд II", kind: "city", faction: "ancients", x: 0.36, y: 0.05 },
  { id: "n-emp1", name: "Стальной Бастион", kind: "city", faction: "empire", x: 0.42, y: 0.08 },
  { id: "n-bp1", name: "Северная Развилка", kind: "battle", x: 0.48, y: 0.10 },
  { id: "n-anc3", name: "Валдесорт", kind: "city", faction: "ancients", x: 0.53, y: 0.07 },
  { id: "n-bp2", name: "Перевал Воронов", kind: "battle", x: 0.58, y: 0.10 },
  { id: "n-purp1", name: "Сторгрим", kind: "city", faction: "subbgars", x: 0.62, y: 0.07 },
  { id: "n-sanc1", name: "Алтарь Стратоса", kind: "sanctuary", x: 0.55, y: 0.12 },
  { id: "n-bp3", name: "Каменный Брод", kind: "battle", x: 0.66, y: 0.13 },
  { id: "n-purp2", name: "Йорнгард", kind: "city", faction: "subbgars", x: 0.71, y: 0.10 },
  { id: "n-dark1", name: "Шёпот Ситаса", kind: "city", faction: "dark", x: 0.78, y: 0.08 },
  { id: "n-bp4", name: "Туманный Тракт", kind: "battle", x: 0.83, y: 0.11 },
  { id: "n-rep1", name: "Северный Гарнизон", kind: "city", faction: "republic", x: 0.86, y: 0.08 },
  { id: "n-port1", name: "Порт Нортвилда", kind: "port", x: 0.27, y: 0.13 },
  { id: "n-port2", name: "Порт Сторгрима", kind: "port", x: 0.66, y: 0.16 },

  // ───────── Северо-восток (отдельный материк) ─────────
  { id: "n-dwv1", name: "Кеирн-Дум", kind: "city", faction: "dwarves", x: 0.91, y: 0.16 },
  { id: "n-purp3", name: "Стенстад", kind: "city", faction: "subbgars", x: 0.93, y: 0.21 },
  { id: "n-sanc2", name: "Алтарь Сихвариса", kind: "sanctuary", x: 0.96, y: 0.18 },
  { id: "n-bp5", name: "Восточный Перевал", kind: "battle", x: 0.95, y: 0.25 },
  { id: "n-dwv2", name: "Карак-Йорн", kind: "city", faction: "dwarves", x: 0.97, y: 0.30 },

  // ───────── Запад (Твердь Гиортда) ─────────
  { id: "n-tverd", name: "Твердь Гиортда", kind: "solid-of-giordt", x: 0.08, y: 0.22 },
  { id: "n-temple", name: "Призрачный Храм", kind: "ghost-temple", x: 0.10, y: 0.30 },
  { id: "n-anc4", name: "Стражи Гиортда", kind: "city", faction: "ancients", x: 0.16, y: 0.26 },
  { id: "n-emp2", name: "Имперская Застава", kind: "city", faction: "empire", x: 0.18, y: 0.31 },
  { id: "n-sanc3", name: "Алтарь Авалайс", kind: "sanctuary", x: 0.16, y: 0.36 },
  { id: "n-dwv3", name: "Карак-Дрейг", kind: "city", faction: "dwarves", x: 0.12, y: 0.38 },
  { id: "n-bp6", name: "Перекрёсток Скал", kind: "battle", x: 0.14, y: 0.42 },
  { id: "n-port3", name: "Порт Гиортда", kind: "port", x: 0.07, y: 0.43 },
  { id: "n-trl1", name: "Логово Троллей", kind: "city", faction: "trolls", x: 0.05, y: 0.39 },

  // ───────── Центральный континент ─────────
  { id: "n-emp3", name: "Цитадель Севера", kind: "city", faction: "empire", x: 0.37, y: 0.22 },
  { id: "n-emp4", name: "Имперский Форт", kind: "city", faction: "empire", x: 0.42, y: 0.26 },
  { id: "n-bp7", name: "Кровавая Тропа", kind: "battle", x: 0.39, y: 0.30 },
  { id: "n-emp5", name: "Имперская Колония", kind: "city", faction: "empire", x: 0.45, y: 0.31 },
  { id: "n-sanc4", name: "Святыня Ангелоны", kind: "sanctuary", x: 0.43, y: 0.36 },
  { id: "n-purp4", name: "Йорсдатт", kind: "city", faction: "subbgars", x: 0.48, y: 0.34 },
  { id: "n-bp8", name: "Брод Бури", kind: "battle", x: 0.41, y: 0.40 },
  { id: "n-reb1", name: "Вестфолл", kind: "city", faction: "rebellion", x: 0.37, y: 0.36 },
  { id: "n-rep2", name: "Республика I", kind: "city", faction: "republic", x: 0.39, y: 0.44 },
  { id: "n-rep3", name: "Республика II", kind: "city", faction: "republic", x: 0.43, y: 0.47 },
  { id: "n-bp9", name: "Лесная Засада", kind: "battle", x: 0.36, y: 0.50 },
  { id: "n-rep4", name: "Южный Гарнизон", kind: "city", faction: "republic", x: 0.40, y: 0.55 },
  { id: "n-rep5", name: "Республика III", kind: "city", faction: "republic", x: 0.45, y: 0.58 },
  { id: "n-port4", name: "Порт Республики", kind: "port", x: 0.34, y: 0.57 },
  { id: "n-port5", name: "Имперский Порт", kind: "port", x: 0.50, y: 0.27 },
  { id: "n-dwv4", name: "Карак-Норн", kind: "city", faction: "dwarves", x: 0.46, y: 0.65 },

  // ───────── Центральные острова ─────────
  { id: "n-smuggler", name: "Логово Контрабандистов", kind: "smuggler-lair", x: 0.30, y: 0.32 },
  { id: "n-trl2", name: "Огненный Пик", kind: "city", faction: "trolls", x: 0.56, y: 0.55 },
  { id: "n-port6", name: "Порт Огненного Пика", kind: "port", x: 0.58, y: 0.60 },
  { id: "n-vortex", name: "Око Вельд'Эрана", kind: "sanctuary", x: 0.63, y: 0.45 },

  // ───────── Восточный континент ─────────
  { id: "n-dwv5", name: "Карак-Зорн", kind: "city", faction: "dwarves", x: 0.78, y: 0.42 },
  { id: "n-bp10", name: "Восточный Тракт", kind: "battle", x: 0.81, y: 0.46 },
  { id: "n-anc5", name: "Бастион Древних", kind: "city", faction: "ancients", x: 0.74, y: 0.38 },
  { id: "n-avn1", name: "Алдесвинд I", kind: "city", faction: "avayns", x: 0.83, y: 0.50 },
  { id: "n-sanc5", name: "Алтарь Антегриза", kind: "sanctuary", x: 0.86, y: 0.55 },
  { id: "n-port7", name: "Порт Алдесвинда", kind: "port", x: 0.87, y: 0.47 },

  // ───────── Юг (Алвинд эльфы) ─────────
  { id: "n-dlk1", name: "Дэлион I", kind: "city", faction: "delions", x: 0.30, y: 0.78 },
  { id: "n-bp11", name: "Лесная Засада II", kind: "battle", x: 0.36, y: 0.80 },
  { id: "n-avn2", name: "Алвинд I", kind: "city", faction: "avayns", x: 0.42, y: 0.77 },
  { id: "n-port8", name: "Зелёный Порт", kind: "port", x: 0.46, y: 0.82 },
  { id: "n-bp12", name: "Граница Эльфов", kind: "battle", x: 0.50, y: 0.79 },
  { id: "n-avn3", name: "Алвинд II", kind: "city", faction: "avayns", x: 0.56, y: 0.78 },
  { id: "n-dlk2", name: "Дэлион II", kind: "city", faction: "delions", x: 0.62, y: 0.83 },
  { id: "n-sanc6", name: "Алтарь Шент’Ар", kind: "sanctuary", x: 0.54, y: 0.86 },
  { id: "n-port9", name: "Алвиндский Порт", kind: "port", x: 0.66, y: 0.78 },

  // ───────── Юго-восток (Пески + Шейбаниды) ─────────
  { id: "n-sands", name: "Пески Сихвариса", kind: "sands-of-sikhvaris", x: 0.84, y: 0.78 },
  { id: "n-sheybanid", name: "Шейбаниды", kind: "sheybanid-camp", x: 0.93, y: 0.82 },
  { id: "n-bp13", name: "Караванный Путь", kind: "battle", x: 0.78, y: 0.74 },
  { id: "n-avn4", name: "Оазис Света", kind: "city", faction: "avayns", x: 0.74, y: 0.78 },

  // ───────── Юго-запад (Пиратская бухта) ─────────
  { id: "n-pirate", name: "Пиратская Бухта", kind: "pirate-cove", x: 0.10, y: 0.85 },
  { id: "n-trl3", name: "Болото Троллей", kind: "city", faction: "trolls", x: 0.20, y: 0.78 },
  { id: "n-port10", name: "Пиратский Порт", kind: "port", x: 0.14, y: 0.78 },

  // ───────── Морские хабы ─────────
  { id: "n-sea1", name: "Северная Роза", kind: "sea", x: 0.50, y: 0.18 },
  { id: "n-sea2", name: "Западная Роза", kind: "sea", x: 0.20, y: 0.50 },
  { id: "n-sea3", name: "Центральная Роза", kind: "sea", x: 0.55, y: 0.40 },
  { id: "n-sea4", name: "Восточная Роза", kind: "sea", x: 0.85, y: 0.32 },
  { id: "n-sea5", name: "Южная Роза", kind: "sea", x: 0.55, y: 0.70 },
  { id: "n-sea6", name: "Юго-восточная Роза", kind: "sea", x: 0.75, y: 0.60 },
];

/** Двусторонние связи между узлами. */
export const EDGES: MapEdge[] = [
  // ─── Север: цепочка вдоль континента ───
  { a: "n-anc1", b: "n-anc2", kind: "road" },
  { a: "n-anc2", b: "n-emp1", kind: "road" },
  { a: "n-emp1", b: "n-bp1", kind: "road" },
  { a: "n-bp1", b: "n-anc3", kind: "road" },
  { a: "n-anc3", b: "n-bp2", kind: "road" },
  { a: "n-bp2", b: "n-purp1", kind: "road" },
  { a: "n-purp1", b: "n-sanc1", kind: "road" },
  { a: "n-sanc1", b: "n-anc3", kind: "road" },
  { a: "n-purp1", b: "n-bp3", kind: "road" },
  { a: "n-bp3", b: "n-purp2", kind: "road" },
  { a: "n-purp2", b: "n-dark1", kind: "road" },
  { a: "n-dark1", b: "n-bp4", kind: "road" },
  { a: "n-bp4", b: "n-rep1", kind: "road" },
  { a: "n-anc1", b: "n-port1", kind: "road" },
  { a: "n-purp1", b: "n-port2", kind: "road" },

  // ─── Север <-> море ───
  { a: "n-port1", b: "n-sea1", kind: "sea" },
  { a: "n-port2", b: "n-sea1", kind: "sea" },
  { a: "n-sea1", b: "n-sea3", kind: "sea" },

  // ─── Северо-восток ───
  { a: "n-rep1", b: "n-dwv1", kind: "sea" },
  { a: "n-dwv1", b: "n-purp3", kind: "road" },
  { a: "n-purp3", b: "n-sanc2", kind: "road" },
  { a: "n-sanc2", b: "n-bp5", kind: "road" },
  { a: "n-bp5", b: "n-dwv2", kind: "road" },
  { a: "n-dwv2", b: "n-sea4", kind: "sea" },
  { a: "n-sea4", b: "n-sea3", kind: "sea" },

  // ─── Запад (Твердь, Храм, дворфский кулак) ───
  { a: "n-tverd", b: "n-anc4", kind: "road" },
  { a: "n-tverd", b: "n-temple", kind: "road" },
  { a: "n-temple", b: "n-anc4", kind: "road" },
  { a: "n-anc4", b: "n-emp2", kind: "road" },
  { a: "n-emp2", b: "n-sanc3", kind: "road" },
  { a: "n-sanc3", b: "n-dwv3", kind: "road" },
  { a: "n-dwv3", b: "n-bp6", kind: "road" },
  { a: "n-bp6", b: "n-trl1", kind: "road" },
  { a: "n-bp6", b: "n-port3", kind: "road" },
  { a: "n-trl1", b: "n-port3", kind: "road" },

  // ─── Запад <-> море ───
  { a: "n-port3", b: "n-sea2", kind: "sea" },
  { a: "n-sea2", b: "n-sea3", kind: "sea" },
  { a: "n-sea2", b: "n-port10", kind: "sea" },

  // ─── Центральный континент ───
  { a: "n-emp3", b: "n-emp4", kind: "road" },
  { a: "n-emp4", b: "n-bp7", kind: "road" },
  { a: "n-bp7", b: "n-emp5", kind: "road" },
  { a: "n-emp5", b: "n-sanc4", kind: "road" },
  { a: "n-sanc4", b: "n-purp4", kind: "road" },
  { a: "n-emp5", b: "n-port5", kind: "road" },
  { a: "n-bp7", b: "n-reb1", kind: "road" },
  { a: "n-reb1", b: "n-bp8", kind: "road" },
  { a: "n-bp8", b: "n-rep2", kind: "road" },
  { a: "n-rep2", b: "n-rep3", kind: "road" },
  { a: "n-rep3", b: "n-bp9", kind: "road" },
  { a: "n-bp9", b: "n-rep4", kind: "road" },
  { a: "n-rep4", b: "n-rep5", kind: "road" },
  { a: "n-rep4", b: "n-port4", kind: "road" },
  { a: "n-rep5", b: "n-dwv4", kind: "road" },

  // ─── Центральный континент <-> море ───
  { a: "n-port5", b: "n-sea3", kind: "sea" },
  { a: "n-port4", b: "n-sea5", kind: "sea" },
  { a: "n-port5", b: "n-sea1", kind: "sea" },

  // ─── Центральные острова ───
  { a: "n-smuggler", b: "n-sea3", kind: "sea" },
  { a: "n-smuggler", b: "n-sea2", kind: "sea" },
  { a: "n-trl2", b: "n-port6", kind: "road" },
  { a: "n-port6", b: "n-sea3", kind: "sea" },
  { a: "n-port6", b: "n-sea5", kind: "sea" },
  { a: "n-vortex", b: "n-sea3", kind: "sea" },
  { a: "n-vortex", b: "n-sea6", kind: "sea" },

  // ─── Восточный континент ───
  { a: "n-anc5", b: "n-dwv5", kind: "road" },
  { a: "n-dwv5", b: "n-bp10", kind: "road" },
  { a: "n-bp10", b: "n-avn1", kind: "road" },
  { a: "n-avn1", b: "n-sanc5", kind: "road" },
  { a: "n-avn1", b: "n-port7", kind: "road" },
  { a: "n-port7", b: "n-sea4", kind: "sea" },
  { a: "n-port7", b: "n-sea6", kind: "sea" },
  { a: "n-anc5", b: "n-sea4", kind: "sea" },

  // ─── Юг ───
  { a: "n-dlk1", b: "n-bp11", kind: "road" },
  { a: "n-bp11", b: "n-avn2", kind: "road" },
  { a: "n-avn2", b: "n-port8", kind: "road" },
  { a: "n-avn2", b: "n-bp12", kind: "road" },
  { a: "n-bp12", b: "n-avn3", kind: "road" },
  { a: "n-avn3", b: "n-dlk2", kind: "road" },
  { a: "n-avn3", b: "n-sanc6", kind: "road" },
  { a: "n-dlk2", b: "n-port9", kind: "road" },

  // ─── Юг <-> море ───
  { a: "n-port8", b: "n-sea5", kind: "sea" },
  { a: "n-port9", b: "n-sea5", kind: "sea" },
  { a: "n-port9", b: "n-sea6", kind: "sea" },

  // ─── Юго-восток ───
  { a: "n-port9", b: "n-avn4", kind: "sea" },
  { a: "n-avn4", b: "n-bp13", kind: "road" },
  { a: "n-bp13", b: "n-sands", kind: "road" },
  { a: "n-sands", b: "n-sheybanid", kind: "road" },
  { a: "n-sheybanid", b: "n-sea6", kind: "sea" },

  // ─── Юго-запад (Пираты) ───
  { a: "n-pirate", b: "n-port10", kind: "road" },
  { a: "n-port10", b: "n-trl3", kind: "sea" },
  { a: "n-trl3", b: "n-dlk1", kind: "road" },
  { a: "n-trl3", b: "n-port4", kind: "sea" },

  // ─── Дополнительные мосты между регионами ───
  { a: "n-anc4", b: "n-sea2", kind: "sea" },
  { a: "n-emp3", b: "n-sea1", kind: "sea" },
  { a: "n-emp3", b: "n-emp1", kind: "road" },
  { a: "n-rep1", b: "n-sea4", kind: "sea" },
];

/** Быстрый доступ. */
export const NODES_BY_ID: Record<string, MapNode> = Object.fromEntries(
  NODES.map((n) => [n.id, n]),
);

/**
 * Соседи узла, доступные «по дорогам и морю». Для пользователя видимы все
 * связи кроме flight (которые виртуальны для Суббгаров).
 */
export function getNeighbors(nodeId: string): { nodeId: string; kind: MapEdge["kind"] }[] {
  const res: { nodeId: string; kind: MapEdge["kind"] }[] = [];
  for (const edge of EDGES) {
    if (edge.a === nodeId) res.push({ nodeId: edge.b, kind: edge.kind });
    else if (edge.b === nodeId) res.push({ nodeId: edge.a, kind: edge.kind });
  }
  return res;
}

/** Список городов фракции (используется на старте). */
export function citiesOfFaction(factionId: string): MapNode[] {
  return NODES.filter((n) => n.kind === "city" && n.faction === factionId);
}

/** Все морские/прибрежные узлы — где могут действовать пираты. */
export function isSeaNode(node: MapNode): boolean {
  return node.kind === "sea" || node.kind === "port" || node.kind === "pirate-cove";
}

/** Можно ли войти на этот узел кинув кубики (Пески/Твердь). */
export function isDiceGateNode(node: MapNode): "even" | "odd" | null {
  if (node.kind === "sands-of-sikhvaris") return "even";
  if (node.kind === "solid-of-giordt") return "odd";
  return null;
}

/** Можно ли использовать узел как святилище (для Гвардий). */
export function isSanctuaryNode(node: MapNode): boolean {
  return node.kind === "sanctuary";
}
