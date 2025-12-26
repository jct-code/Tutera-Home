"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronRight, Lightbulb, AlertCircle } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { LightCard, LightGroupControl } from "./LightCard";
import type { Light, Room } from "@/lib/crestron/types";

interface LightsByRoomProps {
  lights: Light[];
  rooms: Room[];
  maxLightsPerRoom?: number;
  showUnassigned?: boolean;
}

interface RoomGroup {
  roomId: string | undefined;
  roomName: string;
  lights: Light[];
}

export function LightsByRoom({ 
  lights, 
  rooms, 
  maxLightsPerRoom = 6,
  showUnassigned = true 
}: LightsByRoomProps) {
  const [expandedRooms, setExpandedRooms] = useState<Set<string>>(new Set());

  // Create a map of room IDs to room names for quick lookup
  const roomMap = useMemo(() => {
    const map = new Map<string, string>();
    rooms.forEach(room => map.set(room.id, room.name));
    return map;
  }, [rooms]);

  // Group lights by room
  const groupedLights = useMemo(() => {
    const groups = new Map<string | undefined, Light[]>();
    
    lights.forEach(light => {
      const roomId = light.roomId;
      if (!groups.has(roomId)) {
        groups.set(roomId, []);
      }
      groups.get(roomId)!.push(light);
    });

    // Convert to array and sort by room name
    const result: RoomGroup[] = [];
    
    groups.forEach((lightsInRoom, roomId) => {
      const roomName = roomId ? (roomMap.get(roomId) || `Unknown Room (${roomId})`) : "Unassigned";
      result.push({
        roomId,
        roomName,
        lights: lightsInRoom,
      });
    });

    // Sort: Unassigned last, then alphabetically by room name
    result.sort((a, b) => {
      if (!a.roomId) return 1;
      if (!b.roomId) return -1;
      return a.roomName.localeCompare(b.roomName);
    });

    return result;
  }, [lights, roomMap]);

  // Calculate statistics
  const stats = useMemo(() => {
    const assignedLights = lights.filter(l => l.roomId).length;
    const unassignedLights = lights.length - assignedLights;
    const lightsOn = lights.filter(l => l.isOn || l.level > 0).length;
    const roomsWithLights = new Set(lights.filter(l => l.roomId).map(l => l.roomId)).size;
    
    return {
      total: lights.length,
      assigned: assignedLights,
      unassigned: unassignedLights,
      lightsOn,
      roomsWithLights,
    };
  }, [lights]);

  const toggleRoom = (roomId: string) => {
    const newExpanded = new Set(expandedRooms);
    if (newExpanded.has(roomId)) {
      newExpanded.delete(roomId);
    } else {
      newExpanded.add(roomId);
    }
    setExpandedRooms(newExpanded);
  };

  return (
    <div className="space-y-4">
      {/* Statistics Summary */}
      <Card padding="md" className="bg-[var(--surface)]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[var(--light-color)]/20 flex items-center justify-center">
              <Lightbulb className="w-5 h-5 text-[var(--light-color)]" />
            </div>
            <div>
              <p className="font-semibold text-[var(--text-primary)]">
                {stats.lightsOn} of {stats.total} lights on
              </p>
              <p className="text-xs text-[var(--text-secondary)]">
                {stats.roomsWithLights} rooms • {stats.assigned} assigned
                {stats.unassigned > 0 && (
                  <span className="text-[var(--warning)]"> • {stats.unassigned} unassigned</span>
                )}
              </p>
            </div>
          </div>
          <LightGroupControl lights={lights} />
        </div>
      </Card>

      {/* Unassigned Warning */}
      {stats.unassigned > 0 && showUnassigned && (
        <Card padding="sm" className="border-[var(--warning)]/30 bg-[var(--warning)]/5">
          <div className="flex items-center gap-2 text-sm text-[var(--warning)]">
            <AlertCircle className="w-4 h-4" />
            <span>{stats.unassigned} lights are not assigned to any room</span>
          </div>
        </Card>
      )}

      {/* Room Groups */}
      <div className="space-y-3">
        {groupedLights.map((group) => {
          // Skip unassigned if showUnassigned is false
          if (!group.roomId && !showUnassigned) return null;
          
          const roomKey = group.roomId || "unassigned";
          const isExpanded = expandedRooms.has(roomKey);
          const onCount = group.lights.filter(l => l.isOn || l.level > 0).length;
          const visibleLights = isExpanded ? group.lights : group.lights.slice(0, maxLightsPerRoom);
          const hasMore = group.lights.length > maxLightsPerRoom && !isExpanded;

          return (
            <motion.div
              key={roomKey}
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-2"
            >
              {/* Room Header */}
              <button
                onClick={() => toggleRoom(roomKey)}
                className={`
                  w-full flex items-center justify-between p-3 rounded-xl
                  transition-all duration-200
                  ${!group.roomId 
                    ? "bg-[var(--warning)]/10 hover:bg-[var(--warning)]/15" 
                    : "bg-[var(--surface)] hover:bg-[var(--surface-hover)]"
                  }
                `}
              >
                <div className="flex items-center gap-3">
                  <div className={`
                    w-8 h-8 rounded-lg flex items-center justify-center
                    ${!group.roomId 
                      ? "bg-[var(--warning)]/20 text-[var(--warning)]"
                      : "bg-[var(--light-color)]/20 text-[var(--light-color)]"
                    }
                  `}>
                    <Lightbulb className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-[var(--text-primary)]">
                      {group.roomName}
                    </p>
                    <p className="text-xs text-[var(--text-secondary)]">
                      {onCount} of {group.lights.length} on
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-[var(--text-tertiary)]">
                    {group.lights.length} light{group.lights.length !== 1 ? "s" : ""}
                  </span>
                  {isExpanded ? (
                    <ChevronDown className="w-5 h-5 text-[var(--text-tertiary)]" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-[var(--text-tertiary)]" />
                  )}
                </div>
              </button>

              {/* Lights in Room */}
              <AnimatePresence>
                {(isExpanded || group.lights.length <= maxLightsPerRoom) && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 pl-4"
                  >
                    {visibleLights.map((light) => (
                      <LightCard 
                        key={light.id} 
                        light={light} 
                        compact 
                      />
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Show More Button */}
              {hasMore && (
                <button
                  onClick={() => toggleRoom(roomKey)}
                  className="w-full py-2 text-sm text-[var(--accent)] hover:underline"
                >
                  Show {group.lights.length - maxLightsPerRoom} more lights
                </button>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

export default LightsByRoom;

