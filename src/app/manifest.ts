import type { MetadataRoute } from "next";
import { SEO_DESCRIPTION } from "@/lib/company";

/** Name and icons used when someone adds BillerBench to their phone's home screen. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "BillerBench",
    short_name: "BillerBench",
    description: SEO_DESCRIPTION,
    start_url: "/",
    display: "standalone",
    background_color: "#F6F4F3",
    theme_color: "#B42336",
    icons: [
      { src: "/icon-96.png", sizes: "96x96", type: "image/png" },
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
