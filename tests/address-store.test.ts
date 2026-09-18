import test from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { encryptMatch, decryptMatch } from "../lib/address-store";
import type { AddressMatch } from "../lib/residency";

const match: AddressMatch = {
  lon: -77.0655,
  lat: 38.8132,
  local: true,
  street: "W OAK ST",
  line1: "12 W OAK ST",
};

test("remembered addresses round-trip under the key and never appear in the stored record", () => {
  const key = randomBytes(32);
  const record = encryptMatch(match, key);
  assert.deepEqual(decryptMatch(record, key), match);
  const stored = JSON.stringify(record);
  for (const secret of ["W OAK", "12 W", "77.0655", "38.8132"])
    assert.ok(!stored.includes(secret), secret + " leaked");
  assert.equal(record.v, 1);
});

test("a different key or a tampered record cannot be decrypted", () => {
  const key = randomBytes(32);
  const record = encryptMatch(match, key);
  assert.throws(() => decryptMatch(record, randomBytes(32)));
  const tampered = { ...record, data: record.data.slice(0, -4) + "AAAA" };
  assert.throws(() => decryptMatch(tampered, key));
});

test("encryption refuses to run without a configured key", () => {
  assert.throws(() => encryptMatch(match, null));
});
