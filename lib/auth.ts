import { auth, db } from "./firebase";
import type { Member } from "./schema";
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export async function viewer(request: Request): Promise<Member | null> {
  const header = request.headers.get("authorization");
  if (!header) return null;
  if (!header.startsWith("Bearer "))
    throw new HttpError(401, "Please sign in again.");
  let token;
  try {
    token = await auth.verifyIdToken(header.slice(7), true);
  } catch (error) {
    console.error("Identity verification failed", {
      code: (error as { code?: string }).code || "unknown",
    });
    throw new HttpError(401, "Please sign in again.");
  }
  const ref = db.collection("users").doc(token.uid);
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    let user = snap.data() as Member | undefined;
    if (!user) {
      user = {
        id: token.uid,
        email: token.email || "",
        displayName: token.name || "Neighbor",
        bio: "",
        photoURL: "",
        admin: false,
        disabled: false,
        verifiedResident: false,
        createdAt: new Date().toISOString(),
      };
      tx.create(ref, user);
    }
    if (user.disabled)
      throw new HttpError(403, "This Club account is disabled.");
    return user;
  });
}
export function requireUser(user: Member | null): asserts user is Member {
  if (!user) throw new HttpError(401, "Please sign in to continue.");
}
export function requireAdmin(user: Member | null): asserts user is Member {
  requireUser(user);
  if (!user.admin)
    throw new HttpError(403, "Administrator access is required.");
}
