import { NextRequest, NextResponse } from "next/server";
import { handleCallback, SESSION_COOKIE, STATE_COOKIE } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const code = request.nextUrl.searchParams.get("code");
    const state = request.nextUrl.searchParams.get("state");
    const expectedState = request.cookies.get(STATE_COOKIE)?.value;
    
    if (!code) {
      return NextResponse.redirect(new URL("/login?error=no_code", request.url));
    }
    
    if (!state || !expectedState) {
      console.error("Missing OAuth state");
      return NextResponse.redirect(new URL("/login?error=invalid_state", request.url));
    }
    
    const hostname = request.headers.get("host") || request.nextUrl.hostname;
    const sessionId = await handleCallback(code, hostname, state, expectedState);
    
    const response = NextResponse.redirect(new URL("/", request.url));
    response.cookies.set(SESSION_COOKIE, sessionId, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60, // 1 week
      path: "/",
    });
    
    response.cookies.delete(STATE_COOKIE);
    
    return response;
  } catch (error) {
    console.error("Callback error:", error);
    return NextResponse.redirect(new URL("/login?error=callback_failed", request.url));
  }
}
