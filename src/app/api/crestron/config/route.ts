import { NextResponse } from "next/server";
import { CrestronClient } from "@/lib/crestron/client";

// GET - Check if auto-connect is available and attempt connection
export async function GET() {
  const processorIp = process.env.PROCESSOR_IP;
  const authToken = process.env.CRESTRON_HOME_KEY;

  // Both must be present for auto-connect
  if (!processorIp || !authToken) {
    return NextResponse.json({
      autoConnectAvailable: false,
      processorIp: null,
      authKey: null,
      envProcessorIp: processorIp || null, // Return env IP for form pre-fill
    });
  }

  try {
    // Attempt to login with env credentials
    const client = new CrestronClient({
      processorIp,
      authToken,
    });

    const result = await client.login();

    if (result.success && result.data?.authKey) {
      return NextResponse.json({
        autoConnectAvailable: true,
        processorIp,
        authKey: result.data.authKey,
        authTokenFromEnv: true, // Flag that auth token is from env, so client knows refresh is possible
      });
    }

    // Env vars present but login failed
    return NextResponse.json({
      autoConnectAvailable: false,
      processorIp: null,
      authKey: null,
      envProcessorIp: processorIp, // Return env IP for form pre-fill
      error: result.error,
    });
  } catch (error) {
    return NextResponse.json({
      autoConnectAvailable: false,
      processorIp: null,
      authKey: null,
      envProcessorIp: processorIp, // Return env IP for form pre-fill
      error: error instanceof Error ? error.message : "Auto-connect failed",
    });
  }
}

