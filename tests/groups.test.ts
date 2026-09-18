import test from "node:test";
import assert from "node:assert/strict";
import ical from "node-ical";
import {
  entitySchema,
  projectEntity,
  canViewEntity,
  Entity,
  Member,
} from "../lib/schema";
import {
  normalizeStreet,
  matchesEligibility,
  eligibleGroupIds,
  AddressMatch,
} from "../lib/residency";
import { upcomingFromCalendar, feedAllowed } from "../lib/external-calendar";
import { occurrences } from "../lib/events";
import { seeds } from "../data/seed";

const resident: Member = {
  id: "resident",
  email: "resident@example.com",
  displayName: "Neighbor",
  bio: "",
  photoURL: "",
  admin: false,
  disabled: false,
  verifiedResident: true,
  createdAt: "",
};
const block = seeds.find((e) => e.slug === "w-oak-street") as Entity;
const onWOak: AddressMatch = {
  lon: -77.0655,
  lat: 38.8132,
  local: true,
  street: "W OAK ST",
  line1: "12 W OAK ST",
};

test("street normalization matches owner input to the geocoder's form", () => {
  assert.equal(normalizeStreet("West Oak Street"), "W OAK ST");
  assert.equal(normalizeStreet("w. oak st."), "W OAK ST");
  assert.equal(normalizeStreet("Commonwealth Avenue"), "COMMONWEALTH AVE");
  assert.equal(normalizeStreet("E Walnut St"), "E WALNUT ST");
});

test("custom eligibility matches by street, address, or drawn area, and never by default", () => {
  assert.equal(matchesEligibility(onWOak, block.eligibility), true);
  assert.equal(
    matchesEligibility({ ...onWOak, street: "E OAK ST", line1: "12 E OAK ST" }, block.eligibility),
    false,
  );
  assert.equal(
    matchesEligibility(
      { ...onWOak, street: "E OAK ST", line1: "12 E OAK ST" },
      { ...block.eligibility, streets: [], addresses: ["12 East Oak Street"] },
    ),
    true,
  );
  const square = {
    mode: "custom" as const,
    streets: [],
    addresses: [],
    note: "",
    polygon: [
      [-77.07, 38.81],
      [-77.06, 38.81],
      [-77.06, 38.82],
      [-77.07, 38.82],
    ] as [number, number][],
  };
  assert.equal(matchesEligibility(onWOak, square), true);
  assert.equal(matchesEligibility({ ...onWOak, lon: -77.05 }, square), false);
  assert.equal(matchesEligibility(onWOak, { ...square, mode: "club" }), false);
  assert.deepEqual(eligibleGroupIds(onWOak, [block, seeds[0]]), [block.id]);
  assert.deepEqual(eligibleGroupIds(null, [block]), []);
});

test("a custom-eligibility group is hidden from other residents but visible to matching or approved members", () => {
  assert.equal(canViewEntity(block, resident), false);
  assert.equal(canViewEntity(block, { ...resident, eligibleGroupIds: [block.id] }), true);
  assert.equal(canViewEntity(block, { ...resident, approvedGroupIds: [block.id] }), true);
  assert.equal(canViewEntity(block, { ...resident, admin: true }), true);
  const teaser = projectEntity(block, resident)!;
  assert.equal(teaser.locked, true);
  assert.equal(teaser.eligibilityNote, "Households on West Oak Street");
  assert.ok(!("channels" in teaser));
});

test("viewers never receive whitelisted streets or addresses, and relayed contact emails stay hidden", () => {
  const withSecrets: Entity = {
    ...block,
    contactEmail: "organizer@example.com",
    eligibility: { ...block.eligibility, addresses: ["12 W Oak St"] },
  };
  const view = projectEntity(withSecrets, { ...resident, eligibleGroupIds: [block.id] })!;
  assert.deepEqual(view.eligibility?.streets, []);
  assert.deepEqual(view.eligibility?.addresses, []);
  assert.equal(view.eligibility?.mode, "custom");
  assert.equal(view.contactEmail, "");
  assert.equal(view.contactRelay, true);
  const owner = projectEntity(withSecrets, { ...resident, id: withSecrets.ownerIds[0] || "x", admin: true })!;
  assert.deepEqual(owner.eligibility?.addresses, ["12 W Oak St"]);
  assert.equal(owner.contactEmail, "organizer@example.com");
});

test("custom eligibility requires residents-only visibility and at least one criterion", () => {
  const base = { ...block, id: undefined, createdAt: undefined, updatedAt: undefined };
  assert.equal(entitySchema.safeParse({ ...base, visibility: "members" }).success, false);
  assert.equal(
    entitySchema.safeParse({ ...base, eligibility: { mode: "custom", streets: [], addresses: [], polygon: [], note: "" } }).success,
    false,
  );
  assert.equal(
    entitySchema.safeParse({ ...base, eligibility: { ...base.eligibility, polygon: [[-77.06, 38.81], [-77.07, 38.81]] } }).success,
    false,
  );
  assert.equal(entitySchema.safeParse({ ...base, kind: "resources", visibility: "residents" }).success, false);
  assert.equal(entitySchema.safeParse(base).success, true);
});

