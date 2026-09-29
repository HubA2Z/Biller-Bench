import {
  pgTable, pgEnum, text, timestamp, boolean, integer, index, uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";

const id = () => text("id").primaryKey().$defaultFn(() => randomUUID());
const created = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
const updated = () =>
  timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date());

export const roleEnum = pgEnum("role", ["PROVIDER", "STAFF", "ADMIN"]);
export const planEnum = pgEnum("plan", ["FREE", "BASIC", "PRO", "DEDICATED"]);
/** How a question is paid for, which sets its answer deadline. */
export const tierEnum = pgEnum("tier", ["FREE", "PLAN", "URGENT"]);
export const questionStatusEnum = pgEnum("question_status", ["PENDING_PAYMENT", "OPEN", "ANSWERED", "SOLVED"]);
export const answerTypeEnum = pgEnum("answer_type", ["EXPERT", "FOLLOWUP"]);
export const flagStatusEnum = pgEnum("flag_status", ["OPEN", "RESTORED", "REMOVED"]);
export const leadStatusEnum = pgEnum("lead_status", ["NEW", "CONTACTED", "WON", "LOST"]);

export const users = pgTable("users", {
  id: id(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name").notNull(),
  role: roleEnum("role").notNull().default("PROVIDER"),

  // Provider profile
  practiceName: text("practice_name"),
  specialty: text("specialty"),
  state: text("state"),
  npi: text("npi"),
  npiVerifiedAt: timestamp("npi_verified_at", { withTimezone: true }),
  npiNote: text("npi_note"),

  // Staff profile
  credentials: text("credentials"),
  expertSpecialties: text("expert_specialties").array().notNull().default(sql`'{}'::text[]`),
  expertPayers: text("expert_payers").array().notNull().default(sql`'{}'::text[]`),
  expertEhr: text("expert_ehr").array().notNull().default(sql`'{}'::text[]`),

  // Billing
  plan: planEnum("plan").notNull().default("FREE"),
  stripeCustomerId: text("stripe_customer_id").unique(),
  stripeSubscriptionId: text("stripe_subscription_id").unique(),
  planRenewsAt: timestamp("plan_renews_at", { withTimezone: true }),

  createdAt: created(),
  updatedAt: updated(),
});

export const questions = pgTable("questions", {
  id: id(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  authorId: text("author_id").notNull().references(() => users.id),

  codes: text("codes").array().notNull().default(sql`'{}'::text[]`),
  modifiers: text("modifiers").array().notNull().default(sql`'{}'::text[]`),
  payerGroup: text("payer_group").notNull(),
  payerName: text("payer_name").notNull(),
  state: text("state").notNull(),
  specialty: text("specialty").notNull(),
  ehr: text("ehr"),

  tier: tierEnum("tier").notNull(),
  isPrivate: boolean("is_private").notNull().default(false),
  status: questionStatusEnum("status").notNull().default("OPEN"),

  dueAt: timestamp("due_at", { withTimezone: true }),
  paidAt: timestamp("paid_at", { withTimezone: true }),
  stripeSessionId: text("stripe_session_id").unique(),
  firstAnsweredAt: timestamp("first_answered_at", { withTimezone: true }),
  acceptedAnswerId: text("accepted_answer_id"),

  hidden: boolean("hidden").notNull().default(false),
  removed: boolean("removed").notNull().default(false),
  voteCount: integer("vote_count").notNull().default(0),

  createdAt: created(),
  updatedAt: updated(),
}, (t) => [
  index("questions_status_due_idx").on(t.status, t.dueAt),
  index("questions_payer_idx").on(t.payerGroup, t.payerName),
  index("questions_specialty_idx").on(t.specialty),
  index("questions_state_idx").on(t.state),
  index("questions_created_idx").on(t.createdAt),
  index("questions_codes_gin").using("gin", t.codes),
]);

export const answers = pgTable("answers", {
  id: id(),
  questionId: text("question_id").notNull().references(() => questions.id, { onDelete: "cascade" }),
  authorId: text("author_id").notNull().references(() => users.id),
  type: answerTypeEnum("type").notNull(),
  body: text("body").notNull(),
  voteCount: integer("vote_count").notNull().default(0),
  hidden: boolean("hidden").notNull().default(false),
  removed: boolean("removed").notNull().default(false),
  createdAt: created(),
  updatedAt: updated(),
}, (t) => [index("answers_question_idx").on(t.questionId), index("answers_author_idx").on(t.authorId)]);

export const votes = pgTable("votes", {
  id: id(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  questionId: text("question_id").references(() => questions.id, { onDelete: "cascade" }),
  answerId: text("answer_id").references(() => answers.id, { onDelete: "cascade" }),
  createdAt: created(),
}, (t) => [
  uniqueIndex("votes_user_question_uq").on(t.userId, t.questionId),
  uniqueIndex("votes_user_answer_uq").on(t.userId, t.answerId),
]);

export const flags = pgTable("flags", {
  id: id(),
  reporterId: text("reporter_id").notNull().references(() => users.id),
  questionId: text("question_id").references(() => questions.id, { onDelete: "cascade" }),
  answerId: text("answer_id").references(() => answers.id, { onDelete: "cascade" }),
  reason: text("reason").notNull().default("PHI"),
  status: flagStatusEnum("status").notNull().default("OPEN"),
  resolvedById: text("resolved_by_id").references(() => users.id),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  createdAt: created(),
}, (t) => [index("flags_status_idx").on(t.status)]);

/** A practice asking us to do billing work for them: the main revenue funnel. */
export const serviceRequests = pgTable("service_requests", {
  id: id(),
  service: text("service").notNull(),
  practiceName: text("practice_name").notNull(),
  contactName: text("contact_name").notNull(),
  email: text("email").notNull(),
  claimsPerMonth: text("claims_per_month"),
  payers: text("payers"),
  note: text("note"),
  questionId: text("question_id").references(() => questions.id, { onDelete: "set null" }),
  userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
  status: leadStatusEnum("status").notNull().default("NEW"),
  createdAt: created(),
  updatedAt: updated(),
}, (t) => [index("service_requests_status_idx").on(t.status)]);

export const usersRelations = relations(users, ({ many }) => ({
  questions: many(questions),
  answers: many(answers),
}));
export const questionsRelations = relations(questions, ({ one, many }) => ({
  author: one(users, { fields: [questions.authorId], references: [users.id] }),
  answers: many(answers),
}));
export const answersRelations = relations(answers, ({ one }) => ({
  question: one(questions, { fields: [answers.questionId], references: [questions.id] }),
  author: one(users, { fields: [answers.authorId], references: [users.id] }),
}));

export type User = typeof users.$inferSelect;
export type Question = typeof questions.$inferSelect;
export type Answer = typeof answers.$inferSelect;
export type Plan = (typeof planEnum.enumValues)[number];
export type Tier = (typeof tierEnum.enumValues)[number];
