// Loads new files from content/updates into the articles table.
// Runs on every deploy (after migrations). Each file is imported once; later edits
// to the file are ignored so changes made in the admin screen are never overwritten.
import { readdirSync, readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { and, asc, eq, isNull } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import * as schema from "../src/db/schema";
import { parseUpdateFile } from "../src/lib/content-file";
import { slugify } from "../src/lib/slug";
import { parseDenialFile } from "../src/lib/denials";
import { parseQAFile } from "../src/lib/qa-file";
import bcrypt from "bcryptjs";

const DIR = path.join(process.cwd(), "content", "updates");

export async function importContent(db: NodePgDatabase<typeof schema>) {
  await importUpdates(db);
  await importDenials(db);
  await importQuestions(db);
}

const QA_DIR = path.join(process.cwd(), "content", "questions");

/** Loads new files from content/questions as draft "common questions" with their expert answers (once per file). */
async function importQuestions(db: NodePgDatabase<typeof schema>) {
  if (!existsSync(QA_DIR)) return;
  const files = readdirSync(QA_DIR).filter((f) => f.endsWith(".md") && !f.startsWith("_") && f.toLowerCase() !== "readme.md").sort();
  const done = new Set((await db.select({ file: schema.contentImports.file }).from(schema.contentImports)).map((r) => r.file));
  const pending = files.filter((f) => !done.has(`questions/${f}`));
  if (!pending.length) { console.log("Questions: no new files."); return; }
  const U = schema.users;
  const authorEmail = process.env.CONTENT_AUTHOR_EMAIL?.toLowerCase();
  const [answerer] = authorEmail
    ? await db.select().from(U).where(and(eq(U.email, authorEmail), isNull(U.disabledAt)))
    : await db.select().from(U).where(and(eq(U.role, "ADMIN"), isNull(U.disabledAt))).orderBy(asc(U.createdAt)).limit(1);
  if (!answerer) { console.warn("Questions: skipped. No admin account exists yet to credit the answers to."); return; }
  // The non-login account that owns team questions (same one the team queue uses).
  const SYSTEM_EMAIL = "questions@billerbench.system";
  let [sys] = await db.select({ id: U.id }).from(U).where(eq(U.email, SYSTEM_EMAIL));
  if (!sys) [sys] = await db.insert(U).values({ email: SYSTEM_EMAIL, name: "BillerBench", role: "PROVIDER", emailNotifications: false,
    passwordHash: await bcrypt.hash(randomBytes(24).toString("hex"), 10), disabledAt: new Date() }).returning({ id: U.id });
  let added = 0;
  for (const f of pending) {
    const parsed = parseQAFile(readFileSync(path.join(QA_DIR, f), "utf8"));
    if (!parsed.ok) { console.warn(`Questions: skipped ${f}: ${parsed.errors.join(" ")}`); continue; }
    const d = parsed.qa;
    await db.transaction(async (tx) => {
      const [q] = await tx.insert(schema.questions).values({
        slug: `${slugify(d.title, 70)}-${randomBytes(3).toString("hex")}`, title: d.title, body: d.body, authorId: sys.id,
        codes: d.codes, modifiers: [], payerGroup: d.payerGroup, payerName: d.payerName, state: d.state, specialty: d.specialty,
        tier: "FREE", isPrivate: false, status: "ANSWERED", source: "team", draft: true, firstAnsweredAt: new Date(),
      }).returning({ id: schema.questions.id });
      await tx.insert(schema.answers).values({ questionId: q.id, authorId: answerer.id, type: "EXPERT", body: d.answer });
      await tx.insert(schema.contentImports).values({ file: `questions/${f}`, articleId: q.id });
    });
    added++;
  }
  console.log(`Questions: imported ${added} file(s) as drafts.`);
}

const DENIAL_DIR = path.join(process.cwd(), "content", "denials");

/** Loads new files from content/denials as draft Denial Code Library pages (once per file). */
async function importDenials(db: NodePgDatabase<typeof schema>) {
  if (!existsSync(DENIAL_DIR)) return;
  const files = readdirSync(DENIAL_DIR).filter((f) => f.endsWith(".md") && !f.startsWith("_") && f.toLowerCase() !== "readme.md").sort();
  const done = new Set((await db.select({ file: schema.contentImports.file }).from(schema.contentImports)).map((r) => r.file));
  const D = schema.denialCodes;
  let added = 0;
  for (const f of files) {
    const key = `denials/${f}`;
    if (done.has(key)) continue;
    const parsed = parseDenialFile(readFileSync(path.join(DENIAL_DIR, f), "utf8"));
    if (!parsed.ok) { console.warn(`Denials: skipped ${f}: ${parsed.errors.join(" ")}`); continue; }
    const d = parsed.denial;
    await db.transaction(async (tx) => {
      // A code that already has a page (for example edited in the admin screen) is left alone.
      const [existing] = await tx.select({ id: D.id }).from(D).where(eq(D.code, d.code));
      const id = existing?.id ?? (await tx.insert(D).values({
        code: d.code, groupCode: d.groupCode, slug: d.slug, category: d.category, title: d.title,
        quickAnswer: d.quickAnswer, body: d.body, related: d.related, status: "DRAFT",
      }).returning({ id: D.id }))[0].id;
      await tx.insert(schema.contentImports).values({ file: key, articleId: id });
    });
    added++;
  }
  console.log(added ? `Denials: imported ${added} file(s) as drafts.` : "Denials: no new files.");
}

async function importUpdates(db: NodePgDatabase<typeof schema>) {
  if (!existsSync(DIR)) return;
  const files = readdirSync(DIR).filter((f) => f.endsWith(".md") && !f.startsWith("_") && f.toLowerCase() !== "readme.md").sort();
  if (!files.length) return;

  const done = new Set((await db.select({ file: schema.contentImports.file }).from(schema.contentImports)).map((r) => r.file));
  const pending = files.filter((f) => !done.has(f));
  if (!pending.length) { console.log("Content: no new update files."); return; }

  const U = schema.users;
  const authorEmail = process.env.CONTENT_AUTHOR_EMAIL?.toLowerCase();
  const [author] = authorEmail
    ? await db.select().from(U).where(and(eq(U.email, authorEmail), isNull(U.disabledAt)))
    : await db.select().from(U).where(and(eq(U.role, "ADMIN"), isNull(U.disabledAt))).orderBy(asc(U.createdAt)).limit(1);
  if (!author) { console.warn("Content: skipped. No admin account exists yet to credit as the author."); return; }
  const allowPublish = process.env.CONTENT_AUTOPUBLISH === "true";

  for (const file of pending) {
    const parsed = parseUpdateFile(readFileSync(path.join(DIR, file), "utf8"));
    if (!parsed.ok) {
      // A bad file is reported but doesn't block the deploy; fix it and it's retried next deploy.
      console.warn(`Content: skipped ${file}: ${parsed.errors.join(" ")}`);
      continue;
    }
    const u = parsed.update;
    const publish = u.wantsPublish && allowPublish;
    const slug = `${slugify(file.replace(/\.md$/, "").replace(/^\d{4}-\d{2}-\d{2}-/, ""), 70) || slugify(u.title, 70)}-${randomBytes(2).toString("hex")}`;
    await db.transaction(async (tx) => {
      const [a] = await tx.insert(schema.articles).values({
        slug, kind: u.kind, title: u.title, summary: u.summary, body: u.body, codes: u.codes, payers: u.payers,
        specialty: u.specialty, effectiveDate: u.effectiveDate, sourceUrl: u.sourceUrl, authorId: author.id,
        status: publish ? "PUBLISHED" : "DRAFT", publishedAt: publish ? new Date() : null,
      }).returning({ id: schema.articles.id });
      await tx.insert(schema.contentImports).values({ file, articleId: a.id });
    });
    console.log(`Content: imported ${file} as ${publish ? "published" : "draft"}.`);
  }
}
