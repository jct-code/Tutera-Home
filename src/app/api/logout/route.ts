import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getLogoutUrl, deleteSession, SESSION_COOKIE } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const sessionId = cookieStore.get(SESSION_COOKIE)?.value;
    
    if (sessionId) {
      await deleteSession(sessionId);
    }
    
    const hostname = request.headers.get("host") || request.nextUrl.hostname;
    const logoutUrl = await getLogoutUrl(hostname);
    
    const response = NextResponse.redirect(logoutUrl);
    response.cookies.delete(SESSION_COOKIE);
    
    return response;
  } catch (error) {
    console.error("Logout error:", error);
    const response = NextResponse.redirect(new URL("/login", request.url));
    response.cookies.delete(SESSION_COOKIE);
    return response;
  }
}
