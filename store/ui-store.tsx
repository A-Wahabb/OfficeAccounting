"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type UiState = {
  sidebarOpen: boolean;
};

type UiContextValue = UiState & {
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
};

const UiContext = createContext<UiContextValue | null>(null);

export function UiStoreProvider({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const toggleSidebar = useCallback(() => {
    setSidebarOpen((o) => !o);
  }, []);

  const value = useMemo(
    () => ({
      sidebarOpen,
      setSidebarOpen,
      toggleSidebar,
    }),
    [sidebarOpen, toggleSidebar],
  );

  return <UiContext.Provider value={value}>{children}</UiContext.Provider>;
}

export function useUiStore(): UiContextValue {
  const ctx = useContext(UiContext);
  if (!ctx) {
    throw new Error("useUiStore must be used within UiStoreProvider");
  }
  return ctx;
}
