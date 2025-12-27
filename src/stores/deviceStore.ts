"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  Area,
  Room,
  MergedRoom,
  Light,
  Shade,
  Scene,
  Thermostat,
  DoorLock,
  Sensor,
  SecurityDevice,
  MediaRoom,
  QuickAction,
  ThermostatPair,
  ThermostatMode,
} from "@/lib/crestron/types";
import { isFloorHeat, isTemperatureSatisfied } from "@/lib/crestron/types";
import { useAuthStore, refreshAuth } from "./authStore";

interface DeviceState {
  // Data
  areas: Area[];
  rooms: Room[];
  mergedRooms: MergedRoom[];
  lights: Light[];
  shades: Shade[];
  scenes: Scene[];
  thermostats: Thermostat[];
  doorLocks: DoorLock[];
  sensors: Sensor[];
  securityDevices: SecurityDevice[];
  mediaRooms: MediaRoom[];
  quickActions: QuickAction[];
  
  // Loading states
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  
  // Actions
  setAreas: (areas: Area[]) => void;
  setRooms: (rooms: Room[]) => void;
  setMergedRooms: (mergedRooms: MergedRoom[]) => void;
  setLights: (lights: Light[]) => void;
  setShades: (shades: Shade[]) => void;
  setScenes: (scenes: Scene[]) => void;
  setThermostats: (thermostats: Thermostat[]) => void;
  setDoorLocks: (doorLocks: DoorLock[]) => void;
  setSensors: (sensors: Sensor[]) => void;
  setSecurityDevices: (securityDevices: SecurityDevice[]) => void;
  setMediaRooms: (mediaRooms: MediaRoom[]) => void;
  setQuickActions: (quickActions: QuickAction[]) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  setLastUpdated: (date: Date) => void;
  
  // Optimistic update helpers
  updateLight: (id: string, updates: Partial<Light>) => void;
  updateThermostat: (id: string, updates: Partial<Thermostat>) => void;
  updateDoorLock: (id: string, updates: Partial<DoorLock>) => void;
  
  // Clear all data
  clearAll: () => void;
}

export const useDeviceStore = create<DeviceState>()(
  persist(
    (set) => ({
      areas: [],
      rooms: [],
      mergedRooms: [],
      lights: [],
      shades: [],
      scenes: [],
      thermostats: [],
      doorLocks: [],
      sensors: [],
      securityDevices: [],
      mediaRooms: [],
      quickActions: [],
      isLoading: false,
      error: null,
      lastUpdated: null,

      setAreas: (areas) => set({ areas }),
      setRooms: (rooms) => set({ rooms }),
      setMergedRooms: (mergedRooms) => set({ mergedRooms }),
      setLights: (lights) => set({ lights }),
      setShades: (shades) => set({ shades }),
      setScenes: (scenes) => set({ scenes }),
      setThermostats: (thermostats) => set({ thermostats }),
      setDoorLocks: (doorLocks) => set({ doorLocks }),
      setSensors: (sensors) => set({ sensors }),
      setSecurityDevices: (securityDevices) => set({ securityDevices }),
      setMediaRooms: (mediaRooms) => set({ mediaRooms }),
      setQuickActions: (quickActions) => set({ quickActions }),
      setLoading: (isLoading) => set({ isLoading }),
      setError: (error) => set({ error }),
      setLastUpdated: (date) => set({ lastUpdated: date }),

      updateLight: (id, updates) =>
        set((state) => ({
          lights: state.lights.map((light) =>
            light.id === id ? { ...light, ...updates } : light
          ),
        })),

      updateThermostat: (id, updates) =>
        set((state) => ({
          thermostats: state.thermostats.map((thermostat) =>
            thermostat.id === id ? { ...thermostat, ...updates } : thermostat
          ),
        })),

      updateDoorLock: (id, updates) =>
        set((state) => ({
          doorLocks: state.doorLocks.map((lock) =>
            lock.id === id ? { ...lock, ...updates } : lock
          ),
        })),

      clearAll: () =>
        set({
          areas: [],
          rooms: [],
          mergedRooms: [],
          lights: [],
          shades: [],
          scenes: [],
          thermostats: [],
          doorLocks: [],
          sensors: [],
          securityDevices: [],
          mediaRooms: [],
          quickActions: [],
          isLoading: false,
          error: null,
          lastUpdated: null,
        }),
    }),
    {
      name: "crestron-devices",
      // Persist all device data so it's available immediately on page load
      partialize: (state) => ({
        areas: state.areas,
        rooms: state.rooms,
        lights: state.lights,
        shades: state.shades,
        scenes: state.scenes,
        thermostats: state.thermostats,
        doorLocks: state.doorLocks,
        sensors: state.sensors,
        securityDevices: state.securityDevices,
        mediaRooms: state.mediaRooms,
        quickActions: state.quickActions,
        lastUpdated: state.lastUpdated,
        // Don't persist isLoading or error - these should be transient
      }),
    }
  )
);

