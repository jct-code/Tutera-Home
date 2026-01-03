"use client";

import { useState, useEffect } from "react";
import type { User } from "@/lib/schema";

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    isLoading: true,
    isAuthenticated: false,
    error: null,
  });

  useEffect(() => {
    async function checkAuth() {
      try {
        const response = await fetch("/api/auth/user", {
          credentials: "include",
        });

        if (response.status === 401) {
          setState({
            user: null,
            isLoading: false,
            isAuthenticated: false,
            error: null,
          });
          return;
        }

        if (!response.ok) {
          throw new Error("Failed to check authentication");
        }

        const user = await response.json();
        setState({
          user,
          isLoading: false,
          isAuthenticated: true,
          error: null,
        });
      } catch (error) {
        setState({
          user: null,
          isLoading: false,
          isAuthenticated: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    checkAuth();
  }, []);

  const login = () => {
    window.location.href = "/api/login";
  };

  const logout = () => {
    window.location.href = "/api/logout";
  };

  return {
    ...state,
    login,
    logout,
  };
}
