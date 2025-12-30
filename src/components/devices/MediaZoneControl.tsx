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
  setZoneMediaRoomSource,
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
  const [showZoneSourcePicker, setShowZoneSourcePicker] = useState(false);
  const { rooms } = useDeviceStore();
  
  const { zone, mediaRooms, totalRooms, playingCount, avgVolume } = zoneData;
  
  // Create a map of roomId to room name for display
  const roomNameMap = useMemo(() => {
    const map = new Map<string, string>();
    rooms.forEach(room => map.set(room.id, room.name));
    return map;
  }, [rooms]);
  
  // Get all unique sources across all rooms in this zone, with count of how many rooms have each
  const zoneSources = useMemo(() => {
    const sourceMap = new Map<string, number>();
    
    mediaRooms.forEach(room => {
      room.availableProviders.forEach(source => {
        sourceMap.set(source, (sourceMap.get(source) || 0) + 1);
      });
    });
    
    // Convert to array and sort by availability (most common first)
    return Array.from(sourceMap.entries())
      .map(([name, count]) => ({ name, count, isUniversal: count === mediaRooms.length }))
      .sort((a, b) => b.count - a.count);
  }, [mediaRooms]);
  
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
  
  const handleZoneSourceSelect = useCallback(async (sourceName: string) => {
    setIsUpdating(true);
    setShowZoneSourcePicker(false);
    await setZoneMediaRoomSource(zone.id, sourceName);
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
          ? "bg-gradient-to-br from-slate-500/10 to-slate-500/5 border-slate-500/20" 
          : "bg-gradient-to-br from-[var(--surface)]/50 to-transparent"
        }
        ${expanded ? "ring-2 ring-slate-500/30" : ""}
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
                ? "bg-slate-600 shadow-slate-600/30" 
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
                    ? "bg-slate-600 text-white shadow-lg shadow-slate-600/30"
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
          
          {/* Zone Source Selector */}
          {zoneSources.length > 0 && (
            <div>
              <p className="text-xs font-medium text-[var(--text-secondary)] mb-2 uppercase tracking-wider">
                Select Source for All Rooms
              </p>
              <div className="relative">
                <button
                  onClick={(e) => { e.stopPropagation(); setShowZoneSourcePicker(!showZoneSourcePicker); }}
                  disabled={isUpdating}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-slate-500/10 hover:bg-slate-500/20 border border-slate-500/30 transition-colors text-left text-sm"
                >
                  <span className="text-slate-400">Select a source to play on all rooms...</span>
                  <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${showZoneSourcePicker ? "rotate-180" : ""}`} />
                </button>
                
                {showZoneSourcePicker && (
                  <div className="absolute top-full left-0 right-0 mt-1 z-20 bg-[var(--surface)] rounded-lg shadow-lg border border-[var(--border)] max-h-64 overflow-y-auto">
                    {zoneSources.map((source, index) => (
                      <button
                        key={source.name}
                        onClick={(e) => { e.stopPropagation(); handleZoneSourceSelect(source.name); }}
                        className={`
                          w-full px-3 py-2.5 text-left text-sm hover:bg-[var(--surface-hover)] transition-colors
                          ${index === 0 ? "rounded-t-lg" : ""}
                          ${index === zoneSources.length - 1 ? "rounded-b-lg" : ""}
                        `}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[var(--text-primary)]">{source.name}</span>
                          <span className={`text-xs ${source.isUniversal ? "text-green-500" : "text-[var(--text-tertiary)]"}`}>
                            {source.isUniversal ? "All rooms" : `${source.count} of ${totalRooms} rooms`}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <p className="text-xs text-[var(--text-tertiary)] mt-1">
                Rooms without the selected source will remain unchanged
              </p>
            </div>
          )}
          
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {mediaRooms.map((mediaRoom) => (
                <MediaRoomCard
                  key={mediaRoom.id}
                  mediaRoom={mediaRoom}
                  roomName={getDisplayName(mediaRoom.roomId, mediaRoom.name)}
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
                  ? "bg-slate-500/15 text-slate-400" 
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
