import { NextResponse } from "next/server";
import { getCurrentUser, isAdmin } from "@/lib/auth";
import { listProviders } from "@/lib/providers";

/** CSV of provider accounts for admins. */
export async function GET(req: Request) {
  const me = await getCurrentUser();
  if (!isAdmin(me)) return new NextResponse("Not allowed", { status: 403 });
  const q = new URL(req.url).searchParams.get("q") ?? undefined;
  const rows = await listProviders(q);
  // Quote every cell, and neutralize leading = + - @ so spreadsheets don't run them as formulas.
  const cell = (v: unknown) => { let s = v == null ? "" : String(v); if (/^[=+\-@]/.test(s)) s = `'${s}`; return `"${s.replace(/"/g, '""')}"`; };
  const header = ["Name", "Email", "Practice", "Specialty", "State", "NPI", "NPI verified", "Questions", "Open questions", "Service requests", "Joined", "Last sign-in", "Email alerts", "Status"];
  const lines = rows.map(({ u, questions, openQuestions, requests }) => [
    u.name, u.email, u.practiceName, u.specialty, u.state, u.npi, u.npiVerifiedAt ? "Yes" : "No", questions, openQuestions, requests,
    u.createdAt.toISOString().slice(0, 10), u.lastLoginAt?.toISOString().slice(0, 10) ?? "", u.emailNotifications ? "On" : "Off", u.disabledAt ? "Turned off" : "Active",
  ].map(cell).join(","));
  return new NextResponse([header.map(cell).join(","), ...lines].join("\r\n"), {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="billerbench-providers-${new Date().toISOString().slice(0, 10)}.csv"`, "Cache-Control": "no-store" },
  });
}
