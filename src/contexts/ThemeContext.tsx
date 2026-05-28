"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";

export type ConnectTheme = "cyber" | "velvet";

interface ThemeContextValue {
  theme: ConnectTheme;
  setTheme: (t: ConnectTheme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: "cyber",
  setTheme: () => {},
  toggleTheme: () => {},
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ConnectTheme>("cyber");

  useEffect(() => {
    const saved = localStorage.getItem("tz-connect-theme") as ConnectTheme | null;
    if (saved === "velvet" || saved === "cyber") setThemeState(saved);
  }, []);

  const setTheme = (t: ConnectTheme) => {
    setThemeState(t);
    localStorage.setItem("tz-connect-theme", t);
    // The html element should already have .dark — we add/remove .velvet
    const html = document.documentElement;
    if (t === "velvet") {
      html.classList.add("velvet");
    } else {
      html.classList.remove("velvet");
    }
  };

  const toggleTheme = () => setTheme(theme === "cyber" ? "velvet" : "cyber");

  // Apply on mount
  useEffect(() => {
    const html = document.documentElement;
    if (theme === "velvet") html.classList.add("velvet");
    else html.classList.remove("velvet");
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useConnectTheme() {
  return useContext(ThemeContext);
}
