import { NextRequest, NextResponse } from "next/server";
import { handleCallbackSimple, STATE_COOKIE, SESSION_COOKIE, USER_DATA_COOKIE, encodeUserData } from "@/lib/auth-simple";

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
    const code = request.nextUrl.searchParams.get("code");
    const state = request.nextUrl.searchParams.get("state");
    const expectedState = request.cookies.get(STATE_COOKIE)?.value;
    const codeVerifier = request.cookies.get(VERIFIER_COOKIE)?.value;
    
    if (!code) {
      const errorDesc = request.nextUrl.searchParams.get("error_description");
      console.error("OAuth error:", errorDesc);
      return NextResponse.redirect(new URL("/login?error=no_code", baseUrl));
    }
    
    if (!state || !expectedState) {
      console.error("Missing OAuth state");
      return NextResponse.redirect(new URL("/login?error=invalid_state", baseUrl));
    }
    
    if (!codeVerifier) {
      console.error("Missing PKCE code verifier");
      return NextResponse.redirect(new URL("/login?error=invalid_state", baseUrl));
    }
    
    const callbackUrl = new URL(`${baseUrl}/api/callback`);
    request.nextUrl.searchParams.forEach((value, key) => {
      callbackUrl.searchParams.set(key, value);
    });
    
    const { sessionId, user } = await handleCallbackSimple(callbackUrl, expectedState, codeVerifier);
    
    const response = NextResponse.redirect(new URL("/", baseUrl));
    
    response.cookies.set(SESSION_COOKIE, sessionId, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60,
      path: "/",
    });
    
    response.cookies.set(USER_DATA_COOKIE, encodeUserData(user), {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60,
      path: "/",
    });
    
    response.cookies.delete(STATE_COOKIE);
    response.cookies.delete(VERIFIER_COOKIE);
    
    return response;
  } catch (error) {
    console.error("Callback error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    
    if (errorMessage.includes("ACCESS_DENIED")) {
      return NextResponse.redirect(new URL("/login?error=access_denied", baseUrl));
    }
    
    if (errorMessage.includes("state") || errorMessage.includes("CSRF")) {
      return NextResponse.redirect(new URL("/login?error=invalid_state", baseUrl));
    }
    
    const errorCode = encodeURIComponent(errorMessage.substring(0, 100));
    return NextResponse.redirect(new URL(`/login?error=callback_failed&detail=${errorCode}`, baseUrl));
  }
}