// Fetch helpers
async function fetchWithAuth(endpoint: string) {
  const headers = useAuthStore.getState().getAuthHeaders();
  const response = await fetch(`/api/crestron/${endpoint}`, { headers });
  return response.json();
}

// Track if we're already attempting to refresh auth to prevent loops
let isRefreshingAuth = false;

// Fetch all data (rooms, devices, scenes) - used by DataProvider for polling
export async function fetchAllData(isRetryAfterRefresh = false) {
  const store = useDeviceStore.getState();
  
  // Skip if already loading to prevent overlap
  if (store.isLoading) {
    return;
  }
  
  store.setLoading(true);
  store.setError(null);
  
  try {
    // Fetch all data in parallel (including areas and merged rooms from server)
    const [areasData, roomsData, devicesData, scenesData, mergedRoomsData] = await Promise.all([
      fetchWithAuth("areas"),
      fetchWithAuth("rooms"),
      fetchWithAuth("devices"),
      fetchWithAuth("scenes"),
      fetch("/api/crestron/merged-rooms").then(res => res.json()),
    ]);
    
    // Check if all responses indicate potential auth failure (empty data or errors)
    const areasArray = areasData.success 
      ? (Array.isArray(areasData.data) ? areasData.data : areasData.data?.areas || [])
      : [];
    const roomsArray = roomsData.success 
      ? (Array.isArray(roomsData.data) ? roomsData.data : roomsData.data?.rooms || [])
      : [];
    const lightsArray = devicesData.success && devicesData.data?.lights || [];
    const scenesArray = scenesData.success ? (Array.isArray(scenesData.data) ? scenesData.data : []) : [];
    
    // Detect auth failure: if we get empty data from ALL endpoints, auth likely expired
    const allEmpty = areasArray.length === 0 && roomsArray.length === 0 && lightsArray.length === 0 && scenesArray.length === 0;
    
    // If all data is empty and we haven't already tried refreshing, attempt to refresh auth
    if (allEmpty && !isRetryAfterRefresh && !isRefreshingAuth) {
      isRefreshingAuth = true;
      store.setLoading(false); // Release loading lock for refresh
      
      const refreshSuccess = await refreshAuth();
      isRefreshingAuth = false;
      
      if (refreshSuccess) {
        // Retry fetch with new auth
        return fetchAllData(true);
      } else {
        store.setError("Session expired. Please log in again.");
        return;
      }
    }
    
    // Process areas and rooms together - Crestron areas may include rooms, or rooms may have areaId
    interface TransformedArea {
      id: string;
      name: string;
      roomIds: string[];
    }
    
    interface TransformedRoom {
      id: string;
      name: string;
      areaId?: string;
      areaName?: string;
    }
    
    // First, check if areas from API have roomIds populated
    let areas: TransformedArea[] = [];
    if (areasData.success && areasArray.length > 0) {
      areas = areasArray as TransformedArea[];
    }
    
    // Check if areas have roomIds populated (some Crestron versions include this)
    const areasHaveRoomIds = areas.some(a => a.roomIds && a.roomIds.length > 0);
    
    // Build area name lookup from areas API
    const areaIdToName = new Map<string, string>();
    areas.forEach(area => {
      areaIdToName.set(area.id, area.name);
    });
    
    // Process rooms and potentially enrich with area info
    let transformedRooms: TransformedRoom[] = [];
    if (roomsData.success && roomsArray.length > 0) {
      transformedRooms = roomsArray.map((room: { id: string; name: string; areaId?: string; areaName?: string }) => {
        const roomId = String(room.id);
        // Room might already have areaId and areaName from API transform
        const areaId = room.areaId;
        const areaName = room.areaName || (areaId ? areaIdToName.get(areaId) : undefined);
        
        return {
          id: roomId,
          name: room.name,
          areaId,
          areaName,
        };
      });
      store.setRooms(transformedRooms);
    }
    
    // If areas don't have roomIds from API, build them from room data
    if (!areasHaveRoomIds && transformedRooms.length > 0) {
      // Build areas from room's areaId/areaName
      const areaMap = new Map<string, { id: string; name: string; roomIds: string[] }>();
      
      transformedRooms.forEach(room => {
        if (room.areaId && room.areaName) {
          if (!areaMap.has(room.areaId)) {
            areaMap.set(room.areaId, {
              id: room.areaId,
              name: room.areaName,
              roomIds: [],
            });
          }
          areaMap.get(room.areaId)!.roomIds.push(room.id);
        }
      });
      
      // Convert to array and merge with existing areas (to preserve any areas without rooms)
      const areasFromRooms = Array.from(areaMap.values());
      
      // If we have areas from the API, merge; otherwise use what we built from rooms
      if (areas.length > 0) {
        // Update existing areas with roomIds
        areas = areas.map(area => {
          const fromRooms = areasFromRooms.find(a => a.id === area.id);
          return fromRooms ? { ...area, roomIds: fromRooms.roomIds } : area;
        });
      } else {
        areas = areasFromRooms;
      }
    }
    
    if (areas.length > 0) {
      store.setAreas(areas);
    }
    
    // Process devices - only update if we got actual data (don't overwrite with empty)
    if (devicesData.success && devicesData.data) {
      // Only update each device type if we got non-empty data (preserve existing data on partial failures)
      if (devicesData.data.lights?.length > 0) {
        store.setLights(devicesData.data.lights);
      }
      if (devicesData.data.shades?.length > 0) {
        store.setShades(devicesData.data.shades);
      }
      if (devicesData.data.thermostats?.length > 0) {
        store.setThermostats(devicesData.data.thermostats);
      }
      if (devicesData.data.doorLocks?.length > 0) {
        store.setDoorLocks(devicesData.data.doorLocks);
      }
      if (devicesData.data.sensors?.length > 0) {
        store.setSensors(devicesData.data.sensors);
      }
      if (devicesData.data.securityDevices?.length > 0) {
        store.setSecurityDevices(devicesData.data.securityDevices);
      }
      if (devicesData.data.mediaRooms?.length > 0) {
        store.setMediaRooms(devicesData.data.mediaRooms);
      }
    }
    
    // Process scenes - only update if we got actual data
    if (scenesData.success && scenesArray.length > 0) {
      store.setScenes(scenesArray);
    }
    
    // Process merged rooms from server
    if (mergedRoomsData.success && Array.isArray(mergedRoomsData.data)) {
      store.setMergedRooms(mergedRoomsData.data);
    }
    
    // Update timestamp on success
    store.setLastUpdated(new Date());
    
    // Check for any errors
    const errors = [
      !roomsData.success && roomsData.error,
      !devicesData.success && devicesData.error,
      !scenesData.success && scenesData.error,
    ].filter(Boolean);
    
    if (errors.length > 0) {
      store.setError(errors.join("; "));
    }
  } catch (error) {
    store.setError(error instanceof Error ? error.message : "Failed to fetch data");
  } finally {
    store.setLoading(false);
  }
}

