import { NextRequest, NextResponse } from "next/server";
import { CrestronClient } from "@/lib/crestron/client";

// Force dynamic rendering - disable route caching to always get fresh device data
export const dynamic = 'force-dynamic';

function getClientConfig(request: NextRequest) {
  const processorIp = request.headers.get("x-processor-ip");
  const authKey = request.headers.get("x-auth-key");
  
  if (!processorIp || !authKey) {
    return null;
  }
  
  return { processorIp, authKey };
}

// GET - Get all shades
export async function GET(request: NextRequest) {
  const config = getClientConfig(request);
  
  if (!config) {
    return NextResponse.json(
      { success: false, error: "Missing authentication headers" },
      { status: 401 }
    );
  }

  const client = new CrestronClient(config);
  const result = await client.getShades();

  if (result.success) {
    return NextResponse.json(result);
  }

  return NextResponse.json(result, { status: 500 });
}

