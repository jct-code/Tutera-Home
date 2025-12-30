import { NextRequest, NextResponse } from "next/server";
import { CrestronClient } from "@/lib/crestron/client";

function getClientConfig(request: NextRequest) {
  const processorIp = request.headers.get("x-processor-ip");
  const authKey = request.headers.get("x-auth-key");
  
  if (!processorIp || !authKey) {
    return null;
  }
  
  return { processorIp, authKey };
}

// Helper to extract array from potentially nested Crestron response
function extractArray<T>(data: unknown, key: string): T[] {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (typeof data === 'object' && data !== null && key in data) {
    return (data as Record<string, T[]>)[key] || [];
  }
  return [];
}

// Transform Crestron thermostat to our interface format
interface CrestronThermostat {
  id: number;
  name: string;
  roomId?: number;
  currentTemperature: number;
  temperatureUnits: string;
  currentMode: string;
  currentFanMode?: string;
  currentSetPoint: Array<{ type: string; temperature?: number }>;
  connectionStatus: string;
}

function transformThermostat(t: CrestronThermostat) {
  // Convert DeciFahrenheit to Fahrenheit (730 -> 73)
  const tempDivisor = t.temperatureUnits === 'DeciFahrenheit' ? 10 : 1;
  const currentTemp = Math.round(t.currentTemperature / tempDivisor);
  
  // Extract setpoints from currentSetPoint array
  const heatSetPoint = t.currentSetPoint?.find(sp => sp.type === 'heat' || sp.type === 'auxHeat');
  const coolSetPoint = t.currentSetPoint?.find(sp => sp.type === 'cool');
  
  // Map mode names
  const modeMap: Record<string, string> = {
    'Off': 'off',
    'Heat': 'heat',
    'Cool': 'cool',
    'Auto': 'auto',
    'AuxHeat': 'heat',
  };
  
  const fanModeMap: Record<string, string> = {
    'Auto': 'auto',
    'On': 'on',
    'CirculateLow': 'auto',
    'CirculateMedium': 'auto',
  };
  
  return {
    id: String(t.id),
    name: t.name,
    type: 'thermostat' as const,
    roomId: t.roomId ? String(t.roomId) : undefined,
    currentTemp,
    heatSetPoint: heatSetPoint?.temperature ? Math.round(heatSetPoint.temperature / tempDivisor) : currentTemp,
    coolSetPoint: coolSetPoint?.temperature ? Math.round(coolSetPoint.temperature / tempDivisor) : currentTemp + 5,
    mode: (modeMap[t.currentMode] || 'off') as 'off' | 'heat' | 'cool' | 'auto',
    fanMode: (fanModeMap[t.currentFanMode || 'Auto'] || 'auto') as 'auto' | 'on',
    humidity: undefined,
    isRunning: t.currentMode !== 'Off',
  };
}

// Transform Crestron light to our interface format
interface CrestronLight {
  id: number;
  name: string;
  roomId?: number;
  level: number;
  type: string;
  subType: string;
  connectionStatus: string;
}

function transformLight(l: CrestronLight) {
  return {
    id: String(l.id),
    name: l.name,
    type: 'light' as const,
    subType: l.subType?.toLowerCase() === 'switch' ? 'switch' as const : 'dimmer' as const,
    roomId: l.roomId ? String(l.roomId) : undefined,
    level: l.level,
    isOn: l.level > 0,
  };
}

// Transform Crestron sensor to our interface format
interface CrestronSensor {
  id: number;
  name: string;
  roomId?: number;
  presence: string;
  subType: string;
  connectionStatus: string;
}

function transformSensor(s: CrestronSensor) {
  // Map Crestron sensor types to our interface types
  const subTypeMap: Record<string, 'motion' | 'contact' | 'temperature' | 'humidity' | 'luminance'> = {
    'OccupancySensor': 'motion',
    'Window': 'contact',
    'Doorbell': 'contact',
    'WaterAlarm': 'contact',
    'Door': 'contact',
    'Contact': 'contact',
    'Motion': 'motion',
    'Temperature': 'temperature',
    'Humidity': 'humidity',
    'Luminance': 'luminance',
  };
  
  // Map presence values to boolean/number
  const presenceMap: Record<string, boolean> = {
    'Occupied': true,
    'Vacant': false,
    'OpenOrOn': true,
    'CloseOrOff': false,
    'Unknown': false,
  };
  
  const mappedSubType = subTypeMap[s.subType] || 'contact';
  const value = presenceMap[s.presence] ?? false;
  
  return {
    id: String(s.id),
    name: s.name,
    type: 'sensor' as const,
    subType: mappedSubType,
    roomId: s.roomId ? String(s.roomId) : undefined,
    value: value,
    unit: undefined,
  };
}

// Transform Crestron shade to our interface format
interface CrestronShade {
  id: number;
  name: string;
  roomId?: number;
  position?: number;
  connectionStatus: string;
}

function transformShade(s: CrestronShade) {
  return {
    id: String(s.id),
    name: s.name,
    type: 'shade' as const,
    roomId: s.roomId ? String(s.roomId) : undefined,
    position: s.position ?? 0,
  };
}

// Transform Crestron door lock to our interface format
interface CrestronDoorLock {
  id: number;
  name: string;
  roomId?: number;
  locked?: boolean;
  isLocked?: boolean;
  connectionStatus: string;
}

