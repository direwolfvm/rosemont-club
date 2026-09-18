import ical from "node-ical";
import type { VEvent, CalendarResponse } from "node-ical";

/** One upcoming occurrence from a group's published calendar. */
export type FeedEvent = {
  /** ISO date-time in UTC, or YYYY-MM-DD for all-day events. */
  start: string;
  end: string;
  allDay: boolean;
  summary: string;
  location: string;
  url: string;
};
export type Feed = { name: string; events: FeedEvent[]; fetchedAt: string };

const cache = new Map<string, Feed>();
const TTL = 15 * 60 * 1000;
const MAX_BYTES = 3_000_000;

/** Only public https feeds on real hostnames; nothing local or numeric. */
export function feedAllowed(value: string) {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  if (url.protocol !== "https:") return false;
  const host = url.hostname.toLowerCase();
  if (!host.includes(".") || host.endsWith(".local")) return false;
  if (/^[\d.]+$/.test(host) || host.includes(":")) return false;
  return true;
}

const text = (v: unknown) =>
  typeof v === "string" ? v : ((v as { val?: string })?.val ?? "");

export function upcomingFromCalendar(
  parsed: CalendarResponse,
  from = new Date(),
  days = 120,
  count = 8,
): Omit<Feed, "fetchedAt"> {
  const to = new Date(from.getTime() + days * 86400000);
  const out: FeedEvent[] = [];
  let name = "";
  for (const component of Object.values(parsed)) {
    if (!component) continue;
    if (component.type === "VCALENDAR") {
      name = text((component as Record<string, unknown>)["WR-CALNAME"]).trim();
      continue;
    }
    if (component.type !== "VEVENT") continue;
    const event = component as VEvent;
    if (event.recurrenceid) continue; // handled through the base event's overrides
    if (event.status === "CANCELLED") continue;
    const base = {
      summary: text(event.summary).trim() || "Untitled event",
      location: text(event.location).trim(),
      url: typeof event.url === "string" && /^https:/.test(event.url) ? event.url : "",
    };
    if (event.rrule) {
      for (const instance of ical.expandRecurringEvent(event, { from, to })) {
        if (instance.event.status === "CANCELLED") continue;
        out.push({
          ...base,
          summary: text(instance.summary).trim() || base.summary,
          location: text(instance.event.location).trim() || base.location,
          allDay: instance.isFullDay,
          start: stamp(instance.start, instance.isFullDay),
          end: stamp(instance.end, instance.isFullDay),
        });
      }
      continue;
    }
    const allDay = event.datetype === "date";
    const start = event.start;
    const end = event.end || event.start;
    if (!start || end < from || start > to) continue;
    out.push({ ...base, allDay, start: stamp(start, allDay), end: stamp(end, allDay) });
  }
  out.sort((a, b) => a.start.localeCompare(b.start));
  return { name, events: out.slice(0, count) };
}

function stamp(d: Date, allDay: boolean) {
  return allDay ? d.toISOString().slice(0, 10) : d.toISOString();
}

export async function fetchFeed(url: string): Promise<Feed> {
  if (!feedAllowed(url)) throw new Error("Calendar address is not allowed.");
  const hit = cache.get(url);
  if (hit && Date.now() - Date.parse(hit.fetchedAt) < TTL) return hit;
  const response = await fetch(url, {
    headers: { accept: "text/calendar, text/plain;q=0.5" },
    signal: AbortSignal.timeout(10000),
    cache: "no-store",
    redirect: "follow",
  });
  if (!response.ok || !feedAllowed(response.url || url))
    throw new Error("Calendar could not be loaded.");
  const length = Number(response.headers.get("content-length") || 0);
  if (length > MAX_BYTES) throw new Error("Calendar is too large.");
  const body = await response.text();
  if (body.length > MAX_BYTES) throw new Error("Calendar is too large.");
  const feed = {
    ...upcomingFromCalendar(ical.sync.parseICS(body)),
    fetchedAt: new Date().toISOString(),
  };
  if (cache.size > 200) cache.clear();
  cache.set(url, feed);
  return feed;
}
