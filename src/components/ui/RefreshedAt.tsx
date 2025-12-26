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

  return (
    <p className={`text-sm text-[var(--text-secondary)] ${className}`}>
      Updated {lastUpdated.toLocaleTimeString([], { 
        hour: "numeric", 
        minute: "2-digit" 
      })}
    </p>
  );
}

export default RefreshedAt;

