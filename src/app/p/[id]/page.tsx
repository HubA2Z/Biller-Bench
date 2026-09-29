import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { schema } from "@/db";
import { getCurrentUser } from "@/lib/auth";
import { getQuestion } from "@/lib/queries";
import { questionPath } from "@/lib/paths";
import { QuestionView } from "@/components/QuestionView";

export const metadata: Metadata = { title: "Private question", robots: { index: false, follow: false } };

export default async function PrivateQuestion({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ paid?: string; payment?: string }> }) {
  const { id } = await params;
  const sp = await searchParams;
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=/p/${id}`);
  const data = await getQuestion(eq(schema.questions.id, id), user);
  if (!data) notFound();
  if (!data.q.isPrivate) redirect(questionPath(data.q));
  const notice = sp.paid ? "Payment received. Your question is in the urgent queue." : sp.payment === "cancelled" ? "Payment was cancelled. You can finish it any time." : undefined;
  return <QuestionView data={data} user={user} notice={notice} />;
}
