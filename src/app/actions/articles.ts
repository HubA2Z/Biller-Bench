"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { randomBytes } from "node:crypto";
import { z } from "zod";
import { db, schema } from "@/db";
import { requireAdmin } from "@/lib/auth";
import { scanPHI } from "@/lib/phi";
import { classifyCode, parseCodes } from "@/lib/codes";
import { slugify } from "@/lib/slug";
import { SPECIALTIES } from "@/lib/taxonomy";
import { EXPERT_PAYERS } from "@/lib/team";
import { articlePath } from "@/lib/articles";

const A = schema.articles;

export type ArticleState = { errors?: string[] } | undefined;

const articleSchema = z.object({
  kind: z.enum(["ARTICLE", "CODING_UPDATE", "PAYER_UPDATE"]),
  title: z.string().trim().min(10, "Write a title of at least 10 characters.").max(160, "Keep the title under 160 characters."),
  summary: z.string().trim().min(30, "Write a summary of at least 30 characters. It shows in lists and on Google.").max(300, "Keep the summary under 300 characters."),
  body: z.string().trim().min(80, "The article needs at least 80 characters.").max(60000),
  codes: z.string().max(400),
  payers: z.array(z.enum(EXPERT_PAYERS)),
  specialty: z.string(),
  effectiveDate: z.string().regex(/^(\d{4}-\d{2}-\d{2})?$/, "Use a valid effective date."),
  sourceUrl: z.string().trim().refine((u) => !u || /^https:\/\/\S+$/.test(u), "The source link must start with https://"),
  intent: z.enum(["draft", "publish"]),
});

function read(form: FormData) {
  return articleSchema.safeParse({
    kind: form.get("kind"), title: form.get("title") ?? "", summary: form.get("summary") ?? "", body: form.get("body") ?? "",
    codes: form.get("codes") ?? "", payers: form.getAll("payers"), specialty: form.get("specialty") ?? "",
    effectiveDate: form.get("effectiveDate") ?? "", sourceUrl: form.get("sourceUrl") ?? "", intent: form.get("intent") === "publish" ? "publish" : "draft",
  });
}

/** Creates or updates an article. "publish" makes it public; "draft" keeps it (or puts it back) out of view. */
export async function saveArticle(_: ArticleState, form: FormData): Promise<ArticleState> {
  const admin = await requireAdmin();
  const id = (form.get("id") as string) || null;
  const parsed = read(form);
  if (!parsed.success) return { errors: parsed.error.issues.map((i) => i.message) };
  const d = parsed.data;
  const errors: string[] = [];
  const codes = parseCodes(d.codes).slice(0, 20);
  const bad = codes.filter((c) => !classifyCode(c));
  if (bad.length) errors.push(`Not a recognized CPT, HCPCS or ICD-10 code: ${bad.join(", ")}.`);
  if (d.specialty && !(SPECIALTIES as readonly string[]).includes(d.specialty)) errors.push("Choose a listed specialty, or none.");
  if (scanPHI(`${d.title}\n${d.summary}\n${d.body}`).length) errors.push("Remove the possible patient identifiers. BillerBench never stores patient information.");
  if (errors.length) return { errors };

  const values = {
    kind: d.kind, title: d.title, summary: d.summary, body: d.body, codes, payers: d.payers,
    specialty: d.specialty || null, sourceUrl: d.sourceUrl || null,
    effectiveDate: d.effectiveDate ? new Date(`${d.effectiveDate}T12:00:00Z`) : null,
  };

  let saved;
  if (id) {
    const [existing] = await db.select().from(A).where(eq(A.id, id));
    if (!existing) return { errors: ["This article no longer exists."] };
    [saved] = await db.update(A).set({
      ...values,
      status: d.intent === "publish" ? "PUBLISHED" : "DRAFT",
      publishedAt: d.intent === "publish" ? existing.publishedAt ?? new Date() : existing.publishedAt,
    }).where(eq(A.id, id)).returning();
  } else {
    [saved] = await db.insert(A).values({
      ...values, authorId: admin.id,
      slug: `${slugify(d.title, 70)}-${randomBytes(2).toString("hex")}`,
      status: d.intent === "publish" ? "PUBLISHED" : "DRAFT",
      publishedAt: d.intent === "publish" ? new Date() : null,
    }).returning();
  }
  revalidatePath("/updates");
  revalidatePath(articlePath(saved));
  revalidatePath("/team/updates");
  revalidatePath("/");
  redirect(d.intent === "publish" ? `${articlePath(saved)}?published=1` : `/team/updates/${saved.id}?saved=1`);
}

export async function deleteArticle(form: FormData) {
  await requireAdmin();
  const id = String(form.get("id"));
  if (form.get("confirm") !== "yes") return;
  const [a] = await db.delete(A).where(eq(A.id, id)).returning();
  if (a) { revalidatePath("/updates"); revalidatePath(articlePath(a)); }
  revalidatePath("/team/updates");
  redirect("/team/updates?deleted=1");
}
