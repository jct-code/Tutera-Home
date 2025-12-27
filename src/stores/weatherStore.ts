"use client";

import { create } from "zustand";
import type { ThermostatMode } from "@/lib/crestron/types";

interface WeatherState {
  // Data
  outsideTemp: number | null;
  humidity: number | null;
  windSpeed: number | null;
  lastFetched: Date | null;
  
  // Loading states
  isLoading: boolean;
  error: string | null;
  
  // Actions
  setWeatherData: (data: {
    temperature: number;
    humidity?: number;
    windSpeed?: number;
  }) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useWeatherStore = create<WeatherState>((set) => ({
  outsideTemp: null,
  humidity: null,
  windSpeed: null,
  lastFetched: null,
  isLoading: false,
  error: null,

  setWeatherData: (data) =>
    set({
      outsideTemp: data.temperature,
      humidity: data.humidity ?? null,
      windSpeed: data.windSpeed ?? null,
      lastFetched: new Date(),
      error: null,
    }),

  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error, isLoading: false }),
}));

// Constants for smart mode logic
const COLD_THRESHOLD = 55; // Below this, always heat
const HOT_THRESHOLD = 80;  // Above this, always cool

/**
 * Determine the appropriate thermostat mode based on outside temperature and target.
 * 
 * Smart hybrid logic:
 * - Below 55°F outside → Always Heat
 * - Above 80°F outside → Always Cool
 * - 55-80°F → Compare to target: if outside < target = Heat, else Cool
 */
export function determineMode(outsideTemp: number, targetTemp: number): ThermostatMode {
  if (outsideTemp < COLD_THRESHOLD) {
    return "heat";
  }
  
  if (outsideTemp > HOT_THRESHOLD) {
    return "cool";
  }
  
  // In the moderate range, compare to target
  return outsideTemp < targetTemp ? "heat" : "cool";
}

/**
 * Get a human-readable recommendation for the mode
 */
export function getModeRecommendation(outsideTemp: number, targetTemp: number): string {
  const mode = determineMode(outsideTemp, targetTemp);
  
  if (outsideTemp < COLD_THRESHOLD) {
    return `Heating recommended (${outsideTemp}°F outside)`;
  }
  
  if (outsideTemp > HOT_THRESHOLD) {
    return `Cooling recommended (${outsideTemp}°F outside)`;
  }
  
  if (mode === "heat") {
    return `Heating recommended (outside ${outsideTemp}°F < target ${targetTemp}°F)`;
  }
  
  return `Cooling recommended (outside ${outsideTemp}°F > target ${targetTemp}°F)`;
}

// Cache duration in milliseconds (10 minutes)
const CACHE_DURATION = 10 * 60 * 1000;

/**
 * Fetch weather data from the API
 * Respects cache duration to avoid excessive API calls
 */
export async function fetchWeather(force = false): Promise<boolean> {
  const store = useWeatherStore.getState();
  
  // Check cache unless force refresh
  if (!force && store.lastFetched) {
    const timeSinceLastFetch = Date.now() - store.lastFetched.getTime();
    if (timeSinceLastFetch < CACHE_DURATION) {
      return true; // Use cached data
    }
  }
  
  store.setLoading(true);
  
  try {
    const response = await fetch("/api/weather");
    const data = await response.json();
    
    if (data.success && data.data) {
      store.setWeatherData(data.data);
      return true;
    } else {
      store.setError(data.error || "Failed to fetch weather");
      return false;
    }
  } catch (error) {
    store.setError(error instanceof Error ? error.message : "Failed to fetch weather");
    return false;
  } finally {
    store.setLoading(false);
  }
}

