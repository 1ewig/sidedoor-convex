import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    useTypeScriptCli: true,
    optimizePackageImports: ["lucide-react", "@radix-ui/react-icons", "date-fns"],
  },
  images: {
    // Event flyers are served through the same-origin /api/img proxy, which
    // uses a `?src=` query string — allow local query-string paths explicitly.
    localPatterns: [
      {
        pathname: "/api/img",
      },
      {
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
