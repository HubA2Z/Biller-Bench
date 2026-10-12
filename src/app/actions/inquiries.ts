"use server";
import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/db";
import { requireStaff } from "@/lib/auth";
import { scanPHI } from "@/lib/phi";
import { CAREER_ROLES, CONTACT_TOPICS } from "@/lib/company";
import { LIMITS, hitIp, waitMessage } from "@/lib/rate-limit";
import { notifyStaffOfInquiry } from "@/lib/notify";

export type InquiryState = { error?: string; ok?: boolean } | undefined;

const opt = (max: number) => z.string().trim().max(max).optional().transform((v) => v || null);
const base = {
  name: z.string().trim().min(2, "Enter your name.").max(120),
  email: z.string().trim().toLowerCase().email("Enter a valid email address.").max(200),
  phone: opt(40),
};

const contactSchema = z.object({
  ...base,
  organization: opt(160),
  topic: z.enum(CONTACT_TOPICS, { errorMap: () => ({ message: "Choose a topic." }) }),
  message: z.string().trim().min(10, "Tell us a little more (at least 10 characters).").max(4000),
});

const careerSchema = z.object({
  ...base,
  role: z.enum(CAREER_ROLES.map((r) => r.id) as [string, ...string[]], { errorMap: () => ({ message: "Choose the role you’re applying for." }) }),
  experience: opt(300),
  link: opt(300).refine((v) => !v || /^https:\/\/\S+$/i.test(v), "The profile or resume link must start with https://"),
  message: z.string().trim().min(20, "Tell us about your experience (at least 20 characters).").max(4000),
});

/** Websites are a trap field: people never see it, bots fill it in. */
const isBot = (form: FormData) => Boolean(String(form.get("website") ?? "").trim());
const PHI_ERROR = "Remove patient details (names, dates of birth, member IDs, claim numbers) from your message. We never need patient information here.";

async function save(kind: "CONTACT" | "CAREER", values: Omit<typeof schema.inquiries.$inferInsert, "kind">) {
  const [row] = await db.insert(schema.inquiries).values({ kind, ...values }).returning();
  after(() => notifyStaffOfInquiry(row));
}

export async function submitContact(_: InquiryState, form: FormData): Promise<InquiryState> {
  if (isBot(form)) return { ok: true };
  const parsed = contactSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const d = parsed.data;
  if (scanPHI(d.message).length) return { error: PHI_ERROR };
  const limit = await hitIp("inquiry", LIMITS.inquiryIp);
  if (!limit.ok) return { error: waitMessage(limit) };
  await save("CONTACT", { name: d.name, email: d.email, phone: d.phone, organization: d.organization, topic: d.topic, message: d.message });
  return { ok: true };
}

export async function submitApplication(_: InquiryState, form: FormData): Promise<InquiryState> {
  if (isBot(form)) return { ok: true };
  const parsed = careerSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const d = parsed.data;
  if (scanPHI(d.message).length) return { error: PHI_ERROR };
  const limit = await hitIp("inquiry", LIMITS.inquiryIp);
  if (!limit.ok) return { error: waitMessage(limit) };
  await save("CAREER", { name: d.name, email: d.email, phone: d.phone, role: d.role, experience: d.experience, link: d.link, message: d.message });
  return { ok: true };
}

export async function setInquiryStatus(form: FormData) {
  await requireStaff();
  const id = String(form.get("inquiryId"));
  const status = String(form.get("status"));
  if (!["NEW", "REVIEWED", "ARCHIVED"].includes(status)) return;
  await db.update(schema.inquiries).set({ status: status as "NEW" }).where(eq(schema.inquiries.id, id));
  revalidatePath("/team");
}
