import test from "node:test";
import assert from "node:assert/strict";
import { buildTimeline } from "../lib/following";
import { seeds } from "../data/seed";
import type { Card } from "../lib/schema";

const records = seeds as Card[];
const bikeBus = seeds.find((e) => e.slug === "brooks-bike-bus")!;
const happyHour = seeds.find((e) => e.slug === "rosemont-happy-hour")!;
const now = new Date("2026-09-18T12:00:00Z");

test("the timeline merges followed groups' events, RSVPs, and published calendars in date order", () => {
  const items = buildTimeline({
    followedGroupIds: [bikeBus.id, "groups-brooks-pta"],
    records,
    rsvps: [{ entityId: happyHour.id, date: "2026-10-14T17:00", attending: true }],
    feeds: {
      "groups-brooks-pta": [
        { start: "2026-09-25T21:30:00.000Z", end: "2026-09-25T23:30:00.000Z", allDay: false, summary: "Fall Festival", location: "", url: "" },
        { start: "2026-09-21", end: "2026-09-22", allDay: true, summary: "No school", location: "", url: "" },
      ],
      "groups-friday-pizza": [
        { start: "2026-09-19T21:00:00.000Z", end: "", allDay: false, summary: "Should not appear (not followed)", location: "", url: "" },
      ],
    },
    now,
    limit: 6,
  });
  assert.deepEqual(
    items.map((i) => [i.title, i.date, i.external, i.going]),
    [
      // 8 a.m. Eastern on the 18th: that morning's Bike Bus has already left.
      ["No school", "2026-09-21", true, false],
      ["Brooks Bike Bus", "2026-09-25T07:30", false, false],
      ["Fall Festival", "2026-09-25T21:30:00.000Z", true, false],
      ["Brooks Bike Bus", "2026-10-02T07:30", false, false],
      ["Brooks Bike Bus", "2026-10-09T07:30", false, false],
      ["Rosemont Happy Hour", "2026-10-14T17:00", false, true],
    ],
  );
  for (let i = 1; i < items.length; i++) assert.ok(items[i - 1].at <= items[i].at);
  assert.equal(items[0].groupName, "Brooks PTA");
  assert.equal(items[1].groupName, "Brooks Bike Bus");
});

test("an RSVP surfaces an event even when its group is not followed, and is marked going", () => {
  const items = buildTimeline({
    followedGroupIds: [],
    records,
    rsvps: [{ entityId: happyHour.id, date: "2026-10-14T17:00", attending: true }],
    now,
  });
  assert.equal(items.length, 1);
  assert.equal(items[0].title, "Rosemont Happy Hour");
  assert.equal(items[0].going, true);
  assert.equal(items[0].href, "/events/rosemont-happy-hour");
});

test("locked and cancelled events are left out and nothing appears with no follows", () => {
  const locked = records.map((r) => (r.kind === "events" ? { ...r, locked: true } : r));
  assert.deepEqual(buildTimeline({ followedGroupIds: [bikeBus.id], records: locked, now }), []);
  assert.deepEqual(buildTimeline({ followedGroupIds: [], records, now }), []);
});