// Fetch all rooms
export async function fetchRooms() {
  const { setRooms, setError } = useDeviceStore.getState();
  try {
    const data = await fetchWithAuth("rooms");
    if (data.success) {
      const roomsArray = Array.isArray(data.data) ? data.data : data.data?.rooms || [];
      // Transform room IDs to strings to match how device roomId fields are stored
      const transformedRooms = roomsArray.map((room: { id: string | number; name: string }) => ({
        ...room,
        id: String(room.id),
      }));
      setRooms(transformedRooms);
    } else {
      setError(data.error);
    }
  } catch (error) {
    setError(error instanceof Error ? error.message : "Failed to fetch rooms");
  }
}

// Fetch all devices
export async function fetchAllDevices() {
  const { setLoading, setError, setLights, setShades, setThermostats, setDoorLocks, setSensors, setSecurityDevices, setMediaRooms, setLastUpdated } = useDeviceStore.getState();
  
  setLoading(true);
  try {
    const data = await fetchWithAuth("devices");
    if (data.success && data.data) {
      setLights(data.data.lights || []);
      setShades(data.data.shades || []);
      setThermostats(data.data.thermostats || []);
      setDoorLocks(data.data.doorLocks || []);
      setSensors(data.data.sensors || []);
      setSecurityDevices(data.data.securityDevices || []);
      setMediaRooms(data.data.mediaRooms || []);
      setLastUpdated(new Date());
    } else {
      setError(data.error);
    }
  } catch (error) {
    setError(error instanceof Error ? error.message : "Failed to fetch devices");
  } finally {
    setLoading(false);
  }
}

