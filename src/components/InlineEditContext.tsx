"use client";

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react";
import { useSession } from "next-auth/react";

interface InlineEditContextType {
  editMode: boolean;
  toggleEditMode: () => void;
  isAdmin: boolean;
  saveContent: (key: string, value: string) => Promise<void>;
  getContent: (key: string) => string | undefined;
  contents: Record<string, string>;
}

const InlineEditContext = createContext<InlineEditContextType>({
  editMode: false,
  toggleEditMode: () => {},
  isAdmin: false,
  saveContent: async () => {},
  getContent: () => undefined,
  contents: {},
});

export function useInlineEdit() {
  return useContext(InlineEditContext);
}

export function InlineEditProvider({ children }: { children: ReactNode }) {
  const { data: session } = useSession();
  const [editMode, setEditMode] = useState(false);
  const [contents, setContents] = useState<Record<string, string>>({});

  const isAdmin = session?.user?.role === "ADMIN";

  useEffect(() => {
    fetch("/api/site-content")
      .then((r) => r.json())
      .then((data: Record<string, string>) => {
        if (data && typeof data === "object") setContents(data);
      })
      .catch(() => {});
  }, []);

  const toggleEditMode = useCallback(() => {
    if (isAdmin) setEditMode((prev) => !prev);
  }, [isAdmin]);

  const saveContent = useCallback(async (key: string, value: string) => {
    setContents((prev) => ({ ...prev, [key]: value }));
    await fetch("/api/site-content", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, value }),
    });
  }, []);

  const getContent = useCallback(
    (key: string) => contents[key],
    [contents]
  );

  return (
    <InlineEditContext.Provider value={{ editMode, toggleEditMode, isAdmin, saveContent, getContent, contents }}>
      {children}
    </InlineEditContext.Provider>
  );
}
