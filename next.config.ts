import type { NextConfig } from "next";

const apiUrl = process.env.API_URL ?? "http://localhost:4000";

const nextConfig: NextConfig = {
  basePath: "/panel",
  async rewrites() {
    return [
      {
        source: "/api/auth",
        destination: `${apiUrl}/api/auth`,
      },
      {
        source: "/api/auth/:path*",
        destination: `${apiUrl}/api/auth/:path*`,
      },
      {
        source: "/api/packages",
        destination: `${apiUrl}/api/packages`,
      },
      {
        source: "/api/packages/:path*",
        destination: `${apiUrl}/api/packages/:path*`,
      },
      {
        source: "/api/categories",
        destination: `${apiUrl}/api/categories`,
      },
      {
        source: "/api/categories/:path*",
        destination: `${apiUrl}/api/categories/:path*`,
      },
      {
        source: "/api/users",
        destination: `${apiUrl}/api/users`,
      },
      {
        source: "/api/users/:path*",
        destination: `${apiUrl}/api/users/:path*`,
      },
      {
        source: "/api/pricing-rules",
        destination: `${apiUrl}/api/pricing-rules`,
      },
      {
        source: "/api/pricing-rules/:path*",
        destination: `${apiUrl}/api/pricing-rules/:path*`,
      },
      {
        source: "/api/package-templates",
        destination: `${apiUrl}/api/package-templates`,
      },
      {
        source: "/api/package-templates/:path*",
        destination: `${apiUrl}/api/package-templates/:path*`,
      },
      {
        source: "/api/blogs",
        destination: `${apiUrl}/api/blogs`,
      },
      {
        source: "/api/blogs/:path*",
        destination: `${apiUrl}/api/blogs/:path*`,
      },
      {
        source: "/api/blog-categories",
        destination: `${apiUrl}/api/blog-categories`,
      },
      {
        source: "/api/blog-categories/:path*",
        destination: `${apiUrl}/api/blog-categories/:path*`,
      },
      {
        source: "/api/pages",
        destination: `${apiUrl}/api/pages`,
      },
      {
        source: "/api/pages/:path*",
        destination: `${apiUrl}/api/pages/:path*`,
      },
      {
        source: "/api/dashboard",
        destination: `${apiUrl}/api/dashboard`,
      },
      {
        source: "/api/dashboard/:path*",
        destination: `${apiUrl}/api/dashboard/:path*`,
      },
      {
        source: "/api/enquiries",
        destination: `${apiUrl}/api/enquiries`,
      },
      {
        source: "/api/enquiries/:path*",
        destination: `${apiUrl}/api/enquiries/:path*`,
      },
      {
        source: "/api/settings",
        destination: `${apiUrl}/api/settings`,
      },
      {
        source: "/api/settings/:path*",
        destination: `${apiUrl}/api/settings/:path*`,
      },
      {
        source: "/api/permissions",
        destination: `${apiUrl}/api/permissions`,
      },
      {
        source: "/api/permissions/:path*",
        destination: `${apiUrl}/api/permissions/:path*`,
      },
      {
        source: "/api/suppliers",
        destination: `${apiUrl}/api/suppliers`,
      },
      {
        source: "/api/suppliers/:path*",
        destination: `${apiUrl}/api/suppliers/:path*`,
      },
      {
        source: "/api/legacy-assets/:path*",
        destination: `${apiUrl}/api/legacy-assets/:path*`,
      },
      {
        source: "/api/media",
        destination: `${apiUrl}/api/media`,
      },
      {
        source: "/api/media/:path*",
        destination: `${apiUrl}/api/media/:path*`,
      },
      {
        source: "/uploads/:path*",
        destination: `${apiUrl}/uploads/:path*`,
      },
    ];
  },
};

export default nextConfig;
