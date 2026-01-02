// AI Command Processor
// Handles execution of AI-determined device control commands

import type { Light, Thermostat, MediaRoom, Scene, Area, Room } from "@/lib/crestron/types";
import type {
  LightControlArgs,
  ClimateControlArgs,
  MediaControlArgs,
  SceneRecallArgs,
  StatusArgs,
} from "./device-functions";

// State snapshot for a device before command execution
export interface DeviceStateSnapshot {
  type: "light" | "thermostat" | "mediaRoom";
  id: string;
  previousState: Partial<Light | Thermostat | MediaRoom>;
}

// Result of executing a command
export interface CommandExecutionResult {
  success: boolean;
  affectedDevices: DeviceStateSnapshot[];
  message: string;
  details?: {
    totalDevices: number;
    changedDevices: number;
    targetArea?: string;
    targetRoom?: string;
  };
}

// Match context for finding devices
interface DeviceMatchContext {
  areas: Area[];
  rooms: Room[];
  lights: Light[];
  thermostats: Thermostat[];
  mediaRooms: MediaRoom[];
  scenes: Scene[];
}

/**
 * Fuzzy match a string against a target (case-insensitive, partial match)
 */
function fuzzyMatch(input: string, target: string): boolean {
  const normalizedInput = input.toLowerCase().trim();
  const normalizedTarget = target.toLowerCase().trim();
  
  // Exact match
  if (normalizedInput === normalizedTarget) return true;
  
  // Partial match (target contains input or vice versa)
  if (normalizedTarget.includes(normalizedInput)) return true;
  if (normalizedInput.includes(normalizedTarget)) return true;
  
  // Handle common variations
  const variations: Record<string, string[]> = {
    "2nd floor": ["second floor", "2nd", "upstairs"],
    "1st floor": ["first floor", "1st", "main floor"],
    "lower level": ["basement", "lower", "downstairs"],
    "master suite": ["master", "primary suite"],
    "master bedroom": ["master bed", "primary bedroom"],
  };
  
  for (const [canonical, alts] of Object.entries(variations)) {
    if (normalizedTarget.includes(canonical)) {
      if (alts.some(alt => normalizedInput.includes(alt))) return true;
    }
  }
  
  return false;
}

/**
 * Find area by name (fuzzy matching)
 */
function findArea(areaName: string | undefined, areas: Area[]): Area | null {
  if (!areaName) return null;
  return areas.find(area => fuzzyMatch(areaName, area.name)) || null;
}

/**
 * Find room by name (fuzzy matching)
 */
function findRoom(roomName: string | undefined, rooms: Room[]): Room | null {
  if (!roomName) return null;
  return rooms.find(room => fuzzyMatch(roomName, room.name)) || null;
}

/**
 * Get lights matching the area/room/name criteria
 */
export function getMatchingLights(
  args: { area?: string; room?: string; light_name?: string },
  context: DeviceMatchContext
): Light[] {
  const { lights, rooms, areas } = context;
  
  let matchedLights = lights;
  
  // If room is specified, filter by room first
  if (args.room) {
    const room = findRoom(args.room, rooms);
    if (room) {
      matchedLights = matchedLights.filter(light => light.roomId === room.id);
    } else {
      // Try to match room name directly in light's room association
      matchedLights = matchedLights.filter(light => {
        const lightRoom = rooms.find(r => r.id === light.roomId);
        return lightRoom && fuzzyMatch(args.room!, lightRoom.name);
      });
    }
  }
  // If area is specified (and no room), filter by area
  else if (args.area) {
    const area = findArea(args.area, areas);
    if (area) {
      matchedLights = matchedLights.filter(light => {
        if (!light.roomId) return false;
        return area.roomIds.includes(light.roomId);
      });
    }
  }
  
  // If light_name is specified, filter by light name
  if (args.light_name) {
    matchedLights = matchedLights.filter(light => 
      fuzzyMatch(args.light_name!, light.name)
    );
  }
  
  return matchedLights;
}

