"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, ne } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/db";
import { requireStaff } from "@/lib/auth";
import { scanPHI } from "@/lib/phi";
import { DENIAL_CATEGORIES, GROUP_CODES, denialPath, denialSlug, normalizeCode } from "@/lib/denials";

const D = schema.denialCodes;
export type DenialState = { errors?: string[] } | undefined;

const schemaIn = z.object({
  id: z.string().optional(),
  code: z.string().transform(normalizeCode).refine((c) => /^[A-Z]?\d{1,3}$/.test(c), "Code should look like 97 or B7."),
  groupCode: z.enum(Object.keys(GROUP_CODES) as [string, ...string[]]),
  category: z.enum(Object.keys(DENIAL_CATEGORIES) as [string, ...string[]], { errorMap: () => ({ message: "Choose a category." }) }),
  title: z.string().trim().min(10, "Title must be at least 10 characters.").max(160),
  quickAnswer: z.string().trim().min(60, "Quick answer must be at least 60 characters.").max(600),
  body: z.string().trim().min(300, "The page body must be at least 300 characters."),
  related: z.string().optional(),
  intent: z.enum(["draft", "publish"]),
});

export async function saveDenial(_: DenialState, form: FormData): Promise<DenialState> {
  const me = await requireStaff();
  const parsed = schemaIn.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { errors: parsed.error.issues.map((i) => i.message) };
  const d = parsed.data;
  if (scanPHI(`${d.title}\n${d.quickAnswer}\n${d.body}`).length) return { errors: ["Remove the possible patient identifiers. BillerBench never stores patient information."] };
  const [clash] = await db.select({ id: D.id }).from(D).where(d.id ? and(eq(D.code, d.code), ne(D.id, d.id)) : eq(D.code, d.code));
  if (clash) return { errors: [`Code ${d.code} already has a page.`] };
  const related = (d.related ?? "").split(",").map(normalizeCode).filter((c) => /^[A-Z]?\d{1,3}$/.test(c) && c !== d.code).slice(0, 8);
  const publish = d.intent === "publish";
  const now = new Date();
  const values = {
    code: d.code, groupCode: d.groupCode, slug: denialSlug(d.groupCode, d.code), category: d.category,
    title: d.title, quickAnswer: d.quickAnswer, body: d.body, related,
    status: publish ? ("PUBLISHED" as const) : ("DRAFT" as const),
    // Publishing is the review: the person who publishes is shown as the reviewer.
    ...(publish ? { reviewedById: me.id, reviewedAt: now } : {}),
  };
  const [row] = d.id
    ? await db.update(D).set(values).where(eq(D.id, d.id)).returning()
    : await db.insert(D).values(values).returning();
  if (publish && !row.publishedAt) await db.update(D).set({ publishedAt: now }).where(eq(D.id, row.id));
  if (!publish) await db.update(D).set({ publishedAt: null }).where(eq(D.id, row.id));
  revalidatePath("/denials"); revalidatePath("/team/denials");
  redirect(publish ? `${denialPath(row)}?published=1` : `/team/denials?saved=${row.code}`);
}

export async function setDenialStatus(form: FormData) {
  const me = await requireStaff();
  const id = String(form.get("id"));
  const publish = form.get("status") === "PUBLISHED";
  const now = new Date();
  await db.update(D).set(publish
    ? { status: "PUBLISHED", reviewedById: me.id, reviewedAt: now, publishedAt: now }
    : { status: "DRAFT", publishedAt: null }).where(eq(D.id, id));
  revalidatePath("/denials"); revalidatePath("/team/denials");
}
