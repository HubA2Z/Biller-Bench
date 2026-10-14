import type { Metadata, Viewport } from "next";
import Link from "next/link";
import "./globals.css";
import { getCurrentUser, isStaff } from "@/lib/auth";
import { logout } from "./actions/auth";
import { NavLinks } from "@/components/NavLinks";
import { appUrl } from "@/lib/site";
import { SEO_DESCRIPTION, SEO_TITLE, company, socialLinks } from "@/lib/company";

export const metadata: Metadata = {
  metadataBase: new URL(appUrl()),
  title: { default: SEO_TITLE, template: "%s | BillerBench" },
  description: SEO_DESCRIPTION,
  applicationName: "BillerBench",
  openGraph: { type: "website", siteName: "BillerBench", locale: "en_US", title: SEO_TITLE, description: SEO_DESCRIPTION, url: "/" },
  twitter: { card: "summary_large_image", title: SEO_TITLE, description: SEO_DESCRIPTION },
  // Google Search Console "HTML tag" verification: paste only the content="…" value into GOOGLE_SITE_VERIFICATION.
  verification: { google: process.env.GOOGLE_SITE_VERIFICATION?.trim() || "jXm16wfXIbSHp41pq15Gnlw3u1OP_L4QJ4JH4kqYISU" },
};

export const viewport: Viewport = { themeColor: "#B42336" };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  const staff = isStaff(user);
  const social = socialLinks();
  const org = {
    "@context": "https://schema.org", "@type": "Organization", name: company().name, url: appUrl(),
    logo: `${appUrl()}/apple-icon.png`, ...(social.length ? { sameAs: social.map((s) => s.url) } : {}),
  };
  // Tells Google the site name to show in results ("BillerBench" instead of the domain).
  const site = { "@context": "https://schema.org", "@type": "WebSite", name: company().name, alternateName: "Biller Bench", url: `${appUrl()}/` };
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,700&family=Public+Sans:ital,wght@0,400;0,500;0,600;0,700;1,400&family=JetBrains+Mono:wght@400;500;600&display=swap" />
      </head>
      <body>
        <header className="top">
          <div className="top-in">
            <Link className="brand" href="/" aria-label="BillerBench home"><img src="/icon.svg" alt="" width={28} height={28} className="brand-mark" />Biller<b>Bench</b></Link>
            <NavLinks staff={staff} />
            <div className="who">
              {user ? (
                <>
                  <Link href="/account">{user.name}{staff ? " · Team" : ""}</Link>
                  <form action={logout} className="inline"><button className="link" type="submit">Sign out</button></form>
                </>
              ) : (
                <>
                  <Link href="/login">Sign in</Link>
                  <Link className="btn sm" href="/signup" style={{ color: "#fff" }}>Join free</Link>
                </>
              )}
            </div>
          </div>
        </header>
        <main className="wrap">{children}</main>
        <footer className="foot">
          <nav className="foot-links" aria-label="Company">
            <Link href="/about">About us</Link>
            <Link href="/denials">Denial codes</Link>
            <Link href="/services">Billing services</Link>
            <Link href="/updates">Coding updates</Link>
            <Link href="/experts">Our billers</Link>
            <Link href="/careers">Careers</Link>
            <Link href="/contact">Contact</Link>
            {social.map((s) => <a key={s.label} href={s.url} target="_blank" rel="noopener noreferrer me">{s.label}</a>)}
          </nav>
          <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify([site, org]).replace(/</g, "\\u003c") }} />
          Answers are general billing guidance based on published payer and CMS policy, not a guarantee of payment or legal advice.
          CPT® is a registered trademark of the American Medical Association. Never post patient information on BillerBench.
        </footer>
      </body>
    </html>
  );
}
