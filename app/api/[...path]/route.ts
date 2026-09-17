import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createHash } from "node:crypto";
import { db, auth } from "@/lib/firebase";
import { viewer, requireUser, requireAdmin, HttpError } from "@/lib/auth";
import {
  entitySchema,
  projectEntity,
  canManage,
  canView,
  Member,
  Entity,
} from "@/lib/schema";
import { ics, occurrences } from "@/lib/events";
import { verifyAddress, boundaryVersion } from "@/lib/residency";
import { sendMail } from "@/lib/mail";
import { allowedOrigin } from "@/lib/origin";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const readBuckets = new Map<string, { count: number; until: number }>();
function publicReadLimit(req: Request) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",").slice(-2, -1)[0]?.trim() ||
    "local";
  const key = createHash("sha256").update(ip).digest("hex");
  const now = Date.now();
  if (readBuckets.size > 5000)
    for (const [k, v] of readBuckets) if (v.until < now) readBuckets.delete(k);
  const b = readBuckets.get(key);
  if (b && b.until > now) {
    if (++b.count > 180)
      throw new HttpError(429, "Please wait a moment before trying again.");
  } else readBuckets.set(key, { count: 1, until: now + 60000 });
}
const kinds = [
  "groups",
  "events",
  "resources",
  "polls",
  "content",
  "tags",
  "consultations",
];
const json = (v: unknown, status = 200) =>
  NextResponse.json(v, {
    status,
    headers: { "Cache-Control": "private, no-store", Vary: "Authorization" },
  });
