export type NodeType = "city" | "battle" | "shrine" | "port" | "windrose" | "pirate" | "ghost" | "camp" | "smuggler";

export interface MapNode {
  id: string;
  name: string;
  type: NodeType;
  x: number; // % from left (0-100)
  y: number; // % from top (0-100)
  faction?: string; // owning faction for cities
}

export interface MapEdge {
  from: string;
  to: string;
  sea?: boolean;
}

// --- Faction starting cities ---
// empire (red) — north of Wain'Vudell
// republic (blue) — south of Wain'Vudell
// subbgars (purple) — fjords
// dwarves (yellow) — mountains
// delions (dark) — Alvind forests
// avains (white) — Aldeswind forests/mountains
// ancients (brown) — Nortvild
// trolls (green) — troll ruins
// dark (cyan) — cult of Sitas
// rebellion (gray) — Westfall

export const MAP_NODES: MapNode[] = [
  // === EMPIRE CITIES (North) ===
  { id: "emp1", name: "Кронхейм", type: "city", x: 30, y: 12, faction: "empire" },
  { id: "emp2", name: "Ред Форт", type: "city", x: 38, y: 18, faction: "empire" },
  { id: "emp3", name: "Вайнгард", type: "city", x: 25, y: 22, faction: "empire" },

  // === REPUBLIC CITIES (South) ===
  { id: "rep1", name: "Либерхолл", type: "city", x: 32, y: 52, faction: "republic" },
  { id: "rep2", name: "Блау Стейн", type: "city", x: 40, y: 58, faction: "republic" },
  { id: "rep3", name: "Южный Порт", type: "city", x: 28, y: 62, faction: "republic" },

  // === SUBBGAR CITIES (fjords, west) ===
  { id: "sub1", name: "Вальхёрн", type: "city", x: 10, y: 15, faction: "subbgars" },
  { id: "sub2", name: "Фьорд Грома", type: "city", x: 8, y: 28, faction: "subbgars" },

  // === DWARF CITIES (mountains) ===
  { id: "dwf1", name: "Каз-Дуран", type: "city", x: 55, y: 25, faction: "dwarves" },
  { id: "dwf2", name: "Золотой Чертог", type: "city", x: 60, y: 32, faction: "dwarves" },

  // === DELION CITIES (Alvind forest) ===
  { id: "del1", name: "Тен'Алвинд", type: "city", x: 70, y: 45, faction: "delions" },
  { id: "del2", name: "Мрачный Дол", type: "city", x: 75, y: 55, faction: "delions" },

  // === AVAIN CITIES (Aldeswind) ===
  { id: "ava1", name: "Алд'Свинда", type: "city", x: 82, y: 25, faction: "avains" },
  { id: "ava2", name: "Верхний Шпиль", type: "city", x: 88, y: 35, faction: "avains" },

  // === ANCIENT CITIES (Nortvild) ===
  { id: "anc1", name: "Нортвилд", type: "city", x: 50, y: 8, faction: "ancients" },
  { id: "anc2", name: "Рунный Камень", type: "city", x: 65, y: 12, faction: "ancients" },

  // === TROLL CITIES ===
  { id: "trl1", name: "Гроттхейм", type: "city", x: 48, y: 70, faction: "trolls" },
  { id: "trl2", name: "Болотный Трон", type: "city", x: 55, y: 78, faction: "trolls" },

  // === DARK CULT CITIES ===
  { id: "drk1", name: "Храм Ситаса", type: "city", x: 72, y: 75, faction: "dark" },
  { id: "drk2", name: "Пустотный Колодец", type: "city", x: 80, y: 82, faction: "dark" },

  // === REBELLION CITIES (Westfall) ===
  { id: "reb1", name: "Вестфолл", type: "city", x: 15, y: 50, faction: "rebellion" },
  { id: "reb2", name: "Серый Бастион", type: "city", x: 12, y: 60, faction: "rebellion" },

  // === BATTLE POINTS ===
  { id: "bat1", name: "Перекрёсток Мечей", type: "battle", x: 33, y: 35 },
  { id: "bat2", name: "Кровавый Холм", type: "battle", x: 45, y: 42 },
  { id: "bat3", name: "Мост Войны", type: "battle", x: 20, y: 38 },
  { id: "bat4", name: "Стальная Развилка", type: "battle", x: 60, y: 50 },
  { id: "bat5", name: "Долина Костей", type: "battle", x: 42, y: 25 },
  { id: "bat6", name: "Огненный Проход", type: "battle", x: 65, y: 65 },

  // === SHRINES ===
  { id: "shr1", name: "Святилище Джалайны", type: "shrine", x: 35, y: 45 },
  { id: "shr2", name: "Святилище Гиордга", type: "shrine", x: 50, y: 55 },
  { id: "shr3", name: "Святилище Ангелоны", type: "shrine", x: 75, y: 35 },

  // === PORTS ===
  { id: "prt1", name: "Порт Империи", type: "port", x: 18, y: 20 },
  { id: "prt2", name: "Порт Республики", type: "port", x: 22, y: 55 },
  { id: "prt3", name: "Порт Троллей", type: "port", x: 42, y: 82 },
  { id: "prt4", name: "Восточная Гавань", type: "port", x: 90, y: 60 },

  // === WIND ROSES (sea waypoints) ===
  { id: "wr1", name: "Роза Ветров ⚡", type: "windrose", x: 5, y: 42 },
  { id: "wr2", name: "Роза Ветров ⚡", type: "windrose", x: 15, y: 80 },
  { id: "wr3", name: "Роза Ветров ⚡", type: "windrose", x: 92, y: 75 },

  // === SPECIAL ===
  { id: "pir1", name: "Пиратская Бухта", type: "pirate", x: 5, y: 65 },
  { id: "gho1", name: "Призрачный Храм", type: "ghost", x: 60, y: 85 },
  { id: "cmp1", name: "Лагерь Шейбанидов", type: "camp", x: 85, y: 70 },
  { id: "smg1", name: "Логово Контрабандистов", type: "smuggler", x: 48, y: 90 },
];