function transformDoorLock(d: CrestronDoorLock) {
  return {
    id: String(d.id),
    name: d.name,
    type: 'lock' as const,
    roomId: d.roomId ? String(d.roomId) : undefined,
    isLocked: d.isLocked ?? d.locked ?? true,
  };
}

// Transform Crestron media room to our interface format
interface CrestronMediaRoom {
  id: number;
  name: string;
  roomId?: number;
  currentVolumeLevel: number;           // 0-65535 or percentage depending on system
  currentMuteState: "Muted" | "Unmuted" | "unmuted" | "muted";
  currentPowerState: "On" | "Off" | "on" | "off";
  currentProviderId?: number;
  currentSourceId?: number;             // Index into availableSources array (new format)
  availableProviders?: string[];        // Array of strings (old format)
  availableSources?: Array<{            // Array of objects (new format)
    id: number;
    sourceName: string;
  }>;
  availableVolumeControls: string[];    // ["discrete"] or ["none"]
  availableMuteControls: string[];      // ["discrete"] or ["none"]
}

function transformMediaRoom(m: CrestronMediaRoom) {
  // Crestron volume can be 0-65535 (raw) or 0-100 (percent) depending on configuration
  // If volume is > 100, treat it as raw 0-65535 and convert to percent
  // Otherwise, assume it's already a percentage
  const rawVolume = m.currentVolumeLevel ?? 0;
  const volumePercent = rawVolume > 100 
    ? Math.round((rawVolume / 65535) * 100) 
    : rawVolume;
  
  // Normalize power/mute state (handle lowercase variants)
  const normalizedPowerState = (m.currentPowerState || "Off").charAt(0).toUpperCase() + (m.currentPowerState || "Off").slice(1).toLowerCase() as "On" | "Off";
  const normalizedMuteState = (m.currentMuteState || "Unmuted").charAt(0).toUpperCase() + (m.currentMuteState || "Unmuted").slice(1).toLowerCase() as "Muted" | "Unmuted";
  
  // Handle both availableSources (array of objects) and availableProviders (array of strings)
  let availableProviders: string[] = [];
  let currentProviderId: number | undefined = undefined;
  
  if (m.availableSources && Array.isArray(m.availableSources) && m.availableSources.length > 0) {
    // New format: extract sourceName from each object
    availableProviders = m.availableSources.map(s => s.sourceName);
    // currentSourceId is the index into availableSources array
    if (m.currentSourceId !== undefined && m.currentSourceId >= 0 && m.currentSourceId < availableProviders.length) {
      currentProviderId = m.currentSourceId;
    }
  } else if (m.availableProviders && Array.isArray(m.availableProviders)) {
    // Old format: already an array of strings
    availableProviders = m.availableProviders;
    currentProviderId = m.currentProviderId;
  }
  
  // Resolve current source name from provider ID
  const currentSourceName = currentProviderId !== undefined && availableProviders.length > 0
    ? availableProviders[currentProviderId] || undefined
    : undefined;
  
  return {
    id: String(m.id),
    name: m.name,
    type: 'mediaroom' as const,
    roomId: m.roomId ? String(m.roomId) : undefined,
    // Raw values from Crestron
    currentVolumeLevel: rawVolume,
    currentMuteState: normalizedMuteState,
    currentPowerState: normalizedPowerState,
    currentProviderId: currentProviderId,
    availableProviders: availableProviders,
    availableVolumeControls: m.availableVolumeControls || ["none"],
    availableMuteControls: m.availableMuteControls || ["none"],
    // Computed values for UI
    isPoweredOn: normalizedPowerState === "On",
    isMuted: normalizedMuteState === "Muted",
    volumePercent,
    currentSourceName,
  };
}

// GET - Get all devices
export async function GET(request: NextRequest) {
  const config = getClientConfig(request);
  
  if (!config) {
    return NextResponse.json(
      { success: false, error: "Missing authentication headers" },
      { status: 401 }
    );
  }

  const client = new CrestronClient(config);
  
  // Get all device types in parallel
  const [lights, shades, thermostats, doorLocks, sensors, securityDevices, mediaRooms] = 
    await Promise.all([
      client.getLights(),
      client.getShades(),
      client.getThermostats(),
      client.getDoorLocks(),
      client.getSensors(),
      client.getSecurityDevices(),
      client.getMediaRooms(),
    ]);

  // Extract arrays from nested Crestron responses and transform to our format
  const lightsArray = extractArray<CrestronLight>(lights.data, 'lights').map(transformLight);
  const shadesArray = extractArray<CrestronShade>(shades.data, 'shades').map(transformShade);
  const thermostatsArray = extractArray<CrestronThermostat>(thermostats.data, 'thermostats').map(transformThermostat);
  const doorLocksArray = extractArray<CrestronDoorLock>(doorLocks.data, 'doorLocks').map(transformDoorLock);
  const sensorsArray = extractArray<CrestronSensor>(sensors.data, 'sensors').map(transformSensor);
  const securityDevicesArray = extractArray(securityDevices.data, 'securityDevices');
  const mediaRoomsArray = extractArray<CrestronMediaRoom>(mediaRooms.data, 'mediaRooms').map(transformMediaRoom);

  return NextResponse.json({
    success: true,
    data: {
      lights: lightsArray,
      shades: shadesArray,
      thermostats: thermostatsArray,
      doorLocks: doorLocksArray,
      sensors: sensorsArray,
      securityDevices: securityDevicesArray,
      mediaRooms: mediaRoomsArray,
    },
  });
}
