import { DateTime } from "luxon";
import type { Card, Entity } from "./schema";
import type { FeedEvent } from "./external-calendar";
import { occurrences } from "./events";

/** One upcoming thing from a group the member follows or an event they RSVP'd to. */
export type TimelineItem = {
  /** Epoch milliseconds, for ordering across site events and external feeds. */
  at: number;
  /** Site events: local Eastern "YYYY-MM-DDTHH:mm". External: ISO UTC or "YYYY-MM-DD" for all-day. */
  date: string;
  allDay: boolean;
  title: string;
  href: string;
  external: boolean;
  location: string;
  groupId: string;
  groupName: string;
  going: boolean;
  eventId?: string;
};

export type Rsvp = { entityId: string; date: string; attending: boolean };

export function buildTimeline({
  followedGroupIds,
  records,
  rsvps = [],
  feeds = {},
  now = new Date(),
  limit = 12,
  horizonDays = 60,
}: {
  followedGroupIds: string[];
  records: Card[];
  rsvps?: Rsvp[];
  feeds?: Record<string, FeedEvent[]>;
  now?: Date;
  limit?: number;
  horizonDays?: number;
}): TimelineItem[] {
  const followed = new Set(followedGroupIds);
  const going = new Set(
    rsvps.filter((r) => r.attending).map((r) => r.entityId + "@" + r.date),
  );
  const goingEvents = new Set(
    rsvps.filter((r) => r.attending).map((r) => r.entityId),
  );
  const group = (id: string) =>
    records.find((r) => r.kind === "groups" && r.id === id);
  const horizon = now.getTime() + horizonDays * 86400000;
  const items: TimelineItem[] = [];
  for (const r of records) {
    if (r.kind !== "events" || r.locked || r.status !== "active") continue;
    const e = r as Entity;
    if (!followed.has(e.groupId) && !goingEvents.has(e.id)) continue;
    const g = group(e.groupId);
    for (const date of occurrences(e, now, 6)) {
      const at = DateTime.fromISO(date, { zone: e.timezone }).toMillis();
      if (at > horizon && !going.has(e.id + "@" + date)) continue;
      items.push({
        at,
        date,
        allDay: false,
        title: e.name,
        href: "/events/" + e.slug,
        external: false,
        location: e.location,
        groupId: e.groupId,
        groupName: g?.name || "",
        going: going.has(e.id + "@" + date),
        eventId: e.id,
      });
    }
  }
  for (const [groupId, events] of Object.entries(feeds)) {
    if (!followed.has(groupId)) continue;
    const g = group(groupId);
    for (const f of events) {
      const at = f.allDay
        ? Date.parse(f.start + "T12:00:00Z")
        : Date.parse(f.start);
      if (!Number.isFinite(at) || at < now.getTime() - 86400000 || at > horizon)
        continue;
      items.push({
        at,
        date: f.start,
        allDay: f.allDay,
        title: f.summary,
        href: f.url || (g ? "/groups/" + g.slug : "/groups"),
        external: true,
        location: f.location,
        groupId,
        groupName: g?.name || "",
        going: false,
      });
    }
  }
  return items.sort((a, b) => a.at - b.at).slice(0, limit);
}