// Fetch lights
export async function fetchLights() {
  const { setLights, setError } = useDeviceStore.getState();
  try {
    const data = await fetchWithAuth("lights");
    if (data.success) {
      const lightsArray = Array.isArray(data.data) ? data.data : data.data?.lights || [];
      setLights(lightsArray);
    } else {
      setError(data.error);
    }
  } catch (error) {
    setError(error instanceof Error ? error.message : "Failed to fetch lights");
  }
}

// Fetch scenes
export async function fetchScenes() {
  const { setScenes, setError } = useDeviceStore.getState();
  try {
    const data = await fetchWithAuth("scenes");
    if (data.success) {
      const scenesArray = Array.isArray(data.data) ? data.data : [];
      setScenes(scenesArray);
    } else {
      setError(data.error);
    }
  } catch (error) {
    setError(error instanceof Error ? error.message : "Failed to fetch scenes");
  }
}

// Fetch quick actions
export async function fetchQuickActions() {
  const { setQuickActions, setError } = useDeviceStore.getState();
  try {
    const data = await fetchWithAuth("quickactions");
    if (data.success) {
      const quickActionsArray = Array.isArray(data.data) ? data.data : data.data?.quickActions || [];
      setQuickActions(quickActionsArray);
    } else {
      setError(data.error);
    }
  } catch (error) {
    setError(error instanceof Error ? error.message : "Failed to fetch quick actions");
  }
}

// Action helpers
export async function setLightState(id: string, level?: number, isOn?: boolean) {
  const headers = useAuthStore.getState().getAuthHeaders();
  const { updateLight } = useDeviceStore.getState();
  
  // Optimistic update
  if (level !== undefined) {
    updateLight(id, { level, isOn: level > 0 });
  } else if (isOn !== undefined) {
    updateLight(id, { isOn, level: isOn ? 65535 : 0 });
  }
  
  try {
    const response = await fetch("/api/crestron/lights", {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ id, level, isOn }),
    });
    const data = await response.json();
    if (!data.success) {
      fetchLights();
    }
    return data.success;
  } catch {
    fetchLights();
    return false;
  }
}

export async function recallScene(id: string) {
  const headers = useAuthStore.getState().getAuthHeaders();
  
  try {
    const response = await fetch("/api/crestron/scenes", {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    const data = await response.json();
    return data.success;
  } catch {
    return false;
  }
}

export async function setThermostatSetPoint(id: string, heatSetPoint?: number, coolSetPoint?: number) {
  const headers = useAuthStore.getState().getAuthHeaders();
  const { updateThermostat } = useDeviceStore.getState();
  
  // Optimistic update
  updateThermostat(id, { 
    ...(heatSetPoint !== undefined && { heatSetPoint }),
    ...(coolSetPoint !== undefined && { coolSetPoint }),
  });
  
  try {
    const response = await fetch("/api/crestron/thermostats", {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ id, action: "setPoint", heatSetPoint, coolSetPoint }),
    });
    const data = await response.json();
    return data.success;
  } catch {
    return false;
  }
}

export async function setThermostatMode(id: string, mode: string) {
  const headers = useAuthStore.getState().getAuthHeaders();
  const { updateThermostat } = useDeviceStore.getState();
  
  updateThermostat(id, { mode: mode as Thermostat["mode"] });
  
  try {
    const response = await fetch("/api/crestron/thermostats", {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ id, action: "mode", mode }),
    });
    const data = await response.json();
    return data.success;
  } catch {
    return false;
  }
}

