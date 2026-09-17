import { db, auth } from "../lib/firebase";
import { seeds } from "../data/seed";
async function main() {
  let admin;
  try {
    admin = await auth.getUserByEmail("Jordan.eccles@gmail.com");
  } catch (e) {
    if ((e as { code: string }).code !== "auth/user-not-found") throw e;
    admin = await auth.createUser({
      email: "Jordan.eccles@gmail.com",
      displayName: "Jordan Eccles",
    });
  }
  const ref = db.collection("users").doc(admin.uid);
  if (!(await ref.get()).exists)
    await ref.create({
      id: admin.uid,
      email: admin.email,
      displayName: "Jordan Eccles",
      bio: "",
      photoURL: "",
      admin: true,
      disabled: false,
      verifiedResident: false,
      createdAt: new Date().toISOString(),
    });
  for (const seed of seeds) {
    const r = db.collection("entities").doc(seed.id);
    if (!(await r.get()).exists)
      await r.create({ ...seed, ownerIds: [admin.uid] });
  }
  console.log("Seed complete. Existing records and privileges were preserved.");
}
main().catch((e) => {
  console.error("Seed failed:", e.code || e.constructor.name);
  process.exitCode = 1;
});
