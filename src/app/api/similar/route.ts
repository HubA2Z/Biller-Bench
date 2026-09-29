import { similarQuestions } from "@/lib/queries";
import { parseCodes } from "@/lib/codes";
import { questionPath } from "@/lib/paths";

export async function GET(req: Request) {
  const u = new URL(req.url);
  const title = (u.searchParams.get("title") ?? "").slice(0, 200);
  const codes = parseCodes(u.searchParams.get("codes") ?? "").slice(0, 12);
  const rows = await similarQuestions(title, codes);
  return Response.json(rows.map((q) => ({ title: q.title, href: questionPath(q) })));
}
