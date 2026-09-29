import type { MetadataRoute } from "next";
import { appUrl } from "@/lib/stripe";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/p/", "/team", "/account", "/ask", "/checkout", "/api/", "/login", "/signup", "/forgot-password", "/reset-password"] }],
    sitemap: `${appUrl()}/sitemap.xml`,
  };
}
