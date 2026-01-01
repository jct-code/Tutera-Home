"use client";

import {
  ChevronDown,
  ChevronRight,
  Building2,
  Home,
  Music,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { RoomStatusTile } from "@/components/devices/RoomStatusTile";
import type { RoomZoneWithData } from "@/stores/deviceStore";

interface RoomZoneControlProps {
  zoneData: RoomZoneWithData;
  expanded?: boolean;
  onToggleExpand?: () => void;
}

export function RoomZoneControl({ 
  zoneData, 
  expanded = false,
  onToggleExpand 
}: RoomZoneControlProps) {
  const { zone, rooms, totalRooms, totalLights, lightsOn, avgBrightness, avgCurrentTemp, totalMediaRooms, mediaRoomsOn } = zoneData;
  
  const ZoneIcon = zone.id === "whole-house" ? Home : Building2;
  
  return (
    <Card padding="md" className="overflow-hidden">
      {/* Zone Header - Clickable to expand/collapse */}
      <button
        onClick={onToggleExpand}
        className="w-full text-left"
      >
        {/* Mobile Layout: Stack vertically */}
        <div className="flex flex-col gap-2 md:hidden">
          {/* Top row: Title + Rooms count + Expand icon */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-semibold text-[var(--text-primary)]">
                {zone.name}
              </h3>
              <span className="text-sm text-[var(--text-secondary)]">
                {totalRooms} {totalRooms === 1 ? 'room' : 'rooms'}
              </span>
            </div>
            {onToggleExpand && (
              <div className="p-1.5 rounded-lg hover:bg-[var(--surface-hover)] transition-colors">
                {expanded ? (
                  <ChevronDown className="w-4 h-4 text-[var(--text-secondary)]" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-[var(--text-secondary)]" />
                )}
              </div>
            )}
          </div>
          
          {/* Content row: Icon + Lighting stats (left) + Temp (right) */}
          <div className="flex items-center gap-3">
            {/* Smaller icon */}
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[var(--accent)]/20 to-[var(--accent)]/10 flex items-center justify-center flex-shrink-0">
              <ZoneIcon className="w-5 h-5 text-[var(--accent)]" />
            </div>
            
            {/* Lighting stats - left side */}
            <div className="flex items-center gap-4 flex-1">
              <div className="text-center">
                <p className="text-sm font-medium text-[var(--text-primary)]">{totalLights}</p>
                <p className="text-[10px] text-[var(--text-tertiary)]">lights</p>
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-[var(--light-color)]">{lightsOn}</p>
                <p className="text-[10px] text-[var(--text-tertiary)]">on</p>
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-[var(--text-primary)]">{avgBrightness}%</p>
                <p className="text-[10px] text-[var(--text-tertiary)]">bright</p>
              </div>
            </div>
            
            {/* Temp - right side */}
            {avgCurrentTemp > 0 && (
              <div className="text-center">
                <p className="text-sm font-medium text-[var(--climate-color)]">{avgCurrentTemp}°</p>
                <p className="text-[10px] text-[var(--text-tertiary)]">temp</p>
              </div>
            )}
          </div>
        </div>

        {/* Desktop Layout: Similar to mobile but horizontal */}
        <div className="hidden md:flex flex-col gap-2">
          {/* Top row: Title + Rooms count + Expand icon */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h3 className="text-lg font-semibold text-[var(--text-primary)]">
                {zone.name}
              </h3>
              <span className="text-sm text-[var(--text-secondary)]">
                {totalRooms} {totalRooms === 1 ? 'room' : 'rooms'}
              </span>
            </div>
            {onToggleExpand && (
              <div className="p-2 rounded-lg hover:bg-[var(--surface-hover)] transition-colors">
                {expanded ? (
                  <ChevronDown className="w-5 h-5 text-[var(--text-secondary)]" />
                ) : (
                  <ChevronRight className="w-5 h-5 text-[var(--text-secondary)]" />
                )}
              </div>
            )}
          </div>
          
          {/* Content row: Icon + Lighting stats (left) + Temp (right) */}
          <div className="flex items-center gap-4">
            {/* Icon */}
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--accent)]/20 to-[var(--accent)]/10 flex items-center justify-center flex-shrink-0">
              <ZoneIcon className="w-6 h-6 text-[var(--accent)]" />
            </div>
            
            {/* Lighting stats - left side */}
            <div className="flex items-center gap-6 flex-1">
              <div className="text-center">
                <p className="text-base font-medium text-[var(--text-primary)]">{totalLights}</p>
                <p className="text-xs text-[var(--text-tertiary)]">lights</p>
              </div>
              <div className="text-center">
                <p className="text-base font-medium text-[var(--light-color)]">{lightsOn}</p>
                <p className="text-xs text-[var(--text-tertiary)]">on</p>
              </div>
              <div className="text-center">
                <p className="text-base font-medium text-[var(--text-primary)]">{avgBrightness}%</p>
                <p className="text-xs text-[var(--text-tertiary)]">brightness</p>
              </div>
              {totalMediaRooms > 0 && mediaRoomsOn > 0 && (
                <div className="text-center flex items-center gap-1">
                  <Music className="w-3.5 h-3.5 text-slate-500" />
                  <div>
                    <p className="text-base font-medium text-slate-500">{mediaRoomsOn}</p>
                    <p className="text-xs text-[var(--text-tertiary)]">playing</p>
                  </div>
                </div>
              )}
            </div>
            
            {/* Temp - right side */}
            {avgCurrentTemp > 0 && (
              <div className="text-center">
                <p className="text-xl font-semibold text-[var(--climate-color)]">{avgCurrentTemp}°</p>
                <p className="text-xs text-[var(--text-tertiary)]">temp</p>
              </div>
            )}
          </div>
        </div>
      </button>

      {/* Expanded Content */}
      {expanded && rooms.length > 0 && (
        <div className="mt-6 pt-6 border-t border-[var(--border-light)]">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {rooms.map((roomStatus) => (
              <RoomStatusTile
                key={roomStatus.room.id}
                room={roomStatus.room}
                lightingStatus={roomStatus.lightingStatus}
                climateStatus={roomStatus.climateStatus}
                mediaStatus={roomStatus.mediaStatus}
              />
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}

export default RoomZoneControl;

