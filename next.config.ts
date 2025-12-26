import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Disable dev indicators that cause async params/searchParams warnings
  // The component inspector in dev overlay accesses these props synchronously
  devIndicators: false,
};

export default nextConfig;
