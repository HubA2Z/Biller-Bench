import type { NextConfig } from "next";

const securityHeaders = [
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async redirects() {
    // The old pricing page became the billing services page.
    // The question list moved from the home page to /questions; old filtered links follow it (query strings carry over).
    const moved = ["q", "code", "payer", "state", "specialty", "status", "sort", "page"].map((key) => ({
      source: "/", has: [{ type: "query" as const, key }], destination: "/questions", permanent: true,
    }));
    return [{ source: "/pricing", destination: "/services", permanent: true }, ...moved];
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
