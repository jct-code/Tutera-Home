"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

interface AuthState {
  isConnected: boolean;
  isConnecting: boolean;
  isRefreshingAuth: boolean; // Flag to prevent redirects during auth refresh
  processorIp: string | null;
  authKey: string | null;
  authToken: string | null; // Store the original auth token for re-login
  authTokenFromEnv: boolean; // Flag if auth token is from environment (for auto-connect)
  error: string | null;
  
  // Actions
  setConnection: (processorIp: string, authKey: string, authToken?: string, fromEnv?: boolean) => void;
  setConnecting: (isConnecting: boolean) => void;
  setRefreshingAuth: (isRefreshing: boolean) => void;
  setError: (error: string | null) => void;
  disconnect: () => void;
  invalidateAuth: () => void; // Mark auth as invalid without full disconnect
  
  // API helpers
  getAuthHeaders: () => Record<string, string>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      isConnected: false,
      isConnecting: false,
      isRefreshingAuth: false,
      processorIp: null,
      authKey: null,
      authToken: null,
      authTokenFromEnv: false,
      error: null,

      setConnection: (processorIp, authKey, authToken, fromEnv = false) =>
        set({
          isConnected: true,
          isConnecting: false,
          isRefreshingAuth: false,
          processorIp,
          authKey,
          authToken: authToken || get().authToken, // Preserve existing token if not provided
          authTokenFromEnv: fromEnv || get().authTokenFromEnv,
          error: null,
        }),

      setConnecting: (isConnecting) => set({ isConnecting }),
      
      setRefreshingAuth: (isRefreshing) => set({ isRefreshingAuth: isRefreshing }),

      setError: (error) =>
        set({
          error,
          isConnecting: false,
        }),

      disconnect: () =>
        set({
          isConnected: false,
          isConnecting: false,
          isRefreshingAuth: false,
          processorIp: null,
          authKey: null,
          authToken: null,
          authTokenFromEnv: false,
          error: null,
        }),

      invalidateAuth: () =>
        set({
          isConnected: false,
          isRefreshingAuth: false,
          authKey: null,
          // Keep processorIp, authToken, and authTokenFromEnv for re-login
        }),

      getAuthHeaders: (): Record<string, string> => {
        const { processorIp, authKey } = get();
        if (!processorIp || !authKey) {
          return {} as Record<string, string>;
        }
        return {
          "x-processor-ip": processorIp,
          "x-auth-key": authKey,
        };
      },
    }),
    {
      name: "crestron-auth",
      partialize: (state) => ({
        processorIp: state.processorIp,
        authKey: state.authKey, // Persist authKey for faster reconnects
        authToken: state.authToken, // Persist the auth token for re-login
        authTokenFromEnv: state.authTokenFromEnv,
        isConnected: state.isConnected, // Persist connection status
      }),
    }
  )
);

// Login action (separate to handle async)
export async function login(processorIp: string, authToken: string): Promise<boolean> {
  const { setConnecting, setConnection, setError } = useAuthStore.getState();
  
  setConnecting(true);
  setError(null);

  try {
    const response = await fetch("/api/crestron/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ processorIp, authToken }),
    });

    const data = await response.json();

    if (data.success && data.authKey) {
      // Store both the authKey and the authToken for future re-authentication
      setConnection(processorIp, data.authKey, authToken);
      return true;
    }

    setError(data.error || "Failed to connect");
    return false;
  } catch (error) {
    setError(error instanceof Error ? error.message : "Connection failed");
    return false;
  }
}

// Refresh authentication - attempt to re-login with stored credentials
export async function refreshAuth(): Promise<boolean> {
  const { processorIp, authToken, authTokenFromEnv, setConnecting, setConnection, setError, invalidateAuth, setRefreshingAuth } = useAuthStore.getState();
  
  // Need processorIp and either authToken or env flag to refresh
  if (!processorIp || (!authToken && !authTokenFromEnv)) {
    invalidateAuth();
    return false;
  }
  
  // Set refreshing flag to prevent redirects during refresh
  setRefreshingAuth(true);
  setConnecting(true);
  
  try {
    // If authTokenFromEnv is true, we don't send authToken - the server will use env var
    const response = await fetch("/api/crestron/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        processorIp, 
        authToken: authTokenFromEnv ? undefined : authToken 
      }),
    });

    const data = await response.json();

    if (data.success && data.authKey) {
      setConnection(processorIp, data.authKey, authToken ?? undefined, authTokenFromEnv);
      return true;
    }

    // Auth refresh failed - invalidate and let user re-login
    invalidateAuth();
    setError("Session expired. Please log in again.");
    return false;
  } catch (error) {
    invalidateAuth();
    setError(error instanceof Error ? error.message : "Failed to refresh session");
    return false;
  }
}
