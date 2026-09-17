import { z } from "zod";
export const visibility = z.enum(["public", "members", "residents"]);
const short = z.string().trim().max(300);
export const link = z
  .string()
  .trim()
  .max(2000)
  .refine((v) => !v || /^https:\/\//i.test(v), "Use an https:// URL");
export const channelSchema = z.object({
  type: z.enum([
    "WhatsApp",
    "Email",
    "Signal",
    "Discord",
    "Website",
    "Facebook",
    "Other",
  ]),
  label: short,
  url: link.default(""),
  email: z.union([z.email(), z.literal("")]).default(""),
  instructions: z.string().max(2000).default(""),
  visibility: visibility.default("residents"),
});
export const recurrenceSchema = z.object({
  frequency: z
    .enum(["none", "weekly", "monthly", "nth-weekday"])
    .default("none"),
  interval: z.number().int().min(1).max(12).default(1),
  weekday: z.number().int().min(0).max(6).default(2),
  nth: z.number().int().min(1).max(5).default(2),
  months: z.array(z.number().int().min(1).max(12)).max(12).default([]),
  until: z.string().max(10).default(""),
});
export const entitySchema = z
  .object({
    name: z.string().trim().min(2).max(120),
    slug: z
      .string()
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
      .max(100),
    kind: z.enum([
      "groups",
      "events",
      "resources",
      "polls",
      "content",
      "tags",
      "consultations",
    ]),
    summary: short.default(""),
    description: z.string().max(16000).default(""),
    visibility: visibility.default("public"),
    status: z
      .enum(["active", "draft", "archived", "cancelled"])
      .default("active"),
    ownerIds: z.array(z.string().min(1).max(128)).max(20).default([]),
    featured: z.boolean().default(false),
    audienceTags: z.array(short).max(30).default([]),
    topicTags: z.array(short).max(30).default([]),
    website: link.default(""),
    contactEmail: z.union([z.email(), z.literal("")]).default(""),
    image: link.default(""),
    imageAlt: short.default(""),
    membership: z.enum(["open", "request", "follow"]).default("open"),
    scope: short.default("Rosemont"),
    joinInstructions: z.string().max(2000).default(""),
    channels: z.array(channelSchema).max(12).default([]),
    groupId: z.string().max(100).default(""),
    relatedGroups: z.array(short).max(20).default([]),
    relatedEvents: z.array(short).max(20).default([]),
    relatedResources: z.array(short).max(20).default([]),
    start: z.string().max(16).default(""),
    end: z.string().max(16).default(""),
    timezone: z.literal("America/New_York").default("America/New_York"),
    location: short.default(""),
    streetAddress: short.default(""),
    mapUrl: link.default(""),
    sponsor: short.default(""),
    notes: z.string().max(2000).default(""),
    capacity: z.number().int().min(0).max(100000).default(0),
    rsvp: z.boolean().default(false),
    recurrence: recurrenceSchema.default({
      frequency: "none",
      interval: 1,
      weekday: 2,
      nth: 2,
      months: [],
      until: "",
    }),
    overrides: z
      .array(
        z.object({
          date: z.iso.date(),
          cancelled: z.boolean().default(false),
          location: short.default(""),
          sponsor: short.default(""),
        }),
      )
      .max(100)
      .default([]),
    options: z.array(z.string().trim().min(1).max(200)).max(12).default([]),
    opens: z.string().max(30).default(""),
    closes: z.string().max(30).default(""),
    resultsVisibility: z
      .enum(["always", "after-vote", "after-close", "admins"])
      .default("after-vote"),
  })
  .superRefine((v, c) => {
    if (
      v.kind === "events" &&
      (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(v.start) ||
        !Number.isFinite(Date.parse(v.start)))
    )
      c.addIssue({
        code: "custom",
        path: ["start"],
        message: "Choose a valid start date and time",
      });
    if (v.end && (!Number.isFinite(Date.parse(v.end)) || v.end <= v.start))
      c.addIssue({
        code: "custom",
        path: ["end"],
        message: "End must be after start",
      });
    if (
      v.kind === "polls" &&
      (v.options.length < 2 || new Set(v.options).size !== v.options.length)
    )
      c.addIssue({
        code: "custom",
        path: ["options"],
        message: "Provide 2–12 unique options",
      });
    for (const key of ["opens", "closes"] as const)
      if (v[key] && !Number.isFinite(Date.parse(v[key])))
        c.addIssue({
          code: "custom",
          path: [key],
          message: "Choose a valid date",
        });
    if (v.opens && v.closes && v.closes <= v.opens)
      c.addIssue({
        code: "custom",
        path: ["closes"],
        message: "Closing must follow opening",
      });
    if (v.recurrence.until && !/^\d{4}-\d{2}-\d{2}$/.test(v.recurrence.until))
      c.addIssue({
        code: "custom",
        path: ["recurrence", "until"],
        message: "Use YYYY-MM-DD",
      });
  });
export type Entity = z.infer<typeof entitySchema> & {
  id: string;
  createdAt: string;
  updatedAt: string;
};
export type Member = {
  id: string;
  email: string;
  displayName: string;
  bio: string;
  photoURL: string;
  admin: boolean;
  disabled: boolean;
  verifiedResident: boolean;
  verificationDate?: string;
  verificationMethod?: string;
  reviewRequested?: boolean;
  createdAt: string;
};
export type Viewer = Member | null;
export type Card = Partial<Entity> &
  Pick<Entity, "id" | "name" | "slug" | "kind" | "visibility"> & {
    locked?: boolean;
  };
export function canView(audience: string, user: Viewer) {
  return (
    audience === "public" ||
    (!!user &&
      !user.disabled &&
      (user.admin ||
        audience === "members" ||
        (audience === "residents" && user.verifiedResident)))
  );
}
export function canManage(e: Pick<Entity, "ownerIds">, user: Viewer) {
  return (
    !!user && !user.disabled && (user.admin || e.ownerIds.includes(user.id))
  );
}
export function projectEntity(e: Entity, user: Viewer): Card | null {
  if (e.status === "archived" || e.status === "draft")
    return canManage(e, user) ? e : null;
  if (!canView(e.visibility, user) && !canManage(e, user))
    return {
      id: e.id,
      name: e.name,
      slug: e.slug,
      kind: e.kind,
      visibility: e.visibility,
      locked: true,
    };
  return {
    ...e,
    channels: e.channels.filter(
      (c) => canView(c.visibility, user) || canManage(e, user),
    ),
  };
}
