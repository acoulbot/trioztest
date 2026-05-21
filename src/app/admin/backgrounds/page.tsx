"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";

interface WindowBg {
  id: string;
  windowId: string;
  animationType: string;
  customCss: string | null;
  gradientFrom: string | null;
  gradientVia: string | null;
  gradientTo: string | null;
  active: boolean;
}

const windowOptions = [
  { id: "trioz", label: "Т.Р.И.О.\"Z\"", color: "text-fantasy-red" },
  { id: "pero", label: "Перо Измерений", color: "text-fantasy-purple" },
  { id: "connect", label: "TZ.Connect", color: "text-cyan-400" },
  { id: "library", label: "TZ.Library", color: "text-fantasy-emerald" },
];

const animationTypes = [
  { value: "default", label: "По умолчанию" },
  { value: "particles", label: "Частицы" },
  { value: "waves", label: "Волны" },
  { value: "nebula", label: "Туманность" },
  { value: "matrix", label: "Матрица" },
  { value: "aurora", label: "Северное сияние" },
  { value: "custom", label: "Пользовательский CSS" },
];

export default function AdminBackgroundsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [backgrounds, setBackgrounds] = useState<WindowBg[]>([]);
  const [editingWindow, setEditingWindow] = useState<string | null>(null);
  const [form, setForm] = useState({
    animationType: "default",
    customCss: "",
    gradientFrom: "",
    gradientVia: "",
    gradientTo: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (status === "authenticated" && session?.user?.role !== "ADMIN") {
      router.push("/");
    }
  }, [session, status, router]);

  const fetchBackgrounds = async () => {
    const res = await fetch("/api/window-backgrounds");
    setBackgrounds(await res.json());
  };

  useEffect(() => {
    if (session?.user?.role === "ADMIN") fetchBackgrounds();
  }, [session]);

  const handleEdit = (windowId: string) => {
    const existing = backgrounds.find((b) => b.windowId === windowId);
    if (existing) {
      setForm({
        animationType: existing.animationType,
        customCss: existing.customCss || "",
        gradientFrom: existing.gradientFrom || "",
        gradientVia: existing.gradientVia || "",
        gradientTo: existing.gradientTo || "",
      });
    } else {
      setForm({ animationType: "default", customCss: "", gradientFrom: "", gradientVia: "", gradientTo: "" });
    }
    setEditingWindow(windowId);
  };

  const handleSave = async () => {
    if (!editingWindow) return;
    setSaving(true);
    await fetch("/api/window-backgrounds", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ windowId: editingWindow, ...form }),
    });
    setSaving(false);
    setEditingWindow(null);
    fetchBackgrounds();
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-900">
        <div className="animate-spin w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (session?.user?.role !== "ADMIN") return null;

  return (
    <div className="min-h-screen bg-dark-900 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <Link href="/admin" className="text-cyan-400 hover:text-cyan-300 text-sm mb-2 inline-flex items-center gap-1 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Админ-панель
            </Link>
            <h1 className="text-2xl font-bold text-white">Фоны окон главной страницы</h1>
            <p className="text-gray-400 text-sm mt-1">Настройка анимированных фонов для 4 окон на главной странице</p>
          </div>
        </div>

        {/* Windows Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {windowOptions.map((win) => {
            const bg = backgrounds.find((b) => b.windowId === win.id);
            const isEditing = editingWindow === win.id;

            return (
              <motion.div
                key={win.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-card p-6 border border-white/10"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className={`text-lg font-bold ${win.color}`}>{win.label}</h3>
                  <div className="flex items-center gap-2">
                    {bg && (
                      <span className="text-xs text-gray-500 px-2 py-1 rounded-full bg-white/5">
                        {animationTypes.find((a) => a.value === bg.animationType)?.label || bg.animationType}
                      </span>
                    )}
                    <button
                      onClick={() => isEditing ? setEditingWindow(null) : handleEdit(win.id)}
                      className="text-sm text-cyan-400 hover:text-cyan-300 transition-colors"
                    >
                      {isEditing ? "Отмена" : "Изменить"}
                    </button>
                  </div>
                </div>

                {/* Preview */}
                <div className="h-32 rounded-xl overflow-hidden mb-4 relative border border-white/5">
                  <div className={`absolute inset-0 bg-gradient-to-br ${
                    bg?.gradientFrom && bg?.gradientTo
                      ? ""
                      : win.id === "trioz" ? "from-red-950/80 via-rose-900/40 to-dark-900/90"
                      : win.id === "pero" ? "from-purple-950/80 via-violet-900/40 to-dark-900/90"
                      : win.id === "connect" ? "from-cyan-950/80 via-teal-900/40 to-dark-900/90"
                      : "from-emerald-950/80 via-green-900/40 to-dark-900/90"
                  }`}
                    style={bg?.gradientFrom && bg?.gradientTo ? {
                      background: `linear-gradient(135deg, ${bg.gradientFrom}, ${bg.gradientVia || "transparent"}, ${bg.gradientTo})`
                    } : undefined}
                  />
                  {bg?.customCss && (
                    <div className="absolute inset-0" style={{ cssText: bg.customCss } as React.CSSProperties} />
                  )}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-xs text-gray-400">
                      {bg ? `Тип: ${bg.animationType}` : "По умолчанию"}
                    </span>
                  </div>
                </div>

                {/* Edit Form */}
                {isEditing && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="space-y-4 border-t border-white/10 pt-4"
                  >
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Тип анимации</label>
                      <select
                        value={form.animationType}
                        onChange={(e) => setForm({ ...form, animationType: e.target.value })}
                        className="input-field"
                      >
                        {animationTypes.map((type) => (
                          <option key={type.value} value={type.value}>{type.label}</option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block text-sm text-gray-400 mb-1">Градиент от</label>
                        <input
                          type="text"
                          value={form.gradientFrom}
                          onChange={(e) => setForm({ ...form, gradientFrom: e.target.value })}
                          className="input-field"
                          placeholder="#ff4444"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-400 mb-1">Градиент через</label>
                        <input
                          type="text"
                          value={form.gradientVia}
                          onChange={(e) => setForm({ ...form, gradientVia: e.target.value })}
                          className="input-field"
                          placeholder="#8b5cf6"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-400 mb-1">Градиент до</label>
                        <input
                          type="text"
                          value={form.gradientTo}
                          onChange={(e) => setForm({ ...form, gradientTo: e.target.value })}
                          className="input-field"
                          placeholder="#0a0a0f"
                        />
                      </div>
                    </div>

                    {form.animationType === "custom" && (
                      <div>
                        <label className="block text-sm text-gray-400 mb-1">Пользовательский CSS</label>
                        <textarea
                          value={form.customCss}
                          onChange={(e) => setForm({ ...form, customCss: e.target.value })}
                          className="input-field min-h-[100px] font-mono text-sm"
                          placeholder="background: linear-gradient(...);"
                        />
                      </div>
                    )}

                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="btn-primary text-sm"
                    >
                      {saving ? "Сохранение..." : "Сохранить"}
                    </button>
                  </motion.div>
                )}
              </motion.div>
            );
          })}
        </div>

        {/* Info */}
        <div className="glass-card p-6 border border-white/10">
          <h3 className="text-lg font-bold text-white mb-3">Типы анимаций</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
            {animationTypes.map((type) => (
              <div key={type.value} className="flex items-center gap-2 text-gray-400 p-2 rounded-lg bg-white/[0.02]">
                <span className="w-2 h-2 rounded-full bg-cyan-400/50" />
                <span className="font-medium text-white">{type.label}</span>
                <span className="text-gray-600">— {
                  type.value === "default" ? "стандартные SVG-анимации" :
                  type.value === "particles" ? "плавающие частицы" :
                  type.value === "waves" ? "волновая анимация" :
                  type.value === "nebula" ? "космическая туманность" :
                  type.value === "matrix" ? "поток данных" :
                  type.value === "aurora" ? "полярное сияние" :
                  "свой CSS-код"
                }</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
