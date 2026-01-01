"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { RefreshCw } from "lucide-react";

interface PullToRefreshProps {
  children: React.ReactNode;
  onRefresh: () => Promise<void>;
  disabled?: boolean;
}

const PULL_THRESHOLD = 80; // Pixels to pull before triggering refresh
const MAX_PULL = 120; // Maximum pull distance

export function PullToRefresh({ children, onRefresh, disabled = false }: PullToRefreshProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isPulling, setIsPulling] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const startY = useRef(0);
  const currentY = useRef(0);
  
  const pullDistance = useMotionValue(0);
  const rotation = useTransform(pullDistance, [0, PULL_THRESHOLD], [0, 180]);
  const opacity = useTransform(pullDistance, [0, PULL_THRESHOLD / 2, PULL_THRESHOLD], [0, 0.5, 1]);
  const scale = useTransform(pullDistance, [0, PULL_THRESHOLD], [0.5, 1]);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (disabled || isRefreshing) return;
    
    // Only enable pull-to-refresh when at the top of the page
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    if (scrollTop > 5) return;
    
    startY.current = e.touches[0].clientY;
    setIsPulling(true);
  }, [disabled, isRefreshing]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isPulling || disabled || isRefreshing) return;
    
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    if (scrollTop > 5) {
      setIsPulling(false);
      pullDistance.set(0);
      return;
    }
    
    currentY.current = e.touches[0].clientY;
    const delta = currentY.current - startY.current;
    
    if (delta > 0) {
      // Apply resistance to the pull
      const resistance = 0.5;
      const adjustedDelta = Math.min(delta * resistance, MAX_PULL);
      pullDistance.set(adjustedDelta);
      
      // Prevent default scroll when pulling
      if (adjustedDelta > 10) {
        e.preventDefault();
      }
    }
  }, [isPulling, disabled, isRefreshing, pullDistance]);

  const handleTouchEnd = useCallback(async () => {
    if (!isPulling) return;
    
    setIsPulling(false);
    const distance = pullDistance.get();
    
    if (distance >= PULL_THRESHOLD && !isRefreshing) {
      setIsRefreshing(true);
      
      // Animate to loading position
      animate(pullDistance, 60, { duration: 0.2 });
      
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
        animate(pullDistance, 0, { duration: 0.3 });
      }
    } else {
      // Snap back
      animate(pullDistance, 0, { duration: 0.3 });
    }
  }, [isPulling, pullDistance, isRefreshing, onRefresh]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Use passive: false to allow preventDefault on touchmove
    container.addEventListener("touchstart", handleTouchStart, { passive: true });
    container.addEventListener("touchmove", handleTouchMove, { passive: false });
    container.addEventListener("touchend", handleTouchEnd, { passive: true });

    return () => {
      container.removeEventListener("touchstart", handleTouchStart);
      container.removeEventListener("touchmove", handleTouchMove);
      container.removeEventListener("touchend", handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  return (
    <div ref={containerRef} className="relative min-h-screen">
      {/* Pull indicator */}
      <motion.div
        className="fixed left-1/2 -translate-x-1/2 z-50 flex items-center justify-center"
        style={{
          top: useTransform(pullDistance, (v) => v - 40),
          opacity,
        }}
      >
        <motion.div
          className={`
            w-10 h-10 rounded-full bg-[var(--surface)] shadow-lg border border-[var(--border-light)]
            flex items-center justify-center
          `}
          style={{ scale }}
        >
          <motion.div
            style={{ rotate: isRefreshing ? undefined : rotation }}
            animate={isRefreshing ? { rotate: 360 } : undefined}
            transition={isRefreshing ? { duration: 1, repeat: Infinity, ease: "linear" } : undefined}
          >
            <RefreshCw 
              className={`w-5 h-5 ${isRefreshing ? "text-[var(--accent)]" : "text-[var(--text-secondary)]"}`}
            />
          </motion.div>
        </motion.div>
      </motion.div>

      {/* Content */}
      <motion.div
        style={{
          y: useTransform(pullDistance, (v) => (isPulling || isRefreshing ? v : 0)),
        }}
      >
        {children}
      </motion.div>
    </div>
  );
}
