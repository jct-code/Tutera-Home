"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ZoneControlStyle = "buttons" | "slider";

export interface QuickActionsPosition {
  x: number;
  y: number;
}

interface SettingsState {
  // Zone lighting control style preference
  zoneControlStyle: ZoneControlStyle;
  setZoneControlStyle: (style: ZoneControlStyle) => void;
  
  // Slider activation delay in milliseconds (for touch devices)
  sliderActivationDelay: number;
  setSliderActivationDelay: (delay: number) => void;
  
  // Quick Actions button settings
  quickActionsEnabled: boolean;
  setQuickActionsEnabled: (enabled: boolean) => void;
  quickActionsPosition: QuickActionsPosition | null;
  setQuickActionsPosition: (position: QuickActionsPosition | null) => void;
  resetQuickActionsPosition: () => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      // Default to buttons for safer touch experience
      zoneControlStyle: "buttons",
      setZoneControlStyle: (style) => set({ zoneControlStyle: style }),
      
      // Default 300ms press-and-hold to activate slider
      sliderActivationDelay: 300,
      setSliderActivationDelay: (delay) => set({ sliderActivationDelay: delay }),
      
      // Quick Actions button - enabled by default, no custom position
      quickActionsEnabled: true,
      setQuickActionsEnabled: (enabled) => set({ quickActionsEnabled: enabled }),
      quickActionsPosition: null,
      setQuickActionsPosition: (position) => set({ quickActionsPosition: position }),
      resetQuickActionsPosition: () => set({ quickActionsPosition: null }),
    }),
    {
      name: "tutera-settings",
    }
  )
);
