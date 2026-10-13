import "server-only";
import { escapeHtml } from "./markdown";
import { appUrl } from "./site";

export type Email = { to: string | string[]; subject: string; text: string; html?: string };

const from = () => process.env.EMAIL_FROM || "BillerBench <notifications@example.com>";

/**
 * SMTP (for example Gmail with an app password). Set SMTP_USER and SMTP_PASS;
 * SMTP_HOST defaults to smtp.gmail.com and SMTP_PORT to 465.
 */
const smtpConfigured = () => Boolean(process.env.SMTP_USER?.trim() && process.env.SMTP_PASS?.trim());
let transport: import("nodemailer").Transporter | null = null;

async function sendSmtp(to: string[], msg: Email) {
  const nodemailer = await import("nodemailer");
  const port = Number(process.env.SMTP_PORT || 465);
  const user = process.env.SMTP_USER!.trim();
  transport ??= nodemailer.createTransport({
    host: process.env.SMTP_HOST?.trim() || "smtp.gmail.com", port, secure: port === 465,
    // Gmail shows app passwords in groups of four; spaces don't belong in the password.
    auth: { user, pass: process.env.SMTP_PASS!.replace(/\s+/g, "") },
    connectionTimeout: 10_000, greetingTimeout: 10_000, socketTimeout: 15_000,
  });
  // Gmail only sends from the signed-in address, so the display name is all we change.
  await transport.sendMail({
    from: { name: process.env.SMTP_FROM_NAME?.trim() || "BillerBench", address: user },
    to, subject: msg.subject, text: msg.text, html: msg.html ?? layout(msg.subject, msg.text),
  });
}

/**
 * Sends through Resend when RESEND_API_KEY is set, through SMTP (Gmail) when
 * SMTP_USER and SMTP_PASS are set (also used if Resend fails), and otherwise
 * prints the email to the server log so the flow can be tested locally.
 * Never put PHI in an email: titles of private questions stay out.
 */
export async function sendEmail(msg: Email): Promise<void> {
  const to = Array.isArray(msg.to) ? msg.to : [msg.to];
  if (!to.length) return;
  const key = process.env.RESEND_API_KEY;
  if (key) {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: from(), to, subject: msg.subject, text: msg.text, html: msg.html ?? layout(msg.subject, msg.text) }),
      signal: AbortSignal.timeout(10_000),
    }).catch((e) => { console.error("[email] Resend request failed", e); return null; });
    if (res?.ok) return;
    if (res) console.error(`[email] Resend returned ${res.status}: ${await res.text()}`);
    if (!smtpConfigured()) return;
    console.log("[email] falling back to SMTP");
  }
  if (smtpConfigured()) {
    await sendSmtp(to, msg);
    console.log(`[email] sent via SMTP subject="${msg.subject}"`);
    return;
  }
  console.log(`\n[email] to=${to.join(",")} subject="${msg.subject}"\n${msg.text}\n[/email]`);
}

/** Same as sendEmail, but never throws; use for notifications that must not break the request. */
export async function sendEmailSafe(msg: Email) {
  try { await sendEmail(msg); } catch (e) { console.error("[email] send failed", e); }
}

/** Minimal HTML version: paragraphs from the text, links made clickable. */
export function layout(title: string, text: string) {
  const body = text.split(/\n{2,}/).map((p) =>
    `<p style="margin:0 0 14px">${escapeHtml(p).replace(/\n/g, "<br>").replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" style="color:#B42336">$1</a>')}</p>`).join("");
  return `<!doctype html><html><body style="margin:0;background:#F6F4F3;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#1C1A21">
<div style="max-width:560px;margin:0 auto;padding:28px 20px">
<div style="font-weight:700;font-size:20px;margin-bottom:18px"><img src="${appUrl()}/icon-96.png" width="28" height="28" alt="" style="vertical-align:middle;border-radius:6px;margin-right:8px">Biller<span style="color:#B42336">Bench</span></div>
<div style="background:#fff;border:1px solid #E2DDDA;border-radius:8px;padding:22px;font-size:15px;line-height:1.55">
<h1 style="font-size:18px;margin:0 0 14px">${escapeHtml(title)}</h1>${body}</div>
<p style="font-size:12px;color:#8A838C;margin-top:16px">You get this email because you have a BillerBench account. Turn off notifications on your account page.</p>
</div></body></html>`;
}
