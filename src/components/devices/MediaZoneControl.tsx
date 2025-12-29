"use client";

import { useState, useCallback, useMemo } from "react";
import {
  Music,
  Power,
  Volume2,
  VolumeX,
  Home,
  Building2,
  ChevronDown,
  Play,
  Pause,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Slider } from "@/components/ui/Slider";
import { MediaRoomCard } from "@/components/devices/MediaRoomCard";
import type { MediaRoomZoneWithData } from "@/stores/deviceStore";
import { 
  setZoneMediaRoomPower,
  setZoneMediaRoomVolume,
  useDeviceStore,
} from "@/stores/deviceStore";

interface MediaZoneControlProps {
  zoneData: MediaRoomZoneWithData;
  expanded?: boolean;
  onToggleExpand?: () => void;
}

export function MediaZoneControl({ 
  zoneData, 
  expanded = false,
  onToggleExpand 
}: MediaZoneControlProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [localVolume, setLocalVolume] = useState(zoneData.avgVolume);
  const { rooms } = useDeviceStore();
  
  const { zone, mediaRooms, totalRooms, playingCount, avgVolume } = zoneData;
  
  // Create a map of roomId to room name for display
  const roomNameMap = useMemo(() => {
    const map = new Map<string, string>();
    rooms.forEach(room => map.set(room.id, room.name));
    return map;
  }, [rooms]);
  
  // Get display name for a media room
  const getDisplayName = useCallback((roomId: string | undefined, defaultName: string) => {
    if (roomId && roomNameMap.has(roomId)) {
      return roomNameMap.get(roomId)!;
    }
    return defaultName;
  }, [roomNameMap]);
  
  // Sync local volume with zone average when it changes externally
  // useEffect(() => {
  //   setLocalVolume(avgVolume);
  // }, [avgVolume]);
  
  const isAnyPlaying = playingCount > 0;
  
  const handlePowerToggle = useCallback(async () => {
    setIsUpdating(true);
    const newPowerState = isAnyPlaying ? "off" : "on";
    await setZoneMediaRoomPower(zone.id, newPowerState);
    setIsUpdating(false);
  }, [zone.id, isAnyPlaying]);
  
  const handleVolumeChange = useCallback((value: number[]) => {
    setLocalVolume(value[0]);
  }, []);
  
  const handleVolumeCommit = useCallback(async (value: number[]) => {
    setIsUpdating(true);
    await setZoneMediaRoomVolume(zone.id, value[0]);
    setIsUpdating(false);
  }, [zone.id]);
  
  const handleAllOn = useCallback(async () => {
    setIsUpdating(true);
    await setZoneMediaRoomPower(zone.id, "on");
    setIsUpdating(false);
  }, [zone.id]);
  
  const handleAllOff = useCallback(async () => {
    setIsUpdating(true);
    await setZoneMediaRoomPower(zone.id, "off");
    setIsUpdating(false);
  }, [zone.id]);
  
  // Icon for zone type
  const ZoneIcon = zone.id === "whole-house" ? Home : Building2;
  
  return (
    <Card 
      padding="lg" 
      className={`
        transition-all duration-300
        ${isAnyPlaying 
          ? "bg-gradient-to-br from-purple-500/10 to-purple-500/5 border-purple-500/20" 
          : "bg-gradient-to-br from-[var(--surface)]/50 to-transparent"
        }
        ${expanded ? "ring-2 ring-purple-500/30" : ""}
      `}
    >
      {/* Zone Header */}
      <div 
        className={`flex items-center justify-between ${onToggleExpand ? "cursor-pointer" : ""}`}
        onClick={onToggleExpand}
      >
        <div className="flex items-center gap-3">
          <div 
            className={`
              w-12 h-12 rounded-xl flex items-center justify-center shadow-lg transition-all duration-200
              ${isAnyPlaying 
                ? "bg-purple-500 shadow-purple-500/30" 
                : "bg-[var(--surface-hover)]"
              }
            `}
          >
            <ZoneIcon className={`w-6 h-6 ${isAnyPlaying ? "text-white" : "text-[var(--text-tertiary)]"}`} />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">
              {zone.name}
            </h2>
            <p className="text-sm text-[var(--text-secondary)]">
              {playingCount > 0 
                ? `${playingCount} of ${totalRooms} rooms playing`
                : `${totalRooms} rooms (all off)`
              }
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {isAnyPlaying && (
            <div className="text-right">
              <p className="text-2xl font-light text-[var(--text-primary)]">
                {avgVolume}%
              </p>
              <p className="text-xs text-[var(--text-tertiary)]">Avg Volume</p>
            </div>
          )}
          {onToggleExpand && (
            <ChevronDown 
              className={`w-5 h-5 text-[var(--text-tertiary)] transition-transform duration-300 ${expanded ? "rotate-180" : ""}`} 
            />
          )}
        </div>
      </div>
      
      {/* Expandable Content */}
      <div className={`overflow-hidden transition-all duration-300 ${expanded ? "mt-6 opacity-100" : "max-h-0 opacity-0"}`}>
        {/* Zone Controls */}
        <div className="mb-6 space-y-4">
          {/* Power Controls */}
          <div>
            <p className="text-xs font-medium text-[var(--text-secondary)] mb-3 uppercase tracking-wider">Quick Actions</p>
            <div className="flex gap-2">
              <button
                onClick={(e) => { e.stopPropagation(); handleAllOn(); }}
                disabled={isUpdating}
                className={`
                  flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl
                  transition-all duration-200 font-medium
                  ${playingCount === totalRooms
                    ? "bg-purple-500 text-white shadow-lg shadow-purple-500/30"
                    : "bg-[var(--surface)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]"
                  }
                  disabled:opacity-50
                `}
              >
                <Play className="w-4 h-4" />
                All On
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); handleAllOff(); }}
                disabled={isUpdating}
                className={`
                  flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl
                  transition-all duration-200 font-medium
                  ${playingCount === 0
                    ? "bg-[var(--surface-hover)] text-[var(--text-secondary)]"
                    : "bg-[var(--surface)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]"
                  }
                  disabled:opacity-50
                `}
              >
                <Pause className="w-4 h-4" />
                All Off
              </button>
            </div>
          </div>
          
          {/* Zone Volume Control - only show when at least one room is playing */}
          {isAnyPlaying && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">Zone Volume</p>
                <span className="text-sm font-semibold text-[var(--text-primary)]">
                  {localVolume}%
                </span>
              </div>
              <Slider
                value={[localVolume]}
                onValueChange={handleVolumeChange}
                onValueCommit={handleVolumeCommit}
                min={0}
                max={100}
                step={1}
                disabled={isUpdating}
                color="accent"
                size="md"
              />
              <p className="text-xs text-[var(--text-tertiary)] mt-2">
                Adjusts volume for {playingCount} playing {playingCount === 1 ? "room" : "rooms"}
              </p>
            </div>
          )}
        </div>
        
        {/* Media Room List */}
        {mediaRooms.length > 0 && (
          <div className="pt-4 border-t border-[var(--border)]">
            <p className="text-xs font-medium text-[var(--text-tertiary)] mb-3">
              Rooms in this zone ({mediaRooms.length}):
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {mediaRooms.map((mediaRoom) => (
                <MediaRoomCard
                  key={mediaRoom.id}
                  mediaRoom={mediaRoom}
                  roomName={getDisplayName(mediaRoom.roomId, mediaRoom.name)}
                  compact
                />
              ))}
            </div>
          </div>
        )}
      </div>
      
      {/* Collapsed Summary */}
      {!expanded && (
        <div className="mt-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div 
              className={`
                flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium
                ${isAnyPlaying 
                  ? "bg-purple-500/15 text-purple-500" 
                  : "bg-[var(--surface)] text-[var(--text-tertiary)]"
                }
              `}
            >
              {isAnyPlaying ? <Music className="w-3.5 h-3.5" /> : <Power className="w-3.5 h-3.5" />}
              {isAnyPlaying ? "Playing" : "Off"}
            </div>
            {isAnyPlaying && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-[var(--surface)] text-[var(--text-secondary)]">
                <Volume2 className="w-3.5 h-3.5" />
                {avgVolume}%
              </div>
            )}
          </div>
          {isAnyPlaying && (
            <button
              onClick={(e) => { e.stopPropagation(); handleAllOff(); }}
              disabled={isUpdating}
              className="p-2 rounded-lg bg-[var(--surface)] text-[var(--text-tertiary)] hover:bg-[var(--surface-hover)] transition-colors"
              title="Turn all off"
            >
              <Power className="w-4 h-4" />
            </button>
          )}
        </div>
      )}
    </Card>
  );
}

export default MediaZoneControl;
