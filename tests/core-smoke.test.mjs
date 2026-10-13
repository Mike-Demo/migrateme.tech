import assert from "node:assert/strict";
import test from "node:test";
import * as core from "../packages/core/dist/index.js";

test("built core package exports migration helpers", () => {
  assert.equal(typeof core.renderMarkdown, "function");
  assert.equal(typeof core.validateManifest, "function");
});
