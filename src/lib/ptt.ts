import { useState, useEffect, useCallback } from "react";

export interface PTTBinding {
  key: string;          // e.g. "q", "F4", " " (space)
  shift: boolean;
  ctrl: boolean;
  alt: boolean;
  label: string;        // human-readable e.g. "Shift+Q"
}

export interface PTTSettings {
  enabled: boolean;
  binding: PTTBinding;
}

export const DEFAULT_BINDING: PTTBinding = {
  key: "q",
  shift: true,
  ctrl: false,
  alt: false,
  label: "Shift+Q",
};

const STORAGE_KEY = "tz-ptt-settings";

export function loadSettings(): PTTSettings {
  if (typeof window === "undefined") return { enabled: false, binding: DEFAULT_BINDING };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return { enabled: false, binding: DEFAULT_BINDING };
}

export function usePTTSettings() {
  const [settings, setSettings] = useState<PTTSettings>(loadSettings);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch { /* ignore */ }
  }, [settings]);

  const update = useCallback((patch: Partial<PTTSettings>) => {
    setSettings((prev: PTTSettings) => ({ ...prev, ...patch }));
  }, []);

  return { settings, update };
}

/** Format a KeyboardEvent into a human-readable label and PTTBinding */
export function eventToBinding(e: KeyboardEvent): PTTBinding {
  const parts: string[] = [];
  if (e.ctrlKey)  parts.push("Ctrl");
  if (e.altKey)   parts.push("Alt");
  if (e.shiftKey) parts.push("Shift");

  let keyName = e.key;
  if (keyName === " ")        keyName = "Space";
  if (keyName === "Control")  keyName = "";
  if (keyName === "Alt")      keyName = "";
  if (keyName === "Shift")    keyName = "";
  if (keyName === "Meta")     keyName = "Win";

  if (keyName) parts.push(keyName.toUpperCase());

  return {
    key: e.key === " " ? " " : e.key.toLowerCase(),
    shift: e.shiftKey,
    ctrl: e.ctrlKey,
    alt: e.altKey,
    label: parts.filter(Boolean).join("+"),
  };
}

/** Check if a KeyboardEvent matches a stored binding */
export function matchesBinding(e: KeyboardEvent, b: PTTBinding): boolean {
  const keyMatch =
    e.key.toLowerCase() === b.key.toLowerCase() ||
    (b.key === " " && e.key === " ");
  return (
    keyMatch &&
    e.shiftKey === b.shift &&
    e.ctrlKey  === b.ctrl  &&
    e.altKey   === b.alt
  );
}
