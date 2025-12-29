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

// GET - Get raw media rooms data for debugging
export async function GET(request: NextRequest) {
  const config = getClientConfig(request);
  
  if (!config) {
    return NextResponse.json(
      { success: false, error: "Missing authentication headers" },
      { status: 401 }
    );
  }

  const client = new CrestronClient(config);
  
  // Get all media rooms
  const allRoomsResult = await client.getMediaRooms();
  
  if (!allRoomsResult.success) {
    return NextResponse.json({
      success: false,
      error: allRoomsResult.error
    }, { status: 500 });
  }

  const mediaRooms = allRoomsResult.data || [];
  
  // Get individual room details for first 6 rooms
  const roomDetails: Record<string, unknown> = {};
  const roomsToFetch = mediaRooms.slice(0, 6);
  
  for (const room of roomsToFetch) {
    const roomId = String(room.id);
    const roomResult = await client.getMediaRoom(roomId);
    if (roomResult.success) {
      roomDetails[room.name || roomId] = roomResult.data;
    }
  }

  return NextResponse.json({
    success: true,
    timestamp: new Date().toISOString(),
    processorIp: config.processorIp,
    totalRooms: mediaRooms.length,
    allRooms: mediaRooms,
    individualRoomDetails: roomDetails
  }, {
    headers: {
      'Content-Type': 'application/json',
    }
  });
}
