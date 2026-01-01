"use client";

import { createContext, useContext, useState, useCallback, useEffect } from "react";
import { AICommandModal } from "./AICommandModal";
import { useAuthStore } from "@/stores/authStore";

interface AIContextType {
  openAI: () => void;
  closeAI: () => void;
  toggleAI: () => void;
  isOpen: boolean;
}

const AIContext = createContext<AIContextType | null>(null);

export function useAI() {
  const context = useContext(AIContext);
  if (!context) {
    // Return a safe default for SSR or when outside provider
    return { openAI: () => {}, closeAI: () => {}, toggleAI: () => {}, isOpen: false };
  }
  return context;
}

/**
 * Global AI Provider that provides AI modal access across the app
 */
export function AIGlobalProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const { isConnected } = useAuthStore();

  const openAI = useCallback(() => {
    if (isConnected) {
      setIsOpen(true);
    }
  }, [isConnected]);

  const closeAI = useCallback(() => {
    setIsOpen(false);
  }, []);

  const toggleAI = useCallback(() => {
    if (isConnected) {
      setIsOpen(prev => !prev);
    }
  }, [isConnected]);

  // Global keyboard shortcut (Ctrl/Cmd + J)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "j") {
        e.preventDefault();
        toggleAI();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [toggleAI]);

  return (
    <AIContext.Provider value={{ openAI, closeAI, toggleAI, isOpen }}>
      {children}
      {isConnected && (
        <AICommandModal isOpen={isOpen} onClose={closeAI} />
      )}
    </AIContext.Provider>
  );
}
