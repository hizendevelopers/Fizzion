import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@fizzion/config", "@fizzion/types", "@fizzion/ui"],
  serverExternalPackages: ["playwright", "playwright-core"],
};

export default nextConfig;
