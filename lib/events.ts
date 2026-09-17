import { RRule } from "rrule";
import { DateTime } from "luxon";
import type { Entity } from "./schema";
export function rule(e: Entity) {
  const r = e.recurrence;
  if (r.frequency === "none") return null;
  const start = new Date(e.start + "Z");
  return new RRule({
    dtstart: start,
    freq: r.frequency === "weekly" ? RRule.WEEKLY : RRule.MONTHLY,
    interval: r.interval,
    ...(r.frequency === "nth-weekday"
      ? {
          byweekday: [
            RRule.MO,
            RRule.TU,
            RRule.WE,
            RRule.TH,
            RRule.FR,
            RRule.SA,
            RRule.SU,
          ][r.weekday].nth(r.nth),
        }
      : {}),
    ...(r.months.length ? { bymonth: r.months } : {}),
    ...(r.until ? { until: new Date(r.until + "T23:59:59Z") } : {}),
  });
}
export function occurrences(e: Entity, from = new Date(), count = 4) {
  if (e.status !== "active" || !e.start) return [];
  const r = rule(e);
  const localNow = DateTime.fromJSDate(from, { zone: e.timezone }).toFormat(
    "yyyy-MM-dd'T'HH:mm:ss",
  );
  const dates = r
    ? r.between(
        new Date(localNow + "Z"),
        new Date(new Date(localNow + "Z").getTime() + 730 * 86400000),
        true,
      )
    : [new Date(e.start + "Z")];
  return dates
    .map((d) => d.toISOString().slice(0, 16))
    .filter(
      (s) =>
        DateTime.fromISO(s, { zone: e.timezone }).toMillis() >= from.getTime(),
    )
    .filter(
      (s) => !e.overrides.find((o) => o.date === s.slice(0, 10))?.cancelled,
    )
    .slice(0, count);
}
const escape = (s: string) =>
  s
    .replace(/\\/g, "\\\\")
    .replace(/\r?\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
const stamp = (s: string) => s.replace(/[-:]/g, "") + "00";
const utc = (s: string) =>
  DateTime.fromISO(s, { zone: "America/New_York" })
    .toUTC()
    .toFormat("yyyyMMdd'T'HHmmss'Z'");
export function ics(events: Entity[]) {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//The Rosemont Club//Neighborhood Calendar//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:The Rosemont Club",
    "BEGIN:VTIMEZONE",
    "TZID:America/New_York",
    "BEGIN:DAYLIGHT",
    "DTSTART:20070311T020000",
    "RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=2SU",
    "TZOFFSETFROM:-0500",
    "TZOFFSETTO:-0400",
    "TZNAME:EDT",
    "END:DAYLIGHT",
    "BEGIN:STANDARD",
    "DTSTART:20071104T020000",
    "RRULE:FREQ=YEARLY;BYMONTH=11;BYDAY=1SU",
    "TZOFFSETFROM:-0400",
    "TZOFFSETTO:-0500",
    "TZNAME:EST",
    "END:STANDARD",
    "END:VTIMEZONE",
  ];
  for (const e of events) {
    const rr = rule(e);
    const duration = e.end
      ? DateTime.fromISO(e.end).toMillis() -
        DateTime.fromISO(e.start).toMillis()
      : 0;
    const base = [
      "BEGIN:VEVENT",
      `UID:${e.id}@rosemont.club`,
      `DTSTAMP:${new Date(e.updatedAt)
        .toISOString()
        .replace(/[-:]/g, "")
        .replace(/\.\d{3}/, "")}`,
      `DTSTART;TZID=America/New_York:${stamp(e.start)}`,
      ...(e.end ? [`DTEND;TZID=America/New_York:${stamp(e.end)}`] : []),
      `SUMMARY:${escape(e.name)}`,
      `DESCRIPTION:${escape(e.description)}`,
      `LOCATION:${escape([e.location, e.streetAddress].filter(Boolean).join(", "))}`,
    ];
    if (rr) {
      let line = rr
        .toString()
        .split("\n")
        .find((s) => s.startsWith("RRULE:"))!;
      if (e.recurrence.until)
        line = line.replace(
          /UNTIL=[^;]+/,
          `UNTIL=${utc(e.recurrence.until + "T23:59")}`,
        );
      base.push(line);
    }
    for (const o of e.overrides.filter((o) => o.cancelled))
      base.push(
        `EXDATE;TZID=America/New_York:${stamp(o.date + "T" + e.start.slice(11))}`,
      );
    base.push(
      `STATUS:${e.status === "cancelled" ? "CANCELLED" : "CONFIRMED"}`,
      "END:VEVENT",
    );
    lines.push(...base);
    for (const o of e.overrides.filter((o) => !o.cancelled)) {
      const s = o.date + "T" + e.start.slice(11);
      lines.push(
        "BEGIN:VEVENT",
        `UID:${e.id}@rosemont.club`,
        `DTSTAMP:${new Date(e.updatedAt)
          .toISOString()
          .replace(/[-:]/g, "")
          .replace(/\.\d{3}/, "")}`,
        `RECURRENCE-ID;TZID=America/New_York:${stamp(s)}`,
        `DTSTART;TZID=America/New_York:${stamp(s)}`,
        ...(duration
          ? [
              `DTEND;TZID=America/New_York:${stamp(DateTime.fromISO(s).plus({ milliseconds: duration }).toFormat("yyyy-MM-dd'T'HH:mm"))}`,
            ]
          : []),
        `SUMMARY:${escape(e.name)}`,
        `LOCATION:${escape(o.location || e.location)}`,
        `DESCRIPTION:${escape(e.description + (o.sponsor ? "\nSponsor: " + o.sponsor : ""))}`,
        "END:VEVENT",
      );
    }
  }
  lines.push("END:VCALENDAR");
  return (
    lines
      .map((line) => {
        let out = "",
          n = 0;
        for (const ch of line) {
          const len = Buffer.byteLength(ch);
          if (n + len > 74) {
            out += "\r\n ";
            n = 1;
          }
          out += ch;
          n += len;
        }
        return out;
      })
      .join("\r\n") + "\r\n"
  );
}
export function googleCalendar(e: Entity, start: string) {
  const override = e.overrides.find((o) => o.date === start.slice(0, 10));
  const duration = e.end
    ? DateTime.fromISO(e.end).toMillis() - DateTime.fromISO(e.start).toMillis()
    : 0;
  const end = DateTime.fromISO(start)
    .plus({ milliseconds: duration })
    .toFormat("yyyy-MM-dd'T'HH:mm");
  return (
    "https://calendar.google.com/calendar/render?" +
    new URLSearchParams({
      action: "TEMPLATE",
      text: e.name,
      dates: utc(start) + "/" + utc(end),
      ctz: e.timezone,
      details: e.description,
      location: override?.location || e.location,
    }).toString()
  );
}
