"use client";

import { useEffect, useState } from "react";
import { useDeviceStore } from "@/stores/deviceStore";

interface RefreshedAtProps {
  className?: string;
}

export function RefreshedAt({ className = "" }: RefreshedAtProps) {
  const { lastUpdated } = useDeviceStore();
  const [secondsAgo, setSecondsAgo] = useState<number>(0);

  // Update the "seconds ago" counter every second
  useEffect(() => {
    if (!lastUpdated) return;

    const updateSecondsAgo = () => {
      const date = lastUpdated instanceof Date ? lastUpdated : new Date(lastUpdated);
      const diff = Math.floor((Date.now() - date.getTime()) / 1000);
      setSecondsAgo(Math.max(0, diff));
    };

    // Update immediately
    updateSecondsAgo();

    // Then update every second
    const interval = setInterval(updateSecondsAgo, 1000);

    return () => clearInterval(interval);
  }, [lastUpdated]);

  if (!lastUpdated) {
    return null;
  }

  // Format the display text
  const getTimeText = () => {
    if (secondsAgo < 5) {
      return "just now";
    } else if (secondsAgo < 60) {
      return `${secondsAgo}s ago`;
    } else {
      const minutes = Math.floor(secondsAgo / 60);
      return `${minutes}m ago`;
    }
  };

  return (
    <p className={`text-sm text-[var(--text-secondary)] ${className}`}>
      Updated {getTimeText()}
    </p>
  );
}

export default RefreshedAt;

