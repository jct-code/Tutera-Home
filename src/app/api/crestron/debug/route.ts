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

  // Fetch data from discovered endpoints using the client
  const [videoRooms, sources, mediaRooms] = await Promise.all([
    client.getVideoRooms(),
    client.getSources(),
    client.getMediaRooms(),
  ]);

  // Also probe additional endpoints directly
  const baseUrl = `https://${config.processorIp}`;
  const headers = {
    "Crestron-RestAPI-AuthKey": config.authKey,
    "Accept": "application/json",
  };

  const additionalEndpoints = [
    "/cws/api/displays",
    "/cws/api/tvs",
    "/cws/api/projectors",
    "/cws/api/screens",
  ];

  const probeResults: Record<string, { status: number; error?: string }> = {};

  for (const endpoint of additionalEndpoints) {
    try {
      const response = await fetch(`${baseUrl}${endpoint}`, {
        method: "GET",
        headers,
      });
      probeResults[endpoint] = { status: response.status, error: response.ok ? undefined : response.statusText };
    } catch (error) {
      probeResults[endpoint] = { status: 0, error: error instanceof Error ? error.message : "Failed" };
    }
  }

  return NextResponse.json({
    success: true,
    // Main data from discovered endpoints
    videoRooms: videoRooms,
    sources: sources,
    mediaRooms: mediaRooms,
    // Probe results for other endpoints
    probeResults,
  });
}

