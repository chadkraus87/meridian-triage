import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { expect, it } from "vitest";

/**
 * The held-out test set was frozen after the one-time label review (docs/label-changes.md).
 * Any change to it, including a label fix, must be a deliberate, logged decision that also
 * updates data/tickets/test.json.sha256. Otherwise the test numbers stop meaning anything.
 */
it("held-out test set is frozen", () => {
  const actual = createHash("sha256").update(readFileSync("data/tickets/test.json")).digest("hex");
  const frozen = readFileSync("data/tickets/test.json.sha256", "utf8").split(/\s+/)[0];
  expect(actual, "data/tickets/test.json changed after the freeze").toBe(frozen);
});
