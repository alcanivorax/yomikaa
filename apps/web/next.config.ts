import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async rewrites() {
    // Local dev only: proxy /api/v1 to the API so the browser stays same-origin
    // (httpOnly session cookies flow automatically). On Vercel this never runs —
    // vercel.json rewrites /api/(.*) straight to the api service first.
    if (process.env.VERCEL) return [];
    return [
      {
        source: "/api/v1/:path*",
        destination: "http://localhost:4000/api/v1/:path*",
      },
    ];
  },
};

export default nextConfig;
