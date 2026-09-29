import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { cache } from "react";
import { schema } from "@/db";
import { getCurrentUser } from "@/lib/auth";
import { getQuestion } from "@/lib/queries";
import { questionPath } from "@/lib/paths";
import { plainText } from "@/lib/markdown";
import { payerLabel } from "@/lib/taxonomy";
import { QuestionView } from "@/components/QuestionView";

type Params = { code: string; payer: string; slug: string };

const load = cache(async (slug: string) => {
  const user = await getCurrentUser();
  const data = await getQuestion(and(eq(schema.questions.slug, slug), eq(schema.questions.isPrivate, false))!, user);
  return { user, data };
});

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  const { data } = await load(slug);
  if (!data) return { title: "Question not found", robots: { index: false } };
  const { q } = data;
  const desc = `${payerLabel(q.payerGroup, q.payerName)} · ${[...q.codes, ...q.modifiers.map((m) => "-" + m)].join(" ")}. ${plainText(q.body)}`.slice(0, 158);
  return {
    title: q.title,
    description: desc,
    alternates: { canonical: questionPath(q) },
    // Only index questions that have an answer and aren't under PHI review.
    robots: { index: q.status !== "OPEN" && !q.hidden, follow: true },
    openGraph: { title: q.title, description: desc, type: "article" },
  };
}

export default async function PublicQuestion({ params, searchParams }: { params: Promise<Params>; searchParams: Promise<{ paid?: string; payment?: string }> }) {
  const { slug } = await params;
  const sp = await searchParams;
  const { user, data } = await load(slug);
  if (!data) notFound();
  const canonical = questionPath(data.q);
  const p = await params;
  if (`/q/${p.code}/${p.payer}/${p.slug}` !== canonical) permanentRedirect(canonical);

  const expert = data.answers.filter(({ a }) => a.type === "EXPERT" && !a.hidden);
  const accepted = expert.find(({ a }) => a.id === data.q.acceptedAnswerId);
  const jsonLd = expert.length && !data.q.hidden ? {
    "@context": "https://schema.org",
    "@type": "QAPage",
    mainEntity: {
      "@type": "Question",
      name: data.q.title,
      text: plainText(data.q.body),
      answerCount: expert.length,
      upvoteCount: data.q.voteCount,
      datePublished: data.q.createdAt.toISOString(),
      author: { "@type": "Organization", name: "BillerBench member" },
      ...(accepted ? { acceptedAnswer: answerLd(accepted.a, accepted.author.name, canonical) } : {}),
      suggestedAnswer: expert.filter((x) => x !== accepted).map((x) => answerLd(x.a, x.author.name, canonical)),
    },
  } : null;

  const notice = sp.paid ? "Payment received. Your question is in the urgent queue." : sp.payment === "cancelled" ? "Payment was cancelled. You can finish it any time." : undefined;
  return (
    <>
      {jsonLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />}
      <QuestionView data={data} user={user} notice={notice} />
    </>
  );
}

function answerLd(a: { id: string; body: string; voteCount: number; createdAt: Date }, name: string, path: string) {
  return {
    "@type": "Answer", text: plainText(a.body), upvoteCount: a.voteCount, datePublished: a.createdAt.toISOString(),
    url: `${path}#a-${a.id}`, author: { "@type": "Person", name },
  };
}
