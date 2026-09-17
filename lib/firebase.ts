import { getApps, initializeApp, applicationDefault } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
export const projectId =
  process.env.GOOGLE_CLOUD_PROJECT || "permitting-ai-helper";
export const app =
  getApps()[0] ||
  initializeApp({ credential: applicationDefault(), projectId });
export const db = getFirestore(
  app,
  process.env.FIRESTORE_DATABASE || "rosemont-club",
);
export const auth = getAuth(app)
  .tenantManager()
  .authForTenant(process.env.FIREBASE_TENANT_ID || "alex311-qfnem");
