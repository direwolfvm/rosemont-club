/** Live integration checks. Creates and deletes only rosemont-test-* fixtures. Never prints tokens. */
import assert from "node:assert/strict";
import { initializeApp, applicationDefault } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { db } from "../lib/firebase";
import { seeds } from "../data/seed";
const base = process.env.SMOKE_ORIGIN || "http://localhost:3107";
const app = initializeApp(
  {
    credential: applicationDefault(),
    projectId: "permitting-ai-helper",
    serviceAccountId:
      "rosemont-runtime@permitting-ai-helper.iam.gserviceaccount.com",
  },
  "smoke",
);
const auth = getAuth(app).tenantManager().authForTenant("alex311-qfnem");
const prefix = "rosemont-test-" + Date.now();
const users: string[] = [],
  entities: string[] = [];
let checks = 0;
async function check(
  path: string,
  token: string | undefined,
  method = "GET",
  body?: unknown,
  status = 200,
) {
  const r = await fetch(base + "/api/" + path, {
    method,
    headers: {
      Origin: base,
      ...(token ? { Authorization: "Bearer " + token } : {}),
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const d = await r.json();
  assert.equal(r.status, status, `${method} ${path}: ${JSON.stringify(d)}`);
  checks++;
  return d;
}
async function login(role: string) {
  const uid = prefix + "-" + role;
  users.push(uid);
  const password = "Test-only-" + crypto.randomUUID();
  await auth.createUser({
    uid,
    email: uid + "@example.invalid",
    displayName: "Temporary test " + role,
    password,
  });
  await db
    .collection("users")
    .doc(uid)
    .set({
      id: uid,
      email: uid + "@example.invalid",
      displayName: "Temporary test " + role,
      bio: "",
      photoURL: "",
      admin: role === "admin",
      disabled: false,
      verifiedResident: role === "resident",
      createdAt: new Date().toISOString(),
    });
  const r = await fetch(
    "https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=" +
      process.env.FIREBASE_API_KEY,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: uid + "@example.invalid",
        password,
        returnSecureToken: true,
        tenantId: "alex311-qfnem",
      }),
    },
  );
  const j = await r.json();
  assert.ok(j.idToken, "Could not obtain test identity token");
  return { uid, token: j.idToken as string };
}
async function main() {
  try {
    const admin = await login("admin"),
      member = await login("member"),
      resident = await login("resident"),
      owner = await login("owner");
    await check("me", undefined, "GET", undefined, 401);
    await check("admin/users", member.token, "GET", undefined, 403);
    await check("me", "invalid", "GET", undefined, 401);
    const g = {
      ...seeds[0],
      slug: prefix + "-group",
      name: "Temporary restricted test",
      visibility: "residents",
      description: "PRIVATE-FIXTURE-DESCRIPTION",
      ownerIds: [owner.uid],
      channels: [
        {
          type: "WhatsApp",
          label: "Private",
          url: "https://example.invalid/private-fixture",
          email: "",
          instructions: "secret-instructions",
          visibility: "residents",
        },
      ],
    };
    const created = await check("entities", admin.token, "POST", g, 201);
    entities.push(created.id);
    const guest = await check("entities/" + created.id, undefined);
    assert.equal(guest.locked, true);
    assert.ok(!JSON.stringify(guest).includes("PRIVATE-FIXTURE"));
    assert.ok(!JSON.stringify(guest).includes("private-fixture"));
    checks++;
    const listed = await check("entities?kind=groups", undefined);
    assert.ok(!JSON.stringify(listed).includes("PRIVATE-FIXTURE"));
    checks++;
    const visible = await check("entities/" + created.id, resident.token);
    assert.equal(visible.description, g.description);
    checks++;
    await check(
      "entities/" + created.id,
      member.token,
      "PATCH",
      { ...g, summary: "Not my group" },
      403,
    );
    await check("entities/" + created.id, owner.token, "PATCH", {
      ...g,
      summary: "Owner updated",
    });
    await check(
      "entities/" + created.id,
      owner.token,
      "PATCH",
      { ...g, ownerIds: [member.uid] },
      403,
    );
    await check(
      "me",
      member.token,
      "PATCH",
      { displayName: "Escalation", admin: true },
      400,
    );
    const ownerEvent = {
      ...seeds.find((e) => e.kind === "events")!,
      slug: prefix + "-owner-event",
      groupId: created.id,
      ownerIds: [owner.uid],
      visibility: "residents",
    };
    const ownedEvent = await check(
      "entities",
      owner.token,
      "POST",
      ownerEvent,
      201,
    );
    entities.push(ownedEvent.id);
    await check(
      "entities",
      owner.token,
      "POST",
      { ...ownerEvent, slug: prefix + "-bad-audience", visibility: "public" },
      400,
    );
    await check("entities/" + created.id + "/join", resident.token, "POST", {
      join: true,
    });
    const followers = await check(
      "entities/" + created.id + "/members",
      owner.token,
    );
    assert.ok(followers.some((f: any) => f.userId === resident.uid));
    assert.ok(followers.every((f: any) => !("email" in f)));
    checks++;
    await check(
      "entities/" + created.id + "/members",
      member.token,
      "GET",
      undefined,
      403,
    );
    const activity = await check("activity", resident.token);
    assert.ok(activity.groups.some((g: any) => g.entityId === created.id));
    checks++;
    const event = {
      ...seeds.find((e) => e.kind === "events")!,
      slug: prefix + "-event",
      name: "Temporary RSVP test",
      ownerIds: [admin.uid],
      groupId: "",
      visibility: "public",
      capacity: 1,
      start: "2027-06-01T17:00",
      recurrence: {
        frequency: "none",
        interval: 1,
        weekday: 2,
        nth: 2,
        months: [],
        until: "",
      },
    };
    const ev = await check("entities", admin.token, "POST", event, 201);
    entities.push(ev.id);
    await check("entities/" + ev.id + "/rsvp", member.token, "POST", {
      date: event.start,
      attending: true,
    });
    await check(
      "entities/" + ev.id + "/rsvp",
      resident.token,
      "POST",
      { date: event.start, attending: true },
      409,
    );
    await check("entities/" + ev.id + "/rsvp", member.token, "POST", {
      date: event.start,
      attending: false,
    });
    await check("entities/" + ev.id + "/rsvp", resident.token, "POST", {
      date: event.start,
      attending: true,
    });
    const poll = {
      ...seeds[0],
      kind: "polls",
      slug: prefix + "-poll",
      name: "Temporary poll test",
      ownerIds: [admin.uid],
      options: ["A", "B"],
      resultsVisibility: "after-vote",
      visibility: "members",
    };
    const p = await check("entities", admin.token, "POST", poll, 201);
    entities.push(p.id);
    await check(
      "entities/" + p.id + "/vote",
      undefined,
      "POST",
      { option: 0 },
      401,
    );
    const hidden = await check("entities/" + p.id + "/results", member.token);
    assert.equal(hidden.hidden, true);
    checks++;
    await check("entities/" + p.id + "/vote", member.token, "POST", {
      option: 0,
    });
    await check("entities/" + p.id + "/vote", member.token, "POST", {
      option: 1,
    });
    const results = await check("entities/" + p.id + "/results", member.token);
    assert.equal(results.total, 1);
    assert.deepEqual(results.counts, [0, 1]);
    checks++;
    await check(
      "entities/" + p.id,
      admin.token,
      "PATCH",
      { ...poll, options: ["A", "B", "C"] },
      400,
    );
    await check("entities/" + p.id, admin.token, "PATCH", {
      ...poll,
      status: "archived",
    });
    await check("entities/" + p.id, member.token, "GET", undefined, 404);
    const verification = await check("residency", resident.token, "POST", {
      address: "1600 Pennsylvania Avenue NW, Washington, DC 20500",
    });
    assert.equal(verification.verifiedResident, false);
    const stored = (
      await db.collection("users").doc(resident.uid).get()
    ).data()!;
    assert.ok(!("address" in stored));
    assert.ok(!("coordinates" in stored));
    assert.ok(!JSON.stringify(stored).includes("Pennsylvania"));
    checks++;
    const ref = db.collection("users").doc(member.uid);
    await check("admin/users/" + member.uid, admin.token, "PATCH", {
      disabled: true,
    });
    await check("me", member.token, "GET", undefined, 403);
    const publicCalendar = await fetch(base + "/api/calendar");
    assert.equal(publicCalendar.status, 200);
    assert.ok(!(await publicCalendar.text()).includes("PRIVATE-FIXTURE"));
    checks++;
    const direct = await fetch(
      "https://firestore.googleapis.com/v1/projects/permitting-ai-helper/databases/rosemont-club/documents/users?key=" +
        process.env.FIREBASE_API_KEY,
      { headers: { Authorization: "Bearer " + resident.token } },
    );
    assert.equal(direct.status, 403);
    checks++;
    console.log(
      `${checks} live integration checks passed: auth, permissions, privacy, ownership, RSVP capacity, polls, archival, account disabling, calendar, Firestore rules.`,
    );
  } finally {
    for (const c of [
      "memberships",
      "responses",
      "rsvps",
      "rsvpCounts",
      "feedback",
      "audit",
    ]) {
      const snap = await db.collection(c).get();
      for (const d of snap.docs) {
        const v = d.data();
        if (
          d.id.startsWith(prefix) ||
          entities.some((id) => d.id.startsWith(id)) ||
          users.includes(v.userId) ||
          users.includes(v.actor) ||
          entities.includes(v.entityId)
        )
          await d.ref.delete();
      }
    }
    for (const id of entities) await db.collection("entities").doc(id).delete();
    for (const uid of users) {
      await db.collection("users").doc(uid).delete();
      await auth.deleteUser(uid).catch(() => {});
    }
    console.log("Temporary test identities and fixtures removed.");
  }
}
main().catch((e) => {
  console.error(
    e instanceof assert.AssertionError
      ? e.message
      : "Smoke check failed: " +
          (e.code || e.constructor.name) +
          " " +
          e.message,
  );
  process.exitCode = 1;
});
