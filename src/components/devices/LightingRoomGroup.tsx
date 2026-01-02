"use client";

import { useState, useCallback, useRef, useMemo, useEffect } from "react";
import { Card } from "@/components/ui/Card";
import { LightCard, LightGroupControl, levelToPercent, percentToLevel } from "@/components/devices/LightCard";
import { EquipmentCard } from "@/components/devices/EquipmentCard";
import type { LightingRoomGroup } from "@/stores/deviceStore";
import { setLightState, useDeviceStore, recallScene } from "@/stores/deviceStore";
import type { Scene } from "@/lib/crestron/types";
import { Building2, Lightbulb, ChevronDown, ChevronRight, Power, Star, Play } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// Helper to get/set last brightness level from localStorage
const LAST_BRIGHTNESS_KEY = "tutera-last-brightness";
function getLastBrightness(lightId: string): number | null {
  try {
    const stored = localStorage.getItem(LAST_BRIGHTNESS_KEY);
    if (stored) {
      const data = JSON.parse(stored);
      return data[lightId] || null;
    }
  } catch {
    // Ignore errors
  }
  return null;
}

function setLastBrightness(lightId: string, brightness: number): void {
  try {
    const stored = localStorage.getItem(LAST_BRIGHTNESS_KEY);
    const data = stored ? JSON.parse(stored) : {};
    data[lightId] = brightness;
    localStorage.setItem(LAST_BRIGHTNESS_KEY, JSON.stringify(data));
  } catch {
    // Ignore errors
  }
}

// Compact scene button for room groups
function CompactSceneButton({ scene }: { scene: Scene }) {
  const [isActivating, setIsActivating] = useState(false);
  
  const handleActivate = useCallback(async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsActivating(true);
    await recallScene(scene.id);
    setTimeout(() => setIsActivating(false), 1000);
  }, [scene.id]);
  
  return (
    <button
      onClick={handleActivate}
      disabled={isActivating}
      className={`
        flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium
        bg-amber-500/10 text-amber-600 hover:bg-amber-500/20
        transition-colors disabled:opacity-50
        ${scene.isActive ? "ring-1 ring-amber-500" : ""}
      `}
      title={`Activate ${scene.name}`}
    >
      {isActivating ? (
        <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
      ) : (
        <Play className="w-3 h-3" />
      )}
      <span className="truncate max-w-[100px]">{scene.name}</span>
      {scene.isActive && <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />}
    </button>
  );
}

const HOLD_DELAY_MS = 200;
const SCROLL_THRESHOLD = 10;

interface LightingRoomGroupComponentProps {
  group: LightingRoomGroup;
  expanded?: boolean;
  onToggleExpand?: () => void;
}

