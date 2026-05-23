"use client";

import { SessionProvider } from "next-auth/react";
import { ReactNode, createContext, useContext, useState, useEffect } from "react";
import { InlineEditProvider } from "./InlineEditContext";
import InlineEditOverlay from "./InlineEditOverlay";
import { HeartbeatProvider } from "./HeartbeatProvider";

type Theme = "dark" | "light";

const ThemeContext = createContext<{ theme: Theme; toggleTheme: () => void }>({
  theme: "dark",
  toggleTheme: () => {},
});

export function useTheme() {
  return useContext(ThemeContext);
}

function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>("dark");

  useEffect(() => {
    const saved = localStorage.getItem("trioz-theme") as Theme | null;
    if (saved) {
      setTheme(saved);
      document.documentElement.classList.toggle("dark", saved === "dark");
      document.documentElement.classList.toggle("light", saved === "light");
    }
  }, []);

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    localStorage.setItem("trioz-theme", next);
    document.documentElement.classList.toggle("dark", next === "dark");
    document.documentElement.classList.toggle("light", next === "light");
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <ThemeProvider>
        <HeartbeatProvider />
        <InlineEditProvider>
          {children}
          <InlineEditOverlay />
        </InlineEditProvider>
      </ThemeProvider>
    </SessionProvider>
  );
}