// Get thermostat pairs grouped by room
export function getThermostatPairs(): ThermostatPair[] {
  const { thermostats, rooms } = useDeviceStore.getState();
  
  // Group thermostats by roomId
  const roomGroups = new Map<string, Thermostat[]>();
  
  for (const thermostat of thermostats) {
    if (!thermostat.roomId) continue;
    const existing = roomGroups.get(thermostat.roomId) || [];
    existing.push(thermostat);
    roomGroups.set(thermostat.roomId, existing);
  }
  
  // Convert to ThermostatPair format
  const pairs: ThermostatPair[] = [];
  
  for (const [roomId, roomThermostats] of roomGroups) {
    const room = rooms.find(r => r.id === roomId);
    const roomName = room?.name || `Room ${roomId}`;
    
    // Find floor heat and main thermostat
    const floorHeat = roomThermostats.find(t => isFloorHeat(t)) || null;
    const mainThermostat = roomThermostats.find(t => !isFloorHeat(t));
    
    // If we have a main thermostat, create a pair
    if (mainThermostat) {
      pairs.push({
        roomId,
        roomName,
        mainThermostat,
        floorHeat,
      });
    } else if (floorHeat) {
      // Room only has floor heat, treat it as the main
      pairs.push({
        roomId,
        roomName,
        mainThermostat: floorHeat,
        floorHeat: null,
      });
    }
  }
  
  return pairs;
}

// Coordinated mode change for room thermostats (syncs main + floor heat)
export async function setRoomThermostatMode(
  mainThermostatId: string, 
  floorHeatId: string | null, 
  mode: ThermostatMode
): Promise<boolean> {
  const headers = useAuthStore.getState().getAuthHeaders();
  const { updateThermostat } = useDeviceStore.getState();
  
  // Determine floor heat mode based on main thermostat mode
  // Floor heat only supports heat or off
  const floorHeatMode: ThermostatMode = mode === 'heat' ? 'heat' : 'off';
  
  // Optimistic updates
  updateThermostat(mainThermostatId, { mode });
  if (floorHeatId) {
    updateThermostat(floorHeatId, { mode: floorHeatMode });
  }
  
  try {
    // Send mode change to main thermostat
    const mainResponse = await fetch("/api/crestron/thermostats", {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ id: mainThermostatId, action: "mode", mode }),
    });
    const mainData = await mainResponse.json();
    
    // If we have a floor heat, sync its mode
    if (floorHeatId) {
      const floorResponse = await fetch("/api/crestron/thermostats", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ id: floorHeatId, action: "mode", mode: floorHeatMode }),
      });
      const floorData = await floorResponse.json();
      
      return mainData.success && floorData.success;
    }
    
    return mainData.success;
  } catch {
    return false;
  }
}

// Set floor heat mode when user toggles it directly
export async function setFloorHeatMode(
  floorHeatId: string,
  mainThermostatId: string | null,
  mode: ThermostatMode
): Promise<boolean> {
  const headers = useAuthStore.getState().getAuthHeaders();
  const { updateThermostat } = useDeviceStore.getState();
  
  // Floor heat only supports heat or off
  const effectiveMode: ThermostatMode = mode === 'heat' ? 'heat' : 'off';
  
  // Optimistic update for floor heat
  updateThermostat(floorHeatId, { mode: effectiveMode });
  
  // If floor heat is turned to heat, main thermostat should also be heat
  if (effectiveMode === 'heat' && mainThermostatId) {
    updateThermostat(mainThermostatId, { mode: 'heat' });
  }
  
  try {
    // Send mode change to floor heat
    const floorResponse = await fetch("/api/crestron/thermostats", {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ id: floorHeatId, action: "mode", mode: effectiveMode }),
    });
    const floorData = await floorResponse.json();
    
    // If floor heat is set to heat, also set main thermostat to heat
    if (effectiveMode === 'heat' && mainThermostatId) {
      const mainResponse = await fetch("/api/crestron/thermostats", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ id: mainThermostatId, action: "mode", mode: 'heat' }),
      });
      const mainData = await mainResponse.json();
      
      return floorData.success && mainData.success;
    }
    
    return floorData.success;
  } catch {
    return false;
  }
}

