// Crestron Home API Endpoints

export const CRESTRON_ENDPOINTS = {
  // Authentication
  LOGIN: "/cws/api/login",
  LOGOUT: "/cws/api/logout",
  
  // Areas (groupings of rooms by level/zone)
  AREAS: "/cws/api/areas",
  AREA: (id: string) => `/cws/api/areas/${id}`,
  
  // Rooms
  ROOMS: "/cws/api/rooms",
  ROOM: (id: string) => `/cws/api/rooms/${id}`,
  
  // Devices
  DEVICES: "/cws/api/devices",
  DEVICE: (id: string) => `/cws/api/devices/${id}`,
  
  // Lights
  LIGHTS: "/cws/api/lights",
  LIGHT: (id: string) => `/cws/api/lights/${id}`,
  LIGHTS_SET_STATE: "/cws/api/lights/SetState",
  
  // Shades
  SHADES: "/cws/api/shades",
  SHADE: (id: string) => `/cws/api/shades/${id}`,
  
  // Scenes
  SCENES: "/cws/api/scenes",
  SCENE: (id: string) => `/cws/api/scenes/${id}`,
  SCENE_RECALL: (id: string) => `/cws/api/scenes/recall/${id}`,
  
  // Thermostats
  THERMOSTATS: "/cws/api/thermostats",
  THERMOSTAT: (id: string) => `/cws/api/thermostats/${id}`,
  THERMOSTAT_SET_POINT: "/cws/api/thermostats/SetPoint",
  THERMOSTAT_MODE: "/cws/api/thermostats/mode",
  THERMOSTAT_FAN_MODE: "/cws/api/thermostats/fanmode",
  THERMOSTAT_SCHEDULE: "/cws/api/thermostats/schedule",
  
  // Door Locks
  DOOR_LOCKS: "/cws/api/doorlocks",
  DOOR_LOCK: (id: string) => `/cws/api/doorlocks/${id}`,
  
  // Sensors
  SENSORS: "/cws/api/sensors",
  SENSOR: (id: string) => `/cws/api/sensors/${id}`,
  
  // Security Devices
  SECURITY_DEVICES: "/cws/api/securitydevices",
  SECURITY_DEVICE: (id: string) => `/cws/api/securitydevices/${id}`,
  
  // Media Rooms
  MEDIA_ROOMS: "/cws/api/mediarooms",
  MEDIA_ROOM: (id: string) => `/cws/api/mediarooms/${id}`,
  MEDIA_ROOM_MUTE: (id: string) => `/cws/api/mediarooms/${id}/mute`,
  MEDIA_ROOM_UNMUTE: (id: string) => `/cws/api/mediarooms/${id}/unmute`,
  MEDIA_ROOM_VOLUME: (id: string, level: number) => `/cws/api/mediarooms/${id}/volume/${level}`,
  MEDIA_ROOM_POWER: (id: string, state: "on" | "off") => `/cws/api/mediarooms/${id}/power/${state}`,
  MEDIA_ROOM_SELECT_SOURCE: (id: string, sourceId: number) => `/cws/api/mediarooms/${id}/selectsource/${sourceId}`,
  
  // Video Rooms (separate from media rooms - may have display info)
  VIDEO_ROOMS: "/cws/api/videorooms",
  VIDEO_ROOM: (id: string) => `/cws/api/videorooms/${id}`,
  
  // Sources (may contain source type info - audio vs video)
  SOURCES: "/cws/api/sources",
  SOURCE: (id: string) => `/cws/api/sources/${id}`,
  
  // Quick Actions
  QUICK_ACTIONS: "/cws/api/quickactions",
} as const;

export type EndpointKey = keyof typeof CRESTRON_ENDPOINTS;

