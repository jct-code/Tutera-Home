import { NextRequest, NextResponse } from "next/server";
import { CrestronClient } from "@/lib/crestron/client";

// Force dynamic rendering
export const dynamic = 'force-dynamic';

function getClientConfig(request: NextRequest) {
  const processorIp = request.headers.get("x-processor-ip");
  const authKey = request.headers.get("x-auth-key");
  
  if (!processorIp || !authKey) {
    return null;
  }
  
  return { processorIp, authKey };
}

// Helper to safely fetch and return JSON or error
async function probeFetch(
  url: string, 
  headers: Record<string, string>
): Promise<{ status: number; data?: unknown; error?: string }> {
  try {
    const response = await fetch(url, {
      method: "GET",
      headers,
      cache: 'no-store',
    });
    if (response.ok) {
      const data = await response.json().catch(() => null);
      return { status: response.status, data };
    }
    return { status: response.status, error: response.statusText };
  } catch (error) {
    return { status: 0, error: error instanceof Error ? error.message : "Failed" };
  }
}

// Debug endpoint to probe Crestron API for available endpoints
export async function GET(request: NextRequest) {
  const config = getClientConfig(request);
  
  if (!config) {
    return NextResponse.json(
      { success: false, error: "Missing authentication headers" },
      { status: 401 }
    );
  }

  const client = new CrestronClient(config);
  const baseUrl = `https://${config.processorIp}`;
  const headers = {
    "Crestron-RestAPI-AuthKey": config.authKey,
    "Accept": "application/json",
  };

  // Fetch data from discovered endpoints using the client
  const [videoRooms, sources, mediaRooms] = await Promise.all([
    client.getVideoRooms(),
    client.getSources(),
    client.getMediaRooms(),
  ]);

  // Probe additional endpoints for display/AV control
  const additionalEndpoints = [
    "/cws/api/displays",
    "/cws/api/tvs",
    "/cws/api/projectors",
    "/cws/api/screens",
    "/cws/api/receivers",
    "/cws/api/avreceivers",
    "/cws/api/amplifiers",
    "/cws/api/streamers",
    "/cws/api/appletv",
    "/cws/api/roku",
  ];

  const probeResults: Record<string, { status: number; data?: unknown; error?: string }> = {};

  for (const endpoint of additionalEndpoints) {
    probeResults[endpoint] = await probeFetch(`${baseUrl}${endpoint}`, headers);
  }

  // Get detailed info for individual sources (look for Apple TV)
  const sourcesData = sources.data as Array<{ id: number; name?: string; sourceName?: string }> | undefined;
  const sourceDetails: Record<string, unknown> = {};
  
  if (Array.isArray(sourcesData)) {
    // Get first 10 sources for investigation
    const sourcesToProbe = sourcesData.slice(0, 10);
    for (const source of sourcesToProbe) {
      const sourceResult = await client.getSource(String(source.id));
      sourceDetails[`${source.id} - ${source.name || source.sourceName || 'Unknown'}`] = sourceResult;
    }
  }

  // Get detailed info for video rooms
  const videoRoomsData = videoRooms.data as Array<{ id: number; name?: string }> | undefined;
  const videoRoomDetails: Record<string, unknown> = {};
  
  if (Array.isArray(videoRoomsData)) {
    const roomsToProbe = videoRoomsData.slice(0, 5);
    for (const room of roomsToProbe) {
      const roomResult = await client.getVideoRoom(String(room.id));
      videoRoomDetails[`${room.id} - ${room.name || 'Unknown'}`] = roomResult;
      
      // Also probe potential transport/control endpoints for this video room
      const transportEndpoints = [
        `/cws/api/videorooms/${room.id}/transport`,
        `/cws/api/videorooms/${room.id}/controls`,
        `/cws/api/videorooms/${room.id}/remote`,
      ];
      for (const endpoint of transportEndpoints) {
        probeResults[endpoint] = await probeFetch(`${baseUrl}${endpoint}`, headers);
      }
    }
  }

  // Probe media room transport controls
  const mediaRoomsData = mediaRooms.data as Array<{ id: number; name?: string }> | undefined;
  if (Array.isArray(mediaRoomsData) && mediaRoomsData.length > 0) {
    const firstRoom = mediaRoomsData[0];
    const transportEndpoints = [
      `/cws/api/mediarooms/${firstRoom.id}/transport`,
      `/cws/api/mediarooms/${firstRoom.id}/play`,
      `/cws/api/mediarooms/${firstRoom.id}/pause`,
      `/cws/api/mediarooms/${firstRoom.id}/next`,
      `/cws/api/mediarooms/${firstRoom.id}/previous`,
      `/cws/api/mediarooms/${firstRoom.id}/controls`,
    ];
    for (const endpoint of transportEndpoints) {
      probeResults[endpoint] = await probeFetch(`${baseUrl}${endpoint}`, headers);
    }
  }

  // Look for Apple TV sources in the data
  const appletvSources = Array.isArray(sourcesData) 
    ? sourcesData.filter(s => {
        const name = (s.name || s.sourceName || '').toLowerCase();
        return name.includes('apple') || name.includes('atv');
      })
    : [];

  return NextResponse.json({
    success: true,
    timestamp: new Date().toISOString(),
    processorIp: config.processorIp,
    
    // Main data from discovered endpoints
    videoRooms,
    videoRoomDetails,
    sources,
    sourceDetails,
    mediaRooms,
    
    // Apple TV specific findings
    appletvSources,
    
    // Probe results for other endpoints
    probeResults,
  });
}

