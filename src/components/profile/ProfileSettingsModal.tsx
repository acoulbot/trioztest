"use client";

import { useState, useEffect, useRef } from "react";
import Button from "@/components/ui/Button";
import { usePTTSettings, eventToBinding, DEFAULT_BINDING } from "@/lib/ptt";
import { motion, AnimatePresence } from "framer-motion";
import GlowAvatar, { GLOW_PRESETS, GlowAvatarUser } from "@/components/ui/GlowAvatar";
import { DayNightMiniPreview } from "@/components/connect/DayNightBackground";
import { getDMSoundEnabled, setDMSoundEnabled, playDMNotification } from "@/lib/dmSound";
import { exportKeysToJSON, importKeysFromJSON } from "@/lib/e2ee";

function DMSoundToggle() {
  const [on, setOn] = useState(true);
  useEffect(() => { setOn(getDMSoundEnabled()); }, []);
  const toggle = () => {
    const next = !on;
    setOn(next);
    setDMSoundEnabled(next);
    if (next) playDMNotification();
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
  userRole?: string;
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

export default function ProfileSettingsModal({ user, onClose, onSaved, userRole }: ProfileSettingsModalProps) {
  const isPrivileged = userRole === "ADMIN" || userRole === "OWNER" || userRole === "SITE_ADMIN";
  const [glowEnabled, setGlowEnabled] = useState(user.avatarGlowEnabled ?? false);
  const [dayNightEnabled, setDayNightEnabled] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("tz-connect-daynight") === "true";
    }
    return false;
  });
  const [dayNightOpacity, setDayNightOpacity] = useState<number>(() => {
    if (typeof window !== "undefined") {
      return parseInt(localStorage.getItem("tz-connect-daynight-opacity") ?? "15", 10);
    }
    return 15;
  });
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
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const { settings: pttSettings, update: updatePTT } = usePTTSettings();
  const [recordingKey, setRecordingKey] = useState(false);
  const [statusType, setStatusType] = useState<string>("online");
  const [customStatus, setCustomStatus] = useState<string>("");
  const [statusLoading, setStatusLoading] = useState(false);
  const [bannerUrl, setBannerUrl] = useState<string | null>(null);
  const [bannerUploading, setBannerUploading] = useState(false);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/profile/me").then(r => r.json()).then(d => {
      if (d.statusType) setStatusType(d.statusType);
      if (d.customStatus) setCustomStatus(d.customStatus);
      if (d.profileBanner) setBannerUrl(d.profileBanner);
    }).catch(() => {});
  }, []);

  const activeColors = useCustom
    ? customColors
    : GLOW_PRESETS[selectedPreset ?? "royal"].colors;

  const previewUser: GlowAvatarUser = {
    ...user,
    avatarGlowEnabled: glowEnabled,
    avatarGlowColors: JSON.stringify(activeColors),
  };

  async function save() {
    // Save day-night locally (no API needed)
    localStorage.setItem("tz-connect-daynight", String(dayNightEnabled));
    localStorage.setItem("tz-connect-daynight-opacity", String(dayNightOpacity));
    // Dispatch event so MessageArea picks up instantly without reload
    window.dispatchEvent(new CustomEvent("tz-daynight-change", {
      detail: { enabled: dayNightEnabled, opacity: dayNightOpacity },
    }));

    setSaving(true);
    setError(null);
    try {
      const patchBody: Record<string, unknown> = {};
      // Only send glow settings if user is privileged — others get 403 on these fields
      if (isPrivileged) {
        patchBody.avatarGlowEnabled = glowEnabled;
        patchBody.avatarGlowColors = glowEnabled ? activeColors : null;
      }
      if (isPrivileged) {
        patchBody.profileBanner = bannerUrl;
      }
      const res = await fetch("/api/profile/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patchBody),
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
              {isPrivileged && (
                <p className="text-[11px] text-violet-500 dark:text-violet-400 mt-1">
                  {glowEnabled ? "✨ Свечение активно" : "Свечение выключено"}
                </p>
              )}
            </div>
          </div>

          {/* Status */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-neutral-900 dark:text-white">Статус</p>
            <div className="flex gap-2">
              {([["online", "В сети", "bg-green-500"], ["away", "Нет на месте", "bg-yellow-500"], ["dnd", "Не беспокоить", "bg-red-500"], ["invisible", "Невидимка", "bg-neutral-400"]] as const).map(([key, label, color]) => (
                <button key={key} onClick={async () => { setStatusType(key); setStatusLoading(true); await fetch("/api/profile/status", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ statusType: key }) }).catch(() => {}); setStatusLoading(false); }} className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs border transition-all ${statusType === key ? "border-violet-500 bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400" : "border-neutral-200 dark:border-white/10 text-neutral-600 dark:text-neutral-400 hover:border-neutral-300"}`}>
                  <span className={`w-2 h-2 rounded-full ${color}`} />
                  {label}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={customStatus}
                onChange={(e) => setCustomStatus(e.target.value)}
                placeholder="Кастомный статус..."
                maxLength={80}
                className="flex-1 px-3 py-1.5 bg-neutral-50 dark:bg-white/5 border border-neutral-200 dark:border-white/10 rounded-lg text-sm text-neutral-900 dark:text-white"
              />
              <button
                onClick={async () => { setStatusLoading(true); await fetch("/api/profile/status", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ customStatus: customStatus.trim() || null }) }).catch(() => {}); setStatusLoading(false); }}
                disabled={statusLoading}
                className="px-3 py-1.5 bg-violet-500 dark:bg-cyan-500 text-white dark:text-neutral-900 rounded-lg text-xs font-medium disabled:opacity-50"
              >
                {statusLoading ? "..." : "OK"}
              </button>
            </div>
          </div>

          {/* Animated profile banner — admin only */}
          {isPrivileged && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-neutral-900 dark:text-white">🎬 Анимированный профиль</h3>
            <p className="text-xs text-neutral-400">Загрузите GIF или изображение для фона профиля</p>
            {bannerUrl && (
              <div className="relative h-24 rounded-xl overflow-hidden border border-neutral-200 dark:border-white/10">
                <img src={bannerUrl} alt="Banner" className="w-full h-full object-cover" />
                <button
                  onClick={() => setBannerUrl(null)}
                  className="absolute top-1.5 right-1.5 p-1 rounded-lg bg-black/50 text-white hover:bg-black/70 transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            )}
            <button
              onClick={() => bannerInputRef.current?.click()}
              disabled={bannerUploading}
              className="px-3 py-2 bg-violet-500/10 text-violet-600 dark:text-violet-400 rounded-xl text-xs font-medium hover:bg-violet-500/20 transition-colors disabled:opacity-50"
            >
              {bannerUploading ? "Загрузка..." : bannerUrl ? "Заменить фон" : "Загрузить фон"}
            </button>
            <input
              ref={bannerInputRef}
              type="file"
              accept="image/*,.gif"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                setBannerUploading(true);
                const fd = new FormData();
                fd.append("file", file);
                fd.append("type", "banner");
                try {
                  const res = await fetch("/api/profile/avatar", { method: "POST", body: fd });
                  const data = await res.json();
                  if (data.url) setBannerUrl(data.url);
                  else setError("Ошибка загрузки");
                } catch { setError("Ошибка сети"); }
                setBannerUploading(false);
                e.target.value = "";
              }}
            />
          </div>
          )}

          {/* Enable toggle — only for admins */}
          {isPrivileged && (<>
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
          </>)}

          {/* DM sound toggle */}
          <DMSoundToggle />

          {/* ── TZ Connect: Day-Night background (admin only) ── */}
          {isPrivileged && (
          <div className="pt-2 border-t border-neutral-100 dark:border-white/5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-900 dark:text-white flex items-center gap-1.5">
                  🌙 Фон дня и ночи
                </p>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Живое небо и цифровой город в окне чата
                </p>
              </div>
              <button
                onClick={() => setDayNightEnabled(!dayNightEnabled)}
                className={`relative w-11 h-6 rounded-full transition-colors ${
                  dayNightEnabled
                    ? "bg-cyan-500 dark:bg-cyan-500"
                    : "bg-neutral-300 dark:bg-neutral-600"
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                    dayNightEnabled ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            <AnimatePresence>
              {dayNightEnabled && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden space-y-3"
                >
                  {/* Preview strip */}
                  <div className="relative h-20 rounded-xl overflow-hidden border border-neutral-200 dark:border-white/10">
                    <DayNightMiniPreview opacity={dayNightOpacity} />
                    <div className="absolute inset-0 flex items-end p-2">
                      <span className="text-[10px] text-white/60 font-mono bg-black/30 px-1.5 py-0.5 rounded">
                        предпросмотр · {new Date().getHours()}:
                        {String(new Date().getMinutes()).padStart(2, "0")}
                      </span>
                    </div>
                  </div>

                  {/* Opacity slider */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-neutral-500 dark:text-neutral-400">
                        Прозрачность фона
                      </p>
                      <span className="text-xs font-mono text-cyan-500 dark:text-cyan-400">
                        {dayNightOpacity}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min={5}
                      max={35}
                      step={1}
                      value={dayNightOpacity}
                      onChange={(e) => setDayNightOpacity(+e.target.value)}
                      className="w-full accent-cyan-500"
                    />
                    <div className="flex justify-between text-[10px] text-neutral-400">
                      <span>Едва заметно (5%)</span>
                      <span>Атмосферно (35%)</span>
                    </div>
                  </div>

                  {/* Hint */}
                  <p className="text-[11px] text-neutral-400 dark:text-neutral-500 leading-relaxed">
                    Фон реагирует на реальное время. Утром — рассвет,
                    днём — голубое небо, ночью — звёзды и неоновый город.
                    Текст чата всегда остаётся читаемым.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          )}

          {/* Push-to-Talk */}
          <div className="space-y-3 pt-2 border-t border-neutral-100 dark:border-white/5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-neutral-900 dark:text-white">🎙 Режим рации (Push-to-Talk)</h3>
                <p className="text-xs text-neutral-400 mt-0.5">Микрофон включён только пока зажата кнопка</p>
              </div>
              {/* Toggle */}
              <button
                onClick={() => updatePTT({ enabled: !pttSettings.enabled })}
                className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${pttSettings.enabled ? "bg-violet-500 dark:bg-cyan-500" : "bg-neutral-200 dark:bg-neutral-700"}`}
              >
                <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${pttSettings.enabled ? "translate-x-6" : "translate-x-1"}`} />
              </button>
            </div>

            {pttSettings.enabled && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-neutral-500 dark:text-gray-400">Кнопка:</span>
                  <button
                    onKeyDown={(e) => {
                      if (!recordingKey) return;
                      e.preventDefault();
                      e.stopPropagation();
                      const b = eventToBinding(e.nativeEvent);
                      if (b.label) {
                        updatePTT({ binding: b });
                        setRecordingKey(false);
                      }
                    }}
                    onClick={() => setRecordingKey(true)}
                    onBlur={() => setRecordingKey(false)}
                    className={`flex-1 px-3 py-2 rounded-xl text-sm font-mono text-center border-2 transition-colors outline-none
                      ${recordingKey
                        ? "border-violet-500 dark:border-cyan-400 bg-violet-50 dark:bg-cyan-400/10 text-violet-700 dark:text-cyan-300 animate-pulse"
                        : "border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-white/5 text-neutral-900 dark:text-white hover:border-violet-400 dark:hover:border-cyan-500"
                      }`}
                  >
                    {recordingKey ? "Нажмите любую клавишу..." : (pttSettings.binding.label || DEFAULT_BINDING.label)}
                  </button>
                  <button
                    onClick={() => { updatePTT({ binding: DEFAULT_BINDING }); setRecordingKey(false); }}
                    className="text-xs text-neutral-400 hover:text-red-500 dark:hover:text-red-400 transition-colors whitespace-nowrap"
                    title="Сбросить на Shift+Q"
                  >
                    Сбросить
                  </button>
                </div>
                <p className="text-[11px] text-neutral-400">
                  Нажмите на кнопку выше и зажмите нужную клавишу или сочетание. Работает только в голосовом канале.
                </p>
              </div>
            )}
          </div>

          {/* E2EE key backup */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-neutral-900 dark:text-white">🔐 Шифрование E2EE</h3>
            <p className="text-xs text-neutral-400">Экспорт/импорт ключей для расшифровки старых сообщений на новом устройстве</p>
            <div className="flex gap-2">
              <button
                onClick={async () => {
                  const json = await exportKeysToJSON();
                  if (!json) { setError("Ключи не найдены"); return; }
                  const blob = new Blob([json], { type: "application/json" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url; a.download = "tz-e2ee-keys.json"; a.click();
                  URL.revokeObjectURL(url);
                }}
                className="px-3 py-2 bg-violet-500/10 text-violet-600 dark:text-violet-400 rounded-xl text-xs font-medium hover:bg-violet-500/20 transition-colors"
              >
                📤 Экспорт ключей
              </button>
              <label className="px-3 py-2 bg-green-500/10 text-green-600 dark:text-green-400 rounded-xl text-xs font-medium hover:bg-green-500/20 transition-colors cursor-pointer">
                📥 Импорт ключей
                <input type="file" accept=".json" className="hidden" onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  const text = await f.text();
                  const ok = await importKeysFromJSON(text);
                  if (ok) { setError(null); setSuccessToast("Ключи восстановлены!"); setTimeout(() => setSuccessToast(null), 3500); }
                  else setError("Неверный формат файла ключей");
                  e.target.value = "";
                }} />
              </label>
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-500 dark:text-red-400">{error}</p>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-neutral-100 dark:border-white/5 flex gap-2">
          <Button onClick={save} disabled={saving} size="md" className="flex-1">
            {saving ? "Сохранение..." : "Сохранить"}
          </Button>
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl bg-neutral-100 dark:bg-white/5 text-neutral-600 dark:text-neutral-400 text-sm hover:bg-neutral-200 dark:hover:bg-white/10 transition-all"
          >
            Отмена
          </button>
        </div>
      </motion.div>
      {successToast && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[60] px-4 py-2 bg-green-500 text-white text-sm rounded-xl shadow-lg animate-fade-in">
          {successToast}
        </div>
      )}
    </div>
  );
}