/**
 * Get thermostats matching the area/room criteria
 */
export function getMatchingThermostats(
  args: { area?: string; room?: string },
  context: DeviceMatchContext
): Thermostat[] {
  const { thermostats, rooms, areas } = context;
  
  // If room is specified, try multiple matching strategies
  if (args.room) {
    // Strategy 1: Match by room ID
    const room = findRoom(args.room, rooms);
    if (room) {
      const byRoomId = thermostats.filter(t => t.roomId === room.id);
      if (byRoomId.length > 0) return byRoomId;
    }
    
    // Strategy 2: Match by room name in thermostat's room
    const byRoomName = thermostats.filter(t => {
      const thermoRoom = rooms.find(r => r.id === t.roomId);
      return thermoRoom && fuzzyMatch(args.room!, thermoRoom.name);
    });
    if (byRoomName.length > 0) return byRoomName;
    
    // Strategy 3: Match by thermostat name containing room name
    // e.g., "Master Bedroom" matches "Master Suite Thermostat" or "Master HVAC"
    const byThermostatName = thermostats.filter(t => fuzzyMatch(args.room!, t.name));
    if (byThermostatName.length > 0) return byThermostatName;
    
    // No matches found
    return [];
  }
  
  // If area is specified, filter by area
  if (args.area) {
    const area = findArea(args.area, areas);
    if (area) {
      const byArea = thermostats.filter(t => {
        if (!t.roomId) return false;
        return area.roomIds.includes(t.roomId);
      });
      if (byArea.length > 0) return byArea;
      
      // Also try matching by thermostat name containing area name
      const byName = thermostats.filter(t => fuzzyMatch(args.area!, t.name));
      if (byName.length > 0) return byName;
    }
  }
  
  // No filter - return all thermostats
  return thermostats;
}

/**
 * Get media rooms matching the area/room criteria
 */
export function getMatchingMediaRooms(
  args: { area?: string; room?: string },
  context: DeviceMatchContext
): MediaRoom[] {
  const { mediaRooms, rooms, areas } = context;
  
  // If room is specified, filter by room
  if (args.room) {
    const room = findRoom(args.room, rooms);
    if (room) {
      return mediaRooms.filter(m => m.roomId === room.id);
    }
    return mediaRooms.filter(m => {
      const mediaRoom = rooms.find(r => r.id === m.roomId);
      return mediaRoom && fuzzyMatch(args.room!, mediaRoom.name);
    });
  }
  
  // If area is specified, filter by area
  if (args.area) {
    const area = findArea(args.area, areas);
    if (area) {
      return mediaRooms.filter(m => {
        if (!m.roomId) return false;
        return area.roomIds.includes(m.roomId);
      });
    }
  }
  
  // No filter - return all media rooms
  return mediaRooms;
}

/**
 * Find scene by name (fuzzy matching)
 */
export function findScene(
  sceneName: string,
  roomName: string | undefined,
  context: DeviceMatchContext
): Scene | null {
  const { scenes, rooms } = context;
  
  // If room is specified, prefer scenes from that room
  if (roomName) {
    const room = findRoom(roomName, rooms);
    if (room) {
      const roomScene = scenes.find(
        s => s.roomId === room.id && fuzzyMatch(sceneName, s.name)
      );
      if (roomScene) return roomScene;
    }
  }
  
  // Find any scene matching the name
  return scenes.find(s => fuzzyMatch(sceneName, s.name)) || null;
}

/**
 * Generate a natural language response describing what was done
 */
