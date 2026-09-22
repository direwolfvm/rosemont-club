import { FieldValue } from "firebase-admin/firestore";
import type { Query } from "firebase-admin/firestore";
import { db, auth } from "./firebase";
import { forgetAddress } from "./address-store";
import type { Member } from "./schema";

/** A member may delete their own account unless they are the last active administrator. */
export function lastActiveAdmin(
  user: Pick<Member, "id" | "admin">,
  admins: { id: string; disabled?: boolean }[],
) {
  return (
    user.admin && !admins.some((a) => a.id !== user.id && !a.disabled)
  );
}

async function deleteAll(query: Query) {
  const snapshot = await query.get();
  let batch = db.batch();
  let pending = 0;
  for (const doc of snapshot.docs) {
    batch.delete(doc.ref);
    if (++pending === 400) {
      await batch.commit();
      batch = db.batch();
      pending = 0;
    }
  }
  if (pending) await batch.commit();
  return snapshot.size;
}

/**
 * Remove a member's Club data. Content they owned stays (ownership is
 * released for an administrator to reassign), messages to the volunteers are
 * anonymized rather than lost, and RSVP capacity counters are corrected.
 * The shared Firebase identity is deleted too when the runtime has the
 * privilege; otherwise the caller (browser or app) deletes it client-side.
 */
export async function deleteAccount(uid: string) {
  const rsvps = await db.collection("rsvps").where("userId", "==", uid).get();
  for (const doc of rsvps.docs) {
    const data = doc.data();
    await db.runTransaction(async (tx) => {
      if (data.attending) {
        const counter = db
          .collection("rsvpCounts")
          .doc(data.entityId + "_" + String(data.date).replace(/\W/g, ""));
        const current = await tx.get(counter);
        if (current.exists)
          tx.set(counter, {
            count: Math.max(0, (current.data()?.count || 0) - 1),
          });
      }
      tx.delete(doc.ref);
    });
  }
  await deleteAll(db.collection("memberships").where("userId", "==", uid));
  await deleteAll(db.collection("responses").where("userId", "==", uid));
  const feedback = await db
    .collection("feedback")
    .where("userId", "==", uid)
    .get();
  for (const doc of feedback.docs) await doc.ref.update({ userId: "deleted" });
  const owned = await db
    .collection("entities")
    .where("ownerIds", "array-contains", uid)
    .get();
  for (const doc of owned.docs)
    await doc.ref.update({ ownerIds: FieldValue.arrayRemove(uid) });
  await forgetAddress(uid);
  await db.collection("users").doc(uid).delete();
  let identityDeleted = false;
  try {
    await auth.deleteUser(uid);
    identityDeleted = true;
  } catch {
    identityDeleted = false;
  }
  return { identityDeleted, releasedListings: owned.size };
}
