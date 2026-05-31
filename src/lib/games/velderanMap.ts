export type NodeType = "city" | "battle" | "port" | "shrine" | "windrose" | "pirate" | "ghost" | "camp" | "smuggler";

export interface MapNode {
  id: string;
  name: string;
  type: NodeType;
  x: number; // % from left (0-100)
  y: number; // % from top (0-100)
  faction?: string;
}

export interface MapEdge {
  from: string;
  to: string;
  sea?: boolean;
}

// Positions extracted from the official template overlay (2400×1792)
export const MAP_NODES: MapNode[] = [
  // === ANCIENTS (brown) ===
  { id: "anc1", name: "anc1", type: "city", x: 37.0, y: 3.7, faction: "ancients" },
  { id: "anc2", name: "anc2", type: "city", x: 33.8, y: 8.5, faction: "ancients" },
  { id: "anc3", name: "anc3", type: "city", x: 37.3, y: 14.8, faction: "ancients" },
  { id: "anc4", name: "anc4", type: "city", x: 32.2, y: 15.6, faction: "ancients" },
  { id: "anc5", name: "anc5", type: "city", x: 74.7, y: 43.1, faction: "ancients" },
  { id: "anc6", name: "anc6", type: "city", x: 66.3, y: 51.6, faction: "ancients" },
  { id: "anc7", name: "anc7", type: "city", x: 81.6, y: 65.6, faction: "ancients" },

  // === AVAINS (light blue) ===
  { id: "ava1", name: "ava1", type: "city", x: 52.4, y: 2.5, faction: "avains" },
  { id: "ava2", name: "ava2", type: "city", x: 47.3, y: 3.1, faction: "avains" },
  { id: "ava3", name: "ava3", type: "city", x: 56.9, y: 3.7, faction: "avains" },
  { id: "ava4", name: "ava4", type: "city", x: 63.5, y: 5.2, faction: "avains" },
  { id: "ava5", name: "ava5", type: "city", x: 43.4, y: 6.9, faction: "avains" },

  // === DELIONS (black) ===
  { id: "del1", name: "del1", type: "city", x: 40.0, y: 83.4, faction: "delions" },
  { id: "del2", name: "del2", type: "city", x: 62.0, y: 90.5, faction: "delions" },
  { id: "del3", name: "del3", type: "city", x: 42.5, y: 94.8, faction: "delions" },

  // === DWARVES (yellow) ===
  { id: "dwf1", name: "dwf1", type: "city", x: 84.1, y: 19.9, faction: "dwarves" },
  { id: "dwf2", name: "dwf2", type: "city", x: 82.8, y: 36.9, faction: "dwarves" },
  { id: "dwf3", name: "dwf3", type: "city", x: 83.5, y: 55.0, faction: "dwarves" },
  { id: "dwf4", name: "dwf4", type: "city", x: 13.8, y: 75.4, faction: "dwarves" },

  // === EMPIRE (red) ===
  { id: "emp1", name: "emp1", type: "city", x: 43.1, y: 16.9, faction: "empire" },
  { id: "emp2", name: "emp2", type: "city", x: 38.9, y: 27.1, faction: "empire" },
  { id: "emp3", name: "emp3", type: "city", x: 20.8, y: 37.0, faction: "empire" },
  { id: "emp4", name: "emp4", type: "city", x: 29.8, y: 39.2, faction: "empire" },
  { id: "emp5", name: "emp5", type: "city", x: 42.4, y: 42.0, faction: "empire" },
  { id: "emp6", name: "emp6", type: "city", x: 27.0, y: 49.3, faction: "empire" },
  { id: "emp7", name: "emp7", type: "city", x: 19.2, y: 51.1, faction: "empire" },

  // === REBELLION (gray) ===
  { id: "reb1", name: "reb1", type: "city", x: 23.3, y: 51.5, faction: "rebellion" },
  { id: "reb2", name: "reb2", type: "city", x: 9.5, y: 56.3, faction: "rebellion" },
  { id: "reb3", name: "reb3", type: "city", x: 10.6, y: 64.6, faction: "rebellion" },

  // === REPUBLIC (blue) ===
  { id: "rep1", name: "rep1", type: "city", x: 74.5, y: 12.8, faction: "republic" },
  { id: "rep2", name: "rep2", type: "city", x: 26.7, y: 55.1, faction: "republic" },
  { id: "rep3", name: "rep3", type: "city", x: 31.5, y: 58.9, faction: "republic" },
  { id: "rep4", name: "rep4", type: "city", x: 42.7, y: 65.1, faction: "republic" },
  { id: "rep5", name: "rep5", type: "city", x: 36.5, y: 70.6, faction: "republic" },
  { id: "rep6", name: "rep6", type: "city", x: 19.3, y: 74.5, faction: "republic" },

  // === SUBBGARS (purple) ===
  { id: "sub1", name: "sub1", type: "city", x: 65.8, y: 15.2, faction: "subbgars" },
  { id: "sub2", name: "sub2", type: "city", x: 54.5, y: 18.4, faction: "subbgars" },
  { id: "sub3", name: "sub3", type: "city", x: 80.8, y: 24.9, faction: "subbgars" },

  // === TROLLS (green) ===
  { id: "trl1", name: "trl1", type: "city", x: 95.7, y: 39.3, faction: "trolls" },
  { id: "trl2", name: "trl2", type: "city", x: 57.7, y: 40.5, faction: "trolls" },
  { id: "trl3", name: "trl3", type: "city", x: 8.4, y: 50.6, faction: "trolls" },
  { id: "trl4", name: "trl4", type: "city", x: 80.1, y: 50.7, faction: "trolls" },
  { id: "trl5", name: "trl5", type: "city", x: 44.2, y: 53.9, faction: "trolls" },
  { id: "trl6", name: "trl6", type: "city", x: 89.2, y: 61.9, faction: "trolls" },

  // === BATTLE / CROSSING POINTS ===
  { id: "x1", name: "x1", type: "battle", x: 66.4, y: 6.9 },
  { id: "x2", name: "x2", type: "battle", x: 40.4, y: 7.3 },
  { id: "x3", name: "x3", type: "battle", x: 49.9, y: 7.6 },
  { id: "x4", name: "x4", type: "battle", x: 69.5, y: 8.2 },
  { id: "x5", name: "x5", type: "battle", x: 54.0, y: 11.2 },
  { id: "x6", name: "x6", type: "battle", x: 45.3, y: 12.4 },
  { id: "x7", name: "x7", type: "battle", x: 39.8, y: 13.2 },
  { id: "x8", name: "x8", type: "battle", x: 61.4, y: 18.9 },
  { id: "x9", name: "x9", type: "battle", x: 89.4, y: 25.5 },
  { id: "x10", name: "x10", type: "battle", x: 84.3, y: 26.0 },
  { id: "x11", name: "x11", type: "battle", x: 86.2, y: 34.1 },
  { id: "x12", name: "x12", type: "battle", x: 38.2, y: 34.7 },
  { id: "x13", name: "x13", type: "battle", x: 91.3, y: 34.7 },
  { id: "x14", name: "x14", type: "battle", x: 35.7, y: 40.3 },
  { id: "x15", name: "x15", type: "battle", x: 31.2, y: 43.3 },
  { id: "x16", name: "x16", type: "battle", x: 17.6, y: 47.4 },
  { id: "x17", name: "x17", type: "battle", x: 12.9, y: 49.1 },
  { id: "x18", name: "x18", type: "battle", x: 37.2, y: 50.4 },
  { id: "x19", name: "x19", type: "battle", x: 13.4, y: 53.4 },
  { id: "x20", name: "x20", type: "battle", x: 30.5, y: 54.7 },
  { id: "x21", name: "x21", type: "battle", x: 39.8, y: 55.1 },
  { id: "x22", name: "x22", type: "battle", x: 69.8, y: 55.5 },
  { id: "x23", name: "x23", type: "battle", x: 74.8, y: 56.8 },
  { id: "x24", name: "x24", type: "battle", x: 28.3, y: 59.9 },
  { id: "x25", name: "x25", type: "battle", x: 34.8, y: 59.9 },
  { id: "x26", name: "x26", type: "battle", x: 18.5, y: 60.8 },
  { id: "x27", name: "x27", type: "battle", x: 79.2, y: 62.1 },
  { id: "x28", name: "x28", type: "battle", x: 6.2, y: 64.6 },
  { id: "x29", name: "x29", type: "battle", x: 31.9, y: 66.9 },
  { id: "x30", name: "x30", type: "battle", x: 78.5, y: 70.8 },
  { id: "x31", name: "x31", type: "battle", x: 89.8, y: 72.9 },
  { id: "x32", name: "x32", type: "battle", x: 7.4, y: 73.6 },
  { id: "x33", name: "x33", type: "battle", x: 34.8, y: 74.9 },
  { id: "x34", name: "x34", type: "battle", x: 78.8, y: 78.3 },
  { id: "x35", name: "x35", type: "battle", x: 17.8, y: 80.1 },
  { id: "x36", name: "x36", type: "battle", x: 69.8, y: 85.0 },
  { id: "x37", name: "x37", type: "battle", x: 48.0, y: 86.3 },
  { id: "x38", name: "x38", type: "battle", x: 56.3, y: 86.8 },
  { id: "x39", name: "x39", type: "battle", x: 80.8, y: 88.1 },
  { id: "x40", name: "x40", type: "battle", x: 50.0, y: 90.2 },
  { id: "x41", name: "x41", type: "battle", x: 67.6, y: 90.9 },

  // === SPECIAL LOCATIONS ===
  { id: "s1", name: "s1", type: "port", x: 85.0, y: 4.3 },
  { id: "s2", name: "s2", type: "port", x: 37.1, y: 21.3 },
  { id: "s3", name: "s3", type: "port", x: 43.8, y: 22.2 },
  { id: "s4", name: "s4", type: "port", x: 24.5, y: 24.3 },
  { id: "s5", name: "s5", type: "port", x: 69.3, y: 25.2 },
  { id: "s6", name: "s6", type: "port", x: 56.1, y: 26.6 },
  { id: "s7", name: "s7", type: "port", x: 17.8, y: 30.8 },
  { id: "s8", name: "s8", type: "port", x: 25.1, y: 35.4 },
  { id: "s9", name: "s9", type: "port", x: 46.4, y: 35.8 },
  { id: "s10", name: "s10", type: "port", x: 62.3, y: 38.1 },
  { id: "s11", name: "s11", type: "port", x: 80.9, y: 44.6 },
  { id: "s12", name: "s12", type: "port", x: 91.2, y: 51.6 },
  { id: "s13", name: "s13", type: "port", x: 59.7, y: 52.0 },
  { id: "s14", name: "s14", type: "port", x: 48.5, y: 53.5 },
  { id: "s15", name: "s15", type: "port", x: 1.4, y: 56.7 },
  { id: "s16", name: "s16", type: "port", x: 22.8, y: 63.8 },
  { id: "s17", name: "s17", type: "port", x: 63.7, y: 68.4 },
  { id: "s18", name: "s18", type: "port", x: 47.8, y: 72.6 },
  { id: "s19", name: "s19", type: "port", x: 95.3, y: 78.1 },
  { id: "s20", name: "s20", type: "port", x: 37.1, y: 79.5 },
  { id: "s21", name: "s21", type: "port", x: 27.6, y: 82.3 },
  { id: "s22", name: "s22", type: "port", x: 33.5, y: 88.9 },
  { id: "s23", name: "s23", type: "port", x: 96.7, y: 90.7 },
  { id: "s24", name: "s24", type: "port", x: 9.4, y: 92.5 },
  { id: "s25", name: "s25", type: "port", x: 83.4, y: 96.1 },
  { id: "s26", name: "s26", type: "port", x: 60.5, y: 97.5 },
];

// Edges stored in map config file, loaded at runtime
export let MAP_EDGES: MapEdge[] = [];

export function setMapEdges(edges: MapEdge[]) {
  MAP_EDGES = edges;
}

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
  avains: "#93c5fd",
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
