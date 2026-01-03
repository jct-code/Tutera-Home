import * as client from "openid-client";
import { cookies } from "next/headers";
import crypto from "crypto";
import { ADMIN_EMAIL } from "./config";

const ISSUER_URL = process.env.ISSUER_URL ?? "https://replit.com/oidc";
const SESSION_COOKIE = "session_id";
const USER_DATA_COOKIE = "user_data";
export const STATE_COOKIE = "oauth_state";

const ALLOWED_EMAILS = [
  ADMIN_EMAIL.toLowerCase(),
  "jctcrestronnest@gmail.com",
  "joetutera@gmail.com",
];

let oidcConfigPromise: Promise<client.Configuration> | null = null;

async function getOidcConfig(): Promise<client.Configuration> {
  if (!oidcConfigPromise) {
    oidcConfigPromise = client.discovery(
      new URL(ISSUER_URL),
      process.env.REPL_ID!
    );
  }
  return oidcConfigPromise;
}

function generateSessionId(): string {
  return crypto.randomUUID();
}

function encodeUserData(user: SimpleUser): string {
  return Buffer.from(JSON.stringify(user)).toString("base64");
}

function decodeUserData(encoded: string): SimpleUser | null {
  try {
    return JSON.parse(Buffer.from(encoded, "base64").toString("utf-8"));
  } catch {
    return null;
  }
}

export interface SimpleUser {
  id: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  profileImageUrl?: string;
}

export async function createSessionSimple(userId: string, claims: any): Promise<{ sessionId: string; user: SimpleUser }> {
  const sessionId = generateSessionId();
  
  const user: SimpleUser = {
    id: userId,
    email: claims.email,
    firstName: claims.first_name,
    lastName: claims.last_name,
    profileImageUrl: claims.profile_image_url,
  };
  
  return { sessionId, user };
}

export async function getCurrentUserSimple(): Promise<SimpleUser | null> {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(SESSION_COOKIE)?.value;
  const userData = cookieStore.get(USER_DATA_COOKIE)?.value;
  
  if (!sessionId || !userData) {
    return null;
  }
  
  return decodeUserData(userData);
}

export async function getCurrentUserFromRequestSimple(request: { cookies: { get: (name: string) => { value: string } | undefined } }): Promise<SimpleUser | null> {
  const sessionId = request.cookies.get(SESSION_COOKIE)?.value;
  const userData = request.cookies.get(USER_DATA_COOKIE)?.value;
  
  if (!sessionId || !userData) {
    return null;
  }
  
  return decodeUserData(userData);
}

function isEmailAllowedSimple(email: string | undefined): boolean {
  if (!email) return false;
  const normalized = email.toLowerCase();
  return ALLOWED_EMAILS.includes(normalized);
}

function generateCodeVerifier(): string {
  return crypto.randomBytes(32).toString("base64url");
}

function generateCodeChallenge(verifier: string): string {
  return crypto.createHash("sha256").update(verifier).digest("base64url");
}

export async function getLoginUrlSimple(callbackUrl: string): Promise<{ url: string; state: string; codeVerifier: string }> {
  const config = await getOidcConfig();
  const state = crypto.randomUUID();
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = generateCodeChallenge(codeVerifier);
  
  const authUrl = client.buildAuthorizationUrl(config, {
    redirect_uri: callbackUrl,
    scope: "openid email profile offline_access",
    prompt: "login consent",
    state,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
  });
  
  return { url: authUrl.href, state, codeVerifier };
}

export async function handleCallbackSimple(callbackUrlWithParams: URL, expectedState: string, codeVerifier: string): Promise<{ sessionId: string; user: SimpleUser }> {
  const state = callbackUrlWithParams.searchParams.get("state");
  
  if (!state || state !== expectedState) {
    throw new Error("Invalid OAuth state - possible CSRF attack");
  }
  
  if (!codeVerifier) {
    throw new Error("Missing PKCE code verifier");
  }
  
  const config = await getOidcConfig();
  
  const tokens = await client.authorizationCodeGrant(config, callbackUrlWithParams, {
    expectedState: state,
    pkceCodeVerifier: codeVerifier,
    idTokenExpected: true,
  });
  
  const claims = tokens.claims();
  
  if (!claims) {
    throw new Error("No claims received from OIDC provider");
  }
  
  const userEmail = claims.email as string | undefined;
  if (!isEmailAllowedSimple(userEmail)) {
    throw new Error("ACCESS_DENIED: Your email is not authorized to access this application");
  }
  
  return createSessionSimple(claims.sub, claims);
}

export async function getLogoutUrlSimple(hostname: string): Promise<string> {
  const config = await getOidcConfig();
  
  const logoutUrl = client.buildEndSessionUrl(config, {
    client_id: process.env.REPL_ID!,
    post_logout_redirect_uri: `https://${hostname}`,
  });
  
  return logoutUrl.href;
}

export { SESSION_COOKIE, USER_DATA_COOKIE, encodeUserData };
