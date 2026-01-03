"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Home, Wifi, Key, AlertCircle, Loader2, LogIn } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useAuthStore, login } from "@/stores/authStore";
import { useAuth } from "@/hooks/useAuth";

export default function LoginPage() {
  const router = useRouter();
  const { isConnecting, error, isConnected, setConnection } = useAuthStore();
  const { user, isLoading: isAuthLoading, isAuthenticated } = useAuth();
  
  const [processorIp, setProcessorIp] = useState("");
  const [authToken, setAuthToken] = useState("");
  const [localError, setLocalError] = useState("");
  const [isAutoConnecting, setIsAutoConnecting] = useState(true);

  // If user is authenticated and connected to Crestron, redirect to dashboard
  useEffect(() => {
    if (isAuthenticated && isConnected) {
      router.push("/");
    }
  }, [isAuthenticated, isConnected, router]);

  // Check for auto-connect on mount (only if authenticated)
  useEffect(() => {
    if (isAuthLoading) return;
    
    if (!isAuthenticated) {
      setIsAutoConnecting(false);
      return;
    }

    const checkAutoConnect = async () => {
      if (isConnected) {
        router.push("/");
        return;
      }

      try {
        const response = await fetch("/api/crestron/config");
        const data = await response.json();

        if (data.autoConnectAvailable && data.processorIp && data.authKey) {
          setConnection(data.processorIp, data.authKey, undefined, data.authTokenFromEnv || false);
          router.push("/");
          return;
        }
        
        if (data.envProcessorIp) {
          setProcessorIp(data.envProcessorIp);
        }
      } catch (err) {
        console.error("Auto-connect check failed:", err);
      }
      setIsAutoConnecting(false);
    };

    checkAutoConnect();
  }, [router, setConnection, isConnected, isAuthenticated, isAuthLoading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError("");

    if (!processorIp.trim()) {
      setLocalError("Please enter the processor IP address");
      return;
    }

    const success = await login(processorIp.trim(), authToken.trim() || "");
    if (success) {
      router.push("/");
    }
  };

  const displayError = localError || error;

  // Show loading while checking auth
  if (isAuthLoading || isAutoConnecting) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[var(--accent)] mb-4">
            <Home className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-semibold text-[var(--text-primary)] mb-2">
            Crestron Home
          </h1>
          <div className="flex items-center justify-center gap-2 text-[var(--text-secondary)]">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Loading...</span>
          </div>
        </motion.div>
      </div>
    );
  }

  // Show login button if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-md"
        >
          <div className="text-center mb-8">
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
              className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-[var(--accent)] mb-4"
            >
              <Home className="w-10 h-10 text-white" />
            </motion.div>
            <h1 className="text-3xl font-bold text-[var(--text-primary)]">
              Tutera Home
            </h1>
            <p className="text-[var(--text-secondary)] mt-2">
              Smart Home Control
            </p>
          </div>

          <Card padding="lg" className="shadow-[var(--shadow-lg)]">
            <div className="text-center space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-2">
                  Welcome
                </h2>
                <p className="text-[var(--text-secondary)]">
                  Sign in to control your home
                </p>
              </div>

              <a
                href="/api/login"
                className="
                  flex items-center justify-center gap-3 w-full py-4 px-6
                  bg-[var(--accent)] hover:bg-[var(--accent-hover)]
                  text-white font-semibold rounded-xl
                  transition-all duration-200
                  shadow-lg hover:shadow-xl
                "
              >
                <LogIn className="w-5 h-5" />
                Sign In
              </a>

              <p className="text-sm text-[var(--text-tertiary)]">
                Sign in with Apple, Google, or email
              </p>
            </div>
          </Card>
        </motion.div>
      </div>
    );
  }

  // User is authenticated, show Crestron connection form
  return (
    <div className="min-h-screen bg-[var(--background)] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[var(--accent)] mb-4"
          >
            <Home className="w-8 h-8 text-white" />
          </motion.div>
          <h1 className="text-2xl font-semibold text-[var(--text-primary)]">
            Connect to Crestron
          </h1>
          <p className="text-[var(--text-secondary)] mt-2">
            Welcome back, {user?.firstName || user?.email || "User"}
          </p>
        </div>

        <Card padding="lg" className="shadow-[var(--shadow-lg)]">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label
                htmlFor="processorIp"
                className="block text-sm font-medium text-[var(--text-primary)] mb-2"
              >
                Processor IP Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Wifi className="w-5 h-5 text-[var(--text-tertiary)]" />
                </div>
                <input
                  id="processorIp"
                  type="text"
                  value={processorIp}
                  onChange={(e) => setProcessorIp(e.target.value)}
                  placeholder="192.168.1.100"
                  className="
                    w-full pl-10 pr-4 py-3
                    bg-[var(--surface)] border border-[var(--border)]
                    rounded-[var(--radius)] text-[var(--text-primary)]
                    placeholder:text-[var(--text-tertiary)]
                    focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent
                    transition-all duration-200
                  "
                  disabled={isConnecting}
                />
              </div>
              <p className="mt-1.5 text-xs text-[var(--text-tertiary)]">
                The local IP address of your Crestron Home processor
              </p>
            </div>

            <div>
              <label
                htmlFor="authToken"
                className="block text-sm font-medium text-[var(--text-primary)] mb-2"
              >
                Authorization Token <span className="text-[var(--text-tertiary)] font-normal">(optional)</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Key className="w-5 h-5 text-[var(--text-tertiary)]" />
                </div>
                <input
                  id="authToken"
                  type="password"
                  value={authToken}
                  onChange={(e) => setAuthToken(e.target.value)}
                  placeholder="Uses CRESTRON_HOME_KEY env if empty"
                  className="
                    w-full pl-10 pr-4 py-3
                    bg-[var(--surface)] border border-[var(--border)]
                    rounded-[var(--radius)] text-[var(--text-primary)]
                    placeholder:text-[var(--text-tertiary)]
                    focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent
                    transition-all duration-200
                  "
                  disabled={isConnecting}
                />
              </div>
              <p className="mt-1.5 text-xs text-[var(--text-tertiary)]">
                Leave empty to use CRESTRON_HOME_KEY from environment
              </p>
            </div>

            {displayError && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="p-3 bg-[var(--danger-light)] rounded-[var(--radius-sm)] text-sm"
              >
                <div className="flex items-center gap-2 text-[var(--danger)]">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{displayError}</span>
                </div>
              </motion.div>
            )}

            <Button
              type="submit"
              className="w-full"
              size="lg"
              disabled={isConnecting}
            >
              {isConnecting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Connecting...
                </>
              ) : (
                "Connect"
              )}
            </Button>
          </form>
        </Card>

        <div className="text-center mt-4">
          <a
            href="/api/logout"
            className="text-sm text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors"
          >
            Sign out
          </a>
        </div>
      </motion.div>
    </div>
  );
}
