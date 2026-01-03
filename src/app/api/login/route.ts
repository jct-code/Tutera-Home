import { NextRequest, NextResponse } from "next/server";
import { getLoginUrl, generateState, generateCodeVerifier, STATE_COOKIE } from "@/lib/auth";

const VERIFIER_COOKIE = "oauth_verifier";

function getHostname(request: NextRequest): string {
  const forwardedHost = request.headers.get("x-forwarded-host");
  if (forwardedHost) {
    return forwardedHost.split(",")[0].trim().split(":")[0];
  }
  const host = request.headers.get("host");
  if (host && host !== "0.0.0.0" && !host.startsWith("0.0.0.0:")) {
    return host.split(":")[0];
  }
  return request.nextUrl.hostname;
}

export async function GET(request: NextRequest) {
  const hostname = getHostname(request);
  const baseUrl = `https://${hostname}`;
  
  try {
    const state = generateState();
    const codeVerifier = generateCodeVerifier();
    const loginUrl = await getLoginUrl(hostname, state, codeVerifier);
    
    const response = NextResponse.redirect(loginUrl);
    
    response.cookies.set(STATE_COOKIE, state, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      maxAge: 10 * 60,
      path: "/",
    });
    
    response.cookies.set(VERIFIER_COOKIE, codeVerifier, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      maxAge: 10 * 60,
      path: "/",
    });
    
    console.log("Login: Setting cookies, hostname:", hostname);
    
    return response;
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.redirect(new URL("/login?error=auth_failed", baseUrl));
  }
}