test("published calendars expand recurrences, keep all-day dates, and drop cancellations", () => {
  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:test",
    "X-WR-CALNAME:Test PTA",
    "BEGIN:VEVENT",
    "UID:weekly@test",
    "DTSTAMP:20260901T000000Z",
    "DTSTART;TZID=America/New_York:20260904T073000",
    "DTEND;TZID=America/New_York:20260904T080000",
    "RRULE:FREQ=WEEKLY;COUNT=4",
    "EXDATE;TZID=America/New_York:20260918T073000",
    "SUMMARY:Bike Bus",
    "LOCATION:Brooks",
    "END:VEVENT",
    "BEGIN:VEVENT",
    "UID:allday@test",
    "DTSTAMP:20260901T000000Z",
    "DTSTART;VALUE=DATE:20260921",
    "DTEND;VALUE=DATE:20260922",
    "SUMMARY:No school",
    "END:VEVENT",
    "BEGIN:VEVENT",
    "UID:cancelled@test",
    "DTSTAMP:20260901T000000Z",
    "DTSTART:20260922T120000Z",
    "SUMMARY:Cancelled thing",
    "STATUS:CANCELLED",
    "END:VEVENT",
    "BEGIN:VEVENT",
    "UID:past@test",
    "DTSTAMP:20260901T000000Z",
    "DTSTART:20260801T120000Z",
    "SUMMARY:Already happened",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
  const feed = upcomingFromCalendar(ical.sync.parseICS(ics), new Date("2026-09-10T00:00:00Z"));
  assert.equal(feed.name, "Test PTA");
  assert.deepEqual(
    feed.events.map((e) => [e.summary, e.start, e.allDay]),
    [
      ["Bike Bus", "2026-09-11T11:30:00.000Z", false],
      ["No school", "2026-09-21", true],
      ["Bike Bus", "2026-09-25T11:30:00.000Z", false],
    ],
  );
  assert.equal(feed.events[0].location, "Brooks");
});

test("calendar feeds must be public https addresses on real hosts", () => {
  assert.equal(feedAllowed("https://calendar.google.com/calendar/ical/x/public/basic.ics"), true);
  assert.equal(feedAllowed("http://calendar.google.com/basic.ics"), false);
  assert.equal(feedAllowed("https://localhost/basic.ics"), false);
  assert.equal(feedAllowed("https://169.254.169.254/latest"), false);
  assert.equal(feedAllowed("https://metadata.local/x"), false);
  assert.equal(feedAllowed("not a url"), false);
});

test("bike bus recurs on Fridays during the school year; pizza on Fridays spring through fall", () => {
  const bike = seeds.find((e) => e.slug === "brooks-bike-bus-friday")!;
  const bikeDates = occurrences(bike, new Date("2026-06-20T12:00:00Z"), 6);
  assert.deepEqual(bikeDates.slice(0, 3), ["2026-09-04T07:30", "2026-09-11T07:30", "2026-09-18T07:30"]);
  for (const d of bikeDates) assert.equal(new Date(d + "Z").getUTCDay(), 5);
  // Summer break: nothing in July or August, then back in September.
  assert.deepEqual(occurrences(bike, new Date("2027-06-20T12:00:00Z"), 2), ["2027-06-25T07:30", "2027-09-03T07:30"]);
  const pizza = seeds.find((e) => e.slug === "friday-pizza-night")!;
  const pizzaDates = occurrences(pizza, new Date("2026-10-25T12:00:00Z"), 3);
  assert.deepEqual(pizzaDates, ["2026-10-30T17:30", "2027-04-02T17:30", "2027-04-09T17:30"]);
  assert.equal(pizza.visibility, "residents");
  assert.equal(seeds.find((e) => e.slug === "friday-pizza")!.visibility, "residents");
});

test("seeded poll and groups validate and carry the expected access settings", () => {
  const poll = seeds.find((e) => e.kind === "polls")!;
  assert.equal(poll.options.length, 3);
  assert.equal(poll.visibility, "residents");
  const pta = seeds.find((e) => e.slug === "brooks-pta")!;
  assert.ok(pta.calendarUrl.endsWith("/public/basic.ics"));
  const bikeBus = seeds.find((e) => e.slug === "brooks-bike-bus")!;
  assert.deepEqual(bikeBus.channels.map((c) => c.type), ["Instagram", "WhatsApp"]);
  assert.ok(seeds.filter((e) => e.kind === "resources").length >= 30);
  assert.equal(new Set(seeds.map((e) => e.id)).size, seeds.length);
});
