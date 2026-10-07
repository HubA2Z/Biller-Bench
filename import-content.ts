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

const DIR = path.join(process.cwd(), "content", "updates");

export async function importContent(db: NodePgDatabase<typeof schema>) {
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
