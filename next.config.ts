import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    useTypeScriptCli: true,
    optimizePackageImports: ["lucide-react", "@radix-ui/react-icons", "date-fns"],
  },
};

export default nextConfig;
