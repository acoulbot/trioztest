"use client";

import { useMemo } from "react";
import type { GameState, MapNode, Unit } from "@/lib/games/veld-eran/types";
import { EDGES, NODES, NODES_BY_ID } from "@/lib/games/veld-eran/map";
import { FACTIONS } from "@/lib/games/veld-eran/factions";

interface Props {
  state: GameState;
  selectedUnitId: string | null;
  legalMoveNodeIds: string[];
  onClickNode: (nodeId: string) => void;
  onClickUnit: (unit: Unit) => void;
}

const NODE_ICONS: Record<string, string> = {
  city: "●",
  battle: "⚔",
  sanctuary: "◆",
  port: "⚓",
  sea: "✦",
  "pirate-cove": "☠",
  "smuggler-lair": "⚙",
  "ghost-temple": "♰",
  "sheybanid-camp": "⛺",
  "sands-of-sikhvaris": "🎲",
  "solid-of-giordt": "🎲",
};

function nodeFill(node: MapNode): string {
  if (node.faction) return FACTIONS[node.faction].color;
  switch (node.kind) {
    case "sanctuary":
      return "#fbbf24";
    case "port":
      return "#94a3b8";
    case "sea":
      return "#38bdf8";
    case "battle":
      return "#f87171";
    case "pirate-cove":
      return "#111827";
    case "smuggler-lair":
      return "#a78bfa";
    case "ghost-temple":
      return "#e0e7ff";
    case "sheybanid-camp":
      return "#fb923c";
    case "sands-of-sikhvaris":
      return "#fde68a";
    case "solid-of-giordt":
      return "#cbd5e1";
    default:
      return "#9ca3af";
  }
}

export default function GameBoard({
  state,
  selectedUnitId,
  legalMoveNodeIds,
  onClickNode,
  onClickUnit,
}: Props) {
  const unitsByNode = useMemo(() => {
    const map = new Map<string, Unit[]>();
    for (const u of state.units) {
      if (!u.nodeId) continue;
      const arr = map.get(u.nodeId) ?? [];
      arr.push(u);
      map.set(u.nodeId, arr);
    }
    return map;
  }, [state.units]);

  const selectedUnit = state.units.find((u) => u.id === selectedUnitId);
  const selectedNodeId = selectedUnit?.nodeId ?? null;
  const legalSet = useMemo(() => new Set(legalMoveNodeIds), [legalMoveNodeIds]);

  return (
    <div className="relative w-full" style={{ aspectRatio: "16 / 9" }}>
      <img
        src="/games/veld-eran/map.png"
        alt="Карта Вельд'Эран"
        className="absolute inset-0 w-full h-full object-cover rounded-xl border border-white/10"
        draggable={false}
      />

      <svg
        viewBox="0 0 1000 562"
        preserveAspectRatio="none"
        className="absolute inset-0 w-full h-full"
      >
        {/* Связи (рёбра) */}
        {EDGES.map((edge, i) => {
          const a = NODES_BY_ID[edge.a];
          const b = NODES_BY_ID[edge.b];
          if (!a || !b) return null;
          const stroke =
            edge.kind === "sea" ? "rgba(99,179,237,0.45)" : "rgba(248,250,252,0.40)";
          return (
            <line
              key={i}
              x1={a.x * 1000}
              y1={a.y * 562}
              x2={b.x * 1000}
              y2={b.y * 562}
              stroke={stroke}
              strokeWidth={1.2}
              strokeDasharray={edge.kind === "sea" ? "5 4" : "0"}
            />
          );
        })}

        {/* Узлы */}
        {NODES.map((n) => {
          const cx = n.x * 1000;
          const cy = n.y * 562;
          const isSelected = selectedNodeId === n.id;
          const isLegal = legalSet.has(n.id);
          const r = isSpecial(n.kind) ? 14 : 8;
          return (
            <g
              key={n.id}
              onClick={() => onClickNode(n.id)}
              className="cursor-pointer"
              style={{ pointerEvents: "auto" }}
            >
              {isLegal && (
                <circle
                  cx={cx}
                  cy={cy}
                  r={r + 8}
                  fill="rgba(34,197,94,0.18)"
                  stroke="#22c55e"
                  strokeDasharray="3 3"
                  strokeWidth={1.5}
                />
              )}
              {isSelected && (
                <circle
                  cx={cx}
                  cy={cy}
                  r={r + 5}
                  fill="none"
                  stroke="#22d3ee"
                  strokeWidth={2}
                />
              )}
              <circle
                cx={cx}
                cy={cy}
                r={r}
                fill={nodeFill(n)}
                stroke="#0f172a"
                strokeWidth={1.5}
              />
              <text
                x={cx}
                y={cy + 3}
                textAnchor="middle"
                fontSize={11}
                fill={textColor(n)}
                style={{ pointerEvents: "none", userSelect: "none" }}
              >
                {NODE_ICONS[n.kind] ?? "●"}
              </text>
            </g>
          );
        })}

        {/* Фишки на узлах */}
        {NODES.map((n) => {
          const units = unitsByNode.get(n.id) ?? [];
          if (units.length === 0) return null;
          const cx = n.x * 1000;
          const cy = n.y * 562;
          return (
            <g key={`u-${n.id}`}>
              {units.map((u, i) => {
                const offset = (i - (units.length - 1) / 2) * 11;
                const ux = cx + offset;
                const uy = cy - 18;
                const fac = FACTIONS[u.faction];
                const isSel = selectedUnitId === u.id;
                return (
                  <g
                    key={u.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      onClickUnit(u);
                    }}
                    className="cursor-pointer"
                  >
                    <rect
                      x={ux - 6}
                      y={uy - 8}
                      width={12}
                      height={u.kind === "guard" ? 14 : 10}
                      rx={2}
                      fill={fac.color}
                      stroke={isSel ? "#22d3ee" : fac.borderColor}
                      strokeWidth={isSel ? 2 : 1.2}
                    />
                    {u.kind === "guard" && (
                      <text
                        x={ux}
                        y={uy + 1}
                        textAnchor="middle"
                        fontSize={9}
                        fontWeight={700}
                        fill={u.faction === "avayns" ? "#1f2937" : "#fff"}
                        style={{ pointerEvents: "none" }}
                      >
                        ★
                      </text>
                    )}
                    {u.movesLeft > 0 && (
                      <circle
                        cx={ux + 7}
                        cy={uy - 7}
                        r={3}
                        fill="#22c55e"
                        stroke="#052e16"
                      />
                    )}
                  </g>
                );
              })}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function isSpecial(kind: string): boolean {
  return [
    "ghost-temple",
    "smuggler-lair",
    "pirate-cove",
    "sheybanid-camp",
    "sands-of-sikhvaris",
    "solid-of-giordt",
    "sanctuary",
  ].includes(kind);
}

function textColor(n: MapNode): string {
  if (n.faction === "avayns") return "#1f2937";
  if (n.kind === "ghost-temple") return "#1e293b";
  if (n.kind === "sands-of-sikhvaris") return "#7c2d12";
  return "#f8fafc";
}
