/**
 * Apply the site copy from data/seed.ts to existing Firestore records without
 * reseeding or changing permissions. Content sections that do not exist yet
 * (for example a newly added About section) are created and owned by the
 * existing administrators of the "about-club" section.
 */
import { db } from "../lib/firebase";
import { seeds } from "../data/seed";
import type { Entity } from "../lib/schema";

type Field = keyof Entity;
const fields: Record<string, Field[]> = {
  "content-home-intro": ["name", "summary"],
  "content-about-club": ["name", "description"],
  "content-about-not": ["name", "description"],
  "content-about-neighborhood": ["name", "description"],
  "content-about-history": ["name"],
  "content-about-participation": ["name", "description"],
  "content-about-principles": ["name", "description"],
  "content-governance": ["name", "description"],
  "content-guidelines-site": ["name", "summary", "description"],
  "content-guidelines-whatsapp": ["name", "summary", "description"],
  "content-privacy-policy": ["name", "summary", "description"],
  "content-support": ["name", "summary", "description"],
  "groups-rosemont-neighbors": ["summary", "joinInstructions", "channels"],
  "events-rosemont-happy-hour": ["summary", "description"],
  "resources-rosemont-history": ["summary"],
  "resources-alex311-visibility": ["name", "description", "website"],
};

async function main() {
  let created = 0;
  let updated = 0;
  await db.runTransaction(async (transaction) => {
    const anchor = await transaction.get(
      db.collection("entities").doc("content-about-club"),
    );
    const ownerIds: string[] = anchor.get("ownerIds") || [];
    const work = await Promise.all(
      Object.entries(fields).map(async ([id, keys]) => {
        const seed = seeds.find((entry) => entry.id === id);
        if (!seed) throw new Error("Missing seed: " + id);
        const ref = db.collection("entities").doc(id);
        const snapshot = await transaction.get(ref);
        if (!snapshot.exists) {
          if (seed.kind !== "content")
            throw new Error("Missing record: " + id);
          return { ref, create: { ...seed, ownerIds } };
        }
        const patch = Object.fromEntries(
          keys
            .filter(
              (key) =>
                JSON.stringify(snapshot.get(key)) !== JSON.stringify(seed[key]),
            )
            .map((key) => [key, seed[key]]),
        );
        return { ref, patch };
      }),
    );
    const now = new Date().toISOString();
    for (const item of work) {
      if ("create" in item) {
        transaction.create(item.ref, {
          ...item.create,
          createdAt: now,
          updatedAt: now,
        });
        created++;
      } else if (Object.keys(item.patch).length) {
        transaction.update(item.ref, { ...item.patch, updatedAt: now });
        updated++;
      }
    }
  });
  console.log(
    `Site copy applied: ${updated} updated, ${created} created. Unrelated content and permissions preserved.`,
  );
}
main().catch((e) => {
  console.error("Site copy update failed:", (e as Error).message);
  process.exitCode = 1;
});