async function body(req: Request) {
  const reader = req.body?.getReader();
  if (!reader) throw new HttpError(400, "A JSON body is required.");
  const chunks: Uint8Array[] = [];
  let length = 0;
  while (true) {
    const part = await reader.read();
    if (part.done) break;
    length += part.value.byteLength;
    if (length > 80000) {
      await reader.cancel();
      throw new HttpError(413, "Request too large.");
    }
    chunks.push(part.value);
  }
  const raw = Buffer.concat(chunks).toString("utf8");
  try {
    return JSON.parse(raw);
  } catch {
    throw new HttpError(400, "Invalid request.");
  }
}
function audit(actor: string, action: string, target: string) {
  return db
    .collection("audit")
    .add({ actor, action, target, at: new Date().toISOString() });
}
async function limit(key: string, max: number, seconds = 3600) {
  const id = createHash("sha256").update(key).digest("hex");
  const ref = db.collection("rateLimits").doc(id);
  await db.runTransaction(async (tx) => {
    const s = await tx.get(ref);
    const d = s.data();
    const now = Date.now();
    const reset = !d || d.until < now;
    const count = reset ? 0 : d.count;
    if (count >= max)
      throw new HttpError(429, "Too many attempts. Please try again later.");
    tx.set(ref, {
      count: count + 1,
      until: reset ? now + seconds * 1000 : d.until,
    });
  });
}
async function getEntity(id: string) {
  if (!/^[a-z0-9-]{1,180}$/.test(id)) throw new HttpError(404, "Not found.");
  const s = await db.collection("entities").doc(id).get();
  if (!s.exists) throw new HttpError(404, "Not found.");
  return s.data() as Entity;
}
async function handle(
  req: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path } = await context.params;
  const [section, id, action] = path;
  const method = req.method;
  if (section === "health") return json({ ok: true, service: "rosemont-club" });
  if (method === "GET") publicReadLimit(req);
  if (section === "config" && method === "GET")
    return json({
      apiKey: process.env.FIREBASE_API_KEY,
      authDomain: "permitting-ai-helper.firebaseapp.com",
      projectId: "permitting-ai-helper",
      appId: process.env.FIREBASE_APP_ID,
      tenantId: process.env.FIREBASE_TENANT_ID || "alex311-qfnem",
    });
  if (method !== "GET") {
    if (
      !allowedOrigin(
        req.headers.get("origin"),
        req.url,
        process.env.APP_BASE_URL,
        process.env.APP_ADDITIONAL_ORIGINS,
      )
    )
      throw new HttpError(403, "Request origin is not allowed.");
    if (!req.headers.get("content-type")?.includes("application/json"))
      throw new HttpError(415, "Use application/json.");
  }
  const user = await viewer(req);
  if (method !== "GET") {
    requireUser(user);
    await limit("write:" + user.id, 120, 60);
  }
  if (section === "me") {
    requireUser(user);
    if (method === "GET") return json(user);
    if (method === "PATCH") {
      const p = z
        .object({
          displayName: z.string().trim().min(1).max(100),
          bio: z.string().max(500).default(""),
        })
        .strict()
        .parse(await body(req));
      await db.collection("users").doc(user.id).update(p);
      return json({ ...user, ...p });
    }
  }
  if (section === "residency") {
    requireUser(user);
    if (method !== "POST") throw new HttpError(405, "Method not allowed.");
    if (id === "review") {
      await db
        .collection("users")
        .doc(user.id)
        .update({ reviewRequested: true });
      return json({
        message: "A volunteer will review your request. No address was saved.",
      });
    }
    await limit("residency:" + user.id, 5);
    const { address } = z
      .object({ address: z.string().trim().min(8).max(250) })
      .strict()
      .parse(await body(req));
    let result;
    try {
      result = await verifyAddress(address);
    } catch {
      throw new HttpError(
        503,
        "Address matching is temporarily unavailable. Please try again or request volunteer review.",
      );
    }
    const update = {
      verifiedResident: result.verifiedResident,
      verificationDate: new Date().toISOString(),
      verificationMethod: "census-geocoder/" + boundaryVersion,
    };
    await db.collection("users").doc(user.id).update(update);
    return json({ ...update, matched: result.matched });
  }
  if (section === "activity" && method === "GET") {
    requireUser(user);
    const [groups, events] = await Promise.all([
      db.collection("memberships").where("userId", "==", user.id).get(),
      db.collection("rsvps").where("userId", "==", user.id).get(),
    ]);
    return json({
      groups: groups.docs.map((d) => d.data()),
      events: events.docs.map((d) => d.data()),
    });
  }
  if (section === "feedback" && method === "POST") {
    requireUser(user);
    await limit("feedback:" + user.id, 5);
    const data = z
      .object({
        message: z.string().trim().min(5).max(3000),
        entityId: z.string().max(180).default(""),
        type: z.enum(["feedback", "ownership"]).default("feedback"),
      })
      .strict()
      .parse(await body(req));
    await db.collection("feedback").add({
      ...data,
      userId: user.id,
      status: "open",
      createdAt: new Date().toISOString(),
    });
    return json({
      message: "Thanks. Your message is ready for the volunteer team.",
    });
  }
  if (section === "admin") {
    requireAdmin(user);
    if (method === "GET") {
      if (!["users", "feedback", "audit"].includes(id))
        throw new HttpError(404, "Not found.");
      const docs = await db.collection(id).limit(250).get();
      return json(docs.docs.map((d) => ({ ...d.data(), id: d.id })));
    }
    if (id === "feedback" && method === "PATCH") {
      const { feedbackId, status } = z
        .object({
          feedbackId: z.string().regex(/^[a-zA-Z0-9]{1,128}$/),
          status: z.enum(["open", "resolved"]),
        })
        .parse(await body(req));
      await db.collection("feedback").doc(feedbackId).update({ status });
      await audit(user.id, "feedback-status", feedbackId);
      return json({ ok: true });
    }
    if (id === "users" && action && method === "PATCH") {
      const data = z
        .object({
          admin: z.boolean().optional(),
          disabled: z.boolean().optional(),
          verifiedResident: z.boolean().optional(),
        })
        .strict()
        .parse(await body(req));
      if (
        action === user.id &&
        (data.admin === false || data.disabled === true)
      )
        throw new HttpError(
          400,
          "Ask another administrator to change your own access.",
        );
      if (data.verifiedResident !== undefined)
        Object.assign(data, {
          verificationDate: new Date().toISOString(),
          verificationMethod: "manual-admin",
          reviewRequested: false,
        });
      await db.collection("users").doc(action).update(data);
      await audit(user.id, "user-permissions", action);
      return json({ ok: true });
    }
    if (id === "mail" && method === "POST") {
      const { userId, subject, message } = z
        .object({
          userId: z.string().min(1).max(128),
          subject: z.string().min(1).max(150),
          message: z.string().min(1).max(10000),
        })
        .parse(await body(req));
      const target = (await db.collection("users").doc(userId).get()).data() as
        | Member
        | undefined;
      if (!target) throw new HttpError(404, "Member not found.");
      await limit("mail:" + user.id, 10);
      try {
        await sendMail(target.email, subject, message);
      } catch (error) {
        throw new HttpError(502, (error as Error).message);
      }
      await audit(user.id, "email", userId);
      return json({ ok: true });
    }
  }
  if (section === "calendar") {
    const docs = await db
      .collection("entities")
      .where("kind", "==", "events")
      .get();
    const events = docs.docs
      .map((d) => d.data() as Entity)
      .filter(
        (e) =>
          (!id || e.id === id || e.groupId === id) &&
          ["active", "cancelled"].includes(e.status) &&
          canView(e.visibility, user),
      );
    return new NextResponse(ics(events), {
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": 'attachment; filename="rosemont-club.ics"',
        "Cache-Control": "private, no-store",
        Vary: "Authorization",
      },
    });
  }
  if (section === "entities") {
    if (method === "GET" && !id) {
      const kind = req.nextUrl.searchParams.get("kind");
      if (kind && !kinds.includes(kind))
        throw new HttpError(400, "Unknown directory.");
      const query = kind
        ? db.collection("entities").where("kind", "==", kind)
        : db.collection("entities");
      const docs = await query.limit(500).get();
      return json(
        docs.docs
          .map((d) => projectEntity(d.data() as Entity, user))
          .filter(Boolean),
      );
    }
    if (method === "POST" && !id) {
      requireUser(user);
      const parsed = entitySchema.parse(await body(req));
      if (!user.admin) {
        if (parsed.kind !== "events" || !parsed.groupId)
          throw new HttpError(
            403,
            "Only administrators can create this content.",
          );
        const group = await getEntity(parsed.groupId);
        if (group.kind !== "groups" || !canManage(group, user))
          throw new HttpError(403, "You must own the host group.");
        parsed.ownerIds = [user.id];
        parsed.featured = false;
      }
      const entityId = parsed.kind + "-" + parsed.slug;
      const now = new Date().toISOString();
      const e = { ...parsed, id: entityId, createdAt: now, updatedAt: now };
      if (parsed.groupId) {
        const group = await getEntity(parsed.groupId);
        if (group.kind !== "groups")
          throw new HttpError(400, "Choose a valid host group.");
        const ranks = { public: 0, members: 1, residents: 2 };
        if (ranks[e.visibility] < ranks[group.visibility])
          throw new HttpError(
            400,
            "Event visibility must respect its host group.",
          );
      }
      await db
        .collection("entities")
        .doc(entityId)
        .create(e)
        .catch(() => {
          throw new HttpError(409, "That URL is already in use.");
        });
      await audit(user.id, "create", entityId);
      return json(e, 201);
    }
    if (id) {
      const e = await getEntity(id);
      if (method === "GET" && !action) {
        const visible = projectEntity(e, user);
        if (!visible) throw new HttpError(404, "Not found.");
        return json({
          ...visible,
          ...(!visible.locked && e.kind === "events"
            ? { upcoming: occurrences(e) }
            : {}),
        });
      }
      if (method === "PATCH" && !action) {
        requireUser(user);
        if (!canManage(e, user))
          throw new HttpError(403, "You can only edit content you own.");
        const raw = await body(req);
        const update = entitySchema.parse(raw);
        if (update.slug !== e.slug || update.kind !== e.kind)
          throw new HttpError(400, "The content type and URL cannot change.");
        if (
          !user.admin &&
          (JSON.stringify(update.ownerIds) !== JSON.stringify(e.ownerIds) ||
            update.featured !== e.featured ||
            update.groupId !== e.groupId)
        )
          throw new HttpError(
            403,
            "An administrator must change ownership, host group, or featured status.",
          );
        if (update.groupId) {
          const group = await getEntity(update.groupId);
          const ranks = { public: 0, members: 1, residents: 2 };
          if (ranks[update.visibility] < ranks[group.visibility])
            throw new HttpError(
              400,
              "Event visibility must respect its host group.",
            );
        }
        const next = {
          ...update,
          id: e.id,
          createdAt: e.createdAt,
          updatedAt: new Date().toISOString(),
        };
        await db.runTransaction(async (tx) => {
          const ref = db.collection("entities").doc(id);
          const fresh = (await tx.get(ref)).data() as Entity;
          if (!canManage(fresh, user))
            throw new HttpError(
              403,
              "Your ownership has changed. Reload this page.",
            );
          if (
            !user.admin &&
            (JSON.stringify(update.ownerIds) !==
              JSON.stringify(fresh.ownerIds) ||
              update.featured !== fresh.featured ||
              update.groupId !== fresh.groupId)
          )
            throw new HttpError(
              403,
              "An administrator must change ownership, host group, or featured status.",
            );
          if (
            fresh.kind === "polls" &&
            JSON.stringify(update.options) !== JSON.stringify(fresh.options)
          ) {
            const votes = await tx.get(
              db.collection("responses").where("entityId", "==", id).limit(1),
            );
            if (!votes.empty)
              throw new HttpError(
                400,
                "Poll options cannot change after voting starts. Create another poll.",
              );
          }
          tx.set(ref, next);
        });
        await audit(user.id, "edit", id);
        return json(next);
      }
      if (action === "members" && e.kind === "groups") {
        requireUser(user);
        if (!canManage(e, user))
          throw new HttpError(
            403,
            "Only group owners can manage membership requests.",
          );
        if (method === "GET") {
          const snap = await db
            .collection("memberships")
            .where("entityId", "==", e.id)
            .get();
          const rows = await Promise.all(
            snap.docs
              .filter((d) => d.data().status !== "none")
              .map(async (d) => {
                const m = d.data();
                const u = (
                  await db.collection("users").doc(m.userId).get()
                ).data();
                return {
                  userId: m.userId,
                  status: m.status,
                  displayName: u?.displayName || "Neighbor",
                };
              }),
          );
          return json(rows);
        }
        if (method === "POST") {
          const input = z
            .object({
              userId: z.string().min(1).max(128),
              status: z.enum(["member", "none"]),
            })
            .parse(await body(req));
          await db
            .collection("memberships")
            .doc(e.id + "_" + input.userId)
            .update({ status: input.status });
          await audit(user.id, "membership-" + input.status, e.id);
          return json({ ok: true });
        }
      }
      if (
        !canView(e.visibility, user) ||
        !["active", "cancelled"].includes(e.status)
      )
        throw new HttpError(
          403,
          "This content is not available to your account.",
        );
      if (action === "vote" && method === "POST") {
        requireUser(user);
        const { option } = z
          .object({ option: z.number().int().min(0).max(11) })
          .strict()
          .parse(await body(req));
        await db.runTransaction(async (tx) => {
          const fresh = (
            await tx.get(db.collection("entities").doc(id))
          ).data() as Entity;
          const ref = db.collection("responses").doc(id + "_" + user.id);
          await tx.get(ref);
          if (
            fresh.kind !== "polls" ||
            fresh.status !== "active" ||
            !canView(fresh.visibility, user) ||
            Date.parse(fresh.opens) > Date.now() ||
            Date.parse(fresh.closes) < Date.now() ||
            option >= fresh.options.length
          )
            throw new HttpError(
              400,
              "This poll is not accepting that response.",
            );
          tx.set(ref, {
            entityId: id,
            userId: user.id,
            option,
            updatedAt: new Date().toISOString(),
          });
        });
        return json({ ok: true });
      }
      if (action === "results" && method === "GET" && e.kind === "polls") {
        const own = user
          ? (
              await db
                .collection("responses")
                .doc(id + "_" + user.id)
                .get()
            ).data()
          : null;
        const allowed =
          user?.admin ||
          e.resultsVisibility === "always" ||
          (e.resultsVisibility === "after-vote" && !!own) ||
          (e.resultsVisibility === "after-close" &&
            !!e.closes &&
            Date.parse(e.closes) < Date.now());
        if (!allowed)
          return json({ hidden: true, selected: own?.option ?? null });
        const votes = await db
          .collection("responses")
          .where("entityId", "==", id)
          .get();
        const counts = e.options.map(
          (_, i) => votes.docs.filter((d) => d.data().option === i).length,
        );
        return json({
          counts,
          total: votes.size,
          selected: own?.option ?? null,
        });
      }
      if (action === "join" && e.kind === "groups") {
        requireUser(user);
        const ref = db.collection("memberships").doc(id + "_" + user.id);
        if (method === "GET")
          return json((await ref.get()).data() || { status: "none" });
        if (method === "POST") {
          const { join } = z
            .object({ join: z.boolean() })
            .parse(await body(req));
          const status = join
            ? e.membership === "request"
              ? "requested"
              : "following"
            : "none";
          await ref.set({
            entityId: id,
            userId: user.id,
            status,
            updatedAt: new Date().toISOString(),
          });
          return json({ status });
        }
      }
      if (action === "rsvp" && e.kind === "events") {
        requireUser(user);
        const date = req.nextUrl.searchParams.get("date");
        if (method === "GET") {
          if (!date || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(date))
            throw new HttpError(400, "Choose an occurrence.");
          return json(
            (
              await db
                .collection("rsvps")
                .doc(id + "_" + date.replace(/\W/g, "") + "_" + user.id)
                .get()
            ).data() || { attending: false },
          );
        }
        const input = z
          .object({
            date: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/),
            attending: z.boolean(),
          })
          .parse(await body(req));
        await db.runTransaction(async (tx) => {
          const fresh = (
            await tx.get(db.collection("entities").doc(id))
          ).data() as Entity;
          if (
            !fresh.rsvp ||
            fresh.status !== "active" ||
            !canView(fresh.visibility, user) ||
            !occurrences(fresh, new Date(), 200).includes(input.date)
          )
            throw new HttpError(400, "RSVP is not available for this date.");
          const counter = db
            .collection("rsvpCounts")
            .doc(id + "_" + input.date.replace(/\W/g, ""));
          const ref = db.collection("rsvps").doc(counter.id + "_" + user.id);
          const [c, s] = await Promise.all([tx.get(counter), tx.get(ref)]);
          const was = s.data()?.attending || false;
          const count = c.data()?.count || 0;
          const delta = Number(input.attending) - Number(was);
          if (delta > 0 && fresh.capacity && count >= fresh.capacity)
            throw new HttpError(409, "This event is at capacity.");
          tx.set(counter, { count: Math.max(0, count + delta) });
          tx.set(ref, {
            entityId: id,
            userId: user.id,
            date: input.date,
            attending: input.attending,
          });
        });
        return json({ ok: true });
      }
    }
  }
  throw new HttpError(404, "Not found.");
}
async function route(
  req: NextRequest,
  ctx: { params: Promise<{ path: string[] }> },
) {
  try {
    return await handle(req, ctx);
  } catch (err) {
    if (err instanceof z.ZodError)
      return json(
        {
          error: err.issues
            .map((i) => i.path.join(".") + ": " + i.message)
            .join("; "),
        },
        400,
      );
    if (err instanceof HttpError)
      return json({ error: err.message }, err.status);
    console.error("Request failed", {
      type: err instanceof Error ? err.constructor.name : "unknown",
    });
    return json({ error: "Something went wrong. Please try again." }, 500);
  }
}
export { route as GET, route as POST, route as PATCH };