// Set temperature for all thermostats
// When mode is provided, also sets the mode (turning on thermostats that are off)
export async function setAllThermostatsTemp(
  temperature: number, 
  mode?: ThermostatMode
): Promise<boolean> {
  const headers = useAuthStore.getState().getAuthHeaders();
  const { thermostats, updateThermostat } = useDeviceStore.getState();
  
  // Optimistic update all thermostats
  for (const thermostat of thermostats) {
    const updates: Partial<Thermostat> = {
      heatSetPoint: temperature, 
      coolSetPoint: temperature,
    };
    if (mode) {
      updates.mode = mode;
    }
    updateThermostat(thermostat.id, updates);
  }
  
  try {
    // If mode is provided, set mode first for all thermostats (in parallel)
    if (mode) {
      const modeResults = await Promise.all(
        thermostats.map(async (thermostat) => {
          const response = await fetch("/api/crestron/thermostats", {
            method: "POST",
            headers: { ...headers, "Content-Type": "application/json" },
            body: JSON.stringify({ 
              id: thermostat.id, 
              action: "mode", 
              mode 
            }),
          });
          const data = await response.json();
          return data.success;
        })
      );
      
      // If any mode set failed, still continue with temperature
      if (!modeResults.every(Boolean)) {
        console.warn("Some thermostat mode changes failed");
      }
    }
    
    // Send setpoint to all thermostats in parallel
    const setpointPayload = mode === "heat" 
      ? { heatSetPoint: temperature }
      : mode === "cool"
        ? { coolSetPoint: temperature }
        : { heatSetPoint: temperature, coolSetPoint: temperature };
    
    const results = await Promise.all(
      thermostats.map(async (thermostat) => {
        const response = await fetch("/api/crestron/thermostats", {
          method: "POST",
          headers: { ...headers, "Content-Type": "application/json" },
          body: JSON.stringify({ 
            id: thermostat.id, 
            action: "setPoint", 
            ...setpointPayload
          }),
        });
        const data = await response.json();
        return data.success;
      })
    );
    
    return results.every(Boolean);
  } catch {
    return false;
  }
}

// Check temperature satisfaction and turn off floor heat if needed
export async function checkTemperatureSatisfaction(): Promise<void> {
  const headers = useAuthStore.getState().getAuthHeaders();
  const pairs = getThermostatPairs();
  
  for (const pair of pairs) {
    // Only check if we have both a main thermostat and floor heat
    if (!pair.floorHeat) continue;
    
    // Only act if main thermostat is in heat mode and floor heat is on
    if (pair.mainThermostat.mode !== 'heat') continue;
    if (pair.floorHeat.mode !== 'heat') continue;
    
    // Check if main thermostat's temperature is satisfied
    if (isTemperatureSatisfied(pair.mainThermostat)) {
      // Turn off floor heat
      const { updateThermostat } = useDeviceStore.getState();
      updateThermostat(pair.floorHeat.id, { mode: 'off' });
      
      try {
        await fetch("/api/crestron/thermostats", {
          method: "POST",
          headers: { ...headers, "Content-Type": "application/json" },
          body: JSON.stringify({ id: pair.floorHeat.id, action: "mode", mode: "off" }),
        });
      } catch {
        // Silently fail - will retry on next poll
      }
    }
  }
}

export async function setDoorLockState(id: string, isLocked: boolean) {
  const headers = useAuthStore.getState().getAuthHeaders();
  const { updateDoorLock } = useDeviceStore.getState();
  
  updateDoorLock(id, { isLocked });
  
  try {
    const response = await fetch("/api/crestron/doorlocks", {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ id, isLocked }),
    });
    const data = await response.json();
    return data.success;
  } catch {
    return false;
  }
}

// Merged Rooms CRUD operations

export async function fetchMergedRooms() {
  const { setMergedRooms, setError } = useDeviceStore.getState();
  try {
    const response = await fetch("/api/crestron/merged-rooms");
    const data = await response.json();
    if (data.success && Array.isArray(data.data)) {
      setMergedRooms(data.data);
    } else {
      setError(data.error || "Failed to fetch merged rooms");
    }
  } catch (error) {
    setError(error instanceof Error ? error.message : "Failed to fetch merged rooms");
  }
}

