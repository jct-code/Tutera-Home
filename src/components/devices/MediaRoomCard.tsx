"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import {
  Music,
  Tv,
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

// Helper to detect if a source is video-based from its name
function isVideoSource(sourceName: string | undefined): boolean {
  if (!sourceName) return false;
  
  const videoKeywords = [
    'tv', 'apple tv', 'roku', 'firestick', 'fire stick', 'chromecast',
    'hdmi', 'video', 'nvr', 'camera', 'dvr', 'cable', 'satellite',
    'dish', 'directv', 'xfinity', 'projector', 'bluray', 'blu-ray',
    'dvd', 'gaming', 'xbox', 'playstation', 'nintendo', 'switch',
    'screen', 'display', 'monitor'
  ];
  
  const lowerName = sourceName.toLowerCase();
  return videoKeywords.some(keyword => lowerName.includes(keyword));
}

export function MediaRoomCard({ mediaRoom, compact = false, roomName }: MediaRoomCardProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [showSourcePicker, setShowSourcePicker] = useState(false);
  const [localVolume, setLocalVolume] = useState<number | null>(null); // Local state for slider during drag
  
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
  
  // Determine if current source is video
  const isVideo = isVideoSource(mediaRoom.currentSourceName);
  const MediaIcon = isVideo ? Tv : Music;
  
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
  
  const handleVolumeChange = useCallback((value: number[]) => {
    // Update local state during drag for responsive UI
    setLocalVolume(value[0]);
  }, []);
  
  const handleVolumeCommit = useCallback(async (value: number[]) => {
    setIsUpdating(true);
    await setMediaRoomVolume(mediaRoomRef.current.id, value[0]);
    setLocalVolume(null); // Clear local state, use actual value from store
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
            ? "bg-gradient-to-br from-slate-500/10 to-transparent" 
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
                  ? "bg-slate-600 text-white" 
                  : "bg-[var(--surface-hover)] text-[var(--text-tertiary)]"
                }
                ${isUpdating ? "opacity-50" : "hover:opacity-80"}
              `}
            >
              <MediaIcon className="w-5 h-5" />
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
                      ? "bg-slate-600 text-white" 
                      : "bg-[var(--surface-hover)] text-[var(--text-secondary)] hover:bg-slate-500/20 hover:text-slate-300"
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
      padding="md" 
      className={`
        transition-all duration-200
        ${mediaRoom.isPoweredOn 
          ? "bg-gradient-to-br from-slate-500/10 to-transparent" 
          : ""
        }
      `}
    >
      {/* Header */}
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className={`
            w-10 h-10 rounded-xl flex items-center justify-center shrink-0
            transition-all duration-200
            ${mediaRoom.isPoweredOn 
              ? "bg-slate-600 text-white shadow-lg shadow-slate-600/30" 
              : "bg-[var(--surface-hover)] text-[var(--text-tertiary)]"
            }
          `}>
            <MediaIcon className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-[var(--text-primary)] truncate">
              {displayName}
            </h3>
            <p className="text-sm text-[var(--text-secondary)]">
              {mediaRoom.isPoweredOn && mediaRoom.currentSourceName
                ? mediaRoom.currentSourceName
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
            w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ml-3
            transition-all duration-200
            ${mediaRoom.isPoweredOn 
              ? "bg-slate-600 text-white shadow-lg shadow-slate-600/30 hover:bg-slate-700" 
              : "bg-[var(--surface-hover)] text-[var(--text-tertiary)] hover:bg-slate-600 hover:text-white hover:shadow-lg hover:shadow-slate-600/30"
            }
            ${isUpdating ? "opacity-50" : ""}
          `}
          title={mediaRoom.isPoweredOn ? "Turn off" : "Turn on"}
        >
          <Power className="w-5 h-5" />
        </button>
      </div>

      {/* Source Selector */}
      {mediaRoom.availableProviders.length > 0 && (
        <div className="mt-3">
          <div className="relative">
            <button
              onClick={() => setShowSourcePicker(!showSourcePicker)}
              disabled={isUpdating}
              className={`
                w-full flex items-center justify-between
                px-3 py-2 rounded-lg
                transition-colors
                text-left text-sm
                ${mediaRoom.isPoweredOn 
                  ? "bg-[var(--surface)] hover:bg-[var(--surface-hover)]"
                  : "bg-slate-500/10 hover:bg-slate-500/20 border border-slate-500/30"
                }
              `}
            >
              <span className={`${mediaRoom.isPoweredOn ? "text-[var(--text-secondary)]" : "text-slate-400"}`}>
                Select a source...
              </span>
              <ChevronDown className={`
                w-4 h-4 ${mediaRoom.isPoweredOn ? "text-[var(--text-tertiary)]" : "text-slate-400"}
                transition-transform duration-200
                ${showSourcePicker ? "rotate-180" : ""}
              `} />
            </button>
            
            {/* Source Dropdown */}
            {showSourcePicker && (
              <div className="
                absolute top-full left-0 right-0 mt-1 z-10
                bg-[var(--surface)] rounded-lg shadow-lg border border-[var(--border)]
                max-h-48 overflow-y-auto
              ">
                {mediaRoom.availableProviders.map((source, index) => (
                  <button
                    key={index}
                    onClick={() => handleSourceSelect(index)}
                    className={`
                      w-full px-3 py-2 text-left text-sm
                      hover:bg-[var(--surface-hover)] transition-colors
                      ${mediaRoom.currentProviderId === index 
                        ? "bg-slate-500/10 text-slate-300 font-medium" 
                        : "text-[var(--text-primary)]"
                      }
                      ${index === 0 ? "rounded-t-lg" : ""}
                      ${index === mediaRoom.availableProviders.length - 1 ? "rounded-b-lg" : ""}
                    `}
                  >
                    <div className="flex items-center justify-between">
                      <span>{source}</span>
                      {mediaRoom.currentProviderId === index && (
                        <span className="text-xs text-slate-400">●</span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Volume Slider - only show when powered on and has volume control */}
      {mediaRoom.isPoweredOn && canControlVolume && (
        <div className="mt-3">
          <div className="flex items-center gap-2">
            <Slider
              value={[localVolume !== null ? localVolume : mediaRoom.volumePercent]}
              onValueChange={handleVolumeChange}
              onValueCommit={handleVolumeCommit}
              min={0}
              max={100}
              step={1}
              disabled={isUpdating || mediaRoom.isMuted}
              color="accent"
              size="sm"
              className="flex-1"
            />
            <span className="text-sm font-medium text-[var(--text-secondary)] w-10 text-right">
              {localVolume !== null ? localVolume : mediaRoom.volumePercent}%
            </span>
          </div>
        </div>
      )}
    </Card>
  );
}

export default MediaRoomCard;
