"use client";

import { useDeviceStore } from "@/stores/deviceStore";

interface RefreshedAtProps {
  className?: string;
}

export function RefreshedAt({ className = "" }: RefreshedAtProps) {
  const { lastUpdated } = useDeviceStore();

  if (!lastUpdated) {
    return null;
  }

  // Convert to Date object if it's a string (from localStorage persistence)
  const date = lastUpdated instanceof Date ? lastUpdated : new Date(lastUpdated);

  return (
    <p className={`text-sm text-[var(--text-secondary)] ${className}`}>
      Updated {date.toLocaleTimeString([], { 
        hour: "numeric", 
        minute: "2-digit" 
      })}
    </p>
  );
}

export default RefreshedAt;

