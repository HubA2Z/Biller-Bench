/**
 * Business-hours deadlines: Monday–Friday, 9am–5pm US Eastern.
 * US federal holidays are not skipped yet.
 */
const TZ = "America/New_York";
const OPEN_HOUR = 9;
const CLOSE_HOUR = 17;
const STEP_MIN = 5;

const fmt = new Intl.DateTimeFormat("en-US", { timeZone: TZ, weekday: "short", hour: "numeric", hourCycle: "h23" });

function isBusinessMinute(d: Date) {
  const parts = fmt.formatToParts(d);
  const wd = parts.find((p) => p.type === "weekday")!.value;
  const hr = Number(parts.find((p) => p.type === "hour")!.value);
  return wd !== "Sat" && wd !== "Sun" && hr >= OPEN_HOUR && hr < CLOSE_HOUR;
}

export function addBusinessHours(start: Date, hours: number): Date {
  let remaining = hours * 60;
  const t = new Date(start.getTime());
  // Walk forward in 5-minute steps, counting only minutes inside business hours.
  while (remaining > 0) {
    if (isBusinessMinute(t)) remaining -= STEP_MIN;
    t.setTime(t.getTime() + STEP_MIN * 60_000);
  }
  return t;
}

export function formatDuration(ms: number) {
  const m = Math.max(0, Math.round(ms / 60_000));
  if (m < 60) return `${m}m`;
  if (m < 1440) { const h = Math.floor(m / 60), r = m % 60; return `${h}h${r ? ` ${r}m` : ""}`; }
  const d = Math.floor(m / 1440), h = Math.round((m % 1440) / 60);
  return `${d}d${h ? ` ${h}h` : ""}`;
}

export function timeAgo(date: Date, now = new Date()) {
  const m = Math.round((now.getTime() - date.getTime()) / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  if (m < 1440) return `${Math.round(m / 60)} h ago`;
  const d = Math.round(m / 1440);
  return d === 1 ? "1 day ago" : d < 60 ? `${d} days ago` : date.toLocaleDateString("en-US");
}