export const MAP_EDGES: MapEdge[] = [
  // Empire internal
  { from: "emp1", to: "emp2" },
  { from: "emp2", to: "emp3" },
  { from: "emp1", to: "emp3" },
  // Empire to battle points
  { from: "emp2", to: "bat5" },
  { from: "emp3", to: "bat3" },
  { from: "emp3", to: "bat1" },
  // Empire to port
  { from: "emp3", to: "prt1" },
  // Empire to ancients
  { from: "emp1", to: "anc1" },

  // Republic internal
  { from: "rep1", to: "rep2" },
  { from: "rep2", to: "rep3" },
  { from: "rep1", to: "rep3" },
  // Republic to battle points
  { from: "rep1", to: "bat1" },
  { from: "rep1", to: "shr1" },
  { from: "rep2", to: "shr2" },
  { from: "rep3", to: "prt2" },

  // Subbgar
  { from: "sub1", to: "sub2" },
  { from: "sub1", to: "emp1" },
  { from: "sub2", to: "bat3" },
  { from: "sub2", to: "reb1" },

  // Dwarves
  { from: "dwf1", to: "dwf2" },
  { from: "dwf1", to: "bat5" },
  { from: "dwf2", to: "bat4" },
  { from: "dwf2", to: "bat2" },

  // Delions
  { from: "del1", to: "del2" },
  { from: "del1", to: "bat4" },
  { from: "del1", to: "shr3" },
  { from: "del2", to: "bat6" },

  // Avains
  { from: "ava1", to: "ava2" },
  { from: "ava1", to: "shr3" },
  { from: "ava1", to: "anc2" },
  { from: "ava2", to: "prt4" },

  // Ancients
  { from: "anc1", to: "anc2" },
  { from: "anc1", to: "bat5" },

  // Trolls
  { from: "trl1", to: "trl2" },
  { from: "trl1", to: "shr2" },
  { from: "trl1", to: "bat2" },
  { from: "trl2", to: "prt3" },
  { from: "trl2", to: "gho1" },

  // Dark
  { from: "drk1", to: "drk2" },
  { from: "drk1", to: "bat6" },
  { from: "drk1", to: "del2" },
  { from: "drk2", to: "cmp1" },

  // Rebellion
  { from: "reb1", to: "reb2" },
  { from: "reb1", to: "bat3" },
  { from: "reb1", to: "bat1" },
  { from: "reb2", to: "prt2" },

  // Central connections
  { from: "bat1", to: "shr1" },
  { from: "bat1", to: "bat2" },
  { from: "bat2", to: "shr2" },
  { from: "bat2", to: "bat4" },
  { from: "bat5", to: "bat1" },
  { from: "shr1", to: "shr2" },
  { from: "bat4", to: "shr3" },
  { from: "bat6", to: "cmp1" },
  { from: "bat6", to: "shr2" },

  // Sea routes
  { from: "prt1", to: "wr1", sea: true },
  { from: "wr1", to: "pir1", sea: true },
  { from: "wr1", to: "prt2", sea: true },
  { from: "prt2", to: "wr2", sea: true },
  { from: "wr2", to: "prt3", sea: true },
  { from: "wr2", to: "smg1", sea: true },
  { from: "prt3", to: "gho1", sea: true },
  { from: "prt4", to: "wr3", sea: true },
  { from: "wr3", to: "cmp1", sea: true },
  { from: "wr3", to: "smg1", sea: true },
  { from: "pir1", to: "reb2", sea: true },

  // Smuggler teleport (special — connects to all ports)
  { from: "smg1", to: "prt1", sea: true },
  { from: "smg1", to: "prt2", sea: true },
  { from: "smg1", to: "prt3", sea: true },
  { from: "smg1", to: "prt4", sea: true },
];

export const NODE_COLORS: Record<NodeType, string> = {
  city: "#fff",
  battle: "#ef4444",
  shrine: "#a855f7",
  port: "#3b82f6",
  windrose: "#38bdf8",
  pirate: "#f97316",
  ghost: "#6b7280",
  camp: "#d97706",
  smuggler: "#10b981",
};

export const NODE_ICONS: Record<NodeType, string> = {
  city: "🏰",
  battle: "⚔️",
  shrine: "💎",
  port: "⚓",
  windrose: "🧭",
  pirate: "🏴‍☠️",
  ghost: "☠️",
  camp: "🏕️",
  smuggler: "⛵",
};

export const FACTION_COLORS: Record<string, string> = {
  empire: "#ef4444",
  republic: "#3b82f6",
  subbgars: "#a855f7",
  dwarves: "#eab308",
  delions: "#525252",
  avains: "#f5f5f5",
  ancients: "#92400e",
  trolls: "#22c55e",
  dark: "#67e8f9",
  rebellion: "#9ca3af",
};

export function getNeighbors(nodeId: string): string[] {
  const neighbors: string[] = [];
  for (const edge of MAP_EDGES) {
    if (edge.from === nodeId) neighbors.push(edge.to);
    if (edge.to === nodeId) neighbors.push(edge.from);
  }
  return [...new Set(neighbors)];
}

export function getNodeById(id: string): MapNode | undefined {
  return MAP_NODES.find((n) => n.id === id);
}