export function generateLightResponse(
  args: LightControlArgs,
  matchingLights: Light[],
  changedLights: Light[]
): string {
  // Build target description
  let targetDesc = "";
  if (args.light_name && args.room) {
    targetDesc = `${args.light_name} in ${args.room}`;
  } else if (args.light_name) {
    targetDesc = args.light_name;
  } else if (args.room) {
    targetDesc = args.room;
  } else if (args.area) {
    targetDesc = args.area;
  } else {
    targetDesc = "the whole house";
  }
  
  const totalCount = matchingLights.length;
  const changedCount = changedLights.length;
  
  // Special case for single light
  if (totalCount === 1 && changedCount === 1) {
    const lightName = changedLights[0].name;
    switch (args.action) {
      case "on":
        return `Turned on ${lightName}.`;
      case "off":
        return `Turned off ${lightName}.`;
      case "set_brightness":
        return `Set ${lightName} to ${args.brightness}%.`;
      default:
        return `Updated ${lightName}.`;
    }
  }
  
  if (totalCount === 0) {
    return `I couldn't find any lights matching "${args.light_name || targetDesc}".`;
  }
  
  switch (args.action) {
    case "on":
      if (changedCount === 0) {
        return `All ${totalCount} lights in ${targetDesc} were already on.`;
      }
      return `Turned on ${changedCount} of ${totalCount} lights in ${targetDesc}.`;
    
    case "off":
      if (changedCount === 0) {
        return `All ${totalCount} lights in ${targetDesc} were already off.`;
      }
      return `Turned off ${changedCount} of ${totalCount} lights in ${targetDesc}.`;
    
    case "set_brightness":
      return `Set ${changedCount} lights in ${targetDesc} to ${args.brightness}% brightness.`;
    
    default:
      return `Updated ${changedCount} lights in ${targetDesc}.`;
  }
}

/**
 * Generate a natural language response for climate commands
 */
export function generateClimateResponse(
  args: ClimateControlArgs,
  matchingThermostats: Thermostat[],
  changedThermostats: Thermostat[]
): string {
  const targetDesc = args.room || args.area || "the whole house";
  const changedCount = changedThermostats.length;
  
  if (matchingThermostats.length === 0) {
    return `I couldn't find any thermostats in ${targetDesc}.`;
  }
  
  switch (args.action) {
    case "set_temperature":
      return `Set ${changedCount} thermostat${changedCount !== 1 ? "s" : ""} in ${targetDesc} to ${args.temperature}°F.`;
    
    case "set_mode":
      return `Set ${changedCount} thermostat${changedCount !== 1 ? "s" : ""} in ${targetDesc} to ${args.mode} mode.`;
    
    default:
      return `Updated ${changedCount} thermostats in ${targetDesc}.`;
  }
}

/**
 * Generate a natural language response for media commands
 */
export function generateMediaResponse(
  args: MediaControlArgs,
  matchingMediaRooms: MediaRoom[],
  changedMediaRooms: MediaRoom[]
): string {
  const targetDesc = args.room || args.area || "the whole house";
  const changedCount = changedMediaRooms.length;
  
  if (matchingMediaRooms.length === 0) {
    return `I couldn't find any media rooms in ${targetDesc}.`;
  }
  
  switch (args.action) {
    case "power_on":
      return `Powered on ${changedCount} media room${changedCount !== 1 ? "s" : ""} in ${targetDesc}.`;
    
    case "power_off":
      return `Powered off ${changedCount} media room${changedCount !== 1 ? "s" : ""} in ${targetDesc}.`;
    
    case "set_volume":
      return `Set volume to ${args.volume}% in ${changedCount} media room${changedCount !== 1 ? "s" : ""}.`;
    
    case "mute":
      return `Muted ${changedCount} media room${changedCount !== 1 ? "s" : ""} in ${targetDesc}.`;
    
    case "unmute":
      return `Unmuted ${changedCount} media room${changedCount !== 1 ? "s" : ""} in ${targetDesc}.`;
    
    case "select_source":
      return `Switched ${changedCount} media room${changedCount !== 1 ? "s" : ""} to ${args.source}.`;
    
    default:
      return `Updated ${changedCount} media rooms in ${targetDesc}.`;
  }
}

/**
 * Generate status report for devices
 * Uses newlines between sections for better readability
 */
