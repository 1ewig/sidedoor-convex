import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  trailingSlash: true,
  experimental: {
    useTypeScriptCli: true,
    optimizePackageImports: ["lucide-react", "@radix-ui/react-icons", "date-fns"],
  },
  images: {
    unoptimized: true,
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
      { protocol: 'http', hostname: '**' },
    ],
  },
};

export default nextConfig;
