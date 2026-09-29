"use server";
import { z } from "zod";
import { db, schema } from "@/db";
import { getCurrentUser } from "@/lib/auth";
import { scanPHI } from "@/lib/phi";
import { SERVICES } from "@/lib/plans";

export type LeadState = { error?: string; ok?: boolean; service?: string } | undefined;

const leadSchema = z.object({
  service: z.enum(SERVICES.map((s) => s.id) as [string, ...string[]]),
  practiceName: z.string().trim().min(2, "Enter the practice name."),
  contactName: z.string().trim().min(2, "Enter your name."),
  email: z.string().trim().toLowerCase().email("Enter a valid email address."),
  claimsPerMonth: z.string().max(40).optional(),
  payers: z.string().max(200).optional(),
  note: z.string().max(4000).optional(),
  questionId: z.string().optional(),
});

export async function requestService(_: LeadState, form: FormData): Promise<LeadState> {
  const parsed = leadSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const d = parsed.data;
  if (d.note && scanPHI(d.note).length) return { error: "Remove patient details from the note. We'll collect claim details securely after we talk." };
  const user = await getCurrentUser();
  await db.insert(schema.serviceRequests).values({
    service: d.service, practiceName: d.practiceName, contactName: d.contactName, email: d.email,
    claimsPerMonth: d.claimsPerMonth || null, payers: d.payers || null, note: d.note || null,
    questionId: d.questionId || null, userId: user?.id ?? null,
  });
  return { ok: true, service: d.service };
}
