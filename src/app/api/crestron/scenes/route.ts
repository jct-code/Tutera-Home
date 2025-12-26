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

// Transform Crestron scene to our interface format
interface CrestronScene {
  id: number;
  name: string;
  roomId?: number;
  isActive?: boolean;
}

function transformScene(s: CrestronScene) {
  return {
    id: String(s.id),
    name: s.name,
    type: 'scene' as const,
    roomId: s.roomId ? String(s.roomId) : undefined,
    isActive: s.isActive ?? false,
  };
}

// GET - Get all scenes
export async function GET(request: NextRequest) {
  const config = getClientConfig(request);
  
  if (!config) {
    return NextResponse.json(
      { success: false, error: "Missing authentication headers" },
      { status: 401 }
    );
  }

  const client = new CrestronClient(config);
  const result = await client.getScenes();

  if (result.success) {
    // Extract and transform scenes
    const scenesArray = extractArray<CrestronScene>(result.data, 'scenes').map(transformScene);
    return NextResponse.json({ success: true, data: scenesArray });
  }

  return NextResponse.json(result, { status: 500 });
}

// POST - Recall/activate a scene
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
    const { id } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Missing scene id" },
        { status: 400 }
      );
    }

    const client = new CrestronClient(config);
    const result = await client.recallScene(id);

    if (result.success) {
      return NextResponse.json({ success: true });
    }

    return NextResponse.json(result, { status: 500 });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to recall scene" },
      { status: 500 }
    );
  }
}