export function LightingRoomGroup({ 
  group, 
  expanded = false, 
  onToggleExpand 
}: LightingRoomGroupComponentProps) {
  const { roomId, roomName, lights, lightsOn, totalLights, avgBrightness, equipment } = group;
  
  // Get favorite scenes for this room
  const scenes = useDeviceStore((state) => state.scenes);
  const favoriteSceneIds = useDeviceStore((state) => state.favoriteSceneIds);
  
  const favoriteScenes = useMemo(() => {
    return scenes.filter(
      (scene) => scene.roomId === roomId && favoriteSceneIds.includes(scene.id)
    );
  }, [scenes, favoriteSceneIds, roomId]);
  
  const lightsOff = totalLights - lightsOn;
  const isOn = lightsOn > 0;
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isHolding, setIsHolding] = useState(false);
  const [dragPercent, setDragPercent] = useState<number | null>(null);
  const [startX, setStartX] = useState(0);
  const headerRef = useRef<HTMLDivElement>(null);
  const holdTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pendingPointerRef = useRef<{ clientX: number; clientY: number; pointerId: number } | null>(null);
  
  // Clear hold timer on unmount
  useEffect(() => {
    return () => {
      if (holdTimerRef.current) {
        clearTimeout(holdTimerRef.current);
      }
    };
  }, []);
  
  const buttonDisabled = isUpdating || lights.length === 0;

  // Calculate average brightness of all lights
  const avgPercent = useMemo(() => {
    if (totalLights === 0) return 0;
    const totalLevel = lights.reduce((sum, l) => sum + l.level, 0);
    return levelToPercent(Math.round(totalLevel / totalLights));
  }, [lights, totalLights]);

  // Handle all lights brightness change (for swipe)
  const handleAllLights = useCallback(async (targetPercent: number) => {
    setIsUpdating(true);
    const targetLevel = percentToLevel(targetPercent);
    const isOn = targetPercent > 0;
    
    for (const light of lights) {
      await setLightState(light.id, targetLevel, isOn);
    }
    setIsUpdating(false);
  }, [lights]);

  // Handle room toggle - save/restore individual light brightness levels
  const handleRoomToggle = useCallback(async (e?: React.MouseEvent | React.PointerEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    if (isUpdating || lights.length === 0) return;
    
    setIsUpdating(true);
    
    try {
      if (isOn) {
        // Turning off: save each light's current brightness
        const promises = lights.map(async (light) => {
          const percent = levelToPercent(light.level);
          if (percent > 0) {
            setLastBrightness(light.id, percent);
          }
          return setLightState(light.id, 0, false);
        });
        await Promise.all(promises);
      } else {
        // Turning on: restore each light to its last brightness (or 75% default)
        const promises = lights.map(async (light) => {
          const lastBrightness = getLastBrightness(light.id);
          const targetPercent = lastBrightness !== null ? lastBrightness : 75;
          const targetLevel = percentToLevel(targetPercent);
          return setLightState(light.id, targetLevel, true);
        });
        await Promise.all(promises);
      }
    } catch (error) {
      console.error('Error toggling room lights:', error);
    } finally {
      setIsUpdating(false);
    }
  }, [isOn, lights, isUpdating]);

  // Handle swipe for brightness control with hold delay
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (isUpdating) return;
    // Don't start dragging if clicking on expand chevron area or toggle button
    const target = e.target as HTMLElement;
    if (target.closest('[data-expand-button]') || target.closest('[data-toggle-button]')) return;
    
    // Store pending pointer info and start hold timer
    pendingPointerRef.current = { 
      clientX: e.clientX, 
      clientY: e.clientY,
      pointerId: e.pointerId
    };
    setIsHolding(true);
    setStartX(e.clientX);
    
    // Start hold timer - only activate dragging after delay
    holdTimerRef.current = setTimeout(() => {
      if (pendingPointerRef.current) {
        setIsDragging(true);
        setDragPercent(avgPercent);
        try {
          (e.target as HTMLElement).setPointerCapture(pendingPointerRef.current.pointerId);
        } catch {
          // Pointer capture may fail if pointer was released
        }
      }
    }, HOLD_DELAY_MS);
  }, [isUpdating, avgPercent]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    // Check if user is scrolling during hold period (before drag activated)
    if (isHolding && !isDragging && pendingPointerRef.current) {
      const deltaX = Math.abs(e.clientX - pendingPointerRef.current.clientX);
      const deltaY = Math.abs(e.clientY - pendingPointerRef.current.clientY);
      
      // If user moved too much, cancel the hold (they're scrolling)
      if (deltaX > SCROLL_THRESHOLD || deltaY > SCROLL_THRESHOLD) {
        if (holdTimerRef.current) {
          clearTimeout(holdTimerRef.current);
          holdTimerRef.current = null;
        }
        pendingPointerRef.current = null;
        setIsHolding(false);
        return;
      }
    }
    
    if (!isDragging || isUpdating) return;
    
    const headerWidth = headerRef.current?.offsetWidth || 300;
    const deltaX = e.clientX - startX;
    const percentChange = (deltaX / headerWidth) * 100;
    const newPercent = Math.max(0, Math.min(100, avgPercent + percentChange));
    setDragPercent(Math.round(newPercent));
  }, [isDragging, isHolding, isUpdating, startX, avgPercent]);

  const handlePointerUp = useCallback(async (e: React.PointerEvent) => {
    // Clear hold timer if still pending
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    pendingPointerRef.current = null;
    setIsHolding(false);
    
    if (!isDragging) return;
    
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // May fail if not captured
    }
    
    const headerWidth = headerRef.current?.offsetWidth || 300;
    const deltaX = e.clientX - startX;
    const percentChange = (deltaX / headerWidth) * 100;
    const newPercent = Math.max(0, Math.min(100, avgPercent + percentChange));
    
    await handleAllLights(Math.round(newPercent));
    
    setIsDragging(false);
    setDragPercent(null);
  }, [isDragging, startX, avgPercent, handleAllLights]);

  const displayPercent = isDragging && dragPercent !== null ? dragPercent : avgPercent;
  const bgFillPercent = isDragging && dragPercent !== null ? dragPercent : (isOn ? avgPercent : 0);

  // Handle icon click toggle (matching the pattern from LightCard)
  const handleIconClick = useCallback(async (e: React.MouseEvent | React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (buttonDisabled) return;
    console.log('Room icon clicked', { isOn, lightsCount: lights.length, buttonDisabled });
    await handleRoomToggle(e);
  }, [handleRoomToggle, buttonDisabled, isOn, lights]);
  
  // Handle pointer events on icon to prevent swipe
  const handleIconPointerDown = useCallback((e: React.PointerEvent) => {
    e.stopPropagation();
  }, []);

  // Slider control handlers with hold delay
  const [sliderDragging, setSliderDragging] = useState(false);
  const [sliderHolding, setSliderHolding] = useState(false);
  const [sliderDragPercent, setSliderDragPercent] = useState<number | null>(null);
  const [sliderStartX, setSliderStartX] = useState(0);
  const sliderRef = useRef<HTMLDivElement>(null);
  const sliderHoldTimerRef = useRef<NodeJS.Timeout | null>(null);
  const sliderPendingPointerRef = useRef<{ clientX: number; clientY: number; pointerId: number } | null>(null);
  
  // Clear slider hold timer on unmount
  useEffect(() => {
    return () => {
      if (sliderHoldTimerRef.current) {
        clearTimeout(sliderHoldTimerRef.current);
      }
    };
  }, []);

  const handleSliderPointerDown = useCallback((e: React.PointerEvent) => {
    if (isUpdating) return;
    const target = e.target as HTMLElement;
    if (target.closest('[data-expand-button]') || target.closest('[data-toggle-button]')) return;
    
    // Store pending pointer info and start hold timer
    sliderPendingPointerRef.current = { 
      clientX: e.clientX, 
      clientY: e.clientY,
      pointerId: e.pointerId
    };
    setSliderHolding(true);
    setSliderStartX(e.clientX);
    
    // Start hold timer - only activate dragging after delay
    sliderHoldTimerRef.current = setTimeout(() => {
      if (sliderPendingPointerRef.current) {
        setSliderDragging(true);
        setSliderDragPercent(avgPercent);
        try {
          (e.target as HTMLElement).setPointerCapture(sliderPendingPointerRef.current.pointerId);
        } catch {
          // Pointer capture may fail if pointer was released
        }
      }
    }, HOLD_DELAY_MS);
  }, [isUpdating, avgPercent]);

  const handleSliderPointerMove = useCallback((e: React.PointerEvent) => {
    // Check if user is scrolling during hold period (before drag activated)
    if (sliderHolding && !sliderDragging && sliderPendingPointerRef.current) {
      const deltaX = Math.abs(e.clientX - sliderPendingPointerRef.current.clientX);
      const deltaY = Math.abs(e.clientY - sliderPendingPointerRef.current.clientY);
      
      // If user moved too much, cancel the hold (they're scrolling)
      if (deltaX > SCROLL_THRESHOLD || deltaY > SCROLL_THRESHOLD) {
        if (sliderHoldTimerRef.current) {
          clearTimeout(sliderHoldTimerRef.current);
          sliderHoldTimerRef.current = null;
        }
        sliderPendingPointerRef.current = null;
        setSliderHolding(false);
        return;
      }
    }
    
    if (!sliderDragging || isUpdating) return;
    
    const sliderWidth = sliderRef.current?.offsetWidth || 300;
    const deltaX = e.clientX - sliderStartX;
    const percentChange = (deltaX / sliderWidth) * 100;
    const newPercent = Math.max(0, Math.min(100, avgPercent + percentChange));
    setSliderDragPercent(Math.round(newPercent));
  }, [sliderDragging, sliderHolding, isUpdating, sliderStartX, avgPercent]);

  const handleSliderPointerUp = useCallback(async (e: React.PointerEvent) => {
    // Clear hold timer if still pending
    if (sliderHoldTimerRef.current) {
      clearTimeout(sliderHoldTimerRef.current);
      sliderHoldTimerRef.current = null;
    }
    sliderPendingPointerRef.current = null;
    setSliderHolding(false);
    
    if (!sliderDragging) return;
    
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // May fail if not captured
    }
    
    const sliderWidth = sliderRef.current?.offsetWidth || 300;
    const deltaX = e.clientX - sliderStartX;
    const percentChange = (deltaX / sliderWidth) * 100;
    const newPercent = Math.max(0, Math.min(100, avgPercent + percentChange));
    
    await handleAllLights(Math.round(newPercent));
    
    setSliderDragging(false);
    setSliderDragPercent(null);
  }, [sliderDragging, sliderStartX, avgPercent, handleAllLights]);

  const sliderDisplayPercent = sliderDragging && sliderDragPercent !== null ? sliderDragPercent : avgPercent;
  const sliderBgFillPercent = sliderDragging && sliderDragPercent !== null ? sliderDragPercent : (isOn ? avgPercent : 0);

  return (
    <Card padding="lg" className="bg-gradient-to-br from-yellow-500/5 to-transparent relative overflow-hidden">
      {/* Single unified card content */}
      <div className="space-y-3">
        {/* Header Section - Clickable to expand/collapse */}
        <div 
          className={`relative flex items-center justify-between ${onToggleExpand ? 'cursor-pointer' : ''}`}
          onClick={() => onToggleExpand?.()}
        >
          <div className="flex items-center gap-3 flex-1">
            <motion.button
              data-toggle-button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleIconClick(e);
              }}
              onPointerDown={(e) => {
                e.stopPropagation();
                handleIconPointerDown(e);
              }}
              disabled={buttonDisabled}
              animate={{
                backgroundColor: bgFillPercent > 0 
                  ? `rgba(252,211,77,${0.4 + (bgFillPercent / 100) * 0.4})` 
                  : "rgba(252,211,77,0.2)",
              }}
              className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 cursor-pointer hover:opacity-80 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed relative z-10"
              title={isOn ? "Click to turn all lights off" : "Click to turn all lights on"}
              style={{ 
                pointerEvents: 'auto', 
                touchAction: 'manipulation',
                cursor: 'pointer',
              }}
            >
              <Lightbulb 
                className={`w-4 h-4 transition-colors ${bgFillPercent > 0 ? "text-white" : "text-[var(--light-color)]"}`} 
              />
            </motion.button>
            <div className="text-left flex-1">
              <p className="font-medium text-[var(--text-primary)]">
                {roomName}
              </p>
              <p className="text-xs text-[var(--text-secondary)]">
                {`${lightsOn} of ${totalLights} on`}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Light count */}
            <span className="text-sm text-[var(--text-tertiary)]">
              {totalLights} light{totalLights !== 1 ? "s" : ""}
            </span>
            
            {/* Expand indicator */}
            {onToggleExpand && (
              <div className="p-1">
                {expanded ? (
                  <ChevronDown className="w-5 h-5 text-[var(--text-tertiary)]" />
                ) : (
                  <ChevronRight className="w-5 h-5 text-[var(--text-tertiary)]" />
                )}
              </div>
            )}
          </div>
        </div>

        {/* Slider Control - Compact, inline with percentage */}
        {lights.length > 0 && (
          <div className="flex items-center gap-3">
            <div
              ref={sliderRef}
              onPointerDown={handleSliderPointerDown}
              onPointerMove={handleSliderPointerMove}
              onPointerUp={handleSliderPointerUp}
              onPointerCancel={handleSliderPointerUp}
              role="slider"
              aria-label={`${roomName} lights control. ${lightsOn} of ${totalLights} on at ${avgPercent}% average brightness. Slide to adjust.`}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={avgPercent}
              aria-valuetext={`${avgPercent}% brightness`}
              tabIndex={0}
              className={`
                flex-1 relative overflow-hidden rounded-lg cursor-ew-resize h-6
                transition-shadow duration-300 select-none touch-pan-y
                bg-[var(--border-light)]
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2
                ${sliderDragging ? "shadow-[var(--shadow-lg)] z-10" : ""}
                ${isUpdating ? "opacity-70 pointer-events-none" : ""}
              `}
            >
              {/* Brightness fill bar */}
              <motion.div
                className="absolute inset-0 h-full"
                style={{
                  background: "linear-gradient(90deg, var(--light-color), var(--light-color-warm))",
                }}
                animate={{ width: `${sliderDisplayPercent}%` }}
                transition={{ duration: sliderDragging ? 0.05 : 0.3 }}
              />
            </div>
            
            {/* Percentage display - inline right of slider */}
            <span className={`text-sm font-medium tabular-nums transition-colors min-w-[2.5rem] text-right ${sliderDragging ? "text-[var(--light-color-warm)]" : "text-[var(--text-tertiary)]"}`}>
              {sliderDisplayPercent}%
            </span>
          </div>
        )}
        
        {/* Favorite Scenes - Quick access */}
        {favoriteScenes.length > 0 && (
          <div className="pt-3 border-t border-[var(--border-light)]">
            <div className="flex items-center gap-2 mb-2">
              <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
              <span className="text-xs text-[var(--text-tertiary)]">Quick Scenes</span>
            </div>
            <div className="flex flex-wrap gap-2 justify-center">
              {favoriteScenes.slice(0, 4).map((scene) => (
                <CompactSceneButton key={scene.id} scene={scene} />
              ))}
              {favoriteScenes.length > 4 && (
                <span className="text-xs text-[var(--text-tertiary)] self-center px-2">
                  +{favoriteScenes.length - 4} more
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Expanded Content - Only show when expanded */}
      <AnimatePresence>
        {expanded && (lights.length > 0 || equipment.length > 0) && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-6 pt-6 border-t border-[var(--border-light)]"
          >
            {/* Individual Lights */}
            {lights.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-[var(--text-secondary)] mb-3">
                  Individual Lights
                </h4>
                <div className="grid grid-cols-1 gap-3">
                  {lights.map((light) => (
                    <LightCard key={light.id} light={light} compact />
                  ))}
                </div>
              </div>
            )}
            
            {/* Equipment Section */}
            {equipment.length > 0 && (
              <div className={lights.length > 0 ? "mt-6" : ""}>
                <div className="flex items-center gap-2 mb-3">
                  <Power className="w-4 h-4 text-[var(--accent)]" />
                  <h4 className="text-sm font-medium text-[var(--text-secondary)]">
                    Equipment
                  </h4>
                </div>
                <div className="grid grid-cols-1 gap-3">
                  {equipment.map((equip) => (
                    <EquipmentCard key={equip.id} equipment={equip} compact />
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}

export default LightingRoomGroup;

