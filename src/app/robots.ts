import type { MetadataRoute } from "next";
import { appUrl } from "@/lib/stripe";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/p/", "/team", "/account", "/ask", "/checkout", "/api/", "/login", "/signup"] }],
    sitemap: `${appUrl()}/sitemap.xml`,
  };
}
