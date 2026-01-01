"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence, PanInfo } from "framer-motion";
import {
  Zap,
  X,
  Moon,
  Sun,
  Lock,
  Palette,
} from "lucide-react";
import { useDeviceStore, setLightState, recallScene, setDoorLockState } from "@/stores/deviceStore";
import { useSettingsStore } from "@/stores/settingsStore";

interface QuickActionItem {
  id: string;
  icon: React.ElementType;
  label: string;
  color: string;
  action: () => Promise<void>;
}

export function QuickActionsBar() {
  const [isOpen, setIsOpen] = useState(false);
  const [isExecuting, setIsExecuting] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  
  const { lights, doorLocks, scenes } = useDeviceStore();
  const { 
    quickActionsEnabled, 
    quickActionsPosition, 
    setQuickActionsPosition 
  } = useSettingsStore();

  // Initialize position from saved settings and handle reset
  useEffect(() => {
    if (quickActionsPosition) {
      // Validate position is still within viewport
      if (typeof window !== "undefined") {
        const buttonSize = 56;
        const padding = 16;
        const maxX = window.innerWidth - buttonSize - padding;
        const maxY = window.innerHeight - buttonSize - padding;
        const validX = Math.max(padding, Math.min(quickActionsPosition.x, maxX));
        const validY = Math.max(padding, Math.min(quickActionsPosition.y, maxY));
        setPosition({ x: validX, y: validY });
      } else {
        setPosition(quickActionsPosition);
      }
    } else {
      // Reset to default position when null
      setPosition(null);
    }
  }, [quickActionsPosition]);

  // Don't render if disabled
  if (!quickActionsEnabled) {
    return null;
  }

  // Define quick actions based on available devices
  const quickActions: QuickActionItem[] = [
    // All Lights Off
    {
      id: "lights-off",
      icon: Moon,
      label: "All Off",
      color: "#6366F1",
      action: async () => {
        for (const light of lights) {
          if (light.isOn || light.level > 0) {
            await setLightState(light.id, 0, false);
          }
        }
      },
    },
    // All Lights On
    {
      id: "lights-on",
      icon: Sun,
      label: "All On",
      color: "#F59E0B",
      action: async () => {
        for (const light of lights) {
          if (!light.isOn && light.level === 0) {
            await setLightState(light.id, 65535, true);
          }
        }
      },
    },
    // Lock All
    {
      id: "lock-all",
      icon: Lock,
      label: "Lock All",
      color: "#22C55E",
      action: async () => {
        for (const lock of doorLocks) {
          if (!lock.isLocked) {
            await setDoorLockState(lock.id, true);
          }
        }
      },
    },
  ];

  // Add first 2 scenes as quick actions
  scenes.slice(0, 2).forEach((scene) => {
    quickActions.push({
      id: `scene-${scene.id}`,
      icon: Palette,
      label: scene.name.length > 10 ? scene.name.substring(0, 10) + "…" : scene.name,
      color: "#EC4899",
      action: async () => {
        await recallScene(scene.id);
      },
    });
  });

  const handleAction = async (action: QuickActionItem) => {
    setIsExecuting(action.id);
    await action.action();
    setIsExecuting(null);
  };

  // Calculate constrained position within viewport
  const constrainPosition = (x: number, y: number) => {
    const buttonSize = 56; // w-14 = 56px
    const padding = 16;
    const maxX = window.innerWidth - buttonSize - padding;
    const maxY = window.innerHeight - buttonSize - padding;
    return {
      x: Math.max(padding, Math.min(x, maxX)),
      y: Math.max(padding, Math.min(y, maxY)),
    };
  };

  const handleDragEnd = (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const newPosition = constrainPosition(rect.left, rect.top);
      setPosition(newPosition);
      setQuickActionsPosition(newPosition);
    }
    setIsDragging(false);
  };

  const handleClick = () => {
    // Only toggle if not dragging
    if (!isDragging) {
      setIsOpen(!isOpen);
    }
  };

  // Default position styles (bottom-right corner)
  const defaultPositionStyle = position
    ? { left: position.x, top: position.y, right: "auto", bottom: "auto" }
    : {};

  return (
    <>
      {/* Floating Action Button - Draggable */}
      <motion.button
        ref={buttonRef}
        onClick={handleClick}
        drag
        dragMomentum={false}
        dragElastic={0.1}
        onDragStart={() => setIsDragging(true)}
        onDragEnd={handleDragEnd}
        className={`
          fixed w-14 h-14 rounded-full shadow-lg
          flex items-center justify-center
          transition-colors duration-300 cursor-grab active:cursor-grabbing
          touch-none select-none
          ${isOpen ? "bg-[var(--text-primary)]" : "bg-[var(--accent)]"}
          ${!position ? "bottom-24 right-4 md:bottom-6 md:right-6" : ""}
        `}
        style={{ 
          ...defaultPositionStyle,
          zIndex: 9999, // Ensure it's above everything
          pointerEvents: "auto",
        }}
        whileHover={{ scale: isDragging ? 1 : 1.05 }}
        whileTap={{ scale: isDragging ? 1 : 0.95 }}
      >
        <motion.div
          animate={{ rotate: isOpen ? 45 : 0 }}
          transition={{ duration: 0.2 }}
        >
          {isOpen ? (
            <X className="w-6 h-6 text-white" />
          ) : (
            <Zap className="w-6 h-6 text-white" />
          )}
        </motion.div>
      </motion.button>

      {/* Quick Actions Menu */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-black/20 backdrop-blur-sm"
              style={{ zIndex: 9998 }}
            />
            
            {/* Actions - position relative to button */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="fixed flex flex-col items-end gap-3"
              style={
                position
                  ? {
                      zIndex: 9999,
                      left: position.x - 200, // Offset to the left of button
                      top: Math.max(16, position.y - quickActions.length * 48 - 16), // Above the button
                    }
                  : {
                      zIndex: 9999,
                      bottom: "10rem", // bottom-40
                      right: "1rem", // right-4
                    }
              }
            >
              {quickActions.map((action, index) => (
                <motion.button
                  key={action.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => handleAction(action)}
                  disabled={isExecuting !== null}
                  className="flex items-center gap-3 group"
                >
                  <span className="px-3 py-1.5 bg-[var(--surface)] rounded-lg shadow-md text-sm font-medium text-[var(--text-primary)] opacity-0 group-hover:opacity-100 transition-opacity">
                    {action.label}
                  </span>
                  <div
                    className={`
                      w-12 h-12 rounded-full shadow-lg flex items-center justify-center
                      transition-all duration-200
                      ${isExecuting === action.id ? "animate-pulse" : ""}
                    `}
                    style={{ backgroundColor: action.color }}
                  >
                    {isExecuting === action.id ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <action.icon className="w-5 h-5 text-white" />
                    )}
                  </div>
                </motion.button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

export default QuickActionsBar;

