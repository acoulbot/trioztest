"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import GlowAvatar, { GLOW_PRESETS, GlowAvatarUser } from "@/components/ui/GlowAvatar";
import { getDMSoundEnabled, setDMSoundEnabled, playDMNotification } from "@/lib/dmSound";

function DMSoundToggle() {
  const [on, setOn] = useState(true);
  useEffect(() => { setOn(getDMSoundEnabled()); }, []);
  const toggle = () => {
    const next = !on;
    setOn(next);
    setDMSoundEnabled(next);
    if (next) playDMNotification(); // preview sound on enable
  };
  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-neutral-900 dark:text-white">Звук сообщений</p>
        <p className="text-xs text-neutral-400 mt-0.5">Уведомление при получении личного сообщения</p>
      </div>
      <button
        onClick={toggle}
        className={`relative w-11 h-6 rounded-full transition-colors ${
          on ? "bg-violet-600" : "bg-neutral-300 dark:bg-neutral-600"
        }`}
      >
        <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${on ? "translate-x-5" : "translate-x-0"}`} />
      </button>
    </div>
  );
}

interface ProfileSettings {
  avatarGlowEnabled: boolean;
  avatarGlowColors: string | null;
}

interface ProfileSettingsModalProps {
  user: GlowAvatarUser;
  onClose: () => void;
  onSaved: (settings: ProfileSettings) => void;
}

const PRESET_KEYS = Object.keys(GLOW_PRESETS) as (keyof typeof GLOW_PRESETS)[];

function detectPreset(colorsJson: string | null): string | null {
  if (!colorsJson) return "royal";
  try {
    const c = JSON.stringify(JSON.parse(colorsJson));
    for (const key of PRESET_KEYS) {
      if (JSON.stringify(GLOW_PRESETS[key].colors) === c) return key;
    }
  } catch { /* */ }
  return null;
}

export default function ProfileSettingsModal({ user, onClose, onSaved }: ProfileSettingsModalProps) {
  const [glowEnabled, setGlowEnabled] = useState(user.avatarGlowEnabled ?? false);
  const [selectedPreset, setSelectedPreset] = useState<string | null>(detectPreset(user.avatarGlowColors ?? null));
  const [customColors, setCustomColors] = useState<string[]>(() => {
    if (user.avatarGlowColors) {
      try {
        const p = JSON.parse(user.avatarGlowColors) as string[];
        if (Array.isArray(p) && p.length >= 2) return p;
      } catch { /* */ }
    }
    return [...GLOW_PRESETS.royal.colors];
  });
  const [useCustom, setUseCustom] = useState(detectPreset(user.avatarGlowColors ?? null) === null && !!user.avatarGlowColors);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeColors = useCustom
    ? customColors
    : GLOW_PRESETS[selectedPreset ?? "royal"].colors;

  const previewUser: GlowAvatarUser = {
    ...user,
    avatarGlowEnabled: glowEnabled,
    avatarGlowColors: JSON.stringify(activeColors),
  };

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/profile/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          avatarGlowEnabled: glowEnabled,
          avatarGlowColors: glowEnabled ? activeColors : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Ошибка сохранения");
      } else {
        onSaved({
          avatarGlowEnabled: data.avatarGlowEnabled,
          avatarGlowColors: data.avatarGlowColors,
        });
        onClose();
      }
    } catch {
      setError("Ошибка сети");
    }
    setSaving(false);
  }

  function addCustomColor() {
    if (customColors.length < 6) setCustomColors([...customColors, "#ffffff"]);
  }
  function removeCustomColor(i: number) {
    if (customColors.length > 2) setCustomColors(customColors.filter((_, idx) => idx !== i));
  }
  function updateCustomColor(i: number, val: string) {
    const next = [...customColors];
    next[i] = val;
    setCustomColors(next);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={{ type: "spring", damping: 24, stiffness: 280 }}
        className="relative z-10 w-full max-w-md bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-white/10 rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100 dark:border-white/5">
          <h2 className="text-base font-semibold text-neutral-900 dark:text-white">Настройки профиля</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-white/10 text-neutral-400 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-5 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* Preview */}
          <div className="flex items-center gap-4 p-4 bg-neutral-50 dark:bg-white/5 rounded-xl border border-neutral-200 dark:border-white/5">
            <div className="flex-shrink-0">
              <GlowAvatar user={previewUser} size={48} />
            </div>
            <div>
              <p className="text-sm font-medium text-neutral-900 dark:text-white">{user.name}</p>
              <p className="text-xs text-neutral-400">@{(user as { username?: string }).username ?? ""}</p>
              <p className="text-[11px] text-violet-500 dark:text-violet-400 mt-1">
                {glowEnabled ? "✨ Свечение активно" : "Свечение выключено"}
              </p>
            </div>
          </div>

          {/* Enable glow toggle */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-neutral-900 dark:text-white">Свечение аватара</p>
              <p className="text-xs text-neutral-400 mt-0.5">Анимированная переливающаяся обводка</p>
            </div>
            <button
              onClick={() => setGlowEnabled(!glowEnabled)}
              className={`relative w-11 h-6 rounded-full transition-colors ${
                glowEnabled ? "bg-violet-600" : "bg-neutral-300 dark:bg-neutral-600"
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                  glowEnabled ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {/* DM sound toggle */}
          <DMSoundToggle />

          <AnimatePresence>
            {glowEnabled && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden space-y-4"
              >
                {/* Presets */}
                <div>
                  <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-2">Готовые палитры</p>
                  <div className="grid grid-cols-3 gap-2">
                    {PRESET_KEYS.map((key) => {
                      const preset = GLOW_PRESETS[key];
                      const isActive = !useCustom && selectedPreset === key;
                      return (
                        <button
                          key={key}
                          onClick={() => { setSelectedPreset(key); setUseCustom(false); }}
                          className={`flex flex-col items-center gap-1.5 p-2.5 rounded-xl border transition-all ${
                            isActive
                              ? "border-violet-500 bg-violet-50 dark:bg-violet-500/10"
                              : "border-neutral-200 dark:border-white/10 hover:border-violet-300 dark:hover:border-violet-500/50 hover:bg-neutral-50 dark:hover:bg-white/5"
                          }`}
                        >
                          {/* Color strip */}
                          <div className="flex rounded-full overflow-hidden w-full h-3">
                            {preset.colors.slice(0, 5).map((c, i) => (
                              <div
                                key={i}
                                style={{ background: c, flex: 1 }}
                              />
                            ))}
                          </div>
                          <span className="text-[11px] text-neutral-600 dark:text-neutral-300">{preset.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Custom colors */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400">Своя палитра</p>
                    <button
                      onClick={() => setUseCustom(!useCustom)}
                      className={`text-[11px] px-2 py-0.5 rounded-full border transition-all ${
                        useCustom
                          ? "border-violet-500 text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-500/10"
                          : "border-neutral-200 dark:border-white/10 text-neutral-400 hover:border-violet-300"
                      }`}
                    >
                      {useCustom ? "✓ Используется" : "Использовать"}
                    </button>
                  </div>
                  <div className="space-y-2">
                    {customColors.map((c, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <input
                          type="color"
                          value={c}
                          onChange={(e) => { updateCustomColor(i, e.target.value); setUseCustom(true); }}
                          className="w-8 h-8 rounded-lg border border-neutral-200 dark:border-white/10 cursor-pointer bg-transparent"
                        />
                        <div
                          className="flex-1 h-3 rounded-full"
                          style={{ background: c }}
                        />
                        <span className="text-xs font-mono text-neutral-400 w-16">{c}</span>
                        {customColors.length > 2 && (
                          <button
                            onClick={() => removeCustomColor(i)}
                            className="text-neutral-300 dark:text-neutral-600 hover:text-red-400 transition-colors"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        )}
                      </div>
                    ))}
                    {customColors.length < 6 && (
                      <button
                        onClick={addCustomColor}
                        className="text-xs text-neutral-400 hover:text-violet-500 transition-colors flex items-center gap-1"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Добавить цвет ({customColors.length}/6)
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {error && (
            <p className="text-sm text-red-500 dark:text-red-400">{error}</p>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-neutral-100 dark:border-white/5 flex gap-2">
          <button
            onClick={save}
            disabled={saving}
            className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-sm font-medium hover:shadow-lg hover:shadow-violet-500/20 disabled:opacity-50 transition-all"
          >
            {saving ? "Сохранение..." : "Сохранить"}
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl bg-neutral-100 dark:bg-white/5 text-neutral-600 dark:text-neutral-400 text-sm hover:bg-neutral-200 dark:hover:bg-white/10 transition-all"
          >
            Отмена
          </button>
        </div>
      </motion.div>
    </div>
  );
}
