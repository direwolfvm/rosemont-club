import test from "node:test";
import assert from "node:assert/strict";
import { allowedOrigin } from "../lib/origin";

test("custom and configured fallback origins work behind Cloud Run's proxy", () => {
  const internal = "http://localhost:8080/api/me";
  const primary = "https://rosemont.club";
  const fallback = "https://rosemont-club-650621702399.us-east4.run.app";
  for (const origin of [primary, fallback, null])
    assert.equal(allowedOrigin(origin, internal, primary, fallback), true);
  for (const origin of [
    "https://untrusted.example",
    "http://localhost:8080",
    "https://rosemont.club.evil.example",
    "http://rosemont.club",
  ])
    assert.equal(allowedOrigin(origin, internal, primary, fallback), false);
});

test("local development works without configured origins", () => {
  assert.equal(
    allowedOrigin(
      "http://localhost:3000",
      "http://localhost:3000/api/me",
      undefined,
    ),
    true,
  );
  assert.equal(
    allowedOrigin(
      "https://untrusted.example",
      "http://localhost:3000/api/me",
      undefined,
    ),
    false,
  );
});
