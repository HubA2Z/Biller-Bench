"use client";
import Script from "next/script";
import { useEffect, useRef } from "react";
import { GA_ID, track } from "@/lib/analytics";

/** Loads Google Analytics. Page views on in-site navigation are tracked by GA4's enhanced measurement. */
export function GoogleAnalytics() {
  return (
    <>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} strategy="afterInteractive" />
      <Script id="ga-init" strategy="afterInteractive">{`
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());
        gtag('config', '${GA_ID}');
      `}</Script>
    </>
  );
}

/** Sends one analytics event when it first renders (used on form success messages). */
export function TrackOnce({ event, params }: { event: string; params?: Record<string, string | number> }) {
  const sent = useRef(false);
  useEffect(() => { if (!sent.current) { sent.current = true; track(event, params); } }, [event, params]);
  return null;
}
