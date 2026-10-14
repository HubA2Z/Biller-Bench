"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function NavLinks({ staff }: { staff: boolean }) {
  const path = usePathname();
  const items: [string, string][] = [
    ["/", "Questions"],
    ["/denials", "Denial codes"],
    ["/updates", "Updates"],
    ["/ask", "Ask a question"],
    ["/services", "Billing services"],
    ["/experts", "Our experts"],
    ...(staff ? ([["/team", "Team queue"]] as [string, string][]) : []),
  ];
  const active = (href: string) => (href === "/" ? path === "/" || path.startsWith("/q/") || path.startsWith("/p/") : path.startsWith(href));
  return (
    <nav>
      {items.map(([href, label]) => (
        <Link key={href} href={href} aria-current={active(href) ? "page" : undefined}>{label}</Link>
      ))}
    </nav>
  );
}
