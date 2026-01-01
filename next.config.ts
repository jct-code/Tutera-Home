import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  allowedDevOrigins: [
    "*.replit.dev",
    "*.repl.co",
    "*.replit.app",
  ],
};

export default nextConfig;
