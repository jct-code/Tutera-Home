import * as client from "openid-client";
import { cookies } from "next/headers";
import { db } from "./db";
import { users, sessions } from "./schema";
import { eq } from "drizzle-orm";
import type { User, UpsertUser } from "./schema";
import crypto from "crypto";

const ISSUER_URL = process.env.ISSUER_URL ?? "https://replit.com/oidc";
const SESSION_COOKIE = "session_id";
export const STATE_COOKIE = "oauth_state";
const SESSION_TTL = 7 * 24 * 60 * 60 * 1000; // 1 week

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

export async function createSession(userId: string, claims: any, tokens: any): Promise<string> {
  const sessionId = generateSessionId();
  const expire = new Date(Date.now() + SESSION_TTL);
  
  await db.insert(sessions).values({
    sid: sessionId,
    sess: {
      userId,
      claims,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: claims.exp,
    },
    expire,
  });
  
  return sessionId;
}

export async function getSession(sessionId: string): Promise<any | null> {
  const [session] = await db.select().from(sessions).where(eq(sessions.sid, sessionId));
  
  if (!session || new Date(session.expire) < new Date()) {
    if (session) {
      await db.delete(sessions).where(eq(sessions.sid, sessionId));
    }
    return null;
  }
  
  return session.sess;
}

export async function deleteSession(sessionId: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.sid, sessionId));
}

export async function getUser(id: string): Promise<User | undefined> {
  const [user] = await db.select().from(users).where(eq(users.id, id));
  return user;
}

export async function upsertUser(userData: UpsertUser): Promise<User> {
  const [user] = await db
    .insert(users)
    .values(userData)
    .onConflictDoUpdate({
      target: users.id,
      set: {
        ...userData,
        updatedAt: new Date(),
      },
    })
    .returning();
  return user;
}

export async function getCurrentUser(): Promise<User | null> {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(SESSION_COOKIE)?.value;
  
  if (!sessionId) {
    return null;
  }
  
  const session = await getSession(sessionId);
  if (!session) {
    return null;
  }
  
  const user = await getUser(session.userId);
  return user || null;
}

export function generateState(): string {
  return crypto.randomBytes(32).toString("hex");
}

export function generateCodeVerifier(): string {
  return crypto.randomBytes(32).toString("base64url");
}

export function generateCodeChallenge(verifier: string): string {
  return crypto.createHash("sha256").update(verifier).digest("base64url");
}

export async function getLoginUrl(hostname: string, state: string, codeVerifier: string): Promise<string> {
  const config = await getOidcConfig();
  const callbackUrl = `https://${hostname}/api/callback`;
  const codeChallenge = generateCodeChallenge(codeVerifier);
  
  const authUrl = client.buildAuthorizationUrl(config, {
    redirect_uri: callbackUrl,
    scope: "openid email profile offline_access",
    prompt: "login consent",
    state,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
  });
  
  return authUrl.href;
}

function isEmailAllowed(email: string | undefined): boolean {
  const allowedUsers = process.env.ALLOWED_USERS;
  
  if (!allowedUsers) {
    return true;
  }
  
  if (!email) {
    return false;
  }
  
  const allowedList = allowedUsers.split(",").map(e => e.trim().toLowerCase());
  return allowedList.includes(email.toLowerCase());
}

export async function handleCallback(callbackUrlWithParams: URL, expectedState: string, codeVerifier: string): Promise<string> {
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
  });
  
  const claims = tokens.claims();
  
  if (!claims) {
    throw new Error("No claims received from OIDC provider");
  }
  
  const userEmail = claims.email as string | undefined;
  if (!isEmailAllowed(userEmail)) {
    throw new Error("ACCESS_DENIED: Your email is not authorized to access this application");
  }
  
  await upsertUser({
    id: claims.sub,
    email: userEmail,
    firstName: (claims as any).first_name as string | undefined,
    lastName: (claims as any).last_name as string | undefined,
    profileImageUrl: (claims as any).profile_image_url as string | undefined,
  });
  
  const sessionId = await createSession(claims.sub, claims, tokens);
  return sessionId;
}

export async function getLogoutUrl(hostname: string): Promise<string> {
  const config = await getOidcConfig();
  
  const logoutUrl = client.buildEndSessionUrl(config, {
    client_id: process.env.REPL_ID!,
    post_logout_redirect_uri: `https://${hostname}`,
  });
  
  return logoutUrl.href;
}

export { SESSION_COOKIE };
