import { NextRequest, NextResponse } from "next/server";
import { getLoginUrl, generateState, STATE_COOKIE } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const hostname = request.headers.get("host") || request.nextUrl.hostname;
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
