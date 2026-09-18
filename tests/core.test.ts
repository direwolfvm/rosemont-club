import test from "node:test";
import assert from "node:assert/strict";
import {
  entitySchema,
  projectEntity,
  canManage,
  canView,
  Member,
  Entity,
} from "../lib/schema";
import { occurrences, ics, googleCalendar } from "../lib/events";
import { insideRosemont } from "../lib/residency";
import { seeds } from "../data/seed";
const member: Member = {
  id: "member",
  email: "private@example.com",
  displayName: "Neighbor",
  bio: "",
  photoURL: "",
  admin: false,
  disabled: false,
  verifiedResident: false,
  createdAt: "",
};
const admin = { ...member, id: "admin", admin: true };
const resident = { ...member, id: "resident", verifiedResident: true };
const group: Entity = {
  ...seeds[0],
  ownerIds: ["owner"],
  visibility: "residents",
  description: "SECRET DESCRIPTION",
  contactEmail: "secret@example.com",
  channels: [
    {
      type: "WhatsApp",
      label: "Private",
      url: "https://secret.example/invite",
      email: "",
      instructions: "Private directions",
      visibility: "residents",
    },
  ],
};
test("visibility access matrix is enforced", () => {
  for (const [v, guest, m, r, a] of [
    ["public", true, true, true, true],
    ["members", false, true, true, true],
    ["residents", false, false, true, true],
  ] as const) {
    assert.equal(canView(v, null), guest);
    assert.equal(canView(v, member), m);
    assert.equal(canView(v, resident), r);
    assert.equal(canView(v, admin), a);
  }
  assert.equal(canView("residents", { ...resident, disabled: true }), false);
  assert.equal(canView("future-audience", member), false);
});
test("restricted records expose only explicit teaser fields", () => {
  const projected = projectEntity(group, null);
  assert.deepEqual(Object.keys(projected!).sort(), [
    "channelTypes",
    "id",
    "kind",
    "locked",
    "name",
    "slug",
    "visibility",
  ]);
  assert.deepEqual(projected!.channelTypes, ["WhatsApp"]);
  for (const secret of [
    "SECRET",
    "secret.example",
    "secret@example",
    "Private directions",
  ])
    assert.ok(!JSON.stringify(projected).includes(secret));
  assert.equal(projectEntity(group, member)?.locked, true);
  assert.equal(
    projectEntity(group, resident)?.description,
    "SECRET DESCRIPTION",
  );
});
test("public groups show a private channel as an indicator only, never its details", () => {
  const teaser = projectEntity({ ...group, visibility: "public" }, null)?.channels;
  assert.deepEqual(teaser, [
    {
      type: "WhatsApp",
      label: "Private",
      visibility: "residents",
      url: "",
      email: "",
      instructions: "",
      locked: true,
    },
  ]);
  for (const secret of ["secret.example", "Private directions"])
    assert.ok(!JSON.stringify(teaser).includes(secret));
  const full = projectEntity({ ...group, visibility: "public" }, resident)?.channels;
  assert.equal(full?.length, 1);
  assert.equal(full?.[0].url, "https://secret.example/invite");
  assert.equal(full?.[0].locked, undefined);
});
test("owners can manage only owned objects; drafts and archives are not public", () => {
  assert.equal(canManage(group, member), false);
  assert.equal(canManage(group, { ...member, id: "owner" }), true);
  assert.equal(canManage(group, admin), true);
  assert.equal(projectEntity({ ...group, status: "archived" }, resident), null);
  assert.equal(
    projectEntity({ ...group, status: "draft" }, admin)?.status,
    "draft",
  );
});
test("happy hour recurs on second Wednesdays only, April through October", () => {
  const e = seeds.find((e) => e.slug === "rosemont-happy-hour")!;
  const dates = occurrences(e, new Date("2026-09-17T12:00:00Z"), 10);
  assert.deepEqual(dates.slice(0, 3), [
    "2026-10-14T17:00",
    "2027-04-14T17:00",
    "2027-05-12T17:00",
  ]);
  for (const d of dates) {
    const n = new Date(d + "Z");
    assert.equal(n.getUTCDay(), 3);
    assert.ok(n.getUTCDate() >= 8 && n.getUTCDate() <= 14);
    assert.ok(n.getUTCMonth() >= 3 && n.getUTCMonth() <= 9);
  }
});
test("recurrence cancellation, end date and exact time boundaries work", () => {
  const e = seeds.find((e) => e.slug === "rosemont-happy-hour")!;
  assert.equal(
    occurrences(
      {
        ...e,
        overrides: [
          { date: "2026-10-14", cancelled: true, location: "", sponsor: "" },
        ],
      },
      new Date("2026-09-17"),
    )[0],
    "2027-04-14T17:00",
  );
  assert.deepEqual(
    occurrences(
      { ...e, recurrence: { ...e.recurrence, until: "2026-10-15" } },
      new Date("2026-11-01"),
    ),
    [],
  );
  assert.equal(
    occurrences(e, new Date("2026-10-14T21:01:00Z"))[0],
    "2027-04-14T17:00",
  );
});
test("weekly and monthly recurrence work without duplicate database records", () => {
  const e = seeds.find((e) => e.slug === "rosemont-happy-hour")!;
  assert.deepEqual(
    occurrences(
      {
        ...e,
        start: "2026-09-18T10:00",
        recurrence: { ...e.recurrence, frequency: "weekly", months: [] },
      },
      new Date("2026-09-17"),
      2,
    ),
    ["2026-09-18T10:00", "2026-09-25T10:00"],
  );
  assert.deepEqual(
    occurrences(
      {
        ...e,
        start: "2026-09-18T10:00",
        recurrence: { ...e.recurrence, frequency: "monthly", months: [] },
      },
      new Date("2026-09-17"),
      2,
    ),
    ["2026-09-18T10:00", "2026-10-18T10:00"],
  );
});
test("calendar encodes recurrence, Eastern daylight time, escapes and overrides", () => {
  const e = seeds.find((e) => e.slug === "rosemont-happy-hour")!;
  const text = ics([
    {
      ...e,
      description: "line 1\nline 2, with; punctuation",
      overrides: [
        { date: "2026-10-14", cancelled: true, location: "", sponsor: "" },
      ],
    },
  ]);
  assert.match(text, /RRULE:FREQ=MONTHLY/);
  assert.match(text, /BYDAY=\+2WE/);
  assert.match(text, /EXDATE;TZID=America\/New_York:20261014T170000/);
  assert.match(text, /line 1\\nline 2\\, with\\; punctuation/);
  assert.match(text, /BEGIN:VTIMEZONE/);
  assert.ok(text.endsWith("\r\n"));
  const google = new URL(googleCalendar(e, "2026-10-14T17:00"));
  assert.equal(
    google.searchParams.get("dates"),
    "20261014T210000Z/20261014T210000Z",
  );
});
test("user boundary includes central Rosemont and rejects distant points", () => {
  assert.equal(insideRosemont(-77.064, 38.813), true);
  assert.equal(insideRosemont(-77.04, 38.805), false);
  assert.equal(insideRosemont(0, 0), false);
});
test("schemas reject unsafe URLs, invalid polls and invalid event dates", () => {
  assert.equal(
    entitySchema.safeParse({ ...seeds[0], website: "javascript:alert(1)" })
      .success,
    false,
  );
  assert.equal(
    entitySchema.safeParse({
      ...seeds[0],
      kind: "polls",
      options: ["Only one"],
    }).success,
    false,
  );
  assert.equal(
    entitySchema.safeParse({
      ...seeds[0],
      kind: "polls",
      options: ["Same", "Same"],
    }).success,
    false,
  );
  assert.equal(
    entitySchema.safeParse({ ...seeds[0], kind: "events", start: "garbage" })
      .success,
    false,
  );
  assert.equal(
    entitySchema.safeParse({ ...seeds[0], name: "<script>alert(1)</script>" })
      .success,
    true,
  );
});

test("geocoder results contain only verification flags, never address or coordinates", async () => {
  const { verifyAddress } = await import("../lib/residency");
  const original = globalThis.fetch;
  try {
    globalThis.fetch = async () =>
      new Response(
        JSON.stringify({
          result: {
            addressMatches: [
              {
                matchedAddress: "PRIVATE SUBMITTED ADDRESS",
                coordinates: { x: -77.064, y: 38.813 },
                addressComponents: { city: "ALEXANDRIA", state: "VA" },
              },
            ],
          },
        }),
      );
    assert.deepEqual(await verifyAddress("PRIVATE SUBMITTED ADDRESS"), {
      verifiedResident: true,
      matched: true,
    });
    globalThis.fetch = async () =>
      new Response(JSON.stringify({ result: { addressMatches: [] } }));
    assert.deepEqual(await verifyAddress("UNMATCHED PRIVATE ADDRESS"), {
      verifiedResident: false,
      matched: false,
    });
  } finally {
    globalThis.fetch = original;
  }
});
