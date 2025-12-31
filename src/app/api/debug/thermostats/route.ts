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

// GET - Get raw thermostat data for debugging
export async function GET(request: NextRequest) {
  const config = getClientConfig(request);
  
  if (!config) {
    return NextResponse.json(
      { success: false, error: "Missing authentication headers" },
      { status: 401 }
    );
  }

  const client = new CrestronClient(config);
  const result = await client.getThermostats();

  if (result.success && result.data) {
    // Return the raw data without transformation
    return NextResponse.json({
      success: true,
      rawData: result.data,
    });
  }

  return NextResponse.json(result, { status: 500 });
}
