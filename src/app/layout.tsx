import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { getCurrentUser, isStaff } from "@/lib/auth";
import { logout } from "./actions/auth";
import { NavLinks } from "@/components/NavLinks";
import { appUrl } from "@/lib/stripe";

export const metadata: Metadata = {
  metadataBase: new URL(appUrl()),
  title: { default: "BillerBench: medical billing answers from certified billers", template: "%s · BillerBench" },
  description: "Ask claim denial, CPT, ICD-10 and modifier questions. Certified billers answer, with the payer policy behind every answer.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  const staff = isStaff(user);
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
            <Link className="brand" href="/" aria-label="BillerBench home">Biller<b>Bench</b></Link>
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
          Answers are general billing guidance based on published payer and CMS policy, not a guarantee of payment or legal advice.
          CPT® is a registered trademark of the American Medical Association. Never post patient information in a public question.
        </footer>
      </body>
    </html>
  );
}
