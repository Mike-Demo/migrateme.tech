import assert from "node:assert/strict";
import test from "node:test";
import { isManifestV2, upgradeManifestV1ToV2 } from "../packages/core/dist/index.js";

const v1 = {
  version: 1,
  source: { type: "wordpress-wxr", file: "export.xml" },
  destination: { connector: "markdown", outputPath: "out" },
  createdAt: "2026-10-18T00:00:00.000Z",
  items: [],
  mappings: [],
  assets: [],
  transformations: [],
  provenance: [],
  rollback: { enabled: false }
};

test("v1 manifests upgrade to v2 losslessly", () => {
  const v2 = upgradeManifestV1ToV2(v1);
  assert.equal(v2.version, 2);
  assert.equal(v2.source.type, "wordpress-wxr");
  assert.equal(v2.source.file, "export.xml");
  assert.equal(v2.destination.connector, "markdown");
  assert.equal(v2.destination.outputPath, "out");
  assert.equal(v2.createdAt, v1.createdAt);
  assert.ok(isManifestV2(v2));
});

test("isManifestV2 rejects v1 and junk", () => {
  assert.equal(isManifestV2(v1), false);
  assert.equal(isManifestV2(null), false);
  assert.equal(isManifestV2({ version: 2 }), false);
});
