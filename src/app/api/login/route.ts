import { NextRequest, NextResponse } from "next/server";
import { getLoginUrl, generateState, STATE_COOKIE } from "@/lib/auth";

function getHostname(request: NextRequest): string {
  if (process.env.REPLIT_DEV_DOMAIN) {
    return process.env.REPLIT_DEV_DOMAIN;
  }
  const host = request.headers.get("host");
  if (host && host !== "0.0.0.0" && !host.startsWith("0.0.0.0:")) {
    return host;
  }
  return request.nextUrl.hostname;
}

export async function GET(request: NextRequest) {
  try {
    const hostname = getHostname(request);
    const state = generateState();
    const loginUrl = await getLoginUrl(hostname, state);
    
    const response = NextResponse.redirect(loginUrl);
    response.cookies.set(STATE_COOKIE, state, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      maxAge: 10 * 60, // 10 minutes
      path: "/",
    });
    
    return response;
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.redirect(new URL("/login?error=auth_failed", request.url));
  }
}
