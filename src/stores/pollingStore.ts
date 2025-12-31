"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

// Default polling intervals (in seconds for user-friendly display)
export const DEFAULT_POLLING_INTERVALS = {
  active: 3,           // 3 seconds when active
  idle1Min: 10,        // 10 seconds after 1 minute idle
  idle5Min: 60,        // 1 minute after 5 minutes idle
  idle10Min: 1800,     // 30 minutes after 10 minutes idle
};

// Default idle thresholds (in seconds for user-friendly display)
export const DEFAULT_IDLE_THRESHOLDS = {
  oneMinute: 60,       // 1 minute
  fiveMinutes: 300,    // 5 minutes
  tenMinutes: 600,     // 10 minutes
};

interface PollingSettings {
  // Polling intervals (in seconds)
  activeInterval: number;
  idle1MinInterval: number;
  idle5MinInterval: number;
  idle10MinInterval: number;
  
  // Idle thresholds (in seconds)
  idleThreshold1: number;
  idleThreshold2: number;
  idleThreshold3: number;
}

interface PollingState extends PollingSettings {
  // Actions
  setActiveInterval: (seconds: number) => void;
  setIdle1MinInterval: (seconds: number) => void;
  setIdle5MinInterval: (seconds: number) => void;
  setIdle10MinInterval: (seconds: number) => void;
  setIdleThreshold1: (seconds: number) => void;
  setIdleThreshold2: (seconds: number) => void;
  setIdleThreshold3: (seconds: number) => void;
  resetToDefaults: () => void;
}

export const usePollingStore = create<PollingState>()(
  persist(
    (set) => ({
      // Default values
      activeInterval: DEFAULT_POLLING_INTERVALS.active,
      idle1MinInterval: DEFAULT_POLLING_INTERVALS.idle1Min,
      idle5MinInterval: DEFAULT_POLLING_INTERVALS.idle5Min,
      idle10MinInterval: DEFAULT_POLLING_INTERVALS.idle10Min,
      idleThreshold1: DEFAULT_IDLE_THRESHOLDS.oneMinute,
      idleThreshold2: DEFAULT_IDLE_THRESHOLDS.fiveMinutes,
      idleThreshold3: DEFAULT_IDLE_THRESHOLDS.tenMinutes,

      // Actions
      setActiveInterval: (seconds) => set({ activeInterval: Math.max(1, seconds) }),
      setIdle1MinInterval: (seconds) => set({ idle1MinInterval: Math.max(1, seconds) }),
      setIdle5MinInterval: (seconds) => set({ idle5MinInterval: Math.max(1, seconds) }),
      setIdle10MinInterval: (seconds) => set({ idle10MinInterval: Math.max(1, seconds) }),
      setIdleThreshold1: (seconds) => set({ idleThreshold1: Math.max(10, seconds) }),
      setIdleThreshold2: (seconds) => set({ idleThreshold2: Math.max(10, seconds) }),
      setIdleThreshold3: (seconds) => set({ idleThreshold3: Math.max(10, seconds) }),
      resetToDefaults: () => set({
        activeInterval: DEFAULT_POLLING_INTERVALS.active,
        idle1MinInterval: DEFAULT_POLLING_INTERVALS.idle1Min,
        idle5MinInterval: DEFAULT_POLLING_INTERVALS.idle5Min,
        idle10MinInterval: DEFAULT_POLLING_INTERVALS.idle10Min,
        idleThreshold1: DEFAULT_IDLE_THRESHOLDS.oneMinute,
        idleThreshold2: DEFAULT_IDLE_THRESHOLDS.fiveMinutes,
        idleThreshold3: DEFAULT_IDLE_THRESHOLDS.tenMinutes,
      }),
    }),
    {
      name: "tutera-polling-settings",
    }
  )
);

// Helper to get polling settings as milliseconds (for use in DataProvider)
export function getPollingSettingsMs() {
  const state = usePollingStore.getState();
  return {
    intervals: {
      active: state.activeInterval * 1000,
      idle1Min: state.idle1MinInterval * 1000,
      idle5Min: state.idle5MinInterval * 1000,
      idle10Min: state.idle10MinInterval * 1000,
    },
    thresholds: {
      one: state.idleThreshold1 * 1000,
      two: state.idleThreshold2 * 1000,
      three: state.idleThreshold3 * 1000,
    },
  };
}

// Format seconds to a human-readable string
export function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s`;
  }
  if (seconds < 3600) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
  }
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}
