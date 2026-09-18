import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { FieldValue } from "firebase-admin/firestore";
import { db } from "./firebase";
import { matchesEligibility, type AddressMatch } from "./residency";
import type { Entity } from "./schema";

/**
 * Opt-in storage of a member's geocoded address so block-group eligibility
 * can be re-checked when groups are added or their rules change.
 *
 * - Stored only when the member ticks "remember" on the residency form.
 * - AES-256-GCM with a key that lives in Secret Manager (ADDRESS_KEY). The
 *   database alone cannot reveal an address.
 * - Kept in its own collection that no API returns and browsers cannot read.
 * - Decrypted only inside re-evaluation, and the result never leaves the
 *   server or gets logged.
 * - Deleted on request ("Forget my address") or whenever the member
 *   re-verifies without the remember option.
 */
export const COLLECTION = "privateAddresses";
export const STORAGE_VERSION = 1;

function key() {
  const raw = process.env.ADDRESS_KEY;
  if (!raw) return null;
  const k = Buffer.from(raw, "base64");
  return k.length === 32 ? k : null;
}
export const addressStorageEnabled = () => key() !== null;

export type StoredAddress = {
  v: number;
  iv: string;
  tag: string;
  data: string;
  storedAt: string;
};

export function encryptMatch(match: AddressMatch, k = key()): StoredAddress {
  if (!k) throw new Error("Address storage is not configured.");
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", k, iv);
  const plain = Buffer.from(
    JSON.stringify({
      lon: match.lon,
      lat: match.lat,
      local: match.local,
      street: match.street,
      line1: match.line1,
    }),
  );
  const data = Buffer.concat([cipher.update(plain), cipher.final()]);
  return {
    v: STORAGE_VERSION,
    iv: iv.toString("base64"),
    tag: cipher.getAuthTag().toString("base64"),
    data: data.toString("base64"),
    storedAt: new Date().toISOString(),
  };
}

export function decryptMatch(record: StoredAddress, k = key()): AddressMatch {
  if (!k) throw new Error("Address storage is not configured.");
  const decipher = createDecipheriv(
    "aes-256-gcm",
    k,
    Buffer.from(record.iv, "base64"),
  );
  decipher.setAuthTag(Buffer.from(record.tag, "base64"));
  const plain = Buffer.concat([
    decipher.update(Buffer.from(record.data, "base64")),
    decipher.final(),
  ]);
  return JSON.parse(plain.toString()) as AddressMatch;
}

export async function rememberAddress(uid: string, match: AddressMatch) {
  await db.collection(COLLECTION).doc(uid).set(encryptMatch(match));
}

export async function forgetAddress(uid: string) {
  await db.collection(COLLECTION).doc(uid).delete();
}

/**
 * Re-check every remembered address against one group's rule and update
 * each member's eligibleGroupIds for that group only. Returns counts, never
 * identities.
 */
export async function reevaluateGroup(group: Entity) {
  if (!addressStorageEnabled()) return { checked: 0, eligible: 0 };
  const custom = group.eligibility?.mode === "custom" && group.status === "active";
  const snapshot = await db.collection(COLLECTION).limit(5000).get();
  let checked = 0;
  let eligible = 0;
  let batch = db.batch();
  let pending = 0;
  for (const doc of snapshot.docs) {
    let match: AddressMatch;
    try {
      match = decryptMatch(doc.data() as StoredAddress);
    } catch {
      continue; // Unreadable (for example an old key); the member can re-verify.
    }
    checked++;
    const ok = custom && matchesEligibility(match, group.eligibility);
    if (ok) eligible++;
    batch.update(db.collection("users").doc(doc.id), {
      eligibleGroupIds: ok
        ? FieldValue.arrayUnion(group.id)
        : FieldValue.arrayRemove(group.id),
    });
    if (++pending === 400) {
      await batch.commit();
      batch = db.batch();
      pending = 0;
    }
  }
  if (pending) await batch.commit();
  return { checked, eligible };
}
