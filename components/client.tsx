"use client";
import { getApp, getApps, initializeApp } from "firebase/app";
import {
  getAuth,
  Auth,
  signInWithPopup,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  signOut,
} from "firebase/auth";
let authPromise: Promise<Auth> | undefined;
export function clientAuth() {
  return (authPromise ??= fetch("/api/config")
    .then((r) => r.json())
    .then((config) => {
      const auth = getAuth(getApps().length ? getApp() : initializeApp(config));
      auth.tenantId = config.tenantId;
      return auth;
    }));
}
export async function api(path: string, method = "GET", body?: unknown) {
  const auth = await clientAuth();
  const token = await auth.currentUser?.getIdToken();
  const response = await fetch("/api/" + path, {
    method,
    headers: {
      ...(token ? { Authorization: "Bearer " + token } : {}),
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Please try again.");
  return data;
}
export async function downloadCalendar(id?: string) {
  const auth = await clientAuth();
  const token = await auth.currentUser?.getIdToken();
  const r = await fetch("/api/calendar" + (id ? "/" + id : ""), {
    headers: token ? { Authorization: "Bearer " + token } : {},
  });
  if (!r.ok) throw new Error("Calendar download failed.");
  const url = URL.createObjectURL(await r.blob());
  const a = document.createElement("a");
  a.href = url;
  a.download = "rosemont-club.ics";
  a.click();
  URL.revokeObjectURL(url);
}
export {
  signInWithPopup,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  signOut,
};
