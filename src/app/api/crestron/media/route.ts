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

// GET - Get all media rooms
export async function GET(request: NextRequest) {
  const config = getClientConfig(request);
  
  if (!config) {
    return NextResponse.json(
      { success: false, error: "Missing authentication headers" },
      { status: 401 }
    );
  }

  const client = new CrestronClient(config);
  const result = await client.getMediaRooms();

  if (result.success) {
    return NextResponse.json(result);
  }

  return NextResponse.json(result, { status: 500 });
}

// POST - Control media room (volume, power, mute, source)
export async function POST(request: NextRequest) {
  const config = getClientConfig(request);
  
  if (!config) {
    return NextResponse.json(
      { success: false, error: "Missing authentication headers" },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const { id, action, ...params } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Missing media room id" },
        { status: 400 }
      );
    }

    if (!action) {
      return NextResponse.json(
        { success: false, error: "Missing action" },
        { status: 400 }
      );
    }

    const client = new CrestronClient(config);
    let result;

    switch (action) {
      case "power": {
        const { powerState } = params;
        if (!powerState || !["on", "off"].includes(powerState)) {
          return NextResponse.json(
            { success: false, error: "Invalid power state. Must be 'on' or 'off'" },
            { status: 400 }
          );
        }
        result = await client.setMediaRoomPower(id, powerState);
        break;
      }

      case "volume": {
        const { volumePercent } = params;
        if (volumePercent === undefined || volumePercent < 0 || volumePercent > 100) {
          return NextResponse.json(
            { success: false, error: "Invalid volume. Must be 0-100" },
            { status: 400 }
          );
        }
        result = await client.setMediaRoomVolume(id, volumePercent);
        break;
      }

      case "mute": {
        const { muted } = params;
        if (typeof muted !== "boolean") {
          return NextResponse.json(
            { success: false, error: "Invalid mute value. Must be boolean" },
            { status: 400 }
          );
        }
        result = await client.setMediaRoomMute(id, muted);
        break;
      }

      case "source": {
        const { sourceIndex } = params;
        if (sourceIndex === undefined || sourceIndex < 0) {
          return NextResponse.json(
            { success: false, error: "Invalid source index" },
            { status: 400 }
          );
        }
        result = await client.selectMediaRoomSource(id, sourceIndex);
        break;
      }

      default:
        return NextResponse.json(
          { success: false, error: `Unknown action: ${action}. Valid actions: power, volume, mute, source` },
          { status: 400 }
        );
    }

    if (result.success) {
      return NextResponse.json({ success: true });
    }

    return NextResponse.json(result, { status: 500 });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to control media room" },
      { status: 500 }
    );
  }
}
