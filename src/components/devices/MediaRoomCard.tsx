"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import {
  Music,
  Power,
  Volume2,
  VolumeX,
  ChevronDown,
  Ban,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Slider } from "@/components/ui/Slider";
import type { MediaRoom } from "@/lib/crestron/types";
import { hasVolumeControl, hasMuteControl } from "@/lib/crestron/types";
import { 
  setMediaRoomPower, 
  setMediaRoomVolume, 
  setMediaRoomMute, 
  selectMediaRoomSource 
} from "@/stores/deviceStore";

interface MediaRoomCardProps {
  mediaRoom: MediaRoom;
  compact?: boolean;
  roomName?: string;
}

export function MediaRoomCard({ mediaRoom, compact = false, roomName }: MediaRoomCardProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [showSourcePicker, setShowSourcePicker] = useState(false);
  
  // Use a ref to always access the latest data in callbacks for other operations
  const mediaRoomRef = useRef(mediaRoom);
  useEffect(() => {
    mediaRoomRef.current = mediaRoom;
  }, [mediaRoom]);
  
  // Check if controls are available per API
  const canControlVolume = hasVolumeControl(mediaRoom);
  const canMute = hasMuteControl(mediaRoom);
  const hasSources = mediaRoom.availableProviders.length > 0;
  
  const displayName = roomName || mediaRoom.name;
  
  const handlePowerToggle = useCallback(async () => {
    if (isUpdating) return;
    setIsUpdating(true);
    try {
      // Use the current mediaRoom prop directly to ensure we have the latest state
      // This prevents using stale state that might cause incorrect toggles
      const currentState = mediaRoom.isPoweredOn;
      const newPowerState = currentState ? "off" : "on";
      await setMediaRoomPower(mediaRoom.id, newPowerState);
    } finally {
      setIsUpdating(false);
    }
  }, [mediaRoom.id, mediaRoom.isPoweredOn, isUpdating]);
  
  const handleVolumeChange = useCallback(async (value: number[]) => {
    // Don't send API call during drag, just update UI
  }, []);
  
  const handleVolumeCommit = useCallback(async (value: number[]) => {
    setIsUpdating(true);
    await setMediaRoomVolume(mediaRoomRef.current.id, value[0]);
    setIsUpdating(false);
  }, []);
  
  const handleMuteToggle = useCallback(async () => {
    setIsUpdating(true);
    await setMediaRoomMute(mediaRoomRef.current.id, !mediaRoomRef.current.isMuted);
    setIsUpdating(false);
  }, []);
  
  const handleSourceSelect = useCallback(async (sourceIndex: number) => {
    setIsUpdating(true);
    setShowSourcePicker(false);
    await selectMediaRoomSource(mediaRoomRef.current.id, sourceIndex);
    setIsUpdating(false);
  }, []);

  // Compact view for lists
  if (compact) {
    return (
      <Card
        hoverable
        padding="sm"
        className={`
          transition-all duration-200
          ${mediaRoom.isPoweredOn 
            ? "bg-gradient-to-br from-purple-500/10 to-transparent" 
            : "bg-gradient-to-br from-[var(--surface)]/50 to-transparent"
          }
        `}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={handlePowerToggle}
              disabled={isUpdating}
              className={`
                w-10 h-10 rounded-xl flex items-center justify-center shrink-0
                transition-all duration-200
                ${mediaRoom.isPoweredOn 
                  ? "bg-purple-500 text-white" 
                  : "bg-[var(--surface-hover)] text-[var(--text-tertiary)]"
                }
                ${isUpdating ? "opacity-50" : "hover:opacity-80"}
              `}
            >
              <Music className="w-5 h-5" />
            </button>
            <div className="min-w-0">
              <p className="font-medium text-sm text-[var(--text-primary)] truncate">
                {displayName}
              </p>
              <p className="text-xs text-[var(--text-secondary)] truncate">
                {mediaRoom.isPoweredOn 
                  ? mediaRoom.currentSourceName || "Playing" 
                  : "Off"
                }
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {mediaRoom.isPoweredOn && (
              <span className={`text-sm font-medium ${canControlVolume ? "text-[var(--text-secondary)]" : "text-[var(--text-tertiary)] line-through"}`}>
                {mediaRoom.volumePercent}%
              </span>
            )}
            {mediaRoom.isPoweredOn && (
              <button
                onClick={canMute ? handleMuteToggle : undefined}
                disabled={isUpdating || !canMute}
                title={canMute ? (mediaRoom.isMuted ? "Unmute" : "Mute") : "Mute not available"}
                className={`
                  p-1.5 rounded-lg transition-colors relative
                  ${!canMute 
                    ? "opacity-40 cursor-not-allowed" 
                    : mediaRoom.isMuted 
                      ? "bg-red-500/20 text-red-500" 
                      : "text-[var(--text-tertiary)] hover:bg-[var(--surface-hover)]"
                  }
                `}
              >
                {mediaRoom.isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                {!canMute && (
                  <Ban className="w-3 h-3 absolute -top-0.5 -right-0.5 text-[var(--text-tertiary)]" />
                )}
              </button>
            )}
          </div>
        </div>
        
        {/* Source selector - show when OFF and has sources */}
        {!mediaRoom.isPoweredOn && hasSources && (
          <div className="mt-3 pt-3 border-t border-[var(--border)]">
            <p className="text-[10px] font-medium text-[var(--text-tertiary)] mb-2 uppercase tracking-wide">
              Select source to power on
            </p>
            <div className="flex flex-wrap gap-1.5">
              {mediaRoom.availableProviders.slice(0, 6).map((source, index) => (
                <button
                  key={index}
                  onClick={() => handleSourceSelect(index)}
                  disabled={isUpdating}
                  className={`
                    px-2.5 py-1 text-xs rounded-lg transition-all
                    ${index === 0 
                      ? "bg-purple-500 text-white" 
                      : "bg-[var(--surface-hover)] text-[var(--text-secondary)] hover:bg-purple-500/20 hover:text-purple-400"
                    }
                    ${isUpdating ? "opacity-50" : ""}
                  `}
                >
                  {source}
                </button>
              ))}
              {mediaRoom.availableProviders.length > 6 && (
                <span className="px-2 py-1 text-xs text-[var(--text-tertiary)]">
                  +{mediaRoom.availableProviders.length - 6} more
                </span>
              )}
            </div>
          </div>
        )}
      </Card>
    );
  }

  // Full card view
  return (
    <Card 
      padding="lg" 
      className={`
        transition-all duration-200
        ${mediaRoom.isPoweredOn 
          ? "bg-gradient-to-br from-purple-500/10 to-transparent" 
          : ""
        }
      `}
    >
      {/* Header - using raw div instead of CardHeader to ensure full width */}
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center gap-3 min-w-0">
          <div className={`
            w-12 h-12 rounded-xl flex items-center justify-center shrink-0
            transition-all duration-200
            ${mediaRoom.isPoweredOn 
              ? "bg-purple-500 text-white shadow-lg shadow-purple-500/30" 
              : "bg-[var(--surface-hover)] text-[var(--text-tertiary)]"
            }
          `}>
            <Music className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold text-[var(--text-primary)] truncate">
              {displayName}
            </h3>
            <p className="text-sm text-[var(--text-secondary)]">
              {mediaRoom.isPoweredOn 
                ? mediaRoom.currentSourceName || "Playing" 
                : "Off"
              }
            </p>
          </div>
        </div>
        
        {/* Power Toggle */}
        <button
          onClick={handlePowerToggle}
          disabled={isUpdating}
          className={`
            w-14 h-14 rounded-xl flex items-center justify-center shrink-0 ml-4
            transition-all duration-200
            ${mediaRoom.isPoweredOn 
              ? "bg-purple-500 text-white shadow-lg shadow-purple-500/30 hover:bg-purple-600" 
              : "bg-[var(--surface-hover)] text-[var(--text-tertiary)] hover:bg-purple-500 hover:text-white hover:shadow-lg hover:shadow-purple-500/30"
            }
            ${isUpdating ? "opacity-50" : ""}
          `}
          title={mediaRoom.isPoweredOn ? "Turn off" : "Turn on"}
        >
          <Power className="w-6 h-6" />
        </button>
      </div>

      {/* Source Selector - ALWAYS show when sources available (even when off) */}
      {mediaRoom.availableProviders.length > 0 && (
        <div className="mt-4">
          <p className="text-xs font-medium text-[var(--text-secondary)] mb-2">
            {mediaRoom.isPoweredOn ? "SOURCE" : "SELECT SOURCE TO POWER ON"}
          </p>
          <div className="relative">
            <button
              onClick={() => setShowSourcePicker(!showSourcePicker)}
              disabled={isUpdating}
              className={`
                w-full flex items-center justify-between
                px-4 py-3 rounded-xl
                transition-colors
                text-left
                ${mediaRoom.isPoweredOn 
                  ? "bg-[var(--surface)] hover:bg-[var(--surface-hover)]"
                  : "bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30"
                }
              `}
            >
              <span className={`text-sm font-medium ${mediaRoom.isPoweredOn ? "text-[var(--text-primary)]" : "text-purple-400"}`}>
                {mediaRoom.currentSourceName || mediaRoom.availableProviders[0] || "Select Source"}
              </span>
              <ChevronDown className={`
                w-4 h-4 ${mediaRoom.isPoweredOn ? "text-[var(--text-tertiary)]" : "text-purple-400"}
                transition-transform duration-200
                ${showSourcePicker ? "rotate-180" : ""}
              `} />
            </button>
            
            {/* Source Dropdown */}
            {showSourcePicker && (
              <div className="
                absolute top-full left-0 right-0 mt-1 z-10
                bg-[var(--surface)] rounded-xl shadow-lg border border-[var(--border)]
                max-h-48 overflow-y-auto
              ">
                {mediaRoom.availableProviders.map((source, index) => (
                  <button
                    key={index}
                    onClick={() => handleSourceSelect(index)}
                    className={`
                      w-full px-4 py-2.5 text-left text-sm
                      hover:bg-[var(--surface-hover)] transition-colors
                      ${mediaRoom.currentProviderId === index 
                        ? "bg-purple-500/10 text-purple-500 font-medium" 
                        : "text-[var(--text-primary)]"
                      }
                      ${index === 0 ? "rounded-t-xl" : ""}
                      ${index === mediaRoom.availableProviders.length - 1 ? "rounded-b-xl" : ""}
                    `}
                  >
                    {source}
                  </button>
                ))}
              </div>
            )}
          </div>
          {!mediaRoom.isPoweredOn && (
            <p className="text-xs text-purple-400/70 mt-2 italic">
              Selecting a source will set it as default and power on the room
            </p>
          )}
        </div>
      )}

      {/* Controls - only show when powered on */}
      {mediaRoom.isPoweredOn && (
        <div className="mt-4 space-y-4">
          {/* Volume Slider - always shown when powered on */}
          <div className={!canControlVolume ? "opacity-60" : ""}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <p className="text-xs font-medium text-[var(--text-secondary)]">VOLUME</p>
                {!canControlVolume && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--surface-hover)] text-[var(--text-tertiary)] flex items-center gap-1">
                    <Ban className="w-2.5 h-2.5" />
                    Not available
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={canMute ? handleMuteToggle : undefined}
                  disabled={isUpdating || !canMute}
                  title={canMute ? (mediaRoom.isMuted ? "Unmute" : "Mute") : "Mute not available for this room"}
                  className={`
                    p-1.5 rounded-lg transition-colors relative
                    ${!canMute 
                      ? "opacity-40 cursor-not-allowed" 
                      : mediaRoom.isMuted 
                        ? "bg-red-500/20 text-red-500" 
                        : "text-[var(--text-tertiary)] hover:bg-[var(--surface-hover)]"
                    }
                  `}
                >
                  {mediaRoom.isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                  {!canMute && (
                    <Ban className="w-3 h-3 absolute -top-0.5 -right-0.5 text-[var(--text-tertiary)]" />
                  )}
                </button>
                <span className={`text-sm font-semibold w-10 text-right ${canControlVolume ? "text-[var(--text-primary)]" : "text-[var(--text-tertiary)]"}`}>
                  {mediaRoom.volumePercent}%
                </span>
              </div>
            </div>
            <Slider
              value={[mediaRoom.volumePercent]}
              onValueChange={canControlVolume ? handleVolumeChange : undefined}
              onValueCommit={canControlVolume ? handleVolumeCommit : undefined}
              min={0}
              max={100}
              step={1}
              disabled={isUpdating || mediaRoom.isMuted || !canControlVolume}
              color="accent"
              size="md"
            />
            {!canControlVolume && (
              <p className="text-xs text-[var(--text-tertiary)] mt-2 italic">
                This room does not support volume control
              </p>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}

export default MediaRoomCard;