export function generateStatusReport(
  args: StatusArgs,
  context: DeviceMatchContext
): string {
  const parts: string[] = [];
  const { areas, rooms, lights } = context;
  
  // LOG: Debug light status data
  console.log("[AI Status Report] Args:", JSON.stringify(args));
  console.log("[AI Status Report] Total lights in context:", lights.length);
  
  // If asking about whole house lights without specific area/room, break down by area
  if ((args.device_type === "lights" || args.device_type === "all") && !args.area && !args.room) {
    const allLights = lights;
    const allLightsOn = allLights.filter(l => l.isOn || l.level > 0);
    
    // LOG: Show which lights are considered "on" and their levels
    console.log("[AI Status Report] Lights on:", allLightsOn.map(l => ({ name: l.name, level: l.level, isOn: l.isOn })));
    
    if (allLightsOn.length === 0) {
      parts.push(`All ${allLights.length} lights in the house are off.`);
    } else {
      parts.push(`${allLightsOn.length} of ${allLights.length} lights are on:`);
      
      // Get breakdown by area - each on its own line
      for (const area of areas) {
        const areaLights = allLights.filter(l => l.roomId && area.roomIds.includes(l.roomId));
        const areaLightsOn = areaLights.filter(l => l.isOn || l.level > 0);
        
        if (areaLightsOn.length > 0) {
          // Get the room names where lights are on
          const roomsWithLightsOn = new Map<string, { name: string; lights: string[] }>();
          for (const light of areaLightsOn) {
            const room = rooms.find(r => r.id === light.roomId);
            if (room) {
              if (!roomsWithLightsOn.has(room.id)) {
                roomsWithLightsOn.set(room.id, { name: room.name, lights: [] });
              }
              roomsWithLightsOn.get(room.id)!.lights.push(light.name);
            }
          }
          
          const roomDetails = Array.from(roomsWithLightsOn.values())
            .map(r => `${r.name} (${r.lights.length})`)
            .join(", ");
          
          parts.push(`• ${area.name}: ${areaLightsOn.length} lights - ${roomDetails}`);
        }
      }
    }
  } else if (args.device_type === "lights" || args.device_type === "all") {
    // Specific area or room requested
    const targetDesc = args.room || args.area || "the whole house";
    const matchedLights = getMatchingLights(args, context);
    const lightsOn = matchedLights.filter(l => l.isOn || l.level > 0);
    
    // LOG: Debug room-specific light matching
    console.log("[AI Status Report] Target:", targetDesc);
    console.log("[AI Status Report] Matched lights:", matchedLights.map(l => ({ name: l.name, roomId: l.roomId, level: l.level, isOn: l.isOn })));
    console.log("[AI Status Report] Lights on:", lightsOn.map(l => ({ name: l.name, level: l.level })));
    
    if (lightsOn.length === 0) {
      parts.push(`All ${matchedLights.length} lights in ${targetDesc} are off.`);
    } else {
      parts.push(`${lightsOn.length} of ${matchedLights.length} lights on in ${targetDesc}:`);
      // List lights on separate lines (up to 10)
      const lightsToShow = lightsOn.slice(0, 10);
      for (const light of lightsToShow) {
        const brightness = light.level > 0 ? Math.round((light.level / 65535) * 100) : 100;
        parts.push(`• ${light.name} (${brightness}%)`);
      }
      if (lightsOn.length > 10) {
        parts.push(`• ...and ${lightsOn.length - 10} more`);
      }
    }
    
    // DEBUG: Add diagnostic info (remove after debugging)
    const debugInfo: string[] = [];
    debugInfo.push(`\n[DEBUG] Room/Area IDs - rooms: ${rooms.slice(0, 5).map(r => `${r.name}:${r.id}(${typeof r.id})`).join(", ")}`);
    const sampleLights = allLights.slice(0, 5);
    debugInfo.push(`[DEBUG] Sample lights: ${sampleLights.map(l => `${l.name}:roomId=${l.roomId}(${typeof l.roomId}),level=${l.level}`).join(" | ")}`);
    if (args.room) {
      const matchingRoom = rooms.find(r => r.name.toLowerCase().includes(args.room!.toLowerCase()));
      debugInfo.push(`[DEBUG] Looking for room "${args.room}" - found: ${matchingRoom ? `${matchingRoom.name}(id:${matchingRoom.id})` : "none"}`);
      if (matchingRoom) {
        const roomLights = allLights.filter(l => l.roomId === matchingRoom.id);
        debugInfo.push(`[DEBUG] Lights with matching roomId: ${roomLights.length} - ${roomLights.map(l => `${l.name}(lvl:${l.level})`).join(", ")}`);
      }
    }
    parts.push(...debugInfo);
  }
  
  if (args.device_type === "climate" || args.device_type === "all") {
    const targetDesc = args.room || args.area || "the house";
    const thermostats = getMatchingThermostats(args, context);
    if (thermostats.length > 0) {
      if (thermostats.length === 1) {
        // Single thermostat - give detailed info
        const t = thermostats[0];
        const setPointInfo = t.mode === 'heat' 
          ? `set to ${t.heatSetPoint}°F` 
          : t.mode === 'cool' 
            ? `set to ${t.coolSetPoint}°F`
            : t.mode === 'auto'
              ? `heat: ${t.heatSetPoint}°F, cool: ${t.coolSetPoint}°F`
              : 'off';
        parts.push(`${t.name}: ${t.currentTemp}°F, ${t.mode} mode, ${setPointInfo}`);
      } else {
        // Multiple thermostats - each on its own line
        const avgTemp = Math.round(
          thermostats.reduce((sum, t) => sum + t.currentTemp, 0) / thermostats.length
        );
        parts.push(`Climate in ${targetDesc} (avg ${avgTemp}°F):`);
        for (const t of thermostats) {
          parts.push(`• ${t.name}: ${t.currentTemp}°F (${t.mode})`);
        }
      }
    }
  }
  
  if (args.device_type === "media" || args.device_type === "all") {
    const mediaRooms = getMatchingMediaRooms(args, context);
    const playing = mediaRooms.filter(m => m.isPoweredOn);
    if (mediaRooms.length > 0) {
      if (playing.length === 0) {
        parts.push(`All ${mediaRooms.length} media rooms are off.`);
      } else {
        parts.push(`${playing.length} media rooms playing:`);
        for (const m of playing) {
          const source = m.currentSourceName ? ` - ${m.currentSourceName}` : "";
          parts.push(`• ${m.name}${source}`);
        }
      }
    }
  }
  
  return parts.join("\n");
}

