import { NextRequest, NextResponse } from "next/server";
import { CrestronClient } from "@/lib/crestron/client";

// Force dynamic rendering - disable route caching to always get fresh data
export const dynamic = 'force-dynamic';

function getClientConfig(request: NextRequest) {
  const processorIp = request.headers.get("x-processor-ip");
  const authKey = request.headers.get("x-auth-key");
  
  if (!processorIp || !authKey) {
    return null;
  }
  
  return { processorIp, authKey };
}

// Crestron Room structure from API
interface CrestronRoom {
  id: number;
  name: string;
  areaId?: number;
  areaName?: string;
}

// Helper to extract array from potentially nested Crestron response
function extractRooms(data: unknown): CrestronRoom[] {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (typeof data === 'object' && data !== null && 'rooms' in data) {
    return (data as { rooms: CrestronRoom[] }).rooms || [];
  }
  return [];
}

// Transform Crestron room to our interface format
function transformRoom(room: CrestronRoom) {
  return {
    id: String(room.id),
    name: room.name,
    areaId: room.areaId ? String(room.areaId) : undefined,
    areaName: room.areaName,
  };
}

// GET - Get all rooms
export async function GET(request: NextRequest) {
  const config = getClientConfig(request);
  
  if (!config) {
    return NextResponse.json(
      { success: false, error: "Missing authentication headers" },
      { status: 401 }
    );
  }

  const client = new CrestronClient(config);
  const result = await client.getRooms();

  if (result.success) {
    const roomsArray = extractRooms(result.data);
    const transformedRooms = roomsArray.map(transformRoom);
    
    return NextResponse.json({
      success: true,
      data: transformedRooms,
    });
  }

  return NextResponse.json(result, { status: 500 });
}