export async function createMergedRoom(name: string, sourceRoomIds: string[]) {
  const { setMergedRooms, mergedRooms } = useDeviceStore.getState();
  
  try {
    const response = await fetch("/api/crestron/merged-rooms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, sourceRoomIds }),
    });
    const data = await response.json();
    if (data.success && data.data) {
      // Add the new merged room to state
      setMergedRooms([...mergedRooms, data.data]);
      return data.data;
    }
    return null;
  } catch {
    return null;
  }
}

export async function updateMergedRoom(id: string, name?: string, sourceRoomIds?: string[]) {
  const { setMergedRooms, mergedRooms } = useDeviceStore.getState();
  
  try {
    const response = await fetch("/api/crestron/merged-rooms", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, name, sourceRoomIds }),
    });
    const data = await response.json();
    if (data.success && data.data) {
      // Update the merged room in state
      setMergedRooms(mergedRooms.map(room => room.id === id ? data.data : room));
      return data.data;
    }
    return null;
  } catch {
    return null;
  }
}

export async function deleteMergedRoom(id: string) {
  const { setMergedRooms, mergedRooms } = useDeviceStore.getState();
  
  try {
    const response = await fetch(`/api/crestron/merged-rooms?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    const data = await response.json();
    if (data.success) {
      // Remove the merged room from state
      setMergedRooms(mergedRooms.filter(room => room.id !== id));
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

// Move a room to a different area
export async function moveRoomToArea(
  roomId: string,
  roomName: string,
  sourceAreaId: string | null,
  targetAreaId: string
): Promise<boolean> {
  const { areas, rooms, setAreas, setRooms } = useDeviceStore.getState();
  
  // Optimistic update - update local state immediately
  const updatedAreas = areas.map(area => {
    if (area.id === sourceAreaId) {
      // Remove from source area
      return { ...area, roomIds: area.roomIds.filter(id => id !== roomId) };
    }
    if (area.id === targetAreaId) {
      // Add to target area
      return { ...area, roomIds: [...area.roomIds, roomId] };
    }
    return area;
  });
  
  // Update room's areaId and areaName
  const targetArea = areas.find(a => a.id === targetAreaId);
  const updatedRooms = rooms.map(room => {
    if (room.id === roomId) {
      return {
        ...room,
        areaId: targetAreaId === "unassigned" ? undefined : targetAreaId,
        areaName: targetAreaId === "unassigned" ? undefined : targetArea?.name,
      };
    }
    return room;
  });
  
  setAreas(updatedAreas);
  setRooms(updatedRooms);
  
  try {
    const response = await fetch("/api/crestron/areas", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roomName, sourceAreaId, targetAreaId }),
    });
    const data = await response.json();
    
    if (!data.success) {
      // Revert on failure - refetch data
      await fetchAllData();
      return false;
    }
    
    return true;
  } catch {
    // Revert on error - refetch data
    await fetchAllData();
    return false;
  }
}

// Create a new area
export async function createArea(name: string): Promise<boolean> {
  try {
    const response = await fetch("/api/crestron/areas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const data = await response.json();
    
    if (data.success && data.data) {
      // Add the new area to state
      const { areas, setAreas } = useDeviceStore.getState();
      setAreas([...areas, data.data]);
      return true;
    }
    
    return false;
  } catch {
    return false;
  }
}

// Delete an area
export async function deleteArea(areaId: string): Promise<boolean> {
  const { areas, setAreas } = useDeviceStore.getState();
  
  // Optimistic update
  const originalAreas = [...areas];
  setAreas(areas.filter(a => a.id !== areaId));
  
  try {
    const response = await fetch(`/api/crestron/areas?id=${encodeURIComponent(areaId)}`, {
      method: "DELETE",
    });
    const data = await response.json();
    
    if (!data.success) {
      // Revert on failure
      setAreas(originalAreas);
      return false;
    }
    
    // Refetch to get updated room assignments
    await fetchAllData();
    return true;
  } catch {
    // Revert on error
    setAreas(originalAreas);
    return false;
  }
}
