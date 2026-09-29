import Link from "next/link";
import type { User } from "@/db/schema";
import type { getQuestion } from "@/lib/queries";
import { isStaff } from "@/lib/auth";
import { renderMarkdown } from "@/lib/markdown";
import { questionPath } from "@/lib/paths";
import { URGENT, dollars } from "@/lib/plans";
import { timeAgo } from "@/lib/sla";
import { acceptAnswer, reportPhi, resumePayment, toggleVote, upgradeQuestion } from "@/app/actions/questions";
import { AnswerForm } from "./AnswerForm";
import { SubmitButton } from "./SubmitButton";
import { Badge, Icon, QuestionChips, TierChips, slaText } from "./ui";

type Data = NonNullable<Awaited<ReturnType<typeof getQuestion>>>;

export function QuestionView({ data, user, notice }: { data: Data; user: User | null; notice?: string }) {
  const { q, author, answers, voted } = data;
  const path = questionPath(q);
  const staff = isStaff(user);
  const isAuthor = user?.id === q.authorId;
  const s = slaText(q);
  const visible = answers.filter(({ a }) => !a.hidden || staff);
  const sorted = [...visible].sort((x, y) =>
    Number(q.acceptedAnswerId === y.a.id) - Number(q.acceptedAnswerId === x.a.id) ||
    Number(y.a.type === "EXPERT") - Number(x.a.type === "EXPERT") ||
    x.a.createdAt.getTime() - y.a.createdAt.getTime());
  const expert = visible.filter(({ a }) => a.type === "EXPERT");
  const followups = visible.length - expert.length;

  return (
    <article>
      <Link className="back" href="/">← All questions</Link>
      {notice && <div className="phi ok" style={{ marginBottom: 12 }}>{notice}</div>}
      {q.hidden && <div className="hiddenpost">This question is hidden while our team checks a PHI report{staff ? ". Resolve it in the team queue." : "."}</div>}
      <div className="qhead">
        <h1>{q.title}</h1>
        <div className="chips"><TierChips q={q} authorPlan={author.plan} /><QuestionChips q={q} /></div>
        <div className="banner">
          {q.isPrivate
            ? <><span style={{ display: "flex", gap: 6, alignItems: "center" }}><Icon name="lock" /><strong>Private</strong></span><span className="muted">Seen only by {isAuthor ? "you" : author.practiceName ?? author.name} and the BillerBench team. It isn’t published.</span></>
            : <span><strong>Public</strong></span>}
          <span className={`sla ${s.cls}`}>{s.text}</span>
          {isAuthor && q.tier === "FREE" && q.status === "OPEN" && (
            <form action={upgradeQuestion}><input type="hidden" name="questionId" value={q.id} /><SubmitButton className="btn sm" pendingText="Opening checkout…">Get it answered in 4 hours · {dollars(URGENT.priceCents)}</SubmitButton></form>
          )}
          {isAuthor && q.status === "PENDING_PAYMENT" && (
            <form action={resumePayment}><input type="hidden" name="questionId" value={q.id} /><SubmitButton className="btn sm" pendingText="Opening checkout…">Finish payment to post</SubmitButton></form>
          )}
        </div>
      </div>

      <div className="post">
        <div className="vote">
          <form action={toggleVote}><input type="hidden" name="questionId" value={q.id} /><input type="hidden" name="path" value={path} />
            <button aria-pressed={voted.has(q.id)} aria-label="Mark question helpful" disabled={!user || isAuthor}><Icon name="up" /></button></form>
          <strong>{q.voteCount}</strong>
        </div>
        <div style={{ minWidth: 0 }}>
          <div className="body" dangerouslySetInnerHTML={{ __html: renderMarkdown(q.body) }} />
          <div className="byline">Asked {timeAgo(q.createdAt)} by {author.name}{author.practiceName ? `, ${author.practiceName}` : ""} · {q.state} <Badge user={author} /></div>
          {user && <form action={reportPhi} className="postactions"><input type="hidden" name="questionId" value={q.id} /><input type="hidden" name="path" value={path} /><button className="linkbtn">Report PHI</button></form>}
        </div>
      </div>

      <h2 style={{ marginTop: 22 }}>
        {expert.length ? `${expert.length} expert answer${expert.length === 1 ? "" : "s"}` : "Waiting for an expert answer"}
        {followups > 0 && <span className="muted small" style={{ fontFamily: "var(--f-body)", fontWeight: 400 }}> + {followups} follow-up{followups === 1 ? "" : "s"}</span>}
      </h2>
      {!expert.length && q.status !== "PENDING_PAYMENT" && <p className="muted">Our certified billers pick up questions in order of due time. This one: {s.text.toLowerCase()}.</p>}

      {sorted.map(({ a, author: aa }) => {
        const acc = q.acceptedAnswerId === a.id;
        if (a.hidden && !staff) return <div key={a.id} className="hiddenpost">A reply is hidden while our team checks a PHI report.</div>;
        return (
          <div key={a.id} id={`a-${a.id}`} className={`post ${acc ? "accepted" : ""}`}>
            <div className="vote">
              <form action={toggleVote}><input type="hidden" name="answerId" value={a.id} /><input type="hidden" name="path" value={path} />
                <button aria-pressed={voted.has(a.id)} aria-label="Mark helpful" disabled={!user || a.authorId === user.id}><Icon name="up" /></button></form>
              <strong>{a.voteCount}</strong>
              {isAuthor && a.type === "EXPERT" ? (
                <form action={acceptAnswer}><input type="hidden" name="questionId" value={q.id} /><input type="hidden" name="answerId" value={a.id} /><input type="hidden" name="path" value={path} />
                  <button className="acc" aria-pressed={acc} aria-label={acc ? "Unmark solution" : "Mark as the solution"} title={acc ? "Unmark solution" : "Mark as the solution"}><Icon name="check" /></button></form>
              ) : acc ? <span className="accmark" title="Solution"><Icon name="check" /></span> : null}
            </div>
            <div style={{ minWidth: 0 }}>
              <div className={`atype ${a.type === "EXPERT" ? "full" : "quick"}`}>{a.type === "EXPERT" ? "Expert answer" : "Follow-up"}{acc ? " · Marked as solution" : ""}{a.hidden ? " · Hidden (reported)" : ""}</div>
              <div className="body" style={{ marginTop: 6 }} dangerouslySetInnerHTML={{ __html: renderMarkdown(a.body) }} />
              <div className="byline">{aa.name}{aa.credentials ? <span className="muted">, {aa.credentials}</span> : null} <Badge user={aa} /> <span>· {timeAgo(a.createdAt)}</span></div>
              {user && <form action={reportPhi} className="postactions"><input type="hidden" name="answerId" value={a.id} /><input type="hidden" name="path" value={path} /><button className="linkbtn">Report PHI</button></form>}
            </div>
          </div>
        );
      })}

      {!staff && expert.length > 0 && (
        <div className="offer">
          <div><span className="eyebrow">Done for you</span><h3>Have us fix this claim</h3><p>We’ll write the appeal or send a corrected claim for you. Appeals from $49, corrected claims $15.</p>
            <Link className="btn sm" href={`/pricing?service=appeal&question=${q.id}#request`}>Fix my claim</Link></div>
          <div><span className="eyebrow">Seeing this often?</span><h3>Get a denial audit</h3><p>We review your last 90 days of denials and send a fix list. $199, credited to your first month if you move billing to us.</p>
            <Link className="btn sm ghost" href={`/pricing?service=audit&question=${q.id}#request`}>Request an audit</Link></div>
        </div>
      )}

      {!user && (
        <div className="card" style={{ marginTop: 24 }}><h3>Have a similar denial?</h3>
          <p className="muted small">Create a free account to ask our team. <Link className="clear" href="/signup">Join free</Link></p></div>
      )}
      {(staff || isAuthor) && q.status !== "PENDING_PAYMENT" && <AnswerForm questionId={q.id} path={path} staff={staff} />}
    </article>
  );
}
