// Usage: npm run make-staff -- email@example.com "Full Name" "CPC" [password]
import "./load-env";
import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import { db, schema } from "../src/db";

async function main() {
  const [email, name, credentials, pw] = process.argv.slice(2);
  if (!email || !name) {
    console.error('Usage: npm run make-staff -- email@example.com "Full Name" "CPC" [password]');
    process.exit(1);
  }
  const password = pw ?? randomBytes(9).toString("base64url");
  const hash = await bcrypt.hash(password, 12);
  const existing = await db.select().from(schema.users).where(eq(schema.users.email, email.toLowerCase()));
  if (existing.length) {
    await db.update(schema.users).set({ role: "STAFF", credentials: credentials ?? existing[0].credentials }).where(eq(schema.users.id, existing[0].id));
    console.log(`${email} is now a team member (password unchanged).`);
  } else {
    await db.insert(schema.users).values({ email: email.toLowerCase(), name, credentials, role: "STAFF", passwordHash: hash });
    console.log(`Created team member ${email} with password: ${password}`);
  }
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
