"use client";
import { useRef } from "react";

/** A GET form that re-submits when a select changes, so filters apply immediately. */
export function AutoSubmitForm({ children, className }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLFormElement>(null);
  return (
    <form ref={ref} method="get" className={className}
      onChange={(e) => { if ((e.target as HTMLElement).tagName === "SELECT") ref.current?.requestSubmit(); }}>
      {children}
    </form>
  );
}
