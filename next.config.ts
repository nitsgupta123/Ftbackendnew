import type { NextConfig } from "next";

const apiUrl = process.env.API_URL ?? "http://localhost:4000";

const proxyRules = [
  {
    source: "/api/:path*",
    destination: `${apiUrl}/api/:path*`,
  },
  {
    source: "/uploads/:path*",
    destination: `${apiUrl}/uploads/:path*`,
  },
] as const;

const nextConfig: NextConfig = {
  basePath: "/panel",
  async redirects() {
    return [
      // Visiting / (e.g. localhost:3000) should land on the app under basePath
      {
        source: "/",
        destination: "/panel",
        permanent: false,
        basePath: false,
      },
    ];
  },
  async rewrites() {
    return [
      // fetch("/api/...") hits the origin root, not /panel/api/...
      ...proxyRules.map((rule) => ({ ...rule, basePath: false as const })),
      // Keep /panel/api/... working for anything that includes the basePath
      ...proxyRules,
    ];
  },
};

export default nextConfig;
