"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { MAP_NODES, FACTION_COLORS, NODE_ICONS } from "@/lib/games/velderanMap";
import type { MapEdge, NodeType } from "@/lib/games/velderanMap";

interface NodeOverride {
  name?: string;
  type?: NodeType;
}

export default function MapEditorPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [edges, setEdges] = useState<MapEdge[]>([]);
  const [nodeOverrides, setNodeOverrides] = useState<Record<string, NodeOverride>>({});
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [drawMode, setDrawMode] = useState<"path" | "sea_path" | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [editingNode, setEditingNode] = useState<string | null>(null);
  const mapRef = useRef<HTMLDivElement>(null);

  const user = session?.user as { id?: string; username?: string } | undefined;
  const isAdmin = user && ((user.username || "").includes("acoulbot") || (user.id || "").includes("acoulbot"));

  const loadConfig = useCallback(async () => {
    try {
      const res = await fetch("/api/games/map-config");
      if (res.ok) {
        const data = await res.json();
        setEdges(data.edges || []);
        setNodeOverrides(data.nodeOverrides || {});
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (status === "authenticated") {
      if (!isAdmin) {
        router.push("/games/velderan");
        return;
      }
      loadConfig();
    } else if (status === "unauthenticated") {
      router.push("/");
    }
  }, [status, isAdmin, router, loadConfig]);

  const getNodeType = (nodeId: string): NodeType => {
    const override = nodeOverrides[nodeId];
    if (override?.type) return override.type;
    const node = MAP_NODES.find((n) => n.id === nodeId);
    return node?.type || "battle";
  };

  const getNodeName = (nodeId: string): string => {
    const override = nodeOverrides[nodeId];
    if (override?.name) return override.name;
    return nodeId;
  };

  const handleNodeClick = (nodeId: string) => {
    if (editingNode) return;

    if (drawMode && selectedNode && selectedNode !== nodeId) {
      const isSea = drawMode === "sea_path";
      const exists = edges.some(
        (e) =>
          (e.from === selectedNode && e.to === nodeId) ||
          (e.from === nodeId && e.to === selectedNode)
      );
      if (exists) {
        setEdges(edges.filter(
          (e) =>
            !(
              (e.from === selectedNode && e.to === nodeId) ||
              (e.from === nodeId && e.to === selectedNode)
            )
        ));
        setMessage(`Путь удалён: ${getNodeName(selectedNode)} → ${getNodeName(nodeId)}`);
      } else {
        setEdges([...edges, { from: selectedNode, to: nodeId, sea: isSea || undefined }]);
        setMessage(`Путь создан: ${getNodeName(selectedNode)} → ${getNodeName(nodeId)}${isSea ? " (морской)" : ""}`);
      }
      setSelectedNode(null);
    } else {
      setSelectedNode(nodeId);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/games/map-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ edges, nodeOverrides }),
      });
      if (res.ok) {
        setMessage("Сохранено!");
      } else {
        setMessage("Ошибка сохранения");
      }
    } catch {
      setMessage("Ошибка сети");
    }
    setSaving(false);
  };

  const updateNodeType = (nodeId: string, type: NodeType) => {
    setNodeOverrides((prev) => ({
      ...prev,
      [nodeId]: { ...prev[nodeId], type },
    }));
  };

  const updateNodeName = (nodeId: string, name: string) => {
    setNodeOverrides((prev) => ({
      ...prev,
      [nodeId]: { ...prev[nodeId], name },
    }));
  };

  if (status === "loading" || !isAdmin) {
    return (
      <div className="h-screen bg-neutral-950 flex items-center justify-center">
        <div className="text-white/50">Загрузка...</div>
      </div>
    );
  }

  const nodeTypes: NodeType[] = ["city", "battle", "port", "shrine", "windrose", "pirate", "ghost", "camp", "smuggler"];

  return (
    <div className="h-screen bg-neutral-950 flex flex-col overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-4 py-2 bg-neutral-900 border-b border-white/10 flex-shrink-0">
        <button onClick={() => router.push("/games/velderan")} className="text-gray-500 hover:text-gray-300 text-sm">
          ← Назад
        </button>
        <span className="text-white font-bold">🗺️ Редактор карты</span>
        <div className="flex-1" />

        <button
          onClick={() => { setDrawMode(drawMode === "path" ? null : "path"); setSelectedNode(null); }}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
            drawMode === "path"
              ? "bg-amber-600 text-white"
              : "bg-white/5 text-gray-300 hover:bg-white/10"
          }`}
        >
          ✏️ Путь (суша)
        </button>
        <button
          onClick={() => { setDrawMode(drawMode === "sea_path" ? null : "sea_path"); setSelectedNode(null); }}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
            drawMode === "sea_path"
              ? "bg-sky-600 text-white"
              : "bg-white/5 text-gray-300 hover:bg-white/10"
          }`}
        >
          🌊 Путь (море)
        </button>

        <span className="text-gray-500 text-sm">
          Пути: {edges.length} | Ноды: {MAP_NODES.length}
        </span>

        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-1.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-500 disabled:opacity-50 transition-all"
        >
          {saving ? "..." : "💾 Сохранить"}
        </button>

        {message && (
          <span className="text-amber-400 text-sm animate-pulse">{message}</span>
        )}
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Map — fit to screen, aspect ratio 2400:1792 */}
        <div ref={mapRef} className="flex-1 relative flex items-center justify-center overflow-hidden bg-neutral-950">
          <div className="relative w-full" style={{ aspectRatio: "2400/1792", maxHeight: "100%" }}>
            <Image
              src="/games/velderan/map-editor.png"
              alt="Карта"
              fill
              className="object-cover"
              priority
              unoptimized
            />

            {/* SVG overlay for edges — uses viewBox to match % coords */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
              {edges.map((edge, i) => {
                const from = MAP_NODES.find((n) => n.id === edge.from);
                const to = MAP_NODES.find((n) => n.id === edge.to);
                if (!from || !to) return null;
                return (
                  <line
                    key={i}
                    x1={from.x}
                    y1={from.y}
                    x2={to.x}
                    y2={to.y}
                    stroke={edge.sea ? "#38bdf8" : "#fbbf24"}
                    strokeWidth={0.15}
                    strokeDasharray="0.5 0.3"
                    opacity={0.8}
                  />
                );
              })}
            </svg>

            {/* Nodes — positioned with % for responsive scaling */}
            {MAP_NODES.map((node) => {
              const type = getNodeType(node.id);
              const isSelected = selectedNode === node.id;
              const isCity = type === "city";
              const factionColor = node.faction ? FACTION_COLORS[node.faction] : undefined;
              const icon = NODE_ICONS[type] || "❓";

              return (
                <div
                  key={node.id}
                  className="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer group"
                  style={{ left: `${node.x}%`, top: `${node.y}%`, zIndex: isSelected ? 50 : 10 }}
                  onClick={() => handleNodeClick(node.id)}
                  onDoubleClick={() => setEditingNode(node.id)}
                >
                  <div
                    className={`flex items-center justify-center rounded-full transition-all ${
                      isSelected
                        ? "ring-4 ring-yellow-400 scale-125"
                        : "hover:scale-110"
                    }`}
                    style={{
                      width: isCity ? "20px" : "16px",
                      height: isCity ? "20px" : "16px",
                      backgroundColor: isCity
                        ? factionColor || "#666"
                        : "rgba(0,0,0,0.7)",
                      border: `2px solid ${isCity ? "#fff" : factionColor || "#888"}`,
                    }}
                  >
                    <span style={{ fontSize: isCity ? "8px" : "7px" }}>{icon}</span>
                  </div>

                  {/* Tooltip */}
                  <div className="absolute left-1/2 -translate-x-1/2 -top-6 bg-black/90 text-white text-[10px] px-1.5 py-0.5 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
                    {getNodeName(node.id)} ({type})
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Side panel */}
        <div className="w-72 bg-neutral-900 border-l border-white/10 overflow-y-auto flex-shrink-0 p-3">
          {drawMode ? (
            <div className="mb-4 p-3 bg-amber-900/20 border border-amber-500/30 rounded-lg">
              <p className="text-amber-400 text-sm font-medium mb-1">
                {drawMode === "path" ? "✏️ Рисование пути (суша)" : "🌊 Рисование пути (море)"}
              </p>
              <p className="text-gray-400 text-xs">
                {selectedNode
                  ? `Выбрана: ${getNodeName(selectedNode)}. Кликните на вторую точку.`
                  : "Кликните на первую точку пути."}
              </p>
              <p className="text-gray-500 text-xs mt-1">
                Повторный клик на существующий путь удаляет его.
              </p>
            </div>
          ) : (
            <div className="mb-4 p-3 bg-neutral-800 rounded-lg">
              <p className="text-gray-300 text-sm font-medium">Инструкция</p>
              <p className="text-gray-500 text-xs mt-1">
                Нажмите &ldquo;Путь&rdquo; и кликайте на 2 точки для создания пунктирной линии.
                Двойной клик на ноду — редактирование типа/имени.
              </p>
            </div>
          )}

          {/* Selected node info */}
          {selectedNode && !drawMode && (
            <div className="mb-4 p-3 bg-neutral-800 rounded-lg">
              <p className="text-white text-sm font-medium mb-2">
                {getNodeName(selectedNode)}
              </p>
              <p className="text-gray-400 text-xs mb-2">ID: {selectedNode}</p>
              {(() => {
                const node = MAP_NODES.find((n) => n.id === selectedNode);
                if (!node) return null;
                return (
                  <p className="text-gray-500 text-xs">
                    Позиция: ({node.x}%, {node.y}%)
                  </p>
                );
              })()}
              <div className="mt-2">
                <p className="text-gray-400 text-xs mb-1">Связи:</p>
                {edges
                  .filter((e) => e.from === selectedNode || e.to === selectedNode)
                  .map((e, i) => {
                    const other = e.from === selectedNode ? e.to : e.from;
                    return (
                      <div key={i} className="flex items-center justify-between text-xs py-0.5">
                        <span className="text-gray-300">{getNodeName(other)}</span>
                        <span className={e.sea ? "text-sky-400" : "text-amber-400"}>
                          {e.sea ? "🌊" : "🏔️"}
                        </span>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* Node editing modal */}
          {editingNode && (
            <div className="mb-4 p-3 bg-neutral-800 rounded-lg border border-purple-500/30">
              <p className="text-purple-400 text-sm font-medium mb-2">
                Редактирование: {editingNode}
              </p>
              <div className="mb-2">
                <label className="text-gray-400 text-xs">Имя:</label>
                <input
                  type="text"
                  value={nodeOverrides[editingNode]?.name || ""}
                  onChange={(e) => updateNodeName(editingNode, e.target.value)}
                  placeholder={editingNode}
                  className="w-full mt-1 px-2 py-1 bg-neutral-700 text-white rounded text-sm border border-white/10"
                />
              </div>
              <div className="mb-2">
                <label className="text-gray-400 text-xs">Тип:</label>
                <div className="grid grid-cols-3 gap-1 mt-1">
                  {nodeTypes.map((t) => (
                    <button
                      key={t}
                      onClick={() => updateNodeType(editingNode, t)}
                      className={`text-xs px-2 py-1 rounded ${
                        getNodeType(editingNode) === t
                          ? "bg-purple-600 text-white"
                          : "bg-neutral-700 text-gray-300 hover:bg-neutral-600"
                      }`}
                    >
                      {NODE_ICONS[t]} {t}
                    </button>
                  ))}
                </div>
              </div>
              <button
                onClick={() => setEditingNode(null)}
                className="w-full mt-2 px-3 py-1 bg-neutral-700 text-gray-300 rounded text-sm hover:bg-neutral-600"
              >
                Закрыть
              </button>
            </div>
          )}

          {/* Stats */}
          <div className="p-3 bg-neutral-800 rounded-lg text-xs">
            <p className="text-gray-300 font-medium mb-2">Статистика</p>
            <p className="text-gray-500">Города: {MAP_NODES.filter((n) => n.type === "city").length}</p>
            <p className="text-gray-500">Битвы: {MAP_NODES.filter((n) => n.type === "battle").length}</p>
            <p className="text-gray-500">Порты: {MAP_NODES.filter((n) => n.type === "port").length}</p>
            <p className="text-gray-500">Святилища: {MAP_NODES.filter((n) => n.type === "shrine").length}</p>
            <p className="text-gray-500">Пути суша: {edges.filter((e) => !e.sea).length}</p>
            <p className="text-gray-500">Пути море: {edges.filter((e) => e.sea).length}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
