"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";

export type ConnectTheme = "cyber" | "velvet";
export type LightVariant = "default" | "warm";

interface ThemeContextValue {
  theme: ConnectTheme;
  setTheme: (t: ConnectTheme) => void;
  toggleTheme: () => void;
  lightVariant: LightVariant;
  setLightVariant: (v: LightVariant) => void;
  toggleLightVariant: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: "cyber",
  setTheme: () => {},
  toggleTheme: () => {},
  lightVariant: "default",
  setLightVariant: () => {},
  toggleLightVariant: () => {},
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ConnectTheme>("cyber");
  const [lightVariant, setLightVariantState] = useState<LightVariant>("default");

  useEffect(() => {
    const saved = localStorage.getItem("tz-connect-theme") as ConnectTheme | null;
    if (saved === "velvet" || saved === "cyber") setThemeState(saved);
    const savedLight = localStorage.getItem("tz-connect-light-variant") as LightVariant | null;
    if (savedLight === "warm" || savedLight === "default") setLightVariantState(savedLight);
  }, []);

  const setTheme = (t: ConnectTheme) => {
    setThemeState(t);
    localStorage.setItem("tz-connect-theme", t);
    const html = document.documentElement;
    if (t === "velvet") {
      html.classList.add("velvet");
    } else {
      html.classList.remove("velvet");
    }
  };

  const toggleTheme = () => setTheme(theme === "cyber" ? "velvet" : "cyber");

  const setLightVariant = (v: LightVariant) => {
    setLightVariantState(v);
    localStorage.setItem("tz-connect-light-variant", v);
    const html = document.documentElement;
    if (v === "warm") {
      html.classList.add("warm");
    } else {
      html.classList.remove("warm");
    }
  };

  const toggleLightVariant = () => setLightVariant(lightVariant === "default" ? "warm" : "default");

  // Apply on mount
  useEffect(() => {
    const html = document.documentElement;
    if (theme === "velvet") html.classList.add("velvet");
    else html.classList.remove("velvet");
    if (lightVariant === "warm") html.classList.add("warm");
    else html.classList.remove("warm");
  }, [theme, lightVariant]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme, lightVariant, setLightVariant, toggleLightVariant }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useConnectTheme() {
  return useContext(ThemeContext);
}
