import test from "node:test";
import assert from "node:assert/strict";
import { lastActiveAdmin } from "../lib/account";

test("the last active administrator cannot delete their account; anyone else can", () => {
  const me = { id: "me", admin: true };
  assert.equal(lastActiveAdmin(me, [{ id: "me" }]), true);
  assert.equal(lastActiveAdmin(me, [{ id: "me" }, { id: "other", disabled: true }]), true);
  assert.equal(lastActiveAdmin(me, [{ id: "me" }, { id: "other" }]), false);
  assert.equal(lastActiveAdmin({ id: "member", admin: false }, [{ id: "me" }]), false);
});