/**
 * Capture state snapshots for lights before modification
 */
export function captureLightSnapshots(lights: Light[]): DeviceStateSnapshot[] {
  return lights.map(light => ({
    type: "light" as const,
    id: light.id,
    previousState: {
      level: light.level,
      isOn: light.isOn,
    },
  }));
}

/**
 * Capture state snapshots for thermostats before modification
 */
export function captureThermostatSnapshots(thermostats: Thermostat[]): DeviceStateSnapshot[] {
  return thermostats.map(thermostat => ({
    type: "thermostat" as const,
    id: thermostat.id,
    previousState: {
      mode: thermostat.mode,
      heatSetPoint: thermostat.heatSetPoint,
      coolSetPoint: thermostat.coolSetPoint,
      fanMode: thermostat.fanMode,
    },
  }));
}

/**
 * Capture state snapshots for media rooms before modification
 */
export function captureMediaRoomSnapshots(mediaRooms: MediaRoom[]): DeviceStateSnapshot[] {
  return mediaRooms.map(mediaRoom => ({
    type: "mediaRoom" as const,
    id: mediaRoom.id,
    previousState: {
      isPoweredOn: mediaRoom.isPoweredOn,
      volumePercent: mediaRoom.volumePercent,
      isMuted: mediaRoom.isMuted,
      currentProviderId: mediaRoom.currentProviderId,
    },
  }));
}
