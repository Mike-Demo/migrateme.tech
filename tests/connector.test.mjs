import assert from "node:assert/strict";
import test from "node:test";
import {
  requireCapabilities,
  UnsupportedCapabilityError
} from "../packages/core/dist/index.js";

test("capability negotiation accepts capabilities the connector supports", () => {
  const connector = { capabilities: () => new Set(["rollback", "checkpoint"]) };

  assert.doesNotThrow(() => requireCapabilities(connector, ["rollback", "checkpoint"]));
});

test("capability negotiation rejects unsupported capabilities with a named error", () => {
  const connector = { capabilities: () => new Set(["checkpoint"]) };

  assert.throws(
    () => requireCapabilities(connector, ["rollback"]),
    (error) => {
      assert.ok(error instanceof UnsupportedCapabilityError);
      assert.equal(error.name, "UnsupportedCapabilityError");
      assert.equal(error.code, "UNSUPPORTED_CAPABILITY");
      assert.equal(error.capability, "rollback");
      assert.equal(error.message, "UNSUPPORTED_CAPABILITY: connector does not support rollback");
      return true;
    }
  );
});
