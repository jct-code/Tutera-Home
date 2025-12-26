"use client";

import { useEffect, useRef, useState } from "react";
import { useAuthStore } from "@/stores/authStore";
import { fetchAllData, useDeviceStore } from "@/stores/deviceStore";

// Default to 10 seconds if env var not set
const REFRESH_INTERVAL = parseInt(
  process.env.NEXT_PUBLIC_REFRESH_INTERVAL_MS || "10000",
  10
);

interface DataProviderProps {
  children: React.ReactNode;
}

export function DataProvider({ children }: DataProviderProps) {
  const { isConnected } = useAuthStore();
  const { isLoading } = useDeviceStore();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const hasInitialFetch = useRef(false);
  const [isHydrated, setIsHydrated] = useState(false);

  // Suppress Next.js dev overlay async params/searchParams warnings (dev-only, doesn't affect production)
  // These warnings are triggered by the component inspector trying to serialize Promise props
  // Note: Next.js routes these through console.error, not console.warn
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      const originalWarn = console.warn;
      const originalError = console.error;
      
      const shouldSuppress = (message: unknown): boolean => {
        return typeof message === 'string' && 
          (message.includes('searchParams') || message.includes('params are being enumerated')) &&
          message.includes('Promise');
      };
      
      console.warn = (...args: Parameters<typeof console.warn>) => {
        if (shouldSuppress(args[0])) return;
        originalWarn.apply(console, args);
      };
      
      console.error = (...args: Parameters<typeof console.error>) => {
        if (shouldSuppress(args[0])) return;
        originalError.apply(console, args);
      };
      
      return () => {
        console.warn = originalWarn;
        console.error = originalError;
      };
    }
  }, []);

  // Track hydration state
  useEffect(() => {
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    // Wait for hydration before checking connection
    if (!isHydrated) {
      return;
    }

    // Only run when connected
    if (!isConnected) {
      hasInitialFetch.current = false;
      return;
    }

    // Initial fetch
    if (!hasInitialFetch.current) {
      hasInitialFetch.current = true;
      fetchAllData();
    }

    // Set up polling interval
    intervalRef.current = setInterval(() => {
      // fetchAllData already checks isLoading internally
      fetchAllData();
    }, REFRESH_INTERVAL);

    // Cleanup on unmount or when connection changes
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isConnected, isHydrated]);

  return <>{children}</>;
}

export default DataProvider;
