import { NextRequest, NextResponse } from "next/server";
import { getLogoutUrlSimple, SESSION_COOKIE, USER_DATA_COOKIE } from "@/lib/auth-simple";

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
  try {
    const hostname = getHostname(request);
    const logoutUrl = await getLogoutUrlSimple(hostname);
    
    const response = NextResponse.redirect(logoutUrl);
    response.cookies.delete(SESSION_COOKIE);
    response.cookies.delete(USER_DATA_COOKIE);
    
    return response;
  } catch (error) {
    console.error("Logout error:", error);
    const response = NextResponse.redirect(new URL("/login", request.url));
    response.cookies.delete(SESSION_COOKIE);
    response.cookies.delete(USER_DATA_COOKIE);
    return response;
  }
}
