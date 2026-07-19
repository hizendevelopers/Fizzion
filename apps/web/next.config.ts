import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@fizzion/config", "@fizzion/types", "@fizzion/ui"],
};

export default nextConfig;
