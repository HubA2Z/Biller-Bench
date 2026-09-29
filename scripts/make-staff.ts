// Usage: npm run make-staff -- email@example.com "Full Name" "CPC" [--admin]
// Creates the first admin from the command line. After that, admins add billers on the Team members page.
import "./load-env";
import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import { db, schema } from "../src/db";

async function main() {
  const args = process.argv.slice(2);
  const admin = args.includes("--admin");
  const [email, name, credentials, pw] = args.filter((a) => a !== "--admin");
  const role = admin ? "ADMIN" as const : "STAFF" as const;
  if (!email || !name) {
    console.error('Usage: npm run make-staff -- email@example.com "Full Name" "CPC" [--admin]');
    process.exit(1);
  }
  const password = pw ?? randomBytes(9).toString("base64url");
  const hash = await bcrypt.hash(password, 12);
  const existing = await db.select().from(schema.users).where(eq(schema.users.email, email.toLowerCase()));
  if (existing.length) {
    await db.update(schema.users).set({ role, credentials: credentials ?? existing[0].credentials }).where(eq(schema.users.id, existing[0].id));
    console.log(`${email} is now ${admin ? "an admin" : "a team member"} (password unchanged).`);
  } else {
    await db.insert(schema.users).values({ email: email.toLowerCase(), name, credentials, role, passwordHash: hash });
    console.log(`Created ${admin ? "admin" : "team member"} ${email} with password: ${password}\nChange it after signing in with "Forgot your password?".`);
  }
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
